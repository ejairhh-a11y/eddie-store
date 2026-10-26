"use server";

import { AuthError } from "next-auth";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { systemClock, today } from "@/lib/clock";
import { requireAdmin } from "@/server/adminSession";
import { adjustStock, cancelSameOrigin, transition } from "@/server/appointmentState";
import { STOCK_TAG } from "@/server/catalog";
import { log } from "@/server/log";
import type { ErrorCode } from "@/server/result";

// Server Actions del panel (ADR 0007, 0008). Cada una verifica la sesión dentro de la acción,
// valida la entrada con Zod y devuelve un resultado tipado: nunca deja escapar una excepción cruda.

export type ActionState = { message?: string; ok?: boolean; code?: ErrorCode };

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  NOT_FOUND: "La cita ya no existe.",
  INVALID_STATE: "Esa acción ya se aplicó o no está permitida para esta cita.",
  OUT_OF_STOCK: "No queda unidad disponible: cancela otra cita o ajusta el stock.",
  VALIDATION: "El valor no es válido o el stock sería menor que las citas pendientes vigentes.",
};
const GENERIC = "No pudimos completar la acción. Inténtalo de nuevo.";

const appointmentActionSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["sell", "cancel", "noShow", "cancelOrigin"]),
});
const stockActionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,30}$/),
  stockTotal: z.coerce.number().int().min(0).max(999),
});

const fail = (code: ErrorCode): ActionState => ({ code, message: MESSAGES[code] ?? GENERIC });
const form = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/admin",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      const limited = (error as AuthError & { code?: string }).code === "rate_limited";
      return { code: limited ? "RATE_LIMITED" : "UNAUTHORIZED", message: limited ? "Demasiados intentos. Inténtalo más tarde." : "Credenciales inválidas" };
    }
    throw error; // NEXT_REDIRECT tras un login correcto
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function appointmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("UNAUTHORIZED");
  const parsed = appointmentActionSchema.safeParse(form(formData));
  if (!parsed.success) return fail("VALIDATION");
  const { id, kind } = parsed.data;
  const ctx = { adminId: admin.adminId, today: today(systemClock), now: systemClock.now() };

  try {
    if (kind === "cancelOrigin") {
      const r = await cancelSameOrigin(id, ctx);
      if (!r.ok) return fail(r.code);
      updateTag(STOCK_TAG);
      revalidatePath("/admin");
      log("info", "admin.cancel_origin", { cancelled: r.data.cancelled });
      return { ok: true, message: `Canceladas ${r.data.cancelled} citas de ese origen.` };
    }
    const r = await transition(kind, id, ctx);
    if (!r.ok) return fail(r.code);
    updateTag(STOCK_TAG);
    revalidatePath("/admin");
    log("info", "admin.transition", { kind, status: r.data.status });
    return { ok: true };
  } catch (error) {
    log("error", "admin.action_failed", { kind, errorName: error instanceof Error ? error.name : "unknown" });
    return { message: GENERIC };
  }
}

export async function stockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("UNAUTHORIZED");
  const parsed = stockActionSchema.safeParse(form(formData));
  if (!parsed.success) return fail("VALIDATION");
  try {
    const r = await adjustStock(parsed.data.slug, parsed.data.stockTotal, { today: today(systemClock), now: systemClock.now() });
    if (!r.ok) return fail(r.code);
    updateTag(STOCK_TAG);
    revalidatePath("/admin/stock");
    log("info", "admin.stock", { slug: parsed.data.slug, stockTotal: r.data.stockTotal });
    return { ok: true, message: "Stock actualizado." };
  } catch (error) {
    log("error", "admin.action_failed", { kind: "stock", errorName: error instanceof Error ? error.name : "unknown" });
    return { message: GENERIC };
  }
}
