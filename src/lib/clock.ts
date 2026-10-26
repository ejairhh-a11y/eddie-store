// Reloj inyectable (ADR 0004, ADR 0013). El dominio recibe `now`/`today`, nunca llama a `new Date()`.

export const TIME_ZONE = "Europe/Madrid";

/** Fecha local en formato ISO `YYYY-MM-DD`. */
export type LocalDate = string;

export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** La fecha de hoy en Madrid para un instante dado. */
export function localDateOf(instant: Date): LocalDate {
  return dateFmt.format(instant);
}

export function today(clock: Clock = systemClock): LocalDate {
  return localDateOf(clock.now());
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado. */
export function dayOfWeek(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function offsetMinutes(instant: Date): number {
  const p = Object.fromEntries(partsFmt.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return (asUtc - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000;
}

/** Instante UTC de una hora local de Madrid (tiene en cuenta el cambio de hora). */
export function madridToUtc(date: LocalDate, hour: number, minute = 0): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const first = guess - offsetMinutes(new Date(guess)) * 60_000;
  return new Date(guess - offsetMinutes(new Date(first)) * 60_000);
}
