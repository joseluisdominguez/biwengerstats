import { clasificacion, TROFEOS } from "../../lib/palmares";
import RankingTrofeo from "./RankingTrofeo";

// Color propio por trofeo, para que cada clasificación se distinga de un vistazo.
const ACENTO = {
  Ligas: "#ffd700",
  Copas: "#ff8c00",
  Champions: "#00d4ff",
};

export default function Palmares({ palmares, loading, error }) {
  if (loading) {
    return <p className="text-gray-500 py-10 text-center">Cargando palmarés…</p>;
  }

  if (error) {
    return (
      <div className="bg-[#1a1a1f] border border-[#ff2d2d] rounded-xl p-6 max-w-md mx-auto text-center">
        <p className="text-[#ff2d2d] font-semibold mb-2">No se ha podido cargar el palmarés</p>
        <p className="text-gray-400 text-sm">{error}</p>
        <p className="text-gray-500 text-xs mt-4">Revisa VITE_CSV_PALMARES en .env</p>
      </div>
    );
  }

  if (palmares.length === 0) {
    return (
      <p className="text-gray-500 py-10 text-center">
        Todavía no hay ningún palmarés registrado.
      </p>
    );
  }

  return (
    <>
      <p className="text-gray-400 text-sm mb-6">
        Títulos acumulados de todas las temporadas. Quien no ha ganado un trofeo no aparece en
        su clasificación.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {TROFEOS.map((trofeo) => (
          <RankingTrofeo
            key={trofeo}
            titulo={trofeo}
            acento={ACENTO[trofeo]}
            filas={clasificacion(palmares, trofeo)}
          />
        ))}
      </div>
    </>
  );
}
