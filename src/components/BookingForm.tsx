"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createAppointmentAction, getSlotsAction, type BookingState } from "@/app/cita/actions";
import { formatDay, formatSlot } from "@/lib/slots";
import { Icon } from "./Icon";

type Slot = { hour: number; free: boolean };

// Paso 2 del checkout de Stitch convertido en "Datos y horario" (Design.md §3, §6; BACKLOG #11).
export function BookingForm({
  moto,
  dates,
  initialSlots,
  entrada,
  plazo,
  whatsappHref,
}: {
  moto: { slug: string; name: string };
  dates: string[];
  initialSlots: Slot[];
  entrada?: number;
  plazo?: number;
  whatsappHref: string;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(createAppointmentAction, {});
  const [date, setDate] = useState(state.values?.date ?? dates[0]);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [loadingSlots, startSlots] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values ?? {};

  function loadSlots(d: string) {
    setDate(d);
    startSlots(async () => setSlots(await getSlotsAction(d)));
  }

  // Tras un error, el foco va al primer campo inválido o al aviso (Design.md §6).
  useEffect(() => {
    if (!state.code && !state.serverError) return;
    if (state.code === "SLOT_TAKEN") startSlots(async () => setSlots(await getSlotsAction(date)));
    const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (firstInvalid ?? document.getElementById("aviso-cita"))?.focus();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const fe = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-space-lg" noValidate>
      <input type="hidden" name="moto" value={moto.slug} />
      {entrada !== undefined && <input type="hidden" name="entrada" value={entrada} />}
      {plazo !== undefined && <input type="hidden" name="plazo" value={plazo} />}

      <Alert state={state} whatsappHref={whatsappHref} onPick={(d, h) => {
        loadSlots(d);
        setTimeout(() => document.getElementById(`hora-${h}`)?.click(), 300);
      }} />

      <fieldset className="flex flex-col gap-space-md bg-surface-container-low p-space-lg rounded">
        <legend className="font-headline-sm text-headline-sm uppercase text-on-surface px-space-xs">1. Tus datos</legend>
        <Field id="fullName" label="Nombre completo" error={fe.fullName} defaultValue={v.fullName} autoComplete="name" />
        <Field id="email" label="Email" type="email" error={fe.email} defaultValue={v.email} autoComplete="email" />
        <Field id="phone" label="Teléfono" type="tel" error={fe.phone} defaultValue={v.phone} autoComplete="tel" hint="Ej.: 612 345 678" />
      </fieldset>

      <fieldset className="flex flex-col gap-space-md bg-surface-container-low p-space-lg rounded">
        <legend className="font-headline-sm text-headline-sm uppercase text-on-surface px-space-xs">2. Día y hora en el concesionario</legend>
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="date" className="font-label-caps text-label-caps uppercase text-on-surface">
            Día (lunes a sábado)
          </label>
          <select
            id="date"
            name="date"
            value={date}
            onChange={(e) => loadSlots(e.target.value)}
            aria-invalid={fe.date ? true : undefined}
            aria-describedby={fe.date ? "date-error" : undefined}
            className="bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-space-sm min-h-[44px] rounded"
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatDay(d)}
              </option>
            ))}
          </select>
          {fe.date && <p id="date-error" className="font-body-sm text-body-sm text-error">{fe.date}</p>}
        </div>
        <div role="radiogroup" aria-labelledby="hora-label" aria-busy={loadingSlots} aria-invalid={fe.hour ? true : undefined} tabIndex={fe.hour ? -1 : undefined}>
          <p id="hora-label" className="font-label-caps text-label-caps uppercase text-on-surface mb-space-xs">
            Hora
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-space-xs">
            {slots.map((s) => (
              <label
                key={`${date}-${s.hour}`}
                className={`min-h-[44px] flex flex-col items-center justify-center rounded font-label-data text-label-data transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-secondary-container ${
                  s.free
                    ? "cursor-pointer bg-surface-container-high text-on-surface hover:bg-surface-bright has-[:checked]:bg-primary-container has-[:checked]:text-on-primary-container"
                    : "cursor-not-allowed bg-surface-container-lowest text-outline line-through"
                }`}
              >
                <input
                  id={`hora-${s.hour}`}
                  type="radio"
                  name="hour"
                  value={s.hour}
                  disabled={!s.free}
                  defaultChecked={v.hour === String(s.hour) && v.date === date}
                  className="sr-only"
                />
                {String(s.hour).padStart(2, "0")}:00
                {!s.free && <span className="no-underline text-[12px]">Ocupado</span>}
              </label>
            ))}
          </div>
          {fe.hour && <p className="mt-space-xs font-body-sm text-body-sm text-error">{fe.hour}</p>}
        </div>
      </fieldset>

      <div className="flex flex-col gap-space-sm">
        <button
          type="submit"
          disabled={pending}
          className="px-space-lg py-space-sm min-h-[48px] inline-flex items-center justify-center gap-space-xs bg-primary-container hover:bg-secondary-container text-on-primary-container hover:text-on-secondary font-label-caps text-label-caps uppercase rounded font-bold transition-colors disabled:opacity-70"
        >
          <Icon name="event_available" className="text-[18px]" />
          {pending ? "Confirmando…" : "Confirmar cita"}
        </button>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Eddie Store (proyecto académico ficticio) usará tus datos solo para gestionar esta cita. Se anonimizan 90 días después
          de la fecha de la cita. <Link href="/privacidad" className="underline hover:text-secondary">Más información</Link>
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  error,
  defaultValue,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="font-label-caps text-label-caps uppercase text-on-surface">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-space-sm min-h-[44px] rounded border border-outline-variant aria-[invalid=true]:border-error"
      />
      {hint && <p id={`${id}-hint`} className="font-body-sm text-body-sm text-on-surface-variant">{hint}</p>}
      {error && <p id={`${id}-error`} className="font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  );
}

function Alert({
  state,
  whatsappHref,
  onPick,
}: {
  state: BookingState;
  whatsappHref: string;
  onPick: (date: string, hour: number) => void;
}) {
  let body: React.ReactNode = null;
  if (state.serverError) body = "No pudimos completar la acción. Inténtalo de nuevo.";
  else if (state.code === "SLOT_TAKEN") {
    const alts = state.details?.alternatives ?? [];
    body = (
      <>
        <p>Ese horario acaba de ocuparse. Elige otro:</p>
        <ul className="flex flex-wrap gap-space-xs mt-space-xs">
          {alts.map((a) => (
            <li key={`${a.date}-${a.hour}`}>
              <button type="button" onClick={() => onPick(a.date, a.hour)} className="px-space-sm min-h-[44px] rounded bg-surface-container-high text-on-surface font-label-data text-label-data">
                {formatSlot(a.date, a.hour)}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (state.code === "ALREADY_BOOKED") {
    const d = state.details;
    body = (
      <>
        <p>
          Ya tienes una cita{d?.existingDate && d.existingHour !== undefined ? ` el ${formatSlot(d.existingDate, d.existingHour)}` : ""}.
          Para cambiarla, escríbenos por WhatsApp.
        </p>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex mt-space-xs items-center gap-space-xs px-space-sm min-h-[44px] rounded bg-surface-container-high text-on-surface font-label-caps text-label-caps uppercase">
          <Icon name="chat" className="text-[18px]" /> Escribir por WhatsApp
        </a>
      </>
    );
  } else if (state.code === "OUT_OF_STOCK") body = "Esta moto se agotó mientras agendabas.";
  else if (state.code === "NOT_FOUND") body = "La moto elegida no existe.";
  else if (state.code === "RATE_LIMITED") body = "Demasiados intentos. Inténtalo más tarde o escríbenos por WhatsApp.";
  else if (state.code === "VALIDATION") body = "Revisa los campos marcados.";
  if (!body) return null;
  return (
    <div
      id="aviso-cita"
      role="alert"
      tabIndex={-1}
      className="flex items-start gap-space-sm p-space-md rounded bg-error-container text-on-error-container font-body-md text-body-md"
    >
      <Icon name="error" className="text-[20px]" />
      <div>{body}</div>
    </div>
  );
}
