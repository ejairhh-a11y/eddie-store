import { NextResponse } from "next/server";
import { auth } from "@/auth";

// proxy.ts (antes middleware.ts en Next 16): redirige /admin/* sin sesión al login.
// Es una mejora de experiencia, no la barrera de seguridad: esa es requireAdmin() (ADR 0008).
export const proxy = auth((req) => {
  const isLogin = req.nextUrl.pathname === "/admin/login";
  if (!req.auth && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*"] };
