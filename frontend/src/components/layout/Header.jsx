import { temporadaCorta, temporadaLarga } from "../../lib/temporada";

const ORO = "#ffd700";

function IconoMedalla() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 2.5 4.5 8" />
      <path d="M17 2.5 19.5 8" />
      <circle cx="12" cy="15" r="6.5" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
  );
}

function BotonPalmares({ activo, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Palmarés histórico"
      aria-current={activo ? "page" : undefined}
      title="Palmarés histórico"
      className="flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50"
      style={
        activo
          ? { color: ORO, borderColor: ORO, backgroundColor: "rgba(255,215,0,0.12)" }
          : { color: "#9ca3af", borderColor: "#2a2a32", backgroundColor: "#25252b" }
      }
    >
      <IconoMedalla />
    </button>
  );
}

export default function Header({
  temporadaEfectiva,
  temporadasDisponibles,
  temporadaEnCurso,
  onSeleccionarTemporada,
  ultimaJornadaNombre,
  boteTeorico,
  hayPalmares,
  enPalmares,
  onAbrirPalmares,
  onVolver,
}) {
  // En el palmarés no se muestran ni el selector de temporada ni el bote: son datos de una
  // temporada y sobre un histórico no significan nada.
  if (enPalmares) {
    return (
      <header className="border-b border-[#2a2a32] bg-[#1a1a1f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver a la clasificación"
            className="flex-shrink-0 w-10 h-10 rounded-lg border border-[#2a2a32] bg-[#25252b] text-[#e2e2e8] hover:bg-[#2a2a32] flex items-center justify-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50"
          >
            ‹
          </button>
          <h1 className="min-w-0 flex-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">
            <span style={{ color: ORO }}>Palmarés</span>
            <span className="text-gray-400 text-lg font-normal"> — histórico</span>
          </h1>
          <BotonPalmares activo onClick={onVolver} />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[#2a2a32] bg-[#1a1a1f]/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              <span className="text-white">
                🏆La LigaDiarios📝🏆{temporadaCorta(temporadaEfectiva)}⚽
              </span>
              <span className="text-[#00ff88]"> — Biwenger</span>
            </h1>
            {temporadasDisponibles.length > 1 && (
              <label className="inline-flex items-center gap-2">
                <span className="sr-only">Temporada</span>
                <select
                  value={temporadaEfectiva}
                  onChange={(e) => onSeleccionarTemporada(e.target.value)}
                  className="rounded-lg border border-[#2a2a32] bg-[#25252b] text-[#e2e2e8] text-sm px-3 py-1.5 hover:bg-[#2a2a32] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 cursor-pointer"
                >
                  {temporadasDisponibles.map((slug) => (
                    <option key={slug} value={slug}>
                      {temporadaLarga(slug)}
                      {slug === temporadaEnCurso ? " (en curso)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {ultimaJornadaNombre
              ? `Datos hasta la ${ultimaJornadaNombre}`
              : `La temporada ${temporadaLarga(temporadaEfectiva)} aún no ha comenzado`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-gray-400 text-sm">
              Bote {temporadaCorta(temporadaEfectiva)} (deuda generada):
            </span>
            <span className="text-[#ff2d2d] font-mono font-bold text-lg drop-shadow-[0_0_8px_rgba(255,45,45,0.5)]">
              {boteTeorico} €
            </span>
          </div>
          {hayPalmares && <BotonPalmares activo={false} onClick={onAbrirPalmares} />}
        </div>
      </div>
    </header>
  );
}
