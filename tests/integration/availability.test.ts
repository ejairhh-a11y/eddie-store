import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { findWithStock, listWithStock } from "@/server/availability";
import { applyFilters, parseFilters } from "@/server/catalog";
import { closeDb, getDb } from "@/server/db";
import { appointments, motorcycles } from "@/server/schema";
import { resetData, setStock } from "./helpers";

// TECH-DESIGN F1 [I] y ADR 0004: stock derivado con `today` inyectado.

beforeEach(async () => {
  await resetData();
  await setStock("yz450f", 3);
});
afterAll(closeDb);

async function book(slug: string, slotDate: string, n: number, status: "PENDIENTE" | "CANCELADA" = "PENDIENTE") {
  const [m] = await getDb().select({ id: motorcycles.id }).from(motorcycles).where(sql`slug = ${slug}`);
  await getDb()
    .insert(appointments)
    .values({
      code: `YZ-A${n}`,
      accessTokenHash: `h-${n}`,
      motorcycleId: m.id,
      slotStart: new Date(`${slotDate}T0${n}:00:00Z`),
      slotDate,
      fullName: `P${n}`,
      email: `p${n}@example.com`,
      phoneNormalized: `+3461000000${n}`,
      status,
    });
}

describe("stock disponible derivado", () => {
  it("devuelve un número para cada modelo y la YZ65 sale agotada", async () => {
    const list = await listWithStock(getDb(), "2026-10-26");
    expect(list).toHaveLength(6);
    for (const m of list) expect(Number.isFinite(m.available)).toBe(true);
    expect(list.find((m) => m.slug === "yz65")?.available).toBe(0);
    expect(list.find((m) => m.slug === "yz450f")?.available).toBe(3);
  });

  it("una cita pendiente futura aparta una unidad; una cancelada no", async () => {
    await book("yz450f", "2026-11-07", 1);
    await book("yz450f", "2026-11-09", 2, "CANCELADA");
    expect((await findWithStock(getDb(), "yz450f", "2026-10-26"))?.available).toBe(2);
  });

  it("la cita vuelve a contar como disponible cuando pasa su día (reloj inyectado)", async () => {
    await book("yz450f", "2026-11-07", 1);
    expect((await findWithStock(getDb(), "yz450f", "2026-11-07"))?.available).toBe(2);
    expect((await findWithStock(getDb(), "yz450f", "2026-11-08"))?.available).toBe(3);
  });

  it("un slug inexistente devuelve null", async () => {
    expect(await findWithStock(getDb(), "no-existe", "2026-10-26")).toBeNull();
  });
});

describe("filtros del catálogo (F1)", () => {
  it("filtra por tipo, categoría, cilindrada y nombre; ignora valores inválidos", async () => {
    const list = await listWithStock(getDb(), "2026-10-26");
    const slugs = (sp: Record<string, string>) => applyFilters(list, parseFilters(sp)).map((m) => m.slug);
    expect(slugs({ tipo: "4t" })).toEqual(["yz450f", "yz250f"]);
    expect(slugs({ tipo: "2t" })).toEqual(["yz250", "yz125", "yz85", "yz65"]);
    expect(slugs({ categoria: "youth" })).toEqual(["yz85", "yz65"]);
    expect(slugs({ cc: "450" })).toEqual(["yz450f"]);
    expect(slugs({ cc: "250" })).toEqual(["yz250f", "yz250"]);
    expect(slugs({ q: "yz250" })).toEqual(["yz250f", "yz250"]);
    expect(slugs({ tipo: "x", cc: "999" })).toHaveLength(6);
  });
});
