import { headers } from "next/headers";
import { ipHmac } from "./codes";

/** IP del cliente en HMAC (ADR 0010). En Vercel, x-forwarded-for lo fija la plataforma. */
export async function clientIpHmac(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return ipHmac(ip);
}
