import { DEUDA_ALTA } from "../../config";
import { temporadaLarga } from "../../lib/temporada";

export default function DesastreJornada({
  temporadaEfectiva,
  currentJornadaId,
  currentJornadaNombre,
  currentJornadaData,
  canGoPrev,
  canGoNext,
  onAnterior,
  onSiguiente,
  onElegirJornada,
}) {
  return (
    <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg flex flex-col h-[420px] lg:h-[480px]">
      <div className="px-5 py-3 border-b border-[#2a2a32] flex items-center justify-between gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onAnterior}
          disabled={!canGoPrev}
          className="flex-shrink-0 w-10 h-10 rounded-lg border border-[#2a2a32] bg-[#25252b] text-[#e2e2e8] hover:bg-[#2a2a32] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg"
          aria-label="Jornada anterior"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onElegirJornada}
          className="min-w-0 flex-1 text-lg font-semibold text-[#ff8c00] text-center hover:text-[#ff9c20] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/50 rounded px-1 py-0.5 inline-flex items-center justify-center gap-1"
          title="Elegir jornada"
        >
          <span className="truncate">Desastre de la {currentJornadaNombre || "…"}</span>
          <svg
            className="flex-shrink-0 w-4 h-4 opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={!canGoNext}
          className="flex-shrink-0 w-10 h-10 rounded-lg border border-[#2a2a32] bg-[#25252b] text-[#e2e2e8] hover:bg-[#2a2a32] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg"
          aria-label="Jornada siguiente"
        >
          ›
        </button>
      </div>
      <div className="overflow-x-auto overflow-y-auto min-h-0 flex-1">
        {currentJornadaData.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#2a2a32]">
                <th className="text-left py-3 px-4">Pos</th>
                <th className="text-left py-3 px-4">Jugador</th>
                <th className="text-right py-3 px-4">Puntos</th>
                <th className="text-right py-3 px-4">Deuda</th>
              </tr>
            </thead>
            <tbody>
              {currentJornadaData
                .filter((r) => r.Deuda_Generada > 0)
                .map((r) => (
                  <tr
                    key={`${r.Jornada}-${r.Jugador}`}
                    className={
                      r.Deuda_Generada >= DEUDA_ALTA
                        ? "bg-[#ff2d2d]/15 border-l-4 border-[#ff2d2d]"
                        : "bg-[#ff8c00]/10 border-l-4 border-[#ff8c00]"
                    }
                  >
                    <td className="py-2.5 px-4 font-mono">{r.Posicion}</td>
                    <td className="py-2.5 px-4 font-medium">{r.Jugador}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{r.Puntos}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          r.Deuda_Generada >= DEUDA_ALTA
                            ? "text-[#ff2d2d]"
                            : "text-[#ff8c00]"
                        }
                      >
                        {r.Deuda_Generada} €
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="p-5 text-gray-500">
            {currentJornadaId != null
              ? "No hay jugadores con deuda en esta jornada."
              : `La temporada ${temporadaLarga(temporadaEfectiva)} aún no tiene jornadas disputadas.`}
          </p>
        )}
      </div>
    </section>
  );
}
