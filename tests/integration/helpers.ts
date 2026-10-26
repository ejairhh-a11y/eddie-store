import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

/** Deja la base con el catálogo de la migración y sin citas, admins ni contadores. */
export async function resetData() {
  const db = getDb();
  await db.execute(sql`TRUNCATE appointments, rate_limits, admin_users RESTART IDENTITY CASCADE`);
}

export async function setStock(slug: string, stockTotal: number) {
  await getDb().execute(sql`UPDATE motorcycles SET stock_total = ${stockTotal} WHERE slug = ${slug}`);
}

/** Código de error de Postgres y restricción violada, si los hay. */
export function pgError(error: unknown): { code?: string; constraint?: string } {
  const e = (error as { cause?: unknown })?.cause ?? error;
  const { code, constraint } = (e ?? {}) as { code?: string; constraint?: string };
  return { code, constraint };
}
