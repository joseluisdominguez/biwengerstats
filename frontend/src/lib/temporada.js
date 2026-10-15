const SLUG_TEMPORADA = /^(\d{4})-(\d{4})$/;

// Lo que puede escribir una persona en una hoja manual: con guion o con barra, que es como
// la aplicación muestra las temporadas.
const TEMPORADA_ESCRITA = /^(\d{4})\s*[-/]\s*(\d{4})$/;

/** "2026/2027" o "2026-2027" → "2026-2027"; cualquier otra cosa → "" */
export function normalizarTemporada(texto) {
  const m = String(texto ?? "").trim().match(TEMPORADA_ESCRITA);
  return m ? `${m[1]}-${m[2]}` : "";
}

/** "2026-2027" → "26/27" */
export function temporadaCorta(slug) {
  const m = String(slug ?? "").match(SLUG_TEMPORADA);
  return m ? `${m[1].slice(2)}/${m[2].slice(2)}` : String(slug ?? "");
}

/** "2026-2027" → "2026/2027" */
export function temporadaLarga(slug) {
  const m = String(slug ?? "").match(SLUG_TEMPORADA);
  return m ? `${m[1]}/${m[2]}` : String(slug ?? "");
}
