const SLUG_TEMPORADA = /^(\d{4})-(\d{4})$/;

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
