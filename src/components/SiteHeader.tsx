import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "./Icon";
import { MyAppointmentLink } from "./MyAppointmentLink";

// Header de Stitch (Design.md §3). Ocultos: Accesorios & GYTR, Concesionario & Taller, Comparar,
// Cross-Country & Enduro y el acceso de usuario (PRD › No alcance).
const NAV = [
  { href: "/", label: "Gama YZ (Motos)" },
  { href: "/?tipo=4t", label: "4 Tiempos (YZ450F / YZ250F)" },
  { href: "/?tipo=2t", label: "2 Tiempos (YZ250 / YZ125 / YZ85)" },
  { href: "/?categoria=youth", label: "Youth MX (65/85cc)" },
  { href: "/financiacion", label: "Simulador Financiación" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="w-full bg-surface-container-lowest py-space-xs px-margin-mobile lg:px-margin-desktop">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-label-data text-label-data">
          <div className="flex items-center gap-space-sm text-secondary tracking-wider overflow-hidden whitespace-nowrap">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-secondary-container motion-safe:animate-pulse" aria-hidden />
            <span className="truncate font-medium">
              NUEVA GAMA YAMAHA YZ 2025 · CONSULTA PRECIO Y STOCK · AGENDA TU CITA EN EL CONCESIONARIO
            </span>
          </div>
          <span className="hidden md:flex items-center gap-space-xs text-on-surface">
            <Icon name="schedule" className="text-[14px] text-secondary" /> Lunes a sábado · 10:00 – 19:00
          </span>
        </div>
      </div>
      <div className="h-20 max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop flex items-center justify-between gap-space-md">
        <Link href="/" className="flex items-center gap-space-md shrink-0" aria-label="Eddie Store, ir al inicio">
          <Image src="/brand/logo.jpg" alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" priority />
          <span className="flex flex-col leading-none">
            <span className="font-headline-sm text-headline-sm uppercase tracking-tight text-on-surface">EDDIE STORE</span>
            <span className="font-label-data text-label-data tracking-widest uppercase text-secondary font-bold">
              Yamaha Racing Department
            </span>
          </span>
        </Link>
        <form action="/" method="get" role="search" className="hidden xl:flex items-center flex-1 max-w-md mx-space-lg">
          <label className="relative w-full flex items-center bg-surface-container-low px-space-md py-space-xs rounded focus-within:bg-surface-container">
            <Icon name="search" className="text-outline text-[18px] mr-space-sm" />
            <span className="sr-only">Buscar modelo</span>
            <input
              name="q"
              type="search"
              placeholder="Buscar modelo YZ…"
              className="bg-transparent w-full text-on-surface font-body-sm text-body-sm placeholder-outline focus:outline-none min-h-[32px]"
            />
          </label>
        </form>
        <div className="flex items-center gap-space-sm shrink-0">
          <Suspense fallback={null}>
            <MyAppointmentLink />
          </Suspense>
        </div>
      </div>
      <div className="w-full bg-surface-container-lowest/90">
        <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
          <nav aria-label="Principal" className="flex items-center gap-space-xs md:gap-space-sm overflow-x-auto py-space-xs scrollbar-none">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-label-caps text-label-caps uppercase px-space-sm py-space-sm rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
