// Simulador de financiación (PRD › Alcance; ADR 0009). Función pura: corre en cliente y servidor.
// Sistema francés, TIN fijo sin comisiones. Se calcula en `number` y se redondea al céntimo
// (half-up) solo al final; los importes de entrada y salida son céntimos enteros.

export const TIN_BPS = 595;
export const TERMS = [24, 36, 48, 60] as const;
export type Term = (typeof TERMS)[number];
export const DEFAULT_TERM: Term = 36;
/** Cuota "desde" de la tarjeta y la ficha: entrada 0 € y el plazo más largo (Design.md §3). */
export const FROM_TERM: Term = 60;

export type Simulation = {
  financedCents: number;
  installmentCents: number;
  totalCents: number;
  taeBps: number;
};

export function isTerm(value: number): value is Term {
  return (TERMS as readonly number[]).includes(value);
}

/** Un plazo fuera de {24, 36, 48, 60} vuelve a 36 (TECH-DESIGN F2). */
export function normalizeTerm(value: unknown): Term {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && isTerm(n) ? n : DEFAULT_TERM;
}

/** Entrada válida: de 0 € a precio − 1 € (criterio J1). */
export function maxDownPaymentCents(priceCents: number): number {
  return priceCents - 100;
}

export function isValidDownPayment(priceCents: number, downPaymentCents: number): boolean {
  return Number.isInteger(downPaymentCents) && downPaymentCents >= 0 && downPaymentCents <= maxDownPaymentCents(priceCents);
}

/** TAE sin comisiones: (1 + TIN/12)^12 − 1, en puntos básicos. */
export function taeBps(tinBps: number = TIN_BPS): number {
  const monthly = tinBps / 10_000 / 12;
  return Math.round(((1 + monthly) ** 12 - 1) * 10_000);
}

export function simulate(input: {
  priceCents: number;
  downPaymentCents: number;
  termMonths: Term;
  tinBps?: number;
}): Simulation {
  const tinBps = input.tinBps ?? TIN_BPS;
  if (!isValidDownPayment(input.priceCents, input.downPaymentCents)) {
    throw new RangeError("Entrada fuera de rango");
  }
  const financed = input.priceCents - input.downPaymentCents;
  const i = tinBps / 10_000 / 12;
  const n = input.termMonths;
  const raw = i === 0 ? financed / n : (financed * i) / (1 - (1 + i) ** -n);
  const installmentCents = Math.round(raw);
  return {
    financedCents: financed,
    installmentCents,
    totalCents: installmentCents * n,
    taeBps: taeBps(tinBps),
  };
}

export function fromInstallmentCents(priceCents: number): number {
  return simulate({ priceCents, downPaymentCents: 0, termMonths: FROM_TERM }).installmentCents;
}

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const euroInt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** `10.499 €` si no hay céntimos; `154,27 €` si los hay. */
export function formatEuros(cents: number): string {
  return cents % 100 === 0 ? euroInt.format(cents / 100) : euro.format(cents / 100);
}

export function formatPercentBps(bps: number): string {
  return `${(bps / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}
