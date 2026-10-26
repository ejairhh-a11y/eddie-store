import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { bookingSchema } from "@/lib/schemas";
import { createAppointment, findByToken } from "@/server/booking";
import { closeDb, getDb } from "@/server/db";
import { appointments, motorcycles } from "@/server/schema";
import { resetData, setStock } from "./helpers";

// TECH-DESIGN F3 [I], ADR 0006 y 0010. "Hoy" = lunes 26/10/2026; martes 27 es el primer día agendable.
const TODAY = "2026-10-26";
const DAY = "2026-10-27";

beforeEach(async () => {
  await resetData();
  await setStock("yz450f", 3);
});
afterAll(closeDb);

function input(n: number, over: Record<string, unknown> = {}) {
  return bookingSchema.parse({
    moto: "yz450f",
    date: DAY,
    hour: 10,
    fullName: `Piloto Prueba ${n}`,
    email: `piloto${n}@example.com`,
    phone: `61200${String(n).padStart(4, "0")}`,
    ...over,
  });
}

const book = (n: number, over: Record<string, unknown> = {}, ip: string | null = null) =>
  createAppointment(input(n, over), { today: TODAY, ipHmac: ip });

describe("crear cita", () => {
  it("crea una cita PENDIENTE con código legible y token que da acceso a la confirmación", async () => {
    const r = await book(1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.code).toMatch(/^YZ-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(r.data.slotStart.toISOString()).toBe("2026-10-27T09:00:00.000Z");
    const cita = await findByToken(getDb(), r.data.token);
    expect(cita?.code).toBe(r.data.code);
    expect(cita?.status).toBe("PENDIENTE");
    expect(await findByToken(getDb(), r.data.code)).toBeNull(); // el código no da acceso (ADR 0011)
  });

  it("recalcula la cuota en el servidor", async () => {
    const r = await book(1, { entrada: 2000, plazo: 36 });
    expect(r.ok).toBe(true);
    const [row] = await getDb().select({ f: appointments.financing }).from(appointments);
    expect(row.f).toMatchObject({ downPaymentCents: 200_000, termMonths: 36, installmentCents: 25_836, taeBps: 611 });
  });

  it("rechaza hoy, domingos y fechas fuera de la ventana", async () => {
    for (const date of [TODAY, "2026-11-01", "2026-12-31"]) {
      const r = await book(1, { date });
      expect(r.ok ? "ok" : r.code).toBe("VALIDATION");
    }
  });

  it("una franja ocupada devuelve SLOT_TAKEN con alternativas", async () => {
    await book(1);
    const r = await book(2);
    expect(r.ok ? "ok" : r.code).toBe("SLOT_TAKEN");
    if (r.ok) return;
    expect((r.details as { alternatives: unknown[] }).alternatives[0]).toEqual({ date: DAY, hour: 11 });
  });

  it("la misma persona con cita vigente recibe ALREADY_BOOKED, nunca SLOT_TAKEN (C1)", async () => {
    await book(1);
    const byEmail = await book(1, { hour: 12, phone: "699999999" });
    expect(byEmail.ok ? "ok" : byEmail.code).toBe("ALREADY_BOOKED");
    // No se revela cuándo va esa persona al concesionario (SEC-03).
    if (!byEmail.ok) expect(byEmail.details).toBeUndefined();
    const byPhone = await book(2, { hour: 13, phone: "612000001" });
    expect(byPhone.ok ? "ok" : byPhone.code).toBe("ALREADY_BOOKED");
  });

  it("una cita pendiente ya vencida no bloquea a la persona y pasa a VENCIDA", async () => {
    await book(1);
    const later = await createAppointment(input(1, { date: "2026-10-28" }), { today: "2026-10-28", ipHmac: null });
    expect(later.ok ? "ok" : later.code).toBe("VALIDATION"); // hoy no es agendable
    const next = await createAppointment(input(1, { date: "2026-10-29" }), { today: "2026-10-28", ipHmac: null });
    expect(next.ok).toBe(true);
    const statuses = await getDb().select({ s: appointments.status }).from(appointments).orderBy(appointments.slotDate);
    expect(statuses.map((r) => r.s)).toEqual(["VENCIDA", "PENDIENTE"]);
  });

  it("sin stock devuelve OUT_OF_STOCK", async () => {
    await setStock("yz450f", 1);
    expect((await book(1)).ok).toBe(true);
    const r = await book(2, { hour: 11 });
    expect(r.ok ? "ok" : r.code).toBe("OUT_OF_STOCK");
  });

  it("un mismo origen no puede tener más de 2 citas pendientes a la vez (SEC-01)", async () => {
    await setStock("yz450f", 10);
    expect((await book(1, { hour: 10 }, "ip-bot")).ok).toBe(true);
    expect((await book(2, { hour: 11 }, "ip-bot")).ok).toBe(true);
    const third = await book(3, { hour: 12 }, "ip-bot");
    expect(third.ok ? "ok" : third.code).toBe("RATE_LIMITED");
    expect((await book(4, { hour: 12 }, "ip-otro")).ok).toBe(true); // otro origen sí puede
  });

  it("una moto inexistente devuelve NOT_FOUND", async () => {
    const r = await book(1, { moto: "yz999" });
    expect(r.ok ? "ok" : r.code).toBe("NOT_FOUND");
  });
});

describe("concurrencia (ADR 0006)", () => {
  it("10 peticiones simultáneas por la misma franja → exactamente 1 cita y 9 SLOT_TAKEN", async () => {
    await setStock("yz450f", 20);
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => book(100 + i)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "SLOT_TAKEN")).toHaveLength(9);
    const [{ n }] = await getDb().select({ n: sql<number>`count(*)::int` }).from(appointments);
    expect(n).toBe(1);
  });

  it("5 peticiones simultáneas por la última unidad → exactamente 1 cita y 4 OUT_OF_STOCK", async () => {
    await setStock("yz450f", 1);
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => book(200 + i, { hour: 10 + i })));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "OUT_OF_STOCK")).toHaveLength(4);
    const [m] = await getDb().select().from(motorcycles).where(eq(motorcycles.slug, "yz450f"));
    expect(m.stockTotal).toBe(1);
  });
});
