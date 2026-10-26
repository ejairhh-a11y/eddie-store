"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "", label: "Cilindrada: todas" },
  { value: "450", label: "450 cc" },
  { value: "250", label: "250 cc" },
  { value: "125", label: "125 cc" },
  { value: "85", label: "85 cc" },
  { value: "65", label: "65 cc" },
];

// Filtro de cilindrada: actualiza ?cc= conservando el resto de filtros.
export function CcSelect({ value }: { value?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="relative">
      <span className="sr-only">Cilindrada</span>
      <select
        value={value ? String(value) : ""}
        onChange={(e) => {
          const qs = new URLSearchParams(params.toString());
          if (e.target.value) qs.set("cc", e.target.value);
          else qs.delete("cc");
          const s = qs.toString();
          router.push(`${pathname}${s ? `?${s}` : ""}#catalogo`, { scroll: false });
        }}
        className="appearance-none bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-data text-label-data uppercase pl-space-sm pr-7 py-space-sm min-h-[44px] rounded cursor-pointer"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
