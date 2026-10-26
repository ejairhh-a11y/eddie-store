import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogFilters } from "@/components/CatalogFilters";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { formatEuros } from "@/lib/finance";
import { applyFilters, getCatalog, parseFilters } from "@/server/catalog";

// Inicio + catálogo (Stitch 00-home / 02-catalogo → `/`, Design.md §3; BACKLOG #6).
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<GridSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Hero() {
  const catalog = await getCatalog();
  const featured = catalog.find((m) => m.isFeatured) ?? catalog[0];
  return (
    <section className="relative w-full overflow-hidden bg-surface-container-lowest">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop pt-space-2xl pb-space-3xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <span className="self-start inline-flex items-center gap-1.5 px-space-sm py-1 bg-surface-container-high rounded font-label-data text-label-data uppercase tracking-widest text-secondary font-bold">
            Temporada oficial MXGP 2025
          </span>
          <h1 className="font-display-hero-mobile text-display-hero-mobile lg:font-display-hero lg:text-display-hero uppercase tracking-tight text-on-background">
            Domina el circuito:{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-secondary-container">
              Gama Yamaha YZ 2025
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Mira el precio y el stock real de cada modelo, simula tu cuota y agenda tu cita en el concesionario en menos de 5 minutos.
            Sin esperar respuesta por WhatsApp.
          </p>
          <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
            <a
              href="#catalogo"
              className="inline-flex items-center gap-space-xs px-space-lg py-space-sm min-h-[44px] bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase hover:bg-secondary-container hover:text-on-secondary transition-all shadow-[0_0_24px_-4px_rgba(14,75,239,0.5)]"
            >
              <Icon name="sports_motorsports" className="text-[18px]" /> Explorar motocicletas
            </a>
            <Link
              href="/financiacion"
              className="inline-flex items-center gap-space-xs px-space-lg py-space-sm min-h-[44px] bg-surface-container-high text-on-surface font-label-caps text-label-caps uppercase hover:bg-surface-bright transition-all"
            >
              <Icon name="calculate" className="text-secondary text-[18px]" /> Simular cuota
            </Link>
          </div>
        </div>
        {featured && (
          <Link href={`/motos/${featured.slug}`} className="lg:col-span-5 relative block w-full aspect-[4/3] rounded overflow-hidden shadow-2xl bg-surface-container-high">
            <Image
              src="/images/hero-yz450f.jpg"
              alt={`${featured.name} ${featured.modelYear}, moto destacada`}
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" aria-hidden />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-space-sm p-2 bg-surface/90 backdrop-blur rounded">
              <span className="flex flex-col">
                <span className="font-headline-sm text-headline-sm uppercase text-on-surface leading-none">{featured.name}</span>
                <StockBadge available={featured.available} className="mt-1 self-start" />
              </span>
              <span className="font-label-data text-label-data text-secondary-container font-bold">{formatEuros(featured.priceCents)}</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const list = applyFilters(await getCatalog(), filters);
  return (
    <>
      <CatalogFilters filters={filters} count={list.length} />
      <section id="catalogo" className="w-full py-space-2xl max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop scroll-mt-[200px]">
        <div className="mb-space-lg">
          <span className="font-label-data text-label-data uppercase tracking-widest text-secondary font-bold block mb-1">
            Línea de competición oficial
          </span>
          <h2 className="font-headline-lg text-headline-lg uppercase text-on-background">Catálogo Yamaha Racing 2025</h2>
          {filters.q && (
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
              Resultados para «{filters.q}»
            </p>
          )}
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-start gap-space-md bg-surface-container-low p-space-xl rounded">
            <p className="font-headline-sm text-headline-sm text-on-surface">Ningún modelo coincide</p>
            <Link href="/#catalogo" className="px-space-md py-space-sm min-h-[44px] inline-flex items-center bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase rounded">
              Quitar filtros
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {list.map((m, i) => (
              <ProductCard key={m.id} moto={m} priority={i < 2} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function HeroSkeleton() {
  return <div className="w-full h-[520px] bg-surface-container-lowest" aria-hidden />;
}

function GridSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[440px] bg-surface-container-low rounded" />
      ))}
    </div>
  );
}
