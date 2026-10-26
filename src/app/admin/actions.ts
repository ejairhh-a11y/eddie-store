"use server";

import { AuthError } from "next-auth";
import { revalidatePath, updateTag } from "next/cache";
import { signIn, signOut } from "@/auth";
import { systemClock, today } from "@/lib/clock";
import { requireAdmin } from "@/server/adminSession";
import { adjustStock, cancelSameOrigin, transition, type Transition } from "@/server/appointmentState";
import { STOCK_TAG } from "@/server/catalog";
import { log } from "@/server/log";

// Server Actions del panel (ADR 0007, 0008). Cada una verifica la sesión dentro de la acción.

export type ActionState = { message?: string; ok?: boolean };

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  NOT_FOUND: "La cita ya no existe.",
  INVALID_STATE: "Esa acción ya se aplicó o no está permitida para esta cita.",
  OUT_OF_STOCK: "No queda unidad disponible: cancela otra cita o ajusta el stock.",
  VALIDATION: "El stock no puede ser menor que las citas pendientes vigentes.",
};

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
      return { message: limited ? "Demasiados intentos. Inténtalo más tarde." : "Credenciales inválidas" };
    }
    throw error; // NEXT_REDIRECT tras un login correcto
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function appointmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { message: MESSAGES.UNAUTHORIZED };
  const id = String(formData.get("id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const ctx = { adminId: admin.adminId, today: today(systemClock), now: systemClock.now() };

  if (kind === "cancelOrigin") {
    const r = await cancelSameOrigin(id, ctx);
    if (!r.ok) return { message: MESSAGES[r.code] };
    updateTag(STOCK_TAG);
    revalidatePath("/admin");
    log("info", "admin.cancel_origin", { cancelled: r.data.cancelled });
    return { ok: true, message: `Canceladas ${r.data.cancelled} citas de ese origen.` };
  }
  if (!["sell", "cancel", "noShow"].includes(kind)) return { message: MESSAGES.INVALID_STATE };
  const r = await transition(kind as Transition, id, ctx);
  if (!r.ok) return { message: MESSAGES[r.code] ?? "No se pudo completar la acción." };
  updateTag(STOCK_TAG);
  revalidatePath("/admin");
  log("info", "admin.transition", { kind, status: r.data.status });
  return { ok: true };
}

export async function stockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { message: MESSAGES.UNAUTHORIZED };
  const slug = String(formData.get("slug") ?? "");
  const total = Number(formData.get("stockTotal"));
  const r = await adjustStock(slug, total, { today: today(systemClock), now: systemClock.now() });
  if (!r.ok) return { message: MESSAGES[r.code] ?? "Valor no válido." };
  updateTag(STOCK_TAG);
  revalidatePath("/admin/stock");
  log("info", "admin.stock", { slug, stockTotal: r.data.stockTotal });
  return { ok: true, message: "Stock actualizado." };
}
