/**
 * Logger estructurado (ADR 0014). Es la única vía para escribir logs en el servidor.
 *
 * Prohibido incluir en `fields`: nombre, email, teléfono, token de acceso o IP (ni en claro ni
 * en HMAC). Las citas se identifican por su `code`.
 */
type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null;

export function log(level: LogLevel, event: string, fields: Record<string, LogValue> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
