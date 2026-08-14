import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { temporadaLarga } from "../../lib/temporada";
import { CHART_COLORS } from "./colores";
import LegendDeuda from "./LegendDeuda";

export default function EvolucionDeuda({ chartDataDeuda, jugadoresList, temporadaEfectiva }) {
  // Selección local de la leyenda: conjunto vacío significa "todas las líneas".
  const [seleccionados, setSeleccionados] = useState(() => new Set());

  const alternarJugador = (name) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const lineasVisibles =
    seleccionados.size === 0
      ? jugadoresList
      : jugadoresList.filter((j) => seleccionados.has(j));

  return (
    <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg p-4 w-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        Evolución de deuda acumulada (€) por jornada
      </h2>
      <p className="text-gray-500 text-sm mb-2">
        Haz clic en un nombre para mostrar solo esa línea; clic en varios para comparar. Vuelve a
        hacer clic para quitar. Las leyendas siempre muestran todos los jugadores.
      </p>
      <div className="h-80 w-full">
        {chartDataDeuda.length > 0 && jugadoresList.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataDeuda} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
              <XAxis
                dataKey="JornadaNombre"
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                interval={0}
              />
              <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1f",
                  border: "1px solid #2a2a32",
                  borderRadius: "8px",
                }}
                formatter={(value) => [`${value} €`, ""]}
                labelFormatter={(label) => label}
              />
              <Legend
                content={() => (
                  <LegendDeuda
                    jugadoresList={jugadoresList}
                    seleccionados={seleccionados}
                    onToggle={alternarJugador}
                  />
                )}
              />
              {lineasVisibles.map((jugador) => (
                <Line
                  key={jugador}
                  type="monotone"
                  dataKey={jugador}
                  name={jugador}
                  stroke={CHART_COLORS[jugadoresList.indexOf(jugador) % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 flex items-center justify-center h-full">
            La temporada {temporadaLarga(temporadaEfectiva)} aún no tiene jornadas disputadas.
          </p>
        )}
      </div>
    </section>
  );
}
