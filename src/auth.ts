import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/schemas";
import { ipHmac } from "@/server/codes";
import { getDb } from "@/server/db";
import { log } from "@/server/log";
import { verifyPassword } from "@/server/password";
import { loginBlocked, recordLoginFailure } from "@/server/rateLimit";
import { adminUsers } from "@/server/schema";

// Auth.js con Credentials para el panel del concesionario (ADR 0008).
export const SESSION_MAX_AGE_S = 8 * 60 * 60;

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

function requestIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_S },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // El límite de intentos vive aquí, no en el formulario: así también cubre un POST directo a
      // /api/auth/callback/credentials (ADR 0008, hallazgo A5).
      async authorize(raw, request) {
        const now = new Date();
        const ip = ipHmac(requestIp(request));
        if (await loginBlocked(ip, now)) {
          log("warn", "auth.rate_limited");
          throw new RateLimited();
        }
        const parsed = loginSchema.safeParse(raw);
        const [user] = parsed.success
          ? await getDb().select().from(adminUsers).where(eq(adminUsers.email, parsed.data.email))
          : [];
        const valid = !!user && parsed.success && (await verifyPassword(user.passwordHash, parsed.data.password));
        if (!valid) {
          await recordLoginFailure(ip, now);
          log("info", "auth.failed");
          return null;
        }
        log("info", "auth.ok");
        return { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.adminId = user.id;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 1;
        // Momento del login: la expiración absoluta se cuenta desde aquí, no desde la última actividad.
        token.loginAt = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    session({ session, token }) {
      session.adminId = token.adminId as string | undefined;
      session.sessionVersion = token.sessionVersion as number | undefined;
      session.loginAt = token.loginAt as number | undefined;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    adminId?: string;
    sessionVersion?: number;
    loginAt?: number;
  }
}
