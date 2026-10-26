import Link from "next/link";

// 404 con el estilo del sitio (Design.md §6).
export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-margin-mobile py-space-4xl flex flex-col items-start gap-space-md">
      <span className="font-label-data text-label-data uppercase tracking-widest text-secondary">Error 404</span>
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile uppercase text-on-surface">Página no encontrada</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">La página o el modelo que buscas no existe.</p>
      <Link
        href="/"
        className="px-space-md py-space-sm min-h-[44px] inline-flex items-center bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase rounded"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
