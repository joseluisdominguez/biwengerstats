// Los tres trofeos, en el orden en que se presentan (la Champions en medio). La clave es
// también el nombre de la columna en la pestaña Palmares del Sheet; el CSV sigue llegando
// como siempre (Jugador, Ligas, Copas, Champions), reordenar aquí solo cambia la vista.
export const TROFEOS = ["Ligas", "Champions", "Copas"];

/**
 * Ordena una lista de { Jugador, titulos } de más títulos a menos y, a igualdad, por orden
 * alfabético. Quien no suma nada queda fuera.
 *
 * El orden de las filas de la hoja no influye. Los empatados comparten posición y el siguiente
 * salta el hueco (1, 1, 3): numerarlos correlativos inventaría una jerarquía que los datos no
 * contienen.
 */
function rankear(filas) {
  const ordenados = filas
    .filter((fila) => fila.titulos > 0)
    .sort((a, b) => b.titulos - a.titulos || a.Jugador.localeCompare(b.Jugador));

  return ordenados.map((fila) => ({
    Jugador: fila.Jugador,
    titulos: fila.titulos,
    // La lista está ordenada, así que el primero con estos títulos marca la posición del grupo
    posicion: ordenados.findIndex((f) => f.titulos === fila.titulos) + 1,
  }));
}

/**
 * Clasificación de un trofeo concreto. Quien no lo haya ganado no aparece en su clasificación,
 * aunque tenga títulos en los otros dos.
 */
export function clasificacion(palmares, trofeo) {
  return rankear(
    palmares.map((fila) => ({ Jugador: fila.Jugador, titulos: fila[trofeo] }))
  );
}

/**
 * Clasificación general: suma de los tres trofeos por jugador, del que más acumula al que menos.
 */
export function clasificacionTotal(palmares) {
  return rankear(
    palmares.map((fila) => ({
      Jugador: fila.Jugador,
      titulos: TROFEOS.reduce((suma, trofeo) => suma + fila[trofeo], 0),
    }))
  );
}
