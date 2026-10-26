import { stockLevel } from "@/server/availability";
import { Icon } from "./Icon";

// El estado de stock nunca se comunica solo por color: icono + texto (Design.md §2.1, WCAG 1.4.1).
export function StockBadge({ available, className = "" }: { available: number; className?: string }) {
  const level = stockLevel(available);
  const styles = {
    available: { cls: "bg-surface-container-lowest/90 text-secondary-container", icon: "check_circle", text: "Disponible" },
    low: {
      cls: "bg-surface-container-lowest/90 text-tertiary",
      icon: "warning",
      text: available === 1 ? "Última unidad" : `Últimas ${available} unidades`,
    },
    out: { cls: "bg-tertiary-container text-on-tertiary-container", icon: "block", text: "Agotada" },
  }[level];
  return (
    <span
      data-testid="stock-badge"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-data text-label-data uppercase font-bold ${styles.cls} ${className}`}
    >
      <Icon name={styles.icon} className="text-[14px]" />
      {styles.text}
    </span>
  );
}
