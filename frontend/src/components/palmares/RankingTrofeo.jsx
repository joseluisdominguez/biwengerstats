// El podio se distingue del resto de la clasificación; los empatados comparten color
// porque comparten posición.
const COLOR_PODIO = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };

function Trofeo({ color }) {
  return (
    <svg
      className="w-5 h-5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 0 5H7" />
      <path d="M17 6h2.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

export default function RankingTrofeo({ titulo, acento, filas }) {
  return (
    <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg flex flex-col">
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: acento }} aria-hidden />
      <h2 className="px-5 py-3 border-b border-[#2a2a32] flex items-center gap-2 text-lg font-semibold">
        <Trofeo color={acento} />
        <span style={{ color: acento }}>{titulo}</span>
        {filas.length > 0 && (
          <span className="ml-auto text-xs font-normal text-gray-500 font-mono">
            {filas.length}
          </span>
        )}
      </h2>
      {filas.length > 0 ? (
        <ol className="p-2">
          {filas.map((fila) => {
            const colorPodio = COLOR_PODIO[fila.posicion];
            return (
              <li
                key={fila.Jugador}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span
                  className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center font-mono text-sm font-bold"
                  style={
                    colorPodio
                      ? { color: colorPodio, border: `1.5px solid ${colorPodio}` }
                      : { color: "#6b7280" }
                  }
                >
                  {fila.posicion}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{fila.Jugador}</span>
                <span className="font-mono font-bold text-lg" style={{ color: acento }}>
                  {fila.titulos}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-5 py-6 text-gray-500 text-sm">Aún sin ganadores.</p>
      )}
    </section>
  );
}
