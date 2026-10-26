// Datos del concesionario (PRD › Supuestos: un solo concesionario, en Madrid; datos ficticios).
export const DEALER = {
  name: "Eddie Store",
  address: "Polígono Motorsport, Box 14 · 28000 Madrid, España",
  phoneDisplay: "+34 600 000 000",
  hours: "Lunes a sábado · 10:00 – 19:00",
} as const;

/** Número de WhatsApp de demostración, configurable por entorno (PRD › Alcance). */
export function whatsappNumber(): string {
  return (process.env.WHATSAPP_NUMBER ?? "34600000000").replace(/\D/g, "");
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(text)}`;
}
