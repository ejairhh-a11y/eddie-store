import { describe, expect, it } from "vitest";
import {
  formatEuros,
  formatPercentBps,
  fromInstallmentCents,
  isValidDownPayment,
  normalizeTerm,
  simulate,
  taeBps,
} from "@/lib/finance";

// TECH-DESIGN F2 [U]. Referencias calculadas aparte con la fórmula francesa:
// YZ450F 10.499 €, entrada 2.000 € → capital 8.499 €, TIN 5,95 %.
const YZ450F = 1_049_900;

describe("simulate (sistema francés, TIN 5,95 %)", () => {
  it.each([
    [24, 37_649],
    [36, 25_836],
    [48, 19_940],
    [60, 16_411],
  ] as const)("plazo %i meses → cuota %i céntimos (±1)", (termMonths, expected) => {
    const r = simulate({ priceCents: YZ450F, downPaymentCents: 200_000, termMonths });
    expect(r.financedCents).toBe(849_900);
    expect(Math.abs(r.installmentCents - expected)).toBeLessThanOrEqual(1);
    expect(r.totalCents).toBe(r.installmentCents * termMonths);
  });

  it("la TAE sin comisiones es 6,11 %", () => {
    expect(taeBps()).toBe(611);
    expect(formatPercentBps(taeBps())).toBe("6,11 %");
  });

  it("la cuota 'desde' usa entrada 0 € y 60 meses", () => {
    expect(fromInstallmentCents(YZ450F)).toBe(20_273);
  });

  it("rechaza una entrada fuera de rango", () => {
    expect(() => simulate({ priceCents: YZ450F, downPaymentCents: -1, termMonths: 36 })).toThrow(RangeError);
    expect(() => simulate({ priceCents: YZ450F, downPaymentCents: YZ450F, termMonths: 36 })).toThrow(RangeError);
  });
});

describe("validaciones", () => {
  it("la entrada va de 0 € a precio − 1 € (criterio J1)", () => {
    expect(isValidDownPayment(YZ450F, 0)).toBe(true);
    expect(isValidDownPayment(YZ450F, YZ450F - 100)).toBe(true);
    expect(isValidDownPayment(YZ450F, YZ450F - 99)).toBe(false);
    expect(isValidDownPayment(YZ450F, -100)).toBe(false);
    expect(isValidDownPayment(YZ450F, 10.5)).toBe(false);
  });

  it("un plazo fuera de {24, 36, 48, 60} vuelve a 36", () => {
    expect(normalizeTerm(48)).toBe(48);
    expect(normalizeTerm("60")).toBe(60);
    expect(normalizeTerm(12)).toBe(36);
    expect(normalizeTerm("abc")).toBe(36);
    expect(normalizeTerm(undefined)).toBe(36);
  });
});

describe("formato es-ES", () => {
  it("formatea euros", () => {
    expect(formatEuros(YZ450F).replace(/\s/g, " ")).toBe("10.499 €");
    expect(formatEuros(15_427).replace(/\s/g, " ")).toBe("154,27 €");
  });
});
