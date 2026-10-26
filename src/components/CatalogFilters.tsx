import Link from "next/link";
import type { CatalogFilters as Filters } from "@/server/catalog";
import { CcSelect } from "./CcSelect";

// Filtros de Stitch sincronizados con la URL (Design.md §5.2). Sin el chip de disponibilidad (A6).
const CHIPS: { label: string; params: Partial<Filters> }[] = [
  { label: "Toda la gama", params: {} },
  { label: "4 Tiempos (YZ-F)", params: { tipo: "4t" } },
  { label: "2 Tiempos", params: { tipo: "2t" } },
  { label: "Youth MX (65/85cc)", params: { categoria: "youth" } },
];

function hrefFor(params: Partial<Filters>, cc?: number) {
  const qs = new URLSearchParams();
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.categoria) qs.set("categoria", params.categoria);
  if (cc) qs.set("cc", String(cc));
  const s = qs.toString();
  return s ? `/?${s}#catalogo` : "/#catalogo";
}

export function CatalogFilters({ filters, count }: { filters: Filters; count: number }) {
  const active = (p: Partial<Filters>) => p.tipo === filters.tipo && p.categoria === filters.categoria;
  return (
    <section aria-label="Filtros del catálogo" className="w-full bg-surface-container sticky top-[132px] z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs overflow-x-auto scrollbar-none">
          {CHIPS.map((chip) => {
            const isActive = active(chip.params);
            return (
              <Link
                key={chip.label}
                href={hrefFor(chip.params, filters.cc)}
                aria-current={isActive ? "true" : undefined}
                className={`px-space-sm py-space-sm min-h-[44px] inline-flex items-center rounded font-label-caps text-label-caps uppercase whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-space-sm">
          <CcSelect value={filters.cc} />
          <span className="font-label-data text-label-data text-secondary px-space-sm bg-surface-container-lowest py-space-xs rounded" aria-live="polite">
            {count} {count === 1 ? "MODELO" : "MODELOS"}
          </span>
        </div>
      </div>
    </section>
  );
}
