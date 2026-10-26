import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { LocalDate } from "@/lib/clock";
import { simulate, isValidDownPayment, normalizeTerm } from "@/lib/finance";
import type { BookingInput } from "@/lib/schemas";
import { bookableDates, isBookableDate, slotsFor, SLOT_HOURS } from "@/lib/slots";
import { reservedCount } from "./availability";
import { generateAccessToken, generateCode, hashToken } from "./codes";
import { CONSTRAINTS } from "./constraints";
import { getDb, withTransaction, type Db, type Tx } from "./db";
import { pgErrorOf } from "./pgErrors";
import { LIMITS } from "./rateLimit";
import { fail, ok, type Result } from "./result";
import { appointments, motorcycles, type Financing } from "./schema";

// Crear una cita (ADR 0006): una transacción con FOR UPDATE sobre la moto, índices únicos para la
// franja y la persona, y traducción de errores por nombre de restricción.

export type CreatedAppointment = { code: string; token: string; slotStart: Date; motoName: string };
export type BookingFailure = { alternatives?: { date: LocalDate; hour: number }[] };

const CODE_RETRIES = 3;

class SlotTaken extends Error {}
class AlreadyBooked extends Error {}

export async function createAppointment(
  input: BookingInput,
  ctx: { today: LocalDate; ipHmac: string | null },
): Promise<Result<CreatedAppointment, BookingFailure>> {
  if (!isBookableDate(input.date, ctx.today)) {
    return fail("VALIDATION", { fieldErrors: { date: "Elige un día entre mañana y dentro de 30 días (lunes a sábado)" } });
  }
  const slot = slotsFor(input.date).find((s) => s.hour === input.hour);
  if (!slot) return fail("VALIDATION", { fieldErrors: { hour: "Elige una hora válida" } });

  try {
    const result = await withTransaction(async (tx) => {
      const [moto] = await tx
        .select()
        .from(motorcycles)
        .where(eq(motorcycles.slug, input.moto))
        .for("update");
      if (!moto) return fail<BookingFailure>("NOT_FOUND");

      // Las citas pendientes ya vencidas de esta persona pasan a VENCIDA (ADR 0010).
      await tx
        .update(appointments)
        .set({ status: "VENCIDA", updatedAt: sql`now()` })
        .where(
          and(
            eq(appointments.status, "PENDIENTE"),
            lt(appointments.slotDate, ctx.today),
            or(eq(appointments.email, input.email), eq(appointments.phoneNormalized, input.phone)),
          ),
        );

      if (moto.stockTotal - (await reservedCount(tx, moto.id, ctx.today)) <= 0) {
        return fail<BookingFailure>("OUT_OF_STOCK");
      }

      // Tope de citas pendientes simultáneas por origen: frena el acaparamiento de stock (SEC-01).
      if (ctx.ipHmac) {
        const [pending] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(appointments)
          .where(and(eq(appointments.ipHmac, ctx.ipHmac), eq(appointments.status, "PENDIENTE")));
        if (Number(pending?.n ?? 0) >= LIMITS.pendingPerOrigin) return fail<BookingFailure>("RATE_LIMITED");
      }

      const financing = financingFor(moto.priceCents, input);
      const token = generateAccessToken();
      for (let attempt = 1; ; attempt++) {
        const code = generateCode();
        try {
          // Nested transaction = SAVEPOINT: un fallo aquí no aborta la transacción exterior.
          await tx.transaction(async (sp) => {
            await sp.insert(appointments).values({
              code,
              accessTokenHash: hashToken(token),
              motorcycleId: moto.id,
              slotStart: slot.start,
              slotDate: input.date,
              fullName: input.fullName,
              email: input.email,
              phoneNormalized: input.phone,
              ipHmac: ctx.ipHmac,
              financing,
            });
          });
          return ok<CreatedAppointment>({ code, token, slotStart: slot.start, motoName: moto.name });
        } catch (error) {
          const { code: pgCode, constraint } = pgErrorOf(error);
          if (pgCode !== "23505") throw error;
          if (constraint === CONSTRAINTS.code && attempt < CODE_RETRIES) continue;
          if (constraint === CONSTRAINTS.slotPending) throw new SlotTaken();
          if (constraint === CONSTRAINTS.emailPending || constraint === CONSTRAINTS.phonePending) throw new AlreadyBooked();
          throw error;
        }
      }
    });
    return result;
  } catch (error) {
    if (error instanceof SlotTaken) {
      return fail("SLOT_TAKEN", { details: { alternatives: await nearestFreeSlots(getDb(), input.date, ctx.today) } });
    }
    if (error instanceof AlreadyBooked) {
      // No se revela la fecha de la cita existente: quien conozca un email o teléfono ajeno no debe
      // poder averiguar cuándo va esa persona al concesionario (SEC-03).
      return fail("ALREADY_BOOKED");
    }
    throw error;
  }
}

function financingFor(priceCents: number, input: BookingInput): Financing | null {
  if (input.entrada === undefined && input.plazo === undefined) return null;
  const downPaymentCents = (input.entrada ?? 0) * 100;
  if (!isValidDownPayment(priceCents, downPaymentCents)) return null;
  const termMonths = normalizeTerm(input.plazo);
  // Recalculado en el servidor: nunca se confía en una cuota que venga del navegador (ADR 0009).
  const s = simulate({ priceCents, downPaymentCents, termMonths });
  return { downPaymentCents, termMonths, tinBps: 595, installmentCents: s.installmentCents, taeBps: s.taeBps };
}

/** Horas ocupadas (con cita PENDIENTE) de un día. */
export async function takenHours(db: Db | Tx, date: LocalDate): Promise<Set<number>> {
  const starts = slotsFor(date).map((s) => s.start);
  const rows = await db
    .select({ slotStart: appointments.slotStart })
    .from(appointments)
    .where(and(eq(appointments.status, "PENDIENTE"), inArray(appointments.slotStart, starts)));
  const taken = new Set(rows.map((r) => r.slotStart.getTime()));
  return new Set(slotsFor(date).filter((s) => taken.has(s.start.getTime())).map((s) => s.hour));
}

export async function freeSlots(db: Db, date: LocalDate, today: LocalDate): Promise<{ hour: number; free: boolean }[]> {
  if (!isBookableDate(date, today)) return SLOT_HOURS.map((hour) => ({ hour, free: false }));
  const taken = await takenHours(db, date);
  return SLOT_HOURS.map((hour) => ({ hour, free: !taken.has(hour) }));
}

/** Las 3 franjas libres más cercanas a partir del día pedido (Design.md §6). */
export async function nearestFreeSlots(db: Db, from: LocalDate, today: LocalDate, limit = 3) {
  const out: { date: LocalDate; hour: number }[] = [];
  for (const date of bookableDates(today).filter((d) => d >= from)) {
    const taken = await takenHours(db, date);
    for (const hour of SLOT_HOURS) {
      if (!taken.has(hour)) out.push({ date, hour });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Datos de la confirmación por token (ADR 0011). El código corto no da acceso. */
export async function findByToken(db: Db, token: string) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const [row] = await db
    .select({
      code: appointments.code,
      slotDate: appointments.slotDate,
      slotStart: appointments.slotStart,
      status: appointments.status,
      fullName: appointments.fullName,
      phone: appointments.phoneNormalized,
      financing: appointments.financing,
      motoName: motorcycles.name,
      motoSlug: motorcycles.slug,
    })
    .from(appointments)
    .innerJoin(motorcycles, eq(appointments.motorcycleId, motorcycles.id))
    .where(eq(appointments.accessTokenHash, hashToken(token)));
  return row ?? null;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  return `••• •• ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
}
