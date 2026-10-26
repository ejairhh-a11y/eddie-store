import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { formatEuros, fromInstallmentCents } from "@/lib/finance";
import { CATALOG } from "@/server/catalogData";
import { getCatalog, getMotorcycle } from "@/server/catalog";

// Ficha de modelo (Stitch 04-ficha-yz450f → /motos/[slug], Design.md §3; BACKLOG #7).
// Se eliminan los selectores de acabado, ECU, cantidad, accesorios y "entrega inmediata" (A6).

export function generateStaticParams() {
  return CATALOG.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/motos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const moto = await getMotorcycle(slug);
  return moto ? { title: moto.name, description: moto.tagline } : { title: "Modelo no encontrado" };
}

export default async function MotorcyclePage({ params }: PageProps<"/motos/[slug]">) {
  const { slug } = await params;
  const moto = await getMotorcycle(slug);
  if (!moto) notFound();

  const outOfStock = moto.available <= 0;
  const [main, ...thumbs] = moto.images;
  const similar = outOfStock
    ? (await getCatalog()).filter((m) => m.slug !== moto.slug && m.category === moto.category && m.available > 0)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-xl">
      <nav aria-label="Ruta" className="font-label-data text-label-data uppercase text-outline mb-space-md">
        <Link href="/" className="hover:text-secondary">Gama YZ</Link> <span aria-hidden>/</span>{" "}
        <span className="text-on-surface">{moto.name} {moto.modelYear}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        <div className="lg:col-span-7 flex flex-col gap-space-sm">
          <div className="relative w-full aspect-[16/10] rounded overflow-hidden bg-surface-container-high">
            <Image src={main.src} alt={main.alt} fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
          </div>
          {thumbs.length > 0 && (
            <ul className="grid grid-cols-4 gap-space-xs" aria-label="Más fotos">
              {thumbs.map((img) => (
                <li key={img.src} className="relative aspect-[16/10] rounded overflow-hidden bg-surface-container-high">
                  <Image src={img.src} alt={img.alt} fill sizes="15vw" className="object-cover" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-[150px] self-start flex flex-col gap-space-md bg-surface-container-low p-space-lg rounded">
          {moto.badge && (
            <span className="self-start px-2 py-0.5 bg-primary-container text-on-primary-container font-label-data text-label-data uppercase font-bold rounded">
              {moto.badge}
            </span>
          )}
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile lg:font-headline-xl lg:text-headline-xl uppercase text-on-surface">
            {moto.name}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{moto.tagline}</p>
          <div className="flex items-end justify-between gap-space-md">
            <div>
              <span className="font-label-data text-label-data uppercase text-outline block">Precio (IVA incluido)</span>
              <span className="font-headline-lg text-headline-lg text-secondary-container" data-testid="price">
                {formatEuros(moto.priceCents)}
              </span>
            </div>
            <StockBadge available={moto.available} />
          </div>
          <p className="font-label-data text-label-data text-on-surface-variant">
            Financia desde <strong className="text-on-surface">{formatEuros(fromInstallmentCents(moto.priceCents))}/mes</strong> sin
            entrada, a 60 meses.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
            {outOfStock ? (
              <span
                aria-disabled="true"
                className="px-space-md py-space-sm min-h-[44px] inline-flex items-center justify-center gap-space-xs bg-surface-container-highest text-outline font-label-caps text-label-caps uppercase rounded cursor-not-allowed"
              >
                <Icon name="event_busy" className="text-[18px]" /> Agendar cita
              </span>
            ) : (
              <Link
                href={`/cita?moto=${moto.slug}`}
                className="px-space-md py-space-sm min-h-[44px] inline-flex items-center justify-center gap-space-xs bg-primary-container hover:bg-secondary-container text-on-primary-container hover:text-on-secondary font-label-caps text-label-caps uppercase rounded font-bold transition-colors"
              >
                <Icon name="event_available" className="text-[18px]" /> Agendar cita
              </Link>
            )}
            <Link
              href={`/financiacion?moto=${moto.slug}`}
              className="px-space-md py-space-sm min-h-[44px] inline-flex items-center justify-center gap-space-xs bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-caps text-label-caps uppercase rounded transition-colors"
            >
              <Icon name="calculate" className="text-secondary text-[18px]" /> Simular financiación
            </Link>
          </div>
          {outOfStock && (
            <p className="font-body-sm text-body-sm text-tertiary" role="status">
              Este modelo está agotado. No se puede agendar una cita hasta que vuelva a haber stock.
            </p>
          )}
        </aside>
      </div>

      <section className="mt-space-2xl" aria-labelledby="ficha-tecnica">
        <h2 id="ficha-tecnica" className="font-headline-lg text-headline-lg uppercase text-on-surface mb-space-md">
          Ficha técnica
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          {moto.specGroups.map((group) => (
            <div key={group.title} className="bg-surface-container-low rounded p-space-md">
              <table className="w-full">
                <caption className="text-left font-headline-sm text-headline-sm uppercase text-on-surface mb-space-sm">{group.title}</caption>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.label} className="border-t border-outline-variant">
                      <th scope="row" className="py-space-xs pr-space-sm text-left font-label-data text-label-data uppercase text-outline font-normal">
                        {row.label}
                      </th>
                      <td className="py-space-xs text-right font-label-data text-label-data text-on-surface">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {group.note && <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">{group.note}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-space-xl flex items-start gap-space-md bg-surface-container p-space-md rounded">
        <Icon name="tune" className="text-secondary text-[28px]" />
        <div>
          <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Ajuste de sag y puesta a punto en el box</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            En tu cita ajustamos las suspensiones a tu peso en nuestro banco de pruebas. Incluido sin coste.
          </p>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="mt-space-2xl" aria-labelledby="similares">
          <h2 id="similares" className="font-headline-lg text-headline-lg uppercase text-on-surface mb-space-md">
            Modelos similares con stock
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {similar.map((m) => (
              <ProductCard key={m.id} moto={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
