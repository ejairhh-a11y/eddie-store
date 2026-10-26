import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { StepIndicator } from "@/components/StepIndicator";
import { formatEuros } from "@/lib/finance";
import { whatsappUrl } from "@/lib/site";
import { formatSlot, slotsFor } from "@/lib/slots";
import { findByToken, maskPhone } from "@/server/booking";
import { getDb } from "@/server/db";

// Confirmación (paso 3). La URL lleva el token secreto, nunca el código (ADR 0011).
export const metadata: Metadata = { title: "Cita confirmada", robots: { index: false, follow: false } };

export default function ConfirmationPage({ params }: PageProps<"/cita/[token]">) {
  return (
    <div className="max-w-3xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
      <StepIndicator current={3} />
      <Suspense fallback={<div className="h-[420px] bg-surface-container-low rounded" aria-hidden />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ params }: { params: PageProps<"/cita/[token]">["params"] }) {
  const { token } = await params;
  const cita = await findByToken(getDb(), token);
  if (!cita) notFound();

  const hour = slotsFor(cita.slotDate).find((s) => s.start.getTime() === cita.slotStart.getTime())?.hour ?? 10;
  const when = formatSlot(cita.slotDate, hour);
  const firstName = cita.fullName?.split(" ")[0] ?? "";
  const message = `Hola, soy ${firstName}. Tengo cita para ver la ${cita.motoName} el ${when}. Código: ${cita.code}.`;

  return (
    <section className="flex flex-col gap-space-md bg-surface-container-low p-space-lg rounded">
      <span className="inline-flex items-center gap-space-xs font-label-caps text-label-caps uppercase text-secondary">
        <Icon name="check_circle" className="text-[20px]" /> Cita confirmada
      </span>
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile uppercase text-on-surface">
        {firstName ? `¡Listo, ${firstName}!` : "¡Listo!"}
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Te esperamos en Eddie Store Madrid (Polígono Motorsport, Box 14). Guarda este código:
      </p>
      <p className="font-label-data text-headline-lg text-secondary-container" data-testid="codigo-cita">
        {cita.code}
      </p>
      <dl className="grid grid-cols-2 gap-space-xs font-label-data text-label-data">
        <dt className="text-outline uppercase">Moto</dt>
        <dd className="text-right text-on-surface">{cita.motoName}</dd>
        <dt className="text-outline uppercase">Día y hora</dt>
        <dd className="text-right text-on-surface" data-testid="fecha-cita">{when}</dd>
        <dt className="text-outline uppercase">Teléfono</dt>
        <dd className="text-right text-on-surface">{maskPhone(cita.phone)}</dd>
        {cita.financing && (
          <>
            <dt className="text-outline uppercase">Cuota simulada</dt>
            <dd className="text-right text-on-surface">
              {formatEuros(cita.financing.installmentCents)}/mes · {cita.financing.termMonths} meses
            </dd>
          </>
        )}
        <dt className="text-outline uppercase">Estado</dt>
        <dd className="text-right text-on-surface">{cita.status === "PENDIENTE" ? "Pendiente" : cita.status}</dd>
      </dl>
      <a
        href={whatsappUrl(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="px-space-lg py-space-sm min-h-[48px] inline-flex items-center justify-center gap-space-xs bg-primary-container hover:bg-secondary-container text-on-primary-container hover:text-on-secondary font-label-caps text-label-caps uppercase rounded font-bold transition-colors"
      >
        <Icon name="chat" className="text-[18px]" /> Avisar por WhatsApp
      </a>
      <Link href="/" className="font-label-caps text-label-caps uppercase text-secondary hover:underline">
        Volver al catálogo
      </Link>
    </section>
  );
}
