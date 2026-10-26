import Link from "next/link";

// Versión mínima del Sprint 0. El estilo del sitio llega en el BACKLOG #3 (Design.md §6).
export default function NotFound() {
  return (
    <main>
      <h1>Página no encontrada</h1>
      <Link href="/">Volver al inicio</Link>
    </main>
  );
}
