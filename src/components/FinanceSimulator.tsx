"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatEuros,
  formatPercentBps,
  maxDownPaymentCents,
  simulate,
  TERMS,
  TIN_BPS,
  type Term,
} from "@/lib/finance";
import { Icon } from "./Icon";

export type SimulatorMoto = { slug: string; name: string; priceCents: number; available: number };

// Simulador de Stitch 03-pago convertido en informativo (Design.md §3, §5.2; ADR 0009).
// La entrada viaja en euros en la URL (?entrada=2000); el cálculo es la función pura de finance.ts.
export function FinanceSimulator({
  motos,
  initialSlug,
  initialDownPaymentEuros,
  initialTerm,
}: {
  motos: SimulatorMoto[];
  initialSlug: string;
  initialDownPaymentEuros: number;
  initialTerm: Term;
}) {
  const [slug, setSlug] = useState(initialSlug);
  const moto = motos.find((m) => m.slug === slug) ?? motos[0];
  const maxEuros = Math.floor(maxDownPaymentCents(moto.priceCents) / 100);
  const [downEuros, setDownEuros] = useState(Math.min(initialDownPaymentEuros, maxEuros));
  const [term, setTerm] = useState<Term>(initialTerm);

  const clampedDown = Math.min(Math.max(0, Math.round(downEuros || 0)), maxEuros);
  const invalid = downEuros < 0 || downEuros > maxEuros || !Number.isFinite(downEuros);
  const result = useMemo(
    () => simulate({ priceCents: moto.priceCents, downPaymentCents: clampedDown * 100, termMonths: term }),
    [moto.priceCents, clampedDown, term],
  );

  const bookingHref = `/cita?moto=${moto.slug}&entrada=${clampedDown}&plazo=${term}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
      <form className="lg:col-span-7 flex flex-col gap-space-lg bg-surface-container-low p-space-lg rounded" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="moto" className="font-label-caps text-label-caps uppercase text-on-surface">
            Moto
          </label>
          <select
            id="moto"
            value={moto.slug}
            onChange={(e) => {
              setSlug(e.target.value);
              const next = motos.find((m) => m.slug === e.target.value);
              if (next) setDownEuros((d) => Math.min(d, Math.floor(maxDownPaymentCents(next.priceCents) / 100)));
            }}
            className="bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-space-sm min-h-[44px] rounded"
          >
            {motos.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name} — {formatEuros(m.priceCents)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="entrada" className="font-label-caps text-label-caps uppercase text-on-surface">
            Entrada inicial (€)
          </label>
          <input
            id="entrada-rango"
            type="range"
            min={0}
            max={maxEuros}
            step={100}
            value={clampedDown}
            onChange={(e) => setDownEuros(Number(e.target.value))}
            aria-label="Entrada inicial, deslizador"
            className="w-full accent-[var(--color-secondary-container)] min-h-[44px]"
          />
          <input
            id="entrada"
            type="number"
            inputMode="numeric"
            min={0}
            max={maxEuros}
            step={1}
            value={Number.isFinite(downEuros) ? downEuros : ""}
            onChange={(e) => setDownEuros(e.target.value === "" ? 0 : Number(e.target.value))}
            aria-describedby="entrada-ayuda"
            aria-invalid={invalid || undefined}
            className="bg-surface-container-lowest text-on-surface font-label-data text-body-md px-space-md py-space-sm min-h-[44px] rounded w-48"
          />
          <p id="entrada-ayuda" className={`font-body-sm text-body-sm ${invalid ? "text-error" : "text-on-surface-variant"}`}>
            {invalid ? `La entrada debe estar entre 0 € y ${formatEuros(maxEuros * 100)}.` : `Entre 0 € y ${formatEuros(maxEuros * 100)}.`}
          </p>
        </div>

        <fieldset className="flex flex-col gap-space-xs">
          <legend className="font-label-caps text-label-caps uppercase text-on-surface mb-space-xs">Plazo</legend>
          <div className="grid grid-cols-4 gap-space-xs">
            {TERMS.map((t) => (
              <label
                key={t}
                className={`min-h-[44px] flex items-center justify-center rounded cursor-pointer font-label-caps text-label-caps uppercase transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-secondary-container ${
                  term === t ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
                }`}
              >
                <input type="radio" name="plazo" value={t} checked={term === t} onChange={() => setTerm(t)} className="sr-only" />
                {t} meses
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <section aria-labelledby="resultado" className="lg:col-span-5 lg:sticky lg:top-[150px] self-start flex flex-col gap-space-md bg-surface-container-high p-space-lg rounded">
        <h2 id="resultado" className="font-label-caps text-label-caps uppercase text-secondary">
          Cuota mensual estimada
        </h2>
        <div aria-live="polite" aria-atomic="true">
          <p className="font-headline-xl text-headline-xl text-on-surface" data-testid="cuota">
            {formatEuros(result.installmentCents)} <span className="font-label-data text-label-data text-on-surface-variant">/ mes</span>
          </p>
          <span className="sr-only">
            durante {term} meses para {moto.name}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-space-xs font-label-data text-label-data">
          <dt className="text-outline uppercase">Precio</dt>
          <dd className="text-right text-on-surface">{formatEuros(moto.priceCents)}</dd>
          <dt className="text-outline uppercase">Entrada</dt>
          <dd className="text-right text-on-surface">{formatEuros(clampedDown * 100)}</dd>
          <dt className="text-outline uppercase">Capital financiado</dt>
          <dd className="text-right text-on-surface">{formatEuros(result.financedCents)}</dd>
          <dt className="text-outline uppercase">Total a pagar en cuotas</dt>
          <dd className="text-right text-on-surface">{formatEuros(result.totalCents)}</dd>
          <dt className="text-outline uppercase">TIN</dt>
          <dd className="text-right text-on-surface">{formatPercentBps(TIN_BPS)}</dd>
          <dt className="text-outline uppercase">TAE</dt>
          <dd className="text-right text-on-surface" data-testid="tae">{formatPercentBps(result.taeBps)}</dd>
        </dl>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Simulación informativa, sin comisiones ni seguro. No es una oferta de crédito.
        </p>
        {moto.available > 0 ? (
          <Link
            href={bookingHref}
            className="px-space-md py-space-sm min-h-[44px] inline-flex items-center justify-center gap-space-xs bg-primary-container hover:bg-secondary-container text-on-primary-container hover:text-on-secondary font-label-caps text-label-caps uppercase rounded font-bold transition-colors"
          >
            <Icon name="event_available" className="text-[18px]" /> Agendar cita con esta moto
          </Link>
        ) : (
          <p className="font-body-sm text-body-sm text-tertiary">Este modelo está agotado: no se puede agendar cita por ahora.</p>
        )}
      </section>
    </div>
  );
}
