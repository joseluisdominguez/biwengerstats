import { detalleCagaita } from "../../lib/cagaitas";

// Tono propio de las cagaitas: cálido y apagado, para no competir con el rojo y el naranja
// de la deuda, que es lo que manda en esta tabla.
const ACENTO_CAGAITA = "#d4a373";

/**
 * Marca 💩 junto al nombre de quien ha gastado su cagaita. Es un botón, no un adorno: en
 * móvil no hay hover, así que el detalle se despliega al tocarla. El `title` queda como atajo
 * para quien pasa el ratón.
 */
export function MarcaCagaita({ jugador, cagaitas, desplegada, idDetalle, onAlternar }) {
  const resumen = cagaitas.map(detalleCagaita).join("\n");

  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={desplegada}
      aria-controls={idDetalle}
      aria-label={`Cagaita usada por ${jugador}`}
      title={resumen}
      className="ml-1.5 -my-1 w-7 h-7 align-middle rounded-md text-sm leading-none inline-flex items-center justify-center border transition-[background-color,border-color,transform] duration-150 hover:bg-white/10 active:scale-90 focus:outline-none focus-visible:ring-2 cursor-pointer"
      style={{
        borderColor: desplegada ? ACENTO_CAGAITA : "transparent",
        backgroundColor: desplegada ? "rgba(212,163,115,0.14)" : undefined,
        "--tw-ring-color": "rgba(212,163,115,0.6)",
      }}
    >
      <span aria-hidden>💩</span>
    </button>
  );
}

/** Línea desplegada bajo el nombre: una entrada por cagaita registrada en la temporada. */
export function DetalleCagaita({ id, cagaitas }) {
  return (
    <ul
      id={id}
      className="mt-1.5 pl-2.5 border-l-2 text-xs font-normal text-gray-400 space-y-0.5"
      style={{ borderColor: ACENTO_CAGAITA }}
    >
      {cagaitas.map((cagaita, i) => (
        <li key={i}>{detalleCagaita(cagaita)}</li>
      ))}
    </ul>
  );
}
