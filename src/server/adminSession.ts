import { eq } from "drizzle-orm";
import { auth, SESSION_MAX_AGE_S } from "@/auth";
import { getDb } from "./db";
import { adminUsers } from "./schema";

/**
 * Barrera real de seguridad del panel (ADR 0008): cada Server Action y cada página de admin la
 * llama. Comprueba sesión, expiración absoluta de 8 h y que `session_version` siga vigente.
 */
export async function requireAdmin(): Promise<{ adminId: string } | null> {
  const session = await auth();
  if (!session?.adminId || !session.loginAt || session.sessionVersion === undefined) return null;
  if (Math.floor(Date.now() / 1000) - session.loginAt > SESSION_MAX_AGE_S) return null;
  const [user] = await getDb()
    .select({ sessionVersion: adminUsers.sessionVersion })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.adminId));
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  return { adminId: session.adminId };
}
