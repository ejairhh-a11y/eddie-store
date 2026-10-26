import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad" };

// Información de privacidad (ADR 0015, Design.md §10).
export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-2xl flex flex-col gap-space-md font-body-md text-body-md text-on-surface-variant">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile uppercase text-on-surface">Privacidad</h1>
      <p>
        <strong className="text-on-surface">Eddie Store</strong> es un concesionario ficticio creado para un proyecto académico. No
        tiene relación con Yamaha Motor Co., Ltd.
      </p>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Qué datos pedimos y para qué</h2>
      <p>
        Para agendar una cita pedimos tu nombre, tu email y tu teléfono. Los usamos solo para gestionar esa cita en el
        concesionario. No enviamos publicidad ni compartimos tus datos con terceros.
      </p>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Base legal</h2>
      <p>Medidas precontractuales a petición tuya: preparar la visita para comprar una moto.</p>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Cuánto tiempo los guardamos</h2>
      <p>
        Cuando la cita termina (vendida, cancelada o no te presentaste), tus datos se anonimizan 90 días después de la fecha de la
        cita. Solo conservamos la moto, la fecha y el estado, que no te identifican.
      </p>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Seguridad</h2>
      <p>
        La página de confirmación de tu cita usa un enlace secreto y muestra tu teléfono enmascarado. Solo el personal del
        concesionario, con usuario y contraseña, ve los datos completos.
      </p>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Servicios de terceros</h2>
      <p>
        Los iconos del sitio se cargan desde Google Fonts, por lo que Google recibe tu dirección IP al visitar cualquier página.
        No usamos cookies de seguimiento ni analítica de terceros.
      </p>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface">Tus derechos</h2>
      <p>Puedes pedir acceso, rectificación o supresión de tus datos escribiéndonos por WhatsApp con tu código de cita.</p>
    </article>
  );
}
