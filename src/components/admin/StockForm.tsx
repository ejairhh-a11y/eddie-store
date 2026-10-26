"use client";

import { useActionState } from "react";
import { stockAction, type ActionState } from "@/app/admin/actions";

export function StockForm({ slug, name, stockTotal }: { slug: string; name: string; stockTotal: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(stockAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-space-xs">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1">
        <span className="sr-only">Stock total de {name}</span>
        <input
          name="stockTotal"
          type="number"
          min={0}
          max={999}
          defaultValue={stockTotal}
          required
          className="w-24 bg-surface-container-lowest text-on-surface px-space-sm min-h-[44px] rounded border border-outline-variant font-label-data"
        />
      </label>
      <button type="submit" disabled={pending} className="px-space-sm min-h-[44px] rounded bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase disabled:opacity-60">
        {pending ? "…" : "Guardar"}
      </button>
      {state.message && (
        <span role="status" className={`w-full font-body-sm text-body-sm ${state.ok ? "text-secondary" : "text-error"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
