import { and, eq, inArray, sql } from "drizzle-orm";
import type { LocalDate } from "@/lib/clock";
import { reservedCount } from "./availability";
import { withTransaction, type Tx } from "./db";
import { fail, ok, type Result } from "./result";
import { appointments, motorcycles, type AppointmentStatus } from "./schema";

// Máquina de estados de la cita (ADR 0006 §3). Cada transición es una transacción con FOR UPDATE
// sobre la moto y un UPDATE condicional e idempotente: un doble clic nunca descuenta dos veces.

const ALLOWED: Record<"sell" | "cancel" | "noShow", { from: AppointmentStatus[]; to: AppointmentStatus }> = {
  sell: { from: ["PENDIENTE", "VENCIDA"], to: "VENDIDA" },
  cancel: { from: ["PENDIENTE", "VENCIDA"], to: "CANCELADA" },
  noShow: { from: ["PENDIENTE"], to: "VENCIDA" },
};

export type Transition = keyof typeof ALLOWED;

async function lockAppointment(tx: Tx, id: string) {
  const [a] = await tx
    .select({ motorcycleId: appointments.motorcycleId })
    .from(appointments)
    .where(eq(appointments.id, id));
  if (!a) return null;
  // Orden de bloqueo: primero la moto, igual que al crear una cita (sin interbloqueos).
  const [moto] = await tx.select().from(motorcycles).where(eq(motorcycles.id, a.motorcycleId)).for("update");
  const [row] = await tx
    .select({ status: appointments.status, slotDate: appointments.slotDate })
    .from(appointments)
    .where(eq(appointments.id, id))
    .for("update");
  return { moto, row };
}

export async function transition(
  kind: Transition,
  id: string,
  ctx: { adminId: string; today: LocalDate; now: Date },
): Promise<Result<{ status: AppointmentStatus }>> {
  const rule = ALLOWED[kind];
  return withTransaction(async (tx) => {
    const locked = await lockAppointment(tx, id);
    if (!locked) return fail("NOT_FOUND");
    const { moto, row } = locked;
    if (!rule.from.includes(row.status)) return fail("INVALID_STATE");

    if (kind === "sell") {
      // Si la cita ya no apartaba stock (pasada o VENCIDA), su unidad volvió al disponible:
      // vender exige que quede al menos 1 (ADR 0006 §3, hallazgo C3).
      const wasReserving = row.status === "PENDIENTE" && row.slotDate >= ctx.today;
      if (!wasReserving) {
        const available = moto.stockTotal - (await reservedCount(tx, moto.id, ctx.today));
        if (available < 1) return fail("OUT_OF_STOCK");
      }
      if (moto.stockTotal < 1) return fail("OUT_OF_STOCK");
    }

    const updated = await tx
      .update(appointments)
      .set({ status: rule.to, updatedBy: ctx.adminId, updatedAt: ctx.now })
      .where(and(eq(appointments.id, id), inArray(appointments.status, rule.from)))
      .returning({ id: appointments.id });
    if (updated.length === 0) return fail("INVALID_STATE");

    if (kind === "sell") {
      await tx
        .update(motorcycles)
        .set({ stockTotal: sql`${motorcycles.stockTotal} - 1`, updatedAt: ctx.now })
        .where(eq(motorcycles.id, moto.id));
    }
    return ok({ status: rule.to });
  });
}

/** Cancela todas las citas PENDIENTE del mismo origen (IP en HMAC) que la cita dada (ADR 0010). */
export async function cancelSameOrigin(id: string, ctx: { adminId: string; now: Date }): Promise<Result<{ cancelled: number }>> {
  return withTransaction(async (tx) => {
    const [a] = await tx.select({ ipHmac: appointments.ipHmac }).from(appointments).where(eq(appointments.id, id));
    if (!a) return fail("NOT_FOUND");
    if (!a.ipHmac) return ok({ cancelled: 0 });
    const rows = await tx
      .update(appointments)
      .set({ status: "CANCELADA", updatedBy: ctx.adminId, updatedAt: ctx.now })
      .where(and(eq(appointments.ipHmac, a.ipHmac), eq(appointments.status, "PENDIENTE")))
      .returning({ id: appointments.id });
    return ok({ cancelled: rows.length });
  });
}

/** Ajusta el stock total; nunca por debajo de las citas pendientes vigentes (F4). */
export async function adjustStock(slug: string, stockTotal: number, ctx: { today: LocalDate; now: Date }): Promise<Result<{ stockTotal: number }>> {
  if (!Number.isInteger(stockTotal) || stockTotal < 0 || stockTotal > 999) {
    return fail("VALIDATION", { fieldErrors: {} });
  }
  return withTransaction(async (tx) => {
    const [moto] = await tx.select().from(motorcycles).where(eq(motorcycles.slug, slug)).for("update");
    if (!moto) return fail("NOT_FOUND");
    const reserved = await reservedCount(tx, moto.id, ctx.today);
    if (stockTotal < reserved) return fail("VALIDATION", { details: { reserved } });
    await tx.update(motorcycles).set({ stockTotal, updatedAt: ctx.now }).where(eq(motorcycles.id, moto.id));
    return ok({ stockTotal });
  });
}
