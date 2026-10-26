// Nombres fijos de las restricciones. La traducción de errores 23505 depende de ellos
// (ADR 0006 §2): renombrarlos en una migración rompe el mapeo, por eso se comparten.
export const CONSTRAINTS = {
  slotPending: "appointments_slot_pending_uq",
  emailPending: "appointments_email_pending_uq",
  phonePending: "appointments_phone_pending_uq",
  code: "appointments_code_uq",
  accessTokenHash: "appointments_access_token_hash_uq",
} as const;
