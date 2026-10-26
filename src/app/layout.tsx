import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eddie Store — Yamaha Motocross",
  description: "Concesionario Yamaha de motocross (proyecto académico ficticio).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
