import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { bookingSchema } from "@/lib/schemas";
import { adjustStock, cancelSameOrigin, transition } from "@/server/appointmentState";
import { findWithStock } from "@/server/availability";
import { createAppointment } from "@/server/booking";
import { closeDb, getDb } from "@/server/db";
import { anonymizeExpired } from "@/server/privacy";
import { allowBookingAttempt, allowLoginAttempt, LIMITS, recordBooking } from "@/server/rateLimit";
import { adminUsers, appointments, motorcycles } from "@/server/schema";
import { resetData, setStock } from "./helpers";

// TECH-DESIGN F4 [I], ADR 0006 §3, 0010 y 0015.
const TODAY = "2026-10-26";
const NOW = new Date("2026-10-26T12:00:00Z");
let adminId: string;

beforeEach(async () => {
  await resetData();
  await setStock("yz450f", 2);
  const [a] = await getDb()
    .insert(adminUsers)
    .values({ email: "admin@example.com", name: "Admin", passwordHash: "x" })
    .returning({ id: adminUsers.id });
  adminId = a.id;
});
afterAll(closeDb);

async function bookOne(n: number, date = "2026-10-27", hour = 10, ip: string | null = null, today = TODAY) {
  const r = await createAppointment(
    bookingSchema.parse({ moto: "yz450f", date, hour, fullName: `P ${n}`, email: `p${n}@example.com`, phone: `61300${String(n).padStart(4, "0")}` }),
    { today, ipHmac: ip },
  );
  if (!r.ok) throw new Error(`no se pudo agendar: ${r.code}`);
  const [row] = await getDb().select({ id: appointments.id }).from(appointments).where(eq(appointments.code, r.data.code));
  return row.id;
}

const stockTotal = async () =>
  (await getDb().select().from(motorcycles).where(eq(motorcycles.slug, "yz450f")))[0].stockTotal;
const ctx = { get adminId() { return adminId; }, today: TODAY, now: NOW };

describe("transiciones (ADR 0006 §3)", () => {
  it("vendida resta 1 al stock una sola vez aunque haya doble envío (C3)", async () => {
    const id = await bookOne(1);
    const [a, b] = await Promise.all([transition("sell", id, ctx), transition("sell", id, ctx)]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect([a, b].find((r) => !r.ok)).toMatchObject({ code: "INVALID_STATE" });
    expect(await stockTotal()).toBe(1);
  });

  it("vendida y cancelar a la vez: solo una gana y el stock queda coherente", async () => {
    const id = await bookOne(1);
    const [s, c] = await Promise.all([transition("sell", id, ctx), transition("cancel", id, ctx)]);
    expect([s.ok, c.ok].filter(Boolean)).toHaveLength(1);
    const [row] = await getDb().select({ status: appointments.status }).from(appointments).where(eq(appointments.id, id));
    expect(await stockTotal()).toBe(row.status === "VENDIDA" ? 1 : 2);
  });

  it("venta tardía sin unidad disponible devuelve OUT_OF_STOCK y el disponible no baja de 0", async () => {
    await setStock("yz450f", 1);
    const late = await bookOne(1, "2026-10-27", 10, null, TODAY); // cita de B
    const later = { ...ctx, today: "2026-10-28" }; // B no se presentó: su unidad volvió al stock
    const other = await createAppointment(
      bookingSchema.parse({ moto: "yz450f", date: "2026-10-29", hour: 10, fullName: "P 2", email: "p2@example.com", phone: "613000002" }),
      { today: "2026-10-28", ipHmac: null },
    );
    expect(other.ok).toBe(true); // A aparta la unidad liberada
    const r = await transition("sell", late, later);
    expect(r.ok ? "ok" : r.code).toBe("OUT_OF_STOCK");
    expect((await findWithStock(getDb(), "yz450f", "2026-10-28"))?.available).toBe(0);
    expect(await stockTotal()).toBe(1);
  });

  it("no-show solo desde PENDIENTE y cancelar libera la franja", async () => {
    const id = await bookOne(1);
    expect((await transition("noShow", id, ctx)).ok).toBe(true);
    expect((await transition("noShow", id, ctx)).ok).toBe(false);
    expect((await transition("cancel", id, ctx)).ok).toBe(true);
    expect((await transition("sell", id, ctx)).ok).toBe(false); // CANCELADA es final
    expect(await bookOne(2)).toBeTruthy(); // la franja de las 10:00 vuelve a estar libre
  });

  it("cancelar en bloque por origen solo afecta a las pendientes de ese origen", async () => {
    await setStock("yz450f", 5);
    const a = await bookOne(1, "2026-10-27", 10, "ip-bot");
    await bookOne(2, "2026-10-27", 11, "ip-bot");
    await bookOne(3, "2026-10-27", 12, "ip-legit");
    const r = await cancelSameOrigin(a, ctx);
    expect(r).toMatchObject({ ok: true, data: { cancelled: 2 } });
    const pending = await getDb().select({ n: sql<number>`count(*)::int` }).from(appointments).where(eq(appointments.status, "PENDIENTE"));
    expect(pending[0].n).toBe(1);
  });
});

describe("ajuste de stock (F4)", () => {
  it("no permite un total menor que las citas pendientes vigentes", async () => {
    await bookOne(1);
    await bookOne(2, "2026-10-27", 11);
    expect((await adjustStock("yz450f", 1, ctx)).ok).toBe(false);
    expect((await adjustStock("yz450f", 2, ctx)).ok).toBe(true);
    expect((await adjustStock("yz450f", -1, ctx)).ok).toBe(false);
  });
});

describe("retención (ADR 0015)", () => {
  it("anonimiza las citas cerradas de hace más de 90 días", async () => {
    const id = await bookOne(1);
    await transition("cancel", id, ctx);
    expect(await anonymizeExpired(getDb(), "2027-01-20", NOW)).toBe(0); // 85 días
    expect(await anonymizeExpired(getDb(), "2027-01-27", NOW)).toBe(1); // 92 días
    const [row] = await getDb().select().from(appointments).where(eq(appointments.id, id));
    expect(row).toMatchObject({ fullName: null, email: null, phoneNormalized: null, ipHmac: null });
    expect(row.anonymizedAt).not.toBeNull();
  });
});

describe("límites contra abuso (ADR 0010)", () => {
  it("bloquea el 6.º intento de agendar en una hora desde la misma IP", async () => {
    for (let i = 0; i < LIMITS.bookingAttemptsPerHour; i++) expect(await allowBookingAttempt("ip-a", NOW, TODAY)).toBe(true);
    expect(await allowBookingAttempt("ip-a", NOW, TODAY)).toBe(false);
    expect(await allowBookingAttempt("ip-b", NOW, TODAY)).toBe(true);
  });

  it("bloquea la 4.ª cita del día desde la misma IP", async () => {
    for (let i = 0; i < LIMITS.bookingsPerDayPerIp; i++) await recordBooking("ip-c", TODAY);
    expect(await allowBookingAttempt("ip-c", NOW, TODAY)).toBe(false);
  });

  it("bloquea el 6.º intento de login en 15 minutos, también con peticiones simultáneas (SEC-02)", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => allowLoginAttempt("ip-d", NOW)));
    expect(results.filter(Boolean)).toHaveLength(LIMITS.loginAttemptsPer15Min);
    expect(await allowLoginAttempt("ip-d", new Date(NOW.getTime() + 16 * 60_000))).toBe(true);
  });
});
