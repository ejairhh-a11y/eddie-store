import { z } from "zod";
import { isLocalDate } from "./clock";
import { TERMS } from "./finance";
import { SLOT_HOURS } from "./slots";

// Esquemas compartidos cliente/servidor (ADR 0007). Mensajes en español (Design.md §6).

/** Normaliza un teléfono a E.164. Un número de 9 cifras se asume español (+34). */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  const withPrefix = /^\d{9}$/.test(cleaned) ? `+34${cleaned}` : cleaned.replace(/^00/, "+");
  return /^\+\d{9,15}$/.test(withPrefix) ? withPrefix : null;
}

export const bookingSchema = z.object({
  moto: z.string().regex(/^[a-z0-9-]{2,30}$/, "Elige una moto"),
  date: z.string().refine(isLocalDate, "Elige un día válido"),
  hour: z.coerce
    .number()
    .int()
    .refine((h) => (SLOT_HOURS as readonly number[]).includes(h), "Elige una hora válida"),
  fullName: z.string().trim().min(2, "Escribe tu nombre completo").max(80, "El nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().pipe(z.email("Escribe un email válido")).pipe(z.string().max(120)),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) {
        ctx.addIssue({ code: "custom", message: "Escribe un teléfono válido (por ejemplo 612 345 678)" });
        return z.NEVER;
      }
      return p;
    }),
  entrada: z.coerce.number().int().min(0).optional().catch(undefined),
  plazo: z.coerce
    .number()
    .int()
    .refine((t) => (TERMS as readonly number[]).includes(t))
    .optional()
    .catch(undefined),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export type FieldErrors = Partial<Record<"moto" | "date" | "hour" | "fullName" | "email" | "phone", string>>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof FieldErrors;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});
