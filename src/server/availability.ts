import { and, asc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import type { LocalDate } from "@/lib/clock";
import type { Db, Tx } from "./db";
import { appointments, motorcycles, type Motorcycle } from "./schema";

// Stock disponible derivado (ADR 0004): stock_total − citas PENDIENTE con slot_date >= hoy.
// `today` siempre llega desde fuera (reloj inyectable); nunca se usa now() de SQL.

export type MotorcycleWithStock = Motorcycle & { available: number };

function selectWithReserved(db: Db, today: LocalDate) {
  const pending = db
    .select({ motorcycleId: appointments.motorcycleId, n: sql<number>`count(*)::int`.as("n") })
    .from(appointments)
    .where(and(eq(appointments.status, "PENDIENTE"), gte(appointments.slotDate, today)))
    .groupBy(appointments.motorcycleId)
    .as("pending");
  return db
    .select({ ...getTableColumns(motorcycles), reserved: sql<number>`coalesce(${pending.n}, 0)`.mapWith(Number) })
    .from(motorcycles)
    .leftJoin(pending, eq(pending.motorcycleId, motorcycles.id));
}

function withAvailable({ reserved, ...m }: Motorcycle & { reserved: number }): MotorcycleWithStock {
  return { ...m, available: Math.max(0, m.stockTotal - reserved) };
}

export async function listWithStock(db: Db, today: LocalDate): Promise<MotorcycleWithStock[]> {
  const rows = await selectWithReserved(db, today).orderBy(asc(motorcycles.sortOrder));
  return rows.map(withAvailable);
}

export async function findWithStock(db: Db, slug: string, today: LocalDate): Promise<MotorcycleWithStock | null> {
  const [row] = await selectWithReserved(db, today).where(eq(motorcycles.slug, slug));
  return row ? withAvailable(row) : null;
}

/** Citas pendientes vigentes de una moto (dentro de una transacción con la fila bloqueada). */
export async function reservedCount(tx: Tx, motorcycleId: string, today: LocalDate): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.motorcycleId, motorcycleId),
        eq(appointments.status, "PENDIENTE"),
        gte(appointments.slotDate, today),
      ),
    );
  return Number(row?.n ?? 0);
}

export type StockLevel = "available" | "low" | "out";

/** Disponible > 2 · "Últimas" 1–2 · Agotada 0 (Design.md §2.1, criterio J3). */
export function stockLevel(available: number): StockLevel {
  if (available <= 0) return "out";
  if (available <= 2) return "low";
  return "available";
}
