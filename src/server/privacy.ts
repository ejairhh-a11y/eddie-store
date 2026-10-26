import { and, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { addDays, type LocalDate } from "@/lib/clock";
import type { Db } from "./db";
import { appointments, motorcycles } from "./schema";

// Retención (ADR 0015): las citas cerradas se anonimizan 90 días después de su fecha. Las
// pendientes que nunca se cerraron pasan a VENCIDA y también se anonimizan.
export const RETENTION_DAYS = 90;

export async function anonymizeExpired(db: Db, today: LocalDate, now: Date): Promise<number> {
  const cutoff = addDays(today, -RETENTION_DAYS);
  await db
    .update(appointments)
    .set({ status: "VENCIDA", updatedAt: now })
    .where(and(eq(appointments.status, "PENDIENTE"), lt(appointments.slotDate, cutoff)));
  const rows = await db
    .update(appointments)
    .set({ fullName: null, email: null, phoneNormalized: null, ipHmac: null, anonymizedAt: now, updatedAt: now })
    .where(
      and(
        isNull(appointments.anonymizedAt),
        inArray(appointments.status, ["VENDIDA", "CANCELADA", "VENCIDA"]),
        lt(appointments.slotDate, cutoff),
      ),
    )
    .returning({ id: appointments.id });
  return rows.length;
}

/** Citas para el panel: desde hace 14 días en adelante, más las pendientes atrasadas. */
export async function listForAdmin(db: Db, today: LocalDate) {
  const from = addDays(today, -14);
  return db
    .select({
      id: appointments.id,
      code: appointments.code,
      slotDate: appointments.slotDate,
      slotStart: appointments.slotStart,
      status: appointments.status,
      fullName: appointments.fullName,
      phone: appointments.phoneNormalized,
      email: appointments.email,
      anonymizedAt: appointments.anonymizedAt,
      hasOrigin: appointments.ipHmac,
      motoName: motorcycles.name,
    })
    .from(appointments)
    .innerJoin(motorcycles, eq(appointments.motorcycleId, motorcycles.id))
    .where(or(gte(appointments.slotDate, from), eq(appointments.status, "PENDIENTE")))
    .orderBy(desc(appointments.slotDate), appointments.slotStart);
}
