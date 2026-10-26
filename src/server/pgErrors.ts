// Lee el código y la restricción de un error de Postgres, aunque Drizzle lo envuelva en `cause`.
export function pgErrorOf(error: unknown): { code?: string; constraint?: string } {
  let e: unknown = error;
  for (let i = 0; i < 3 && e; i++) {
    const { code, constraint } = e as { code?: unknown; constraint?: unknown };
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, constraint: typeof constraint === "string" ? constraint : undefined };
    }
    e = (e as { cause?: unknown }).cause;
  }
  return {};
}
