// Genera el SQL de la migración de datos del catálogo a partir de src/server/catalogData.ts.
// Uso: npx tsx scripts/catalog-sql.ts > drizzle/<n>_catalogo_inicial.sql (una sola vez).
import { CATALOG } from "../src/server/catalogData";

const lit = (v: string | null) => (v === null ? "NULL" : `'${v.replaceAll("'", "''")}'`);
const json = (v: unknown) => `${lit(JSON.stringify(v))}::jsonb`;

const rows = CATALOG.map(
  (m) =>
    `(${[
      lit(m.slug),
      lit(m.name),
      m.modelYear,
      `${lit(m.engineType)}::engine_type`,
      `${lit(m.category)}::category`,
      m.displacementCc,
      m.priceCents,
      m.stockTotal,
      lit(m.tagline),
      lit(m.badge),
      json(m.cardSpecs),
      json(m.specGroups),
      json(m.images),
      m.isFeatured,
      m.sortOrder,
    ].join(", ")})`,
);

console.log(`-- Catálogo inicial (ADR 0016 §cambio 2026-10-26). Corre una sola vez y no pisa el stock real.
INSERT INTO "motorcycles" ("slug", "name", "model_year", "engine_type", "category", "displacement_cc", "price_cents", "stock_total", "tagline", "badge", "card_specs", "spec_groups", "images", "is_featured", "sort_order") VALUES
${rows.join(",\n")}
ON CONFLICT ("slug") DO NOTHING;`);
