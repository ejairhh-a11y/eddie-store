// Seed idempotente del catálogo para entornos locales y de CI (ADR 0016).
// En producción el catálogo entra con la migración 0001 y este script no se ejecuta.
import { sql } from "drizzle-orm";
import { CATALOG } from "../src/server/catalogData";
import { closeDb, getDb } from "../src/server/db";
import { motorcycles } from "../src/server/schema";

async function main() {
  const db = getDb();
  for (const m of CATALOG) {
    await db
      .insert(motorcycles)
      .values(m)
      .onConflictDoUpdate({
        target: motorcycles.slug,
        set: { ...m, updatedAt: sql`now()` },
      });
  }
  console.log(JSON.stringify({ level: "info", event: "seed.catalog", count: CATALOG.length }));
  await closeDb();
}

main().catch((error) => {
  console.error(JSON.stringify({ level: "error", event: "seed.catalog_failed", errorName: error?.name }));
  process.exit(1);
});
