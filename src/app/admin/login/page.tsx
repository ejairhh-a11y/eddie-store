import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Acceso concesionario", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <div className="max-w-md mx-auto px-margin-mobile py-space-3xl">
      <div className="bg-surface-container-high p-space-lg rounded flex flex-col gap-space-md">
        <h1 className="font-headline-md text-headline-md uppercase text-on-surface">Acceso concesionario</h1>
        <LoginForm />
      </div>
    </div>
  );
}
