import { CHART_COLORS } from "./colores";

// Un nombre más largo desborda la fila de leyendas en móvil.
const MAX_NOMBRE = 14;
const CORTE_NOMBRE = 12;

export default function LegendDeuda({ jugadoresList, seleccionados, onToggle }) {
  if (!jugadoresList || !jugadoresList.length) return null;
  return (
    <div
      className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2"
      style={{ fontSize: "12px" }}
    >
      {jugadoresList.map((name, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const isSelected = seleccionados.size === 0 || seleccionados.has(name);
        return (
          <button
            key={name}
            type="button"
            onClick={() => onToggle(name)}
            className="inline-flex items-center gap-1.5 hover:opacity-100 transition-opacity"
            style={{
              opacity: isSelected ? 1 : 0.4,
              color,
              cursor: "pointer",
            }}
          >
            <span style={{ width: 10, height: 2, backgroundColor: color }} aria-hidden />
            {name.length > MAX_NOMBRE ? name.slice(0, CORTE_NOMBRE) + "…" : name}
          </button>
        );
      })}
    </div>
  );
}
