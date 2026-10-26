import { addDays, dayOfWeek, madridToUtc, type LocalDate } from "./clock";

// Franjas de cita (PRD › Casos borde; TECH-DESIGN › Reglas de dominio):
// lunes a sábado, inicios de 10:00 a 18:00 (1 h), desde mañana hasta dentro de 30 días.

export const SLOT_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
export const BOOKING_WINDOW_DAYS = 30;

export function isOpenDay(date: LocalDate): boolean {
  return dayOfWeek(date) !== 0;
}

export function firstBookableDate(today: LocalDate): LocalDate {
  return addDays(today, 1);
}

export function lastBookableDate(today: LocalDate): LocalDate {
  return addDays(today, BOOKING_WINDOW_DAYS);
}

/** Días que se pueden agendar a partir de `today` (mañana … +30, sin domingos). */
export function bookableDates(today: LocalDate): LocalDate[] {
  const dates: LocalDate[] = [];
  for (let i = 1; i <= BOOKING_WINDOW_DAYS; i++) {
    const d = addDays(today, i);
    if (isOpenDay(d)) dates.push(d);
  }
  return dates;
}

export function isBookableDate(date: LocalDate, today: LocalDate): boolean {
  return date >= firstBookableDate(today) && date <= lastBookableDate(today) && isOpenDay(date);
}

export function isSlotHour(hour: number): boolean {
  return (SLOT_HOURS as readonly number[]).includes(hour);
}

export type Slot = { date: LocalDate; hour: number; start: Date };

export function slotsFor(date: LocalDate): Slot[] {
  return SLOT_HOURS.map((hour) => ({ date, hour, start: madridToUtc(date, hour) }));
}

const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

/** `sáb 8 nov · 11:00` (Design.md §10). */
export function formatSlot(date: LocalDate, hour: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = weekday.format(dt).replace(".", "");
  const dm = dayMonth.format(dt).replace(".", "");
  return `${wd} ${dm} · ${String(hour).padStart(2, "0")}:00`;
}
