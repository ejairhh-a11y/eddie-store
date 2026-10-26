import { describe, expect, it } from "vitest";
import { addDays, isLocalDate, localDateOf, madridToUtc } from "@/lib/clock";
import { bookableDates, formatSlot, isBookableDate, isSlotHour, slotsFor } from "@/lib/slots";

// TECH-DESIGN F3 [U] y Reglas de dominio (franjas, reloj, zona Europe/Madrid).

describe("reloj y zona horaria", () => {
  it("'hoy' es la fecha de Madrid, no la de UTC", () => {
    // 23:30 UTC del 31/10 ya es 1/11 en Madrid (UTC+1).
    expect(localDateOf(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
  });

  it("convierte la hora local a UTC respetando el cambio de hora", () => {
    expect(madridToUtc("2026-03-28", 10).toISOString()).toBe("2026-03-28T09:00:00.000Z"); // CET
    expect(madridToUtc("2026-03-30", 10).toISOString()).toBe("2026-03-30T08:00:00.000Z"); // CEST
    expect(madridToUtc("2026-10-24", 18).toISOString()).toBe("2026-10-24T16:00:00.000Z"); // CEST
    expect(madridToUtc("2026-10-26", 18).toISOString()).toBe("2026-10-26T17:00:00.000Z"); // CET
  });

  it("valida fechas ISO", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("28/02/2026")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("franjas", () => {
  const today = "2026-10-26"; // lunes

  it("ofrece desde mañana hasta dentro de 30 días, sin domingos", () => {
    const dates = bookableDates(today);
    expect(dates[0]).toBe("2026-10-27");
    expect(dates.at(-1)).toBe("2026-11-25");
    expect(dates).not.toContain("2026-11-01"); // domingo
    expect(dates).toHaveLength(26);
  });

  it("rechaza hoy, domingos y fechas fuera de la ventana", () => {
    expect(isBookableDate(today, today)).toBe(false);
    expect(isBookableDate("2026-11-01", today)).toBe(false);
    expect(isBookableDate("2026-11-26", today)).toBe(false);
    expect(isBookableDate("2026-11-25", today)).toBe(true);
  });

  it("cada día tiene 9 franjas de 10:00 a 18:00", () => {
    const slots = slotsFor("2026-10-27");
    expect(slots.map((s) => s.hour)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(slots[0].start.toISOString()).toBe("2026-10-27T09:00:00.000Z");
    expect(isSlotHour(19)).toBe(false);
    expect(isSlotHour(9)).toBe(false);
  });

  it("formatea la franja como en Design.md", () => {
    expect(formatSlot("2026-11-07", 11)).toBe("sáb 7 nov · 11:00");
  });
});
