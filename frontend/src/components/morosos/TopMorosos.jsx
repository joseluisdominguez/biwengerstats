import { temporadaCorta } from "../../lib/temporada";

export default function TopMorosos({ topMorosos, temporadaEfectiva }) {
  return (
    <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg flex flex-col h-[420px] lg:h-[480px]">
      <h2 className="px-5 py-3 text-lg font-semibold border-b border-[#2a2a32] text-[#ff2d2d] flex-shrink-0">
        Top Morosos {temporadaCorta(temporadaEfectiva)}
      </h2>
      <div className="overflow-x-auto overflow-y-auto min-h-0 flex-1">
        {topMorosos.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#1a1a1f]">
              <tr className="text-gray-400 border-b border-[#2a2a32]">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3 px-4">Jugador</th>
                <th className="text-right py-3 px-4">Deuda generada</th>
              </tr>
            </thead>
            <tbody>
              {topMorosos.map((j, i) => (
                <tr key={j.Jugador} className="border-b border-[#2a2a32]/60 hover:bg-white/5">
                  <td className="py-2.5 px-4 font-mono text-gray-400">{i + 1}</td>
                  <td className="py-2.5 px-4 font-medium">{j.Jugador}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-[#ff2d2d]">
                    {j.Deuda_Generada} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-5 text-gray-500">
            Aún no se conocen los participantes de esta temporada.
          </p>
        )}
      </div>
    </section>
  );
}
