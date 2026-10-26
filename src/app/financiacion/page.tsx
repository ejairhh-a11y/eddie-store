import type { Metadata } from "next";
import { Suspense } from "react";
import { FinanceSimulator } from "@/components/FinanceSimulator";
import { maxDownPaymentCents, normalizeTerm } from "@/lib/finance";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = { title: "Simulador de financiación" };

// Simulador (Stitch 03-pago → /financiacion, Design.md §3; BACKLOG #8).
export default function FinancePage({ searchParams }: PageProps<"/financiacion">) {
  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
      <header>
        <span className="font-label-data text-label-data uppercase tracking-widest text-secondary font-bold">Simulador</span>
        <h1 className="font-headline-xl-mobile text-headline-xl-mobile lg:font-headline-xl lg:text-headline-xl uppercase text-on-surface">
          Calcula tu cuota
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Elige la moto, la entrada y el plazo. TIN fijo del 5,95 % sin comisiones. Luego agenda tu cita con esta simulación.
        </p>
      </header>
      <Suspense fallback={<div className="h-[520px] bg-surface-container-low rounded" aria-hidden />}>
        <Simulator searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Simulator({ searchParams }: { searchParams: PageProps<"/financiacion">["searchParams"] }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const catalog = await getCatalog();
  const motos = catalog.map(({ slug, name, priceCents, available }) => ({ slug, name, priceCents, available }));
  const moto = motos.find((m) => m.slug === one("moto")) ?? motos[0];
  const entrada = Number(one("entrada"));
  const validEntrada = Number.isInteger(entrada) && entrada >= 0 && entrada * 100 <= maxDownPaymentCents(moto.priceCents);
  return (
    <FinanceSimulator
      motos={motos}
      initialSlug={moto.slug}
      initialDownPaymentEuros={validEntrada ? entrada : 2000}
      initialTerm={normalizeTerm(one("plazo"))}
    />
  );
}
