import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { log } from "@/server/log";

const DB_TIMEOUT_MS = 3000;

/**
 * Chequeo de salud para el protocolo de despliegue (ADR 0014, SPRINT0 DoD 3 y 4).
 * Nunca devuelve detalles del error ni la cadena de conexión.
 */
export async function GET(request: Request): Promise<Response> {
  // Leer la petición hace que la ruta sea dinámica: el chequeo se ejecuta en cada llamada.
  const requestId = request.headers.get("x-vercel-id") ?? "local";
  const startedAt = Date.now();

  try {
    await withTimeout(getDb().execute(sql`select 1`), DB_TIMEOUT_MS);
    log("info", "health.ok", { requestId, durationMs: Date.now() - startedAt });
    return Response.json({ status: "ok", db: "ok" }, { headers: noStore });
  } catch (error) {
    log("error", "health.db_down", {
      requestId,
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return Response.json({ status: "error", db: "down" }, { status: 503, headers: noStore });
  }
}

const noStore = { "Cache-Control": "no-store" };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
