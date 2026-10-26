"use client";

// Reemplaza al layout raíz cuando este falla (ADR 0014): por eso incluye <html> y <body>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main>
          <h1>No pudimos completar la acción</h1>
          <button type="button" onClick={reset}>
            Inténtalo de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
