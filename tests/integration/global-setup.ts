import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Aplica las migraciones reales sobre una base vacía antes de las pruebas de integración.
export default async function setup() {
  if (process.env.DB_DRIVER !== "pg" || !process.env.DATABASE_URL) {
    throw new Error("Las pruebas de integración necesitan DB_DRIVER=pg y DATABASE_URL de un Postgres de prueba");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } finally {
    await pool.end();
  }
}
