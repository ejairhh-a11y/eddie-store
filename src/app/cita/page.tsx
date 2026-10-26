import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";
import { StepIndicator } from "@/components/StepIndicator";
import { StockBadge } from "@/components/StockBadge";
import { systemClock, today } from "@/lib/clock";
import { formatEuros, isValidDownPayment, normalizeTerm, simulate } from "@/lib/finance";
import { whatsappUrl } from "@/lib/site";
import { bookableDates } from "@/lib/slots";
import { freeSlots } from "@/server/booking";
import { getCatalog, getMotorcycle } from "@/server/catalog";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Agendar cita" };

// Paso 2 de la cita (Stitch 01-checkout → /cita, Design.md §3; BACKLOG #11).
export default function BookingPage({ searchParams }: PageProps<"/cita">) {
  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile lg:font-headline-xl lg:text-headline-xl uppercase text-on-surface">
        Agenda tu cita
      </h1>
      <Suspense fallback={<div className="h-[600px] bg-surface-container-low rounded" aria-hidden />}>
        <Booking searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Booking({ searchParams }: { searchParams: PageProps<"/cita">["searchParams"] }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const slug = one("moto");
  const moto = slug ? await getMotorcycle(slug) : null;

  if (!moto || moto.available <= 0) {
    const options = (await getCatalog()).filter((m) => m.available > 0);
    return (
      <>
        <StepIndicator current={1} />
        <section className="flex flex-col gap-space-md">
          {moto && <p className="font-body-md text-body-md text-tertiary">La {moto.name} está agotada. Elige otra moto:</p>}
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">¿Qué moto quieres ver?</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
            {options.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/cita?moto=${m.slug}`}
                  className="flex items-center justify-between gap-space-sm p-space-md min-h-[44px] rounded bg-surface-container-low hover:bg-surface-container-high"
                >
                  <span className="font-headline-sm text-headline-sm uppercase text-on-surface">{m.name}</span>
                  <span className="font-label-data text-label-data text-secondary-container">{formatEuros(m.priceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  }

  const day = today(systemClock);
  const dates = bookableDates(day);
  const initialSlots = await freeSlots(getDb(), dates[0], day);
  const entradaRaw = Number(one("entrada"));
  const entrada = Number.isInteger(entradaRaw) && isValidDownPayment(moto.priceCents, entradaRaw * 100) ? entradaRaw : undefined;
  const plazo = one("plazo") !== undefined ? normalizeTerm(one("plazo")) : undefined;
  const sim = entrada !== undefined ? simulate({ priceCents: moto.priceCents, downPaymentCents: entrada * 100, termMonths: plazo ?? 36 }) : null;

  return (
    <>
      <StepIndicator current={2} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        <div className="lg:col-span-7 order-2 lg:order-1">
          <BookingForm
            moto={{ slug: moto.slug, name: moto.name }}
            dates={dates}
            initialSlots={initialSlots}
            entrada={entrada}
            plazo={entrada !== undefined ? (plazo ?? 36) : undefined}
            whatsappHref={whatsappUrl(`Hola, quiero cambiar mi cita para la ${moto.name}.`)}
          />
        </div>
        <aside
          aria-label="Resumen de la cita"
          className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-[150px] self-start flex flex-col gap-space-md bg-surface-container-high p-space-lg rounded"
        >
          <div className="relative w-full aspect-[16/10] rounded overflow-hidden bg-surface-container">
            <Image src={moto.images[0].src} alt={moto.images[0].alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
          <div className="flex items-start justify-between gap-space-sm">
            <h2 className="font-headline-md text-headline-md uppercase text-on-surface">{moto.name}</h2>
            <StockBadge available={moto.available} />
          </div>
          <dl className="grid grid-cols-2 gap-space-xs font-label-data text-label-data">
            <dt className="text-outline uppercase">Precio</dt>
            <dd className="text-right text-on-surface">{formatEuros(moto.priceCents)}</dd>
            {sim && (
              <>
                <dt className="text-outline uppercase">Cuota simulada</dt>
                <dd className="text-right text-on-surface">
                  {formatEuros(sim.installmentCents)}/mes · {plazo ?? 36} meses
                </dd>
              </>
            )}
            <dt className="text-outline uppercase">Dónde</dt>
            <dd className="text-right text-on-surface">Eddie Store Madrid · Box 14</dd>
          </dl>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            La cita aparta una unidad para ti. No pagas nada ahora: la compra se cierra en el concesionario.
          </p>
          <Link href={`/motos/${moto.slug}`} className="font-label-caps text-label-caps uppercase text-secondary hover:underline">
            Cambiar de moto
          </Link>
        </aside>
      </div>
    </>
  );
}
