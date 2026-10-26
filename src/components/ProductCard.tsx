import Image from "next/image";
import Link from "next/link";
import { formatEuros, fromInstallmentCents } from "@/lib/finance";
import type { MotorcycleWithStock } from "@/server/availability";
import { StockBadge } from "./StockBadge";

// Tarjeta del catálogo migrada de Stitch (Design.md §5.2). Toda la tarjeta es un enlace a la ficha.
export function ProductCard({ moto, priority = false }: { moto: MotorcycleWithStock; priority?: boolean }) {
  const image = moto.images[0];
  return (
    <article className="relative flex flex-col bg-surface-container-low rounded overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
      <div className="relative w-full aspect-[16/10] bg-surface-container-high overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {moto.badge && (
            <span className="px-2 py-0.5 bg-primary-container text-on-primary-container font-label-data text-label-data uppercase font-bold tracking-wider rounded">
              {moto.badge}
            </span>
          )}
          <StockBadge available={moto.available} />
        </div>
        <div className="absolute bottom-2 right-2 bg-surface-container-lowest/80 backdrop-blur px-2 py-1 rounded font-label-data text-label-data text-on-surface">
          MY {moto.modelYear}
        </div>
      </div>
      <div className="p-space-md flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-space-sm mb-1">
            <h3 className="font-headline-md text-headline-md uppercase text-on-surface">
              <Link href={`/motos/${moto.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {moto.name}
              </Link>
            </h3>
            <span className="font-label-data text-body-md text-secondary-container font-bold whitespace-nowrap">
              {formatEuros(moto.priceCents)}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-space-sm">{moto.tagline}</p>
          <dl className="grid grid-cols-3 gap-1 bg-surface-container-lowest p-2 rounded mb-space-md text-center">
            {moto.cardSpecs.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="font-label-data text-label-data text-outline uppercase">{s.label}</dt>
                <dd className="font-label-data text-label-data text-on-surface font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex items-center justify-between gap-space-sm">
          <span className="font-label-data text-label-data text-on-surface-variant">
            Financia desde <strong className="text-on-surface">{formatEuros(fromInstallmentCents(moto.priceCents))}/mes</strong>
          </span>
          <span className="inline-flex items-center px-space-sm py-2 bg-surface-container-highest text-on-surface font-label-caps text-label-caps uppercase rounded">
            Ver ficha
          </span>
        </div>
      </div>
    </article>
  );
}
