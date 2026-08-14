import { useEffect } from "react";

export default function JornadaModal({ jornadas, jornadaActivaIndex, onSeleccionar, onCerrar }) {
  useEffect(() => {
    const onEscape = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar jornada"
    >
      <div
        className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[#2a2a32] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#ff8c00]">Elegir jornada</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg border border-[#2a2a32] bg-[#25252b] text-gray-400 hover:text-[#e2e2e8] hover:bg-[#2a2a32] flex items-center justify-center"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {jornadas.map(({ id, index, name }) => {
            const isSelected = index === jornadaActivaIndex;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSeleccionar(index)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-[#ff8c00]/20 border-[#ff8c00] text-[#ff8c00] font-medium"
                    : "border-transparent hover:bg-white/5 text-[#e2e2e8]"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
