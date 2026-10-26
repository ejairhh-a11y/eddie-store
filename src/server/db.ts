import { neon, Pool as NeonPool } from "@neondatabase/serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeonPool } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import * as schema from "./schema";

/**
 * Acceso a la base de datos (ADR 0002, ADR 0013 §cambio 2026-10-26).
 * - Vercel: lecturas con `neon-http` y transacciones con `neon-serverless` (Pool por transacción).
 * - CI y local (`DB_DRIVER=pg`): `node-postgres` contra un Postgres normal.
 * Se crean de forma perezosa para que `next build` no necesite DATABASE_URL.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let readDb: Db | undefined;
let pgPool: PgPool | undefined;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  return url;
}

function usesNodePg(): boolean {
  return process.env.DB_DRIVER === "pg";
}

function nodePgDb(): Db {
  pgPool ??= new PgPool({ connectionString: databaseUrl(), max: 10 });
  return drizzleNodePg(pgPool, { schema }) as unknown as Db;
}

export function getDb(): Db {
  if (!readDb) {
    readDb = usesNodePg()
      ? nodePgDb()
      : (drizzleNeonHttp(neon(databaseUrl()), { schema }) as unknown as Db);
  }
  return readDb;
}

/** Ejecuta `fn` en una transacción interactiva (necesaria para `FOR UPDATE`, ADR 0006). */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (usesNodePg()) return nodePgDb().transaction(fn);
  const pool = new NeonPool({ connectionString: databaseUrl() });
  try {
    const db = drizzleNeonPool(pool, { schema }) as unknown as Db;
    return await db.transaction(fn);
  } finally {
    await pool.end();
  }
}

/** Cierra el pool de node-postgres (pruebas y scripts). */
export async function closeDb(): Promise<void> {
  await pgPool?.end();
  pgPool = undefined;
  readDb = undefined;
}
