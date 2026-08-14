// Los tres trofeos, en el orden en que se presentan. La clave es también el nombre de la
// columna en la pestaña Palmares del Sheet.
export const TROFEOS = ["Ligas", "Copas", "Champions"];

/**
 * Clasificación de un trofeo: más títulos primero y, a igualdad, por orden alfabético.
 *
 * El orden de las filas de la hoja no influye. Quien no haya ganado nada en ese trofeo no
 * aparece en su clasificación, aunque tenga títulos en los otros dos.
 *
 * Los empatados comparten posición y el siguiente salta el hueco (1, 1, 3): numerarlos
 * correlativos inventaría una jerarquía que los datos no contienen.
 */
export function clasificacion(palmares, trofeo) {
  const ordenados = palmares
    .filter((fila) => fila[trofeo] > 0)
    .sort((a, b) => b[trofeo] - a[trofeo] || a.Jugador.localeCompare(b.Jugador));

  return ordenados.map((fila) => ({
    Jugador: fila.Jugador,
    titulos: fila[trofeo],
    // La lista está ordenada, así que el primero con estos títulos marca la posición del grupo
    posicion: ordenados.findIndex((f) => f[trofeo] === fila[trofeo]) + 1,
  }));
}
