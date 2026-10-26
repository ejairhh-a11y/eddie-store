import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb, getDb } from "@/server/db";
import { adminUsers } from "@/server/schema";
import { resetData } from "./helpers";

// SEC-04 / F4 [I]: la barrera real del panel es requireAdmin() (ADR 0008): sesión, expiración
// absoluta de 8 h y session_version vigente. Se simula la sesión de Auth.js.
const session = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/auth", () => ({ auth: async () => session.value, SESSION_MAX_AGE_S: 8 * 60 * 60 }));

const { requireAdmin } = await import("@/server/adminSession");

let adminId = "";
const nowS = () => Math.floor(Date.now() / 1000);

beforeEach(async () => {
  await resetData();
  const [a] = await getDb()
    .insert(adminUsers)
    .values({ email: "admin@example.com", name: "Admin", passwordHash: "x", sessionVersion: 3 })
    .returning({ id: adminUsers.id });
  adminId = a.id;
  session.value = { adminId, sessionVersion: 3, loginAt: nowS() };
});
afterAll(closeDb);

describe("requireAdmin", () => {
  it("acepta una sesión vigente", async () => {
    expect(await requireAdmin()).toEqual({ adminId });
  });

  it("rechaza sin sesión o con una sesión incompleta", async () => {
    session.value = null;
    expect(await requireAdmin()).toBeNull();
    session.value = { adminId };
    expect(await requireAdmin()).toBeNull();
  });

  it("rechaza una sesión de más de 8 horas aunque haya actividad", async () => {
    session.value = { adminId, sessionVersion: 3, loginAt: nowS() - 8 * 3600 - 5 };
    expect(await requireAdmin()).toBeNull();
    session.value = { adminId, sessionVersion: 3, loginAt: nowS() - 7 * 3600 };
    expect(await requireAdmin()).toEqual({ adminId });
  });

  it("rechaza una sesión con session_version desactualizada (revocada)", async () => {
    session.value = { adminId, sessionVersion: 2, loginAt: nowS() };
    expect(await requireAdmin()).toBeNull();
  });

  it("rechaza una sesión de un admin que ya no existe", async () => {
    session.value = { adminId: "00000000-0000-4000-8000-000000000000", sessionVersion: 3, loginAt: nowS() };
    expect(await requireAdmin()).toBeNull();
  });
});
