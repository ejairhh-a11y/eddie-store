import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

/**
 * Cliente Drizzle sobre el driver HTTP de Neon, para lecturas (ADR 0002).
 * El cliente transaccional (neon-serverless con Pool) se agrega con el dominio de reserva
 * (BACKLOG #9). Se crea de forma perezosa para que `next build` no necesite DATABASE_URL.
 */
let readDb: NeonHttpDatabase | undefined;

export function getDb(): NeonHttpDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  readDb ??= drizzle(neon(url));
  return readDb;
}
