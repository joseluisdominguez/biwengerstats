// Estado navegable de la aplicación. Vive en el query string porque el despliegue es
// estático (GitHub Pages) y no hay servidor que reescriba rutas: una URL con path propio
// devolvería 404 al abrirla en frío.

export const PARAM_TEMPORADA = "temporada";
export const PARAM_VISTA = "vista";

// Única vista con nombre propio. Cualquier otro valor de ?vista= no se reconoce y la
// aplicación se queda en la vista principal.
export const VISTA_PALMARES = "palmares";

export function leerParam(nombre) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(nombre) || "";
}

/**
 * Escribe los parámetros indicados y apila una entrada en el historial, de modo que el
 * botón atrás deshaga la navegación en lugar de abandonar la aplicación. Los parámetros
 * que no se mencionan se conservan; un valor vacío borra el suyo.
 */
export function navegarA(cambios) {
  const url = new URL(window.location.href);
  for (const [nombre, valor] of Object.entries(cambios)) {
    if (valor) url.searchParams.set(nombre, valor);
    else url.searchParams.delete(nombre);
  }
  window.history.pushState({}, "", url);
}
