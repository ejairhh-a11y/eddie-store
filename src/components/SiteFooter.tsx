import Link from "next/link";
import { DEALER } from "@/lib/site";
import { Icon } from "./Icon";

// Footer de Stitch (Design.md §3, §10): sin boletín por email ni textos de pago; con aviso legal.
export function SiteFooter() {
  return (
    <footer className="w-full bg-surface-container-lowest text-on-surface-variant pt-space-3xl pb-space-xl">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl pb-space-2xl">
          <div className="flex flex-col gap-space-md">
            <span className="font-headline-md text-headline-md text-on-surface uppercase">EDDIE STORE</span>
            <p className="font-body-sm text-body-sm leading-relaxed">
              Concesionario Yamaha de motocross. Consulta precio y stock real, simula tu cuota y agenda tu cita en el box.
            </p>
          </div>
          <div className="flex flex-col gap-space-sm">
            <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface">Concesionario</h2>
            <p className="flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface">
              <Icon name="location_on" className="text-secondary text-[18px] mt-0.5" /> {DEALER.address}
            </p>
            <p className="flex items-center gap-space-xs font-label-data text-label-data text-on-surface">
              <Icon name="call" className="text-secondary text-[18px]" /> {DEALER.phoneDisplay}
            </p>
            <p className="font-label-data text-label-data text-on-surface">{DEALER.hours}</p>
          </div>
          <div className="flex flex-col gap-space-sm">
            <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface">Tu compra</h2>
            <Link className="font-body-sm text-body-sm hover:text-secondary" href="/">
              Catálogo Yamaha YZ 2025
            </Link>
            <Link className="font-body-sm text-body-sm hover:text-secondary" href="/financiacion">
              Simulador de financiación
            </Link>
            <Link className="font-body-sm text-body-sm hover:text-secondary" href="/cita">
              Agendar cita
            </Link>
            <Link className="font-body-sm text-body-sm hover:text-secondary" href="/privacidad">
              Privacidad
            </Link>
          </div>
        </div>
        <div className="pt-space-lg border-t border-outline-variant font-label-data text-label-data text-outline">
          Proyecto académico ficticio. Sin afiliación con Yamaha Motor Co., Ltd. Precios y stock de demostración.
        </div>
      </div>
    </footer>
  );
}
