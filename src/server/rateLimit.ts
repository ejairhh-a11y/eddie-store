import { and, eq, lt, sql } from "drizzle-orm";
import type { LocalDate } from "@/lib/clock";
import { getDb } from "./db";
import { rateLimits } from "./schema";

// Límites contra abuso en la base de datos (ADR 0010). Cada operación es una sentencia atómica
// propia, fuera de la transacción de la cita: un SLOT_TAKEN no revierte el contador.

function intFromEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback; // un valor vacío o inválido no bloquea todo (SEC-12)
}

export const LIMITS = {
  bookingAttemptsPerHour: 5,
  bookingsPerDayPerIp: 3,
  /** Citas PENDIENTE simultáneas por origen (IP en HMAC). Frena el acaparamiento de stock (SEC-01). */
  pendingPerOrigin: 2,
  bookingsPerDayGlobal: intFromEnv("MAX_DAILY_BOOKINGS", 10),
  loginAttemptsPer15Min: 5,
} as const;

function hourWindow(now: Date): Date {
  return new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
}

function quarterWindow(now: Date): Date {
  return new Date(Math.floor(now.getTime() / 900_000) * 900_000);
}

function dayWindow(today: LocalDate): Date {
  return new Date(`${today}T00:00:00Z`);
}

async function increment(key: string, windowStart: Date): Promise<number> {
  const [row] = await getDb()
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  return row.count;
}

async function current(key: string, windowStart: Date): Promise<number> {
  const [row] = await getDb()
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), eq(rateLimits.windowStart, windowStart)));
  return row?.count ?? 0;
}

/** Limpieza oportunista de ventanas de más de 2 días. */
async function prune(now: Date) {
  await getDb()
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(now.getTime() - 2 * 86_400_000)));
}

/** Cuenta un intento de agendar y dice si se puede seguir. */
export async function allowBookingAttempt(ip: string, now: Date, today: LocalDate): Promise<boolean> {
  if (Math.random() < 0.05) await prune(now);
  const attempts = await increment(`booking-hour:${ip}`, hourWindow(now));
  if (attempts > LIMITS.bookingAttemptsPerHour) return false;
  if ((await current(`booking-day:${ip}`, dayWindow(today))) >= LIMITS.bookingsPerDayPerIp) return false;
  if ((await current("booking-global", dayWindow(today))) >= LIMITS.bookingsPerDayGlobal) return false;
  return true;
}

/** Registra una cita creada con éxito (límite diario por IP y tope global). */
export async function recordBooking(ip: string, today: LocalDate): Promise<void> {
  await increment(`booking-day:${ip}`, dayWindow(today));
  await increment("booking-global", dayWindow(today));
}

/**
 * Cuenta un intento de login ANTES de verificar la contraseña y dice si se permite (SEC-02).
 * El incremento y la comprobación son una sola operación atómica: las peticiones simultáneas no
 * pueden saltarse el límite leyendo un contador viejo.
 */
export async function allowLoginAttempt(ip: string, now: Date): Promise<boolean> {
  return (await increment(`login:${ip}`, quarterWindow(now))) <= LIMITS.loginAttemptsPer15Min;
}
