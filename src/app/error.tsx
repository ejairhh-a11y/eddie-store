"use client";

// Versión mínima del Sprint 0 (ADR 0014): mensaje genérico, nunca detalles técnicos.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>No pudimos completar la acción</h1>
      <button type="button" onClick={reset}>
        Inténtalo de nuevo
      </button>
    </main>
  );
}
