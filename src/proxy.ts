import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findByToken } from "@/server/booking";
import { CATALOG } from "@/server/catalogData";
import { getDb } from "@/server/db";

// proxy.ts (antes middleware.ts en Next 16).
// 1. /admin/*: redirige al login sin sesión. Es una mejora de experiencia, no la barrera de
//    seguridad: esa es requireAdmin() dentro de cada acción y página (ADR 0008).
// 2. /motos/[slug] y /cita/[token]: con el renderizado en streaming (PPR) un notFound() dentro de
//    Suspense llega con estado 200. Para que un modelo o una cita inexistentes den un 404 real, se
//    comprueba aquí antes de renderizar (ver ADR 0005, cambio 2026-10-26).
const SLUGS = new Set(CATALOG.map((m) => m.slug));
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null; // %-secuencia inválida: se trata como inexistente, no como error 500 (SEC-09)
  }
}

function notFound(origin: string) {
  return NextResponse.rewrite(new URL("/_not-found", origin), { status: 404 });
}

export const proxy = auth(async (req) => {
  const path = req.nextUrl.pathname;
  const origin = req.nextUrl.origin;

  const moto = path.match(/^\/motos\/([^/]+)\/?$/);
  if (moto) {
    const slug = safeDecode(moto[1]);
    if (!slug || !SLUGS.has(slug)) return notFound(origin);
  }

  const cita = path.match(/^\/cita\/([^/]+)\/?$/);
  if (cita) {
    const token = safeDecode(cita[1]);
    if (!token || !TOKEN.test(token)) return notFound(origin);
    try {
      if (!(await findByToken(getDb(), token))) return notFound(origin);
    } catch {
      // Si la base de datos falla, la página muestra su propio error; no se bloquea aquí.
    }
  }

  if (path.startsWith("/admin") && path !== "/admin/login" && !req.auth) {
    return NextResponse.redirect(new URL("/admin/login", origin));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/motos/:path*", "/cita/:path+"] };
