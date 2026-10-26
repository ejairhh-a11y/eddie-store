import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { StockForm } from "@/components/admin/StockForm";
import { systemClock, today } from "@/lib/clock";
import { requireAdmin } from "@/server/adminSession";
import { listWithStock } from "@/server/availability";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Panel · Stock", robots: { index: false, follow: false } };

// Panel de stock: total, apartadas y disponible por modelo (Design.md §7; BACKLOG #14).
export default function AdminStockPage() {
  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile uppercase text-on-surface">Stock</h1>
      <Suspense fallback={<div className="h-[400px] bg-surface-container-low rounded" aria-hidden />}>
        <StockTable />
      </Suspense>
    </div>
  );
}

async function StockTable() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const rows = await listWithStock(getDb(), today(systemClock));
  return (
    <>
      <AdminNav current="stock" />
      <table className="w-full">
        <thead>
          <tr className="font-label-caps text-label-caps uppercase text-outline text-left">
            <th scope="col" className="py-space-xs">Modelo</th>
            <th scope="col" className="py-space-xs">Total</th>
            <th scope="col" className="py-space-xs">Apartadas</th>
            <th scope="col" className="py-space-xs">Disponible</th>
            <th scope="col" className="py-space-xs">Ajustar total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.slug} className="border-t border-outline-variant font-label-data text-label-data text-on-surface">
              <th scope="row" className="py-space-sm text-left font-body-md text-body-md">{m.name}</th>
              <td>{m.stockTotal}</td>
              <td>{m.stockTotal - m.available}</td>
              <td className={m.available === 0 ? "text-tertiary" : "text-secondary-container"}>{m.available}</td>
              <td className="py-space-sm">
                <StockForm slug={m.slug} name={m.name} stockTotal={m.stockTotal} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
