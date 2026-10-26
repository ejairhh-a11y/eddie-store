// Material Symbols (Design.md §2.4). Decorativo por defecto; con `label` se anuncia.
export function Icon({ name, className = "", label }: { name: string; className?: string; label?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
