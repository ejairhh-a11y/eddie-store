import type { Metadata } from "next";
import { Barlow_Condensed, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Fuentes de Stitch con next/font (Design.md §2.2): sin bloquear el render.
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-grotesk" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "Eddie Store — Yamaha Motocross", template: "%s · Eddie Store" },
  description: "Consulta precio y stock real de la gama Yamaha YZ 2025, simula tu cuota y agenda tu cita en el concesionario.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`dark ${barlow.variable} ${grotesk.variable} ${jetbrains.variable}`}>
      <head>
        {/* Material Symbols: fuente de iconos de Stitch (Design.md §2.4). display=block evita que se vea
            el nombre del icono como texto mientras carga. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-background font-body-md text-body-md text-on-background min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-secondary">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-space-md focus:py-space-sm focus:bg-primary-container focus:text-on-primary-container"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" className="flex-1 w-full">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
