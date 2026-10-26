// Crea el primer admin solo si SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD están definidas y ese email
// no existe todavía. Nunca cambia una contraseña existente (ADR 0016 §cambio 2026-10-26).
import { closeDb, getDb } from "../src/server/db";
import { hashPassword } from "../src/server/password";
import { adminUsers } from "../src/server/schema";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(JSON.stringify({ level: "info", event: "seed.admin_skipped" }));
    return;
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres");

  const inserted = await getDb()
    .insert(adminUsers)
    .values({ email, name: "Administrador", passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: adminUsers.email })
    .returning({ id: adminUsers.id });
  console.log(JSON.stringify({ level: "info", event: "seed.admin", created: inserted.length === 1 }));
  await closeDb();
}

main().catch((error) => {
  console.error(JSON.stringify({ level: "error", event: "seed.admin_failed", errorName: error?.name }));
  process.exit(1);
});
