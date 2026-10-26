"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isLocalDate, systemClock, today } from "@/lib/clock";
import { bookingSchema, fieldErrorsOf, type FieldErrors } from "@/lib/schemas";
import { createAppointment, freeSlots, type BookingFailure } from "@/server/booking";
import { STOCK_TAG } from "@/server/catalog";
import { getDb } from "@/server/db";
import { log } from "@/server/log";
import { allowBookingAttempt, recordBooking } from "@/server/rateLimit";
import { clientIpHmac } from "@/server/requestIp";
import type { ErrorCode } from "@/server/result";

// Server Actions de la cita (ADR 0007): validan con Zod, aplican los límites (ADR 0010) y
// devuelven códigos tipados. Nunca dejan escapar excepciones crudas.

export type BookingState = {
  code?: ErrorCode;
  fieldErrors?: FieldErrors;
  details?: BookingFailure;
  values?: Record<string, string>;
  /** Error inesperado: mensaje genérico, sin detalles técnicos (Design.md §6, ADR 0014). */
  serverError?: boolean;
};

export async function createAppointmentAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const values = { ...raw };
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { code: "VALIDATION", fieldErrors: fieldErrorsOf(parsed.error), values };

  const now = systemClock.now();
  const day = today(systemClock);
  const ip = await clientIpHmac();
  if (!(await allowBookingAttempt(ip, now, day))) {
    log("warn", "booking.rate_limited");
    return { code: "RATE_LIMITED", values };
  }

  let token: string;
  try {
    const result = await createAppointment(parsed.data, { today: day, ipHmac: ip });
    if (!result.ok) {
      log("info", "booking.rejected", { reason: result.code });
      return { code: result.code, fieldErrors: result.fieldErrors, details: result.details, values };
    }
    await recordBooking(ip, day);
    updateTag(STOCK_TAG);
    log("info", "booking.created", { code: result.data.code });
    token = result.data.token;
  } catch (error) {
    log("error", "booking.failed", { errorName: error instanceof Error ? error.name : "unknown" });
    return { serverError: true, values };
  }
  redirect(`/cita/${token}`);
}

/** Franjas libres de un día para el SlotPicker. */
export async function getSlotsAction(date: string): Promise<{ hour: number; free: boolean }[]> {
  if (!isLocalDate(date)) return [];
  return freeSlots(getDb(), date, today(systemClock));
}
