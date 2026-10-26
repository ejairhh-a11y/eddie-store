import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";

export function AdminNav({ current }: { current: "citas" | "stock" }) {
  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-space-sm min-h-[44px] inline-flex items-center rounded font-label-caps text-label-caps uppercase ${
        active ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-space-sm">
      <nav aria-label="Panel" className="flex gap-space-xs">
        {link("/admin", "Citas", current === "citas")}
        {link("/admin/stock", "Stock", current === "stock")}
      </nav>
      <form action={logoutAction}>
        <button type="submit" className="px-space-sm min-h-[44px] rounded bg-surface-container-highest text-on-surface font-label-caps text-label-caps uppercase">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
