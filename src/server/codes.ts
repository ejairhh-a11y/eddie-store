import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

// Identificadores de cita (ADR 0011): código legible sin ambigüedades + token secreto de 128 bits.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 símbolos: sin 0/O, 1/I/L

export function generateCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `YZ-${s}`;
}

export function generateAccessToken(): string {
  return randomBytes(16).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** IP identificada con HMAC y secreto (ADR 0010): un SHA-256 simple se invierte sobre IPv4. */
export function ipHmac(ip: string): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) throw new Error("RATE_LIMIT_SECRET no está configurada");
  return createHmac("sha256", secret).update(ip).digest("hex");
}
