import { cacheLife, cacheTag } from "next/cache";
import { systemClock, today } from "@/lib/clock";
import { findWithStock, listWithStock, type MotorcycleWithStock } from "./availability";
import { getDb } from "./db";

// Lecturas cacheadas del catálogo (ADR 0005). Las mutaciones que cambian el stock llaman a
// updateTag(STOCK_TAG); la red de seguridad de 1 h recoge las citas que vencen con el tiempo.
export const STOCK_TAG = "stock";

export async function getCatalog(): Promise<MotorcycleWithStock[]> {
  "use cache";
  cacheTag(STOCK_TAG);
  cacheLife({ stale: 60, revalidate: 3600, expire: 86_400 });
  return listWithStock(getDb(), today(systemClock));
}

export async function getMotorcycle(slug: string): Promise<MotorcycleWithStock | null> {
  "use cache";
  cacheTag(STOCK_TAG, `moto:${slug}`);
  cacheLife({ stale: 60, revalidate: 3600, expire: 86_400 });
  return findWithStock(getDb(), slug, today(systemClock));
}

export type CatalogFilters = { tipo?: "4t" | "2t"; categoria?: "youth"; cc?: number; q?: string };

/** Normaliza los filtros de la URL: un valor inválido se ignora (TECH-DESIGN F1). */
export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const f: CatalogFilters = {};
  const tipo = one("tipo");
  if (tipo === "4t" || tipo === "2t") f.tipo = tipo;
  if (one("categoria") === "youth") f.categoria = "youth";
  const cc = Number(one("cc"));
  if ([450, 250, 125, 85, 65].includes(cc)) f.cc = cc;
  const q = one("q")?.trim();
  if (q) f.q = q.slice(0, 40);
  return f;
}

export function applyFilters(list: MotorcycleWithStock[], f: CatalogFilters): MotorcycleWithStock[] {
  const q = f.q?.toLowerCase().replace(/\s+/g, "");
  return list.filter(
    (m) =>
      (!f.tipo || m.engineType.toLowerCase() === f.tipo) &&
      (!f.categoria || m.category === "YOUTH") &&
      (!f.cc || (f.cc === 250 ? [249, 250].includes(m.displacementCc) : m.displacementCc === f.cc)) &&
      (!q || m.name.toLowerCase().replace(/\s+/g, "").includes(q) || m.slug.includes(q)),
  );
}
