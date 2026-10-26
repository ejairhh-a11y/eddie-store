"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/admin/actions";

// Login del concesionario (Design.md §7): mensaje genérico, sin revelar qué campo falló.
export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-space-md">
      {state.message && (
        <p role="alert" className="p-space-sm rounded bg-error-container text-on-error-container font-body-md text-body-md">
          {state.message}
        </p>
      )}
      <div className="flex flex-col gap-space-xs">
        <label htmlFor="email" className="font-label-caps text-label-caps uppercase text-on-surface">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="bg-surface-container-lowest text-on-surface px-space-md py-space-sm min-h-[44px] rounded border border-outline-variant" />
      </div>
      <div className="flex flex-col gap-space-xs">
        <label htmlFor="password" className="font-label-caps text-label-caps uppercase text-on-surface">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="bg-surface-container-lowest text-on-surface px-space-md py-space-sm min-h-[44px] rounded border border-outline-variant" />
      </div>
      <button type="submit" disabled={pending} className="px-space-lg min-h-[48px] bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase rounded font-bold disabled:opacity-70">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
