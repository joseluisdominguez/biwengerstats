import { useId, useState } from "react";
import { temporadaCorta } from "../../lib/temporada";
import { DetalleCagaita, MarcaCagaita } from "./MarcaCagaita";

// Fuera de la zona con scroll: la leyenda se ve sin bajar hasta el final de la tabla
function PieTarjeta({ children }) {
  return (
    <footer className="px-5 py-2.5 border-t border-[#2a2a32] text-xs text-gray-500 flex-shrink-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {children}
    </footer>
  );
}

/**
 * Pie de la tarjeta con lo que significa la marca. Solo aparece cuando hay algo que contar:
 * una temporada sin cagaitas se queda exactamente como antes.
 */
function LeyendaCagaitas({ cagaitas, cagaitasError, participantes }) {
  if (cagaitasError) {
    return <PieTarjeta>💩 No se han podido cargar las cagaitas.</PieTarjeta>;
  }
  if (!cagaitas) return null;

  const usadas = cagaitas.porJugador.size;
  const { sinAsignar } = cagaitas;
  if (usadas === 0 && sinAsignar.length === 0) return null;

  return (
    <PieTarjeta>
      {usadas > 0 && (
        <span>
          💩 Ya han usado su cagaita:{" "}
          <span className="font-mono text-gray-300">
            {usadas} de {participantes}
          </span>
        </span>
      )}
      {sinAsignar.length > 0 && (
        <span
          className="text-[#ff8c00]"
          title="Estos nombres de la hoja no coinciden con ningún participante de la temporada"
        >
          ⚠ Sin asignar: {sinAsignar.join(", ")}
        </span>
      )}
    </PieTarjeta>
  );
}

export default function TopMorosos({ topMorosos, temporadaEfectiva, cagaitas, cagaitasError }) {
  const prefijoId = useId();
  // Filas con el detalle de la cagaita a la vista. App monta este componente con la temporada
  // como key, así que al cambiar de temporada se empieza siempre con todo plegado.
  const [nombresDesplegados, setNombresDesplegados] = useState([]);

  const alternar = (nombre) =>
    setNombresDesplegados((actuales) =>
      actuales.includes(nombre) ? actuales.filter((n) => n !== nombre) : [...actuales, nombre]
    );

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
              {topMorosos.map((j, i) => {
                const suyas = cagaitas?.porJugador.get(j.Jugador);
                const desplegada = Boolean(suyas) && nombresDesplegados.includes(j.Jugador);
                const idDetalle = `${prefijoId}-cagaita-${i}`;
                return (
                  <tr key={j.Jugador} className="border-b border-[#2a2a32]/60 hover:bg-white/5">
                    <td className="py-2.5 px-4 font-mono text-gray-400 align-top">{i + 1}</td>
                    <td className="py-2.5 px-4 font-medium">
                      {/* En línea con el texto: si el nombre parte en dos líneas, la marca
                          sigue pegada a la última palabra en vez de irse al borde */}
                      <span>{j.Jugador}</span>
                      {suyas && (
                        <MarcaCagaita
                          jugador={j.Jugador}
                          cagaitas={suyas}
                          desplegada={desplegada}
                          idDetalle={idDetalle}
                          onAlternar={() => alternar(j.Jugador)}
                        />
                      )}
                      {desplegada && <DetalleCagaita id={idDetalle} cagaitas={suyas} />}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#ff2d2d] align-top">
                      {j.Deuda_Generada} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="p-5 text-gray-500">
            Aún no se conocen los participantes de esta temporada.
          </p>
        )}
      </div>
      <LeyendaCagaitas
        cagaitas={cagaitas}
        cagaitasError={cagaitasError}
        participantes={topMorosos.length}
      />
    </section>
  );
}
