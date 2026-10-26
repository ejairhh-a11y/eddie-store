"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "./Icon";

// "Mi cita" (ADR 0009): refleja la moto del flujo en curso (?moto=) y lleva a /cita con sus parámetros.
export function MyAppointmentLink() {
  const params = useSearchParams();
  const moto = params.get("moto");
  const qs = new URLSearchParams();
  for (const key of ["moto", "entrada", "plazo"]) {
    const v = params.get(key);
    if (v) qs.set(key, v);
  }
  return (
    <Link
      href={moto ? `/cita?${qs}` : "/cita"}
      className="relative flex items-center gap-space-xs px-space-sm py-space-sm rounded bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors min-h-[44px]"
    >
      <Icon name="event_available" className="text-[20px] text-secondary" />
      <span className="font-label-data text-label-data uppercase">Mi cita</span>
      {moto && (
        <span className="absolute -top-1.5 -right-1.5 bg-primary-container text-on-primary-container font-label-data text-label-data font-bold px-1.5 rounded-full min-w-[18px] text-center">
          1<span className="sr-only"> moto elegida</span>
        </span>
      )}
    </Link>
  );
}
