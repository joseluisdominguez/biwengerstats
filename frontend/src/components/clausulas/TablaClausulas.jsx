import { useEffect, useState } from "react";
import ClausulaCell from "./ClausulaCell";

// Cada cuánto se revisa si alguna cláusula ha quedado libre. El dato no cambia,
// pero el "libre el…" depende de la hora actual.
const REFRESCO_MS = 60_000;

export default function TablaClausulas({ clausulasData, clausulasLoading, esTemporadaEnCurso }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), REFRESCO_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mt-6 bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg p-4 w-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        Cláusulas por jugador (últimas fechas hacer/recibir)
      </h2>
      {!esTemporadaEnCurso ? (
        <p className="text-gray-500 text-sm">
          Las cláusulas solo aplican a la temporada en curso.
        </p>
      ) : clausulasLoading ? (
        <p className="text-gray-500 text-sm">Cargando cláusulas…</p>
      ) : clausulasData.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No hay datos de cláusulas o la URL no está configurada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#2a2a32]">
                <th className="text-left py-3 px-4">Jugador</th>
                <th className="text-left py-3 px-4">Clausula 1 hacer</th>
                <th className="text-left py-3 px-4">Clausula 2 hacer</th>
                <th className="text-left py-3 px-4">Clausula 1 recibir</th>
                <th className="text-left py-3 px-4">Clausula 2 recibir</th>
              </tr>
            </thead>
            <tbody>
              {clausulasData.map((r) => (
                <tr key={r.Jugador} className="border-b border-[#2a2a32]/60 hover:bg-white/5">
                  <td className="py-2.5 px-4 font-medium">{r.Jugador}</td>
                  <td className="py-2.5 px-4 text-gray-300">
                    <ClausulaCell value={r.Fecha1Hacer} now={now} />
                  </td>
                  <td className="py-2.5 px-4 text-gray-300">
                    <ClausulaCell value={r.Fecha2Hacer} now={now} />
                  </td>
                  <td className="py-2.5 px-4 text-gray-300">
                    <ClausulaCell value={r.Fecha1Recibir} now={now} />
                  </td>
                  <td className="py-2.5 px-4 text-gray-300">
                    <ClausulaCell value={r.Fecha2Recibir} now={now} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
