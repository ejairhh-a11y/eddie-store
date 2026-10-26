import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { systemClock, today } from "@/lib/clock";
import { formatDay, formatSlot, slotsFor } from "@/lib/slots";
import { requireAdmin } from "@/server/adminSession";
import { getDb } from "@/server/db";
import { anonymizeExpired, listForAdmin } from "@/server/privacy";

export const metadata: Metadata = { title: "Panel · Citas", robots: { index: false, follow: false } };

// Panel de citas (Design.md §7; BACKLOG #13).
export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile uppercase text-on-surface">Panel del concesionario</h1>
      <Suspense fallback={<div className="h-[400px] bg-surface-container-low rounded" aria-hidden />}>
        <Appointments />
      </Suspense>
    </div>
  );
}

const STATUS_LABEL = { PENDIENTE: "Pendiente", VENDIDA: "Vendida", CANCELADA: "Cancelada", VENCIDA: "No se presentó" } as const;

async function Appointments() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const day = today(systemClock);
  await anonymizeExpired(getDb(), day, systemClock.now()); // retención oportunista (ADR 0015)
  const rows = await listForAdmin(getDb(), day);

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(r.slotDate, [...(byDay.get(r.slotDate) ?? []), r]);

  return (
    <>
      <AdminNav current="citas" />
      {rows.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">No hay citas.</p>}
      {[...byDay.entries()].map(([date, list]) => (
        <section key={date} aria-labelledby={`dia-${date}`} className="flex flex-col gap-space-sm">
          <h2 id={`dia-${date}`} className="font-headline-sm text-headline-sm uppercase text-on-surface">
            {formatDay(date)} {date === day && <span className="text-secondary">· hoy</span>}
          </h2>
          <ul className="flex flex-col gap-space-xs">
            {list.map((a) => {
              const hour = slotsFor(a.slotDate).find((s) => s.start.getTime() === a.slotStart.getTime())?.hour ?? 0;
              const noShow = a.status === "VENCIDA" || (a.status === "PENDIENTE" && a.slotDate < day);
              return (
                <li
                  key={a.id}
                  data-testid="cita-admin"
                  className={`grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center p-space-md rounded ${
                    noShow ? "bg-tertiary-container/30 border border-tertiary-container" : "bg-surface-container-low"
                  }`}
                >
                  <span className="md:col-span-2 font-label-data text-label-data text-on-surface">{formatSlot(a.slotDate, hour)}</span>
                  <span className="md:col-span-3 font-body-md text-body-md text-on-surface">
                    {a.anonymizedAt ? "Datos anonimizados" : a.fullName}
                    {!a.anonymizedAt && <span className="block font-label-data text-label-data text-on-surface-variant">{a.phone}</span>}
                  </span>
                  <span className="md:col-span-2 font-body-sm text-body-sm text-on-surface">{a.motoName}</span>
                  <span className="md:col-span-1 font-label-data text-label-data text-secondary-container">{a.code}</span>
                  <span className={`md:col-span-1 font-label-caps text-label-caps uppercase ${noShow ? "text-tertiary" : "text-on-surface-variant"}`}>
                    {noShow ? "No se presentó" : STATUS_LABEL[a.status]}
                  </span>
                  <span className="md:col-span-3 flex flex-wrap gap-space-xs">
                    {(a.status === "PENDIENTE" || a.status === "VENCIDA") && (
                      <>
                        <ActionButton id={a.id} kind="sell" label="Vendida" tone="primary" confirmText={`¿Marcar como vendida la cita ${a.code}? Resta 1 al stock.`} />
                        <ActionButton id={a.id} kind="cancel" label="Cancelar" confirmText={`¿Cancelar la cita ${a.code}? Libera la unidad y la franja.`} />
                      </>
                    )}
                    {a.status === "PENDIENTE" && (
                      <ActionButton id={a.id} kind="noShow" label="No-show" confirmText={`¿Marcar la cita ${a.code} como "no se presentó"?`} />
                    )}
                    {a.status === "PENDIENTE" && a.hasOrigin && (
                      <ActionButton id={a.id} kind="cancelOrigin" label="Cancelar origen" tone="danger" confirmText="¿Cancelar TODAS las citas pendientes del mismo origen (posible abuso)?" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
