// Indicador de 3 pasos del checkout de Stitch: Moto → Datos y horario → Confirmación (Design.md §3).
const STEPS = ["Moto", "Datos y horario", "Confirmación"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="grid grid-cols-3 gap-space-xs" aria-label="Pasos para agendar la cita">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "next";
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex items-center gap-space-sm p-space-sm rounded font-label-caps text-label-caps uppercase ${
              state === "current"
                ? "bg-primary-container text-on-primary-container"
                : state === "done"
                  ? "bg-surface-container-high text-secondary"
                  : "bg-surface-container-low text-outline"
            }`}
          >
            <span className="font-label-data text-label-data">{String(n).padStart(2, "0")}</span>
            <span className="truncate">{label}</span>
            {state === "done" && <span className="sr-only">(completado)</span>}
          </li>
        );
      })}
    </ol>
  );
}
