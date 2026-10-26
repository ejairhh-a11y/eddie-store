import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONSTRAINTS } from "@/server/constraints";
import { closeDb, getDb } from "@/server/db";
import { appointments, motorcycles } from "@/server/schema";
import { pgError, resetData } from "./helpers";

// BACKLOG #2: esquema, restricciones con nombre fijo y catálogo de la migración de datos.

beforeEach(resetData);
afterAll(closeDb);

async function yz450fId() {
  const [m] = await getDb().select({ id: motorcycles.id }).from(motorcycles).where(sql`slug = 'yz450f'`);
  return m.id;
}

function appointment(motorcycleId: string, n: number, slotStart = new Date("2026-11-07T10:00:00Z")) {
  return {
    code: `YZ-T${n}`,
    accessTokenHash: `hash-${n}`,
    motorcycleId,
    slotStart,
    slotDate: "2026-11-07",
    fullName: `Piloto ${n}`,
    email: `piloto${n}@example.com`,
    phoneNormalized: `+3460000000${n}`,
  };
}

describe("catálogo inicial (migración 0001)", () => {
  it("carga los 6 modelos del PRD en orden", async () => {
    const rows = await getDb().select({ slug: motorcycles.slug }).from(motorcycles).orderBy(motorcycles.sortOrder);
    expect(rows.map((r) => r.slug)).toEqual(["yz450f", "yz250f", "yz250", "yz125", "yz85", "yz65"]);
  });

  it("guarda el precio en céntimos (YZ450F = 10.499 €)", async () => {
    const [m] = await getDb().select().from(motorcycles).where(sql`slug = 'yz450f'`);
    expect(m.priceCents).toBe(1_049_900);
    expect(m.cardSpecs).toHaveLength(3);
    expect(m.specGroups).toHaveLength(3);
  });

  it("no permite stock negativo", async () => {
    await expect(getDb().execute(sql`UPDATE motorcycles SET stock_total = -1 WHERE slug = 'yz450f'`)).rejects.toThrow();
  });
});

describe("restricciones de citas con nombre fijo (ADR 0006 §2)", () => {
  it("una franja solo admite una cita PENDIENTE", async () => {
    const id = await yz450fId();
    await getDb().insert(appointments).values(appointment(id, 1));
    const error = await getDb()
      .insert(appointments)
      .values({ ...appointment(id, 2) })
      .catch((e: unknown) => e);
    expect(pgError(error)).toEqual({ code: "23505", constraint: CONSTRAINTS.slotPending });
  });

  it("una franja cancelada vuelve a quedar libre", async () => {
    const id = await yz450fId();
    await getDb().insert(appointments).values({ ...appointment(id, 1), status: "CANCELADA" });
    await expect(getDb().insert(appointments).values(appointment(id, 2))).resolves.toBeDefined();
  });

  it("un email solo puede tener una cita PENDIENTE", async () => {
    const id = await yz450fId();
    await getDb().insert(appointments).values(appointment(id, 1));
    const error = await getDb()
      .insert(appointments)
      .values({ ...appointment(id, 2, new Date("2026-11-07T11:00:00Z")), email: "piloto1@example.com" })
      .catch((e: unknown) => e);
    expect(pgError(error)).toEqual({ code: "23505", constraint: CONSTRAINTS.emailPending });
  });

  it("exige anonimizar nombre, email y teléfono a la vez", async () => {
    const id = await yz450fId();
    await expect(
      getDb().insert(appointments).values({ ...appointment(id, 1), fullName: null }),
    ).rejects.toThrow();
  });
});
