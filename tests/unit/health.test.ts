import { afterEach, describe, expect, it, vi } from "vitest";

// SPRINT0 DoD 3 y 4: contrato de GET /api/health.
async function callHealth(databaseUrl: string | undefined) {
  vi.resetModules();
  if (databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = databaseUrl;
  const { GET } = await import("@/app/api/health/route");
  return GET(new Request("http://localhost/api/health"));
}

const originalUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("devuelve 503 sin detalles cuando no hay DATABASE_URL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await callHealth(undefined);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error", db: "down" });
  });

  it("devuelve 503 sin filtrar la cadena de conexión cuando la base de datos no responde", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const unreachable = "postgresql://user:secret-password@127.0.0.1:1/eddie";
    const res = await callHealth(unreachable);

    expect(res.status).toBe(503);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ status: "error", db: "down" });
    expect(body).not.toContain("secret-password");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const logged = errorLog.mock.calls.map((args) => String(args[0])).join("\n");
    expect(logged).toContain("health.db_down");
    expect(logged).not.toContain("secret-password");
    expect(logged).not.toContain("127.0.0.1");
  });

  it.skipIf(!process.env.TEST_DATABASE_URL)("devuelve 200 con una base de datos real", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await callHealth(process.env.TEST_DATABASE_URL);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });
});
