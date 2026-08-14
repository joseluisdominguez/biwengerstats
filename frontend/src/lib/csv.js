import Papa from "papaparse";
import { CLAUSULAS_LABEL_TEMPORADA, TEMPORADA_POR_DEFECTO } from "../config";

export function parseNum(val) {
  if (val === "" || val == null) return 0;
  const n = Number(String(val).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function descargarFilas(url, opciones) {
  return fetch(url)
    .then((r) => r.text())
    .then((text) => Papa.parse(text, { header: false, ...opciones }).data || []);
}

/**
 * Historial_Jornadas. El CSV no lleva cabecera y admite tres anchos:
 * 7 columnas: Jornada, Nombre_Jornada, Jugador, Puntos, Posicion, Deuda_Generada, Temporada
 * 6 columnas: sin Temporada (filas anteriores a este cambio → TEMPORADA_POR_DEFECTO)
 * 5 columnas (legacy): Jornada, Jugador, Puntos, Posicion, Deuda_Generada
 */
export function fetchHistorial(url) {
  return descargarFilas(url, { skipEmptyLines: true }).then((rows) =>
    rows
      .filter((row) => Array.isArray(row) && row.length >= 5)
      .map((row) =>
        row.length >= 6
          ? {
              Jornada: parseNum(row[0]),
              Nombre_Jornada: String(row[1] ?? "").trim(),
              Jugador: String(row[2] ?? "").trim(),
              Puntos: parseNum(row[3]),
              Posicion: parseNum(row[4]),
              Deuda_Generada: parseNum(row[5]),
              Temporada: String(row[6] ?? "").trim() || TEMPORADA_POR_DEFECTO,
            }
          : {
              Jornada: parseNum(row[0]),
              Nombre_Jornada: "",
              Jugador: String(row[1] ?? "").trim(),
              Puntos: parseNum(row[2]),
              Posicion: parseNum(row[3]),
              Deuda_Generada: parseNum(row[4]),
              Temporada: TEMPORADA_POR_DEFECTO,
            }
      )
  );
}

/** Una celda cuenta como recuento solo si trae un número; el vacío no lo es. */
function esRecuento(val) {
  const s = String(val ?? "").trim();
  return s !== "" && !Number.isNaN(Number(s.replace(",", ".")));
}

/**
 * Palmares. Pestaña manual, columnas: Jugador, Ligas, Copas, Champions.
 *
 * La cabecera se detecta en lugar de asumirse: quien mantiene la hoja a mano casi seguro
 * querrá una fila de títulos, pero podría no ponerla. Si ninguna de las tres columnas de
 * recuento de la primera fila trae un número, esa fila es la cabecera y se descarta.
 */
export function fetchPalmares(url) {
  return descargarFilas(url, { skipEmptyLines: true }).then((rows) => {
    const [primera] = rows;
    const hayCabecera =
      Array.isArray(primera) &&
      !esRecuento(primera[1]) &&
      !esRecuento(primera[2]) &&
      !esRecuento(primera[3]);

    return rows
      .slice(hayCabecera ? 1 : 0)
      .filter((row) => Array.isArray(row) && String(row[0] ?? "").trim())
      .map((row) => ({
        Jugador: String(row[0]).trim(),
        Ligas: parseNum(row[1]),
        Copas: parseNum(row[2]),
        Champions: parseNum(row[3]),
      }));
  });
}

/**
 * Clausulas. Fila 1 = jugadores (desde la columna B), filas 2-5 = fechas de recibir y hacer.
 * La fila del manifiesto de temporada se busca por su etiqueta en la columna A, no por posición.
 */
export function fetchClausulas(url) {
  return descargarFilas(url, { skipEmptyLines: false }).then((rows) => {
    const manifiesto = rows.find(
      (r) => Array.isArray(r) && String(r[0] ?? "").trim() === CLAUSULAS_LABEL_TEMPORADA
    );
    const temporadaActual = manifiesto ? String(manifiesto[1] ?? "").trim() : "";
    if (rows.length < 5) return { jugadores: [], temporadaActual };

    const [row0 = [], row1 = [], row2 = [], row3 = [], row4 = []] = rows;
    const jugadores = [];
    for (let col = 1; col < row0.length; col++) {
      const jugador = String(row0[col] ?? "").trim();
      if (!jugador) continue;
      jugadores.push({
        Jugador: jugador,
        Fecha1Recibir: String(row1[col] ?? "").trim(),
        Fecha2Recibir: String(row2[col] ?? "").trim(),
        Fecha1Hacer: String(row3[col] ?? "").trim(),
        Fecha2Hacer: String(row4[col] ?? "").trim(),
      });
    }
    return { jugadores, temporadaActual };
  });
}
