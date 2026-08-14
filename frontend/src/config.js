// URLs de los CSV publicados del Google Sheet (Archivo → Compartir → Publicar en la web)
// y constantes de dominio compartidas por toda la aplicación.

// Marcador que llevan las URLs de ejemplo de .env.example mientras nadie las sustituye.
const MARCADOR_EJEMPLO = "TU_";

// Historial_Jornadas. Sin cabecera; columnas:
// Jornada, Nombre_Jornada, Jugador, Puntos, Posicion, Deuda_Generada, Temporada
export const CSV_HISTORIAL =
  import.meta.env.VITE_CSV_HISTORIAL ||
  "https://docs.google.com/spreadsheets/d/TU_SHEET_ID/export?format=csv&gid=0";

// Clausulas (opcional): fila 1 = jugadores, filas 2-5 = fechas, fila del manifiesto = temporada
export const CSV_CLAUSULAS = import.meta.env.VITE_CSV_CLAUSULAS || "";

// Palmares (opcional): pestaña manual. Columnas: Jugador, Ligas, Copas, Champions
export const CSV_PALMARES = import.meta.env.VITE_CSV_PALMARES || "";

/** Una URL de CSV cuenta como configurada si existe y no conserva el marcador de ejemplo. */
export function csvConfigurado(url) {
  return Boolean(url) && !url.includes(MARCADOR_EJEMPLO);
}

// Deuda máxima que puede generar un jugador en una jornada (la del colista).
// Se usa solo para el tratamiento visual: el importe siempre sale del dato.
export const DEUDA_ALTA = 2;

// Temporada de las filas anteriores a la introducción de la columna Temporada.
export const TEMPORADA_POR_DEFECTO = "2025-2026";

// Etiqueta de la fila con la que el bot publica la temporada en curso en la pestaña
// Clausulas. Permite conocerla aunque todavía no haya ninguna jornada registrada.
export const CLAUSULAS_LABEL_TEMPORADA = "Temporada actual";
