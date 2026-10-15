// Una cagaita es el perdón de una venta al mercado hecha por error: una por participante y
// temporada. La norma la aplica la liga; aquí solo se cruza lo que dice la hoja con los
// participantes de la temporada para poder señalarlo en Top Morosos.

/** Clave de emparejamiento: sin espacios en los extremos y sin distinguir mayúsculas. */
function claveNombre(nombre) {
  return String(nombre ?? "").trim().toLocaleLowerCase();
}

/**
 * Cagaitas de una temporada cruzadas con sus participantes.
 *
 * @param {{ Temporada: string, Jugador: string, Fecha: string, Futbolista: string }[]} cagaitas
 * @param {string} temporada slug de la temporada, p. ej. "2026-2027"
 * @param {string[]} roster participantes de esa temporada, tal como se muestran
 * @returns {{ porJugador: Map<string, object[]>, sinAsignar: string[] }}
 *   `porJugador` va indexado por el nombre del roster, no por el de la hoja, para que la tabla
 *   pueda buscar con el nombre que pinta. `sinAsignar` son los nombres de la hoja que no
 *   coinciden con nadie, sin repetir.
 *
 * Con el roster vacío no se asigna nada ni se da nada por huérfano: todavía no se sabe quién
 * juega, así que no hay con qué cruzar.
 */
export function cagaitasDeTemporada(cagaitas, temporada, roster) {
  const porJugador = new Map();
  if (roster.length === 0) return { porJugador, sinAsignar: [] };

  const nombrePorClave = new Map(roster.map((nombre) => [claveNombre(nombre), nombre]));
  const sinAsignar = new Map();

  for (const cagaita of cagaitas) {
    if (cagaita.Temporada !== temporada) continue;
    const clave = claveNombre(cagaita.Jugador);
    const nombre = nombrePorClave.get(clave);
    if (nombre) {
      porJugador.set(nombre, [...(porJugador.get(nombre) ?? []), cagaita]);
    } else if (!sinAsignar.has(clave)) {
      sinAsignar.set(clave, cagaita.Jugador.trim());
    }
  }

  return { porJugador, sinAsignar: [...sinAsignar.values()] };
}

/** "12/10/2026 · vendió a Pedri", omitiendo lo que esté en blanco. */
export function detalleCagaita({ Fecha, Futbolista }) {
  const partes = [Fecha, Futbolista && `vendió a ${Futbolista}`].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : "Usó su cagaita";
}
