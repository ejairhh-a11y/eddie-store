import type { FieldErrors } from "@/lib/schemas";

// Contrato de resultado de las Server Actions y del dominio (ADR 0007).
export type ErrorCode =
  | "VALIDATION"
  | "SLOT_TAKEN"
  | "ALREADY_BOOKED"
  | "OUT_OF_STOCK"
  | "INVALID_STATE"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "RATE_LIMITED";

export type Ok<T> = { ok: true; data: T };
export type Fail<E = unknown> = { ok: false; code: ErrorCode; fieldErrors?: FieldErrors; details?: E };
export type Result<T, E = unknown> = Ok<T> | Fail<E>;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const fail = <E>(code: ErrorCode, extra: Omit<Fail<E>, "ok" | "code"> = {}): Fail<E> => ({
  ok: false,
  code,
  ...extra,
});
