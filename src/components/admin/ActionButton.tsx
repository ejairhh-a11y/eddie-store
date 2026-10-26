"use client";

import { useActionState } from "react";
import { appointmentAction, type ActionState } from "@/app/admin/actions";

// Botón de transición con confirmación; se deshabilita mientras la acción está en curso
// para evitar el doble clic (Design.md §7). La idempotencia real la da el servidor (ADR 0006 §3).
export function ActionButton({
  id,
  kind,
  label,
  confirmText,
  tone = "neutral",
}: {
  id: string;
  kind: "sell" | "cancel" | "noShow" | "cancelOrigin";
  label: string;
  confirmText: string;
  tone?: "primary" | "neutral" | "danger";
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(appointmentAction, {});
  const cls = {
    primary: "bg-primary-container text-on-primary-container hover:bg-secondary-container hover:text-on-secondary",
    neutral: "bg-surface-container-highest text-on-surface hover:bg-surface-bright",
    danger: "bg-tertiary-container text-on-tertiary-container hover:opacity-90",
  }[tone];
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button
        type="submit"
        disabled={pending}
        className={`px-space-sm min-h-[44px] rounded font-label-caps text-label-caps uppercase transition-colors disabled:opacity-60 ${cls}`}
      >
        {pending ? "…" : label}
      </button>
      {state.message && (
        <span role="status" className={`font-body-sm text-body-sm ${state.ok ? "text-secondary" : "text-error"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
