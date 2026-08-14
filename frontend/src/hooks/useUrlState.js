import { useCallback, useEffect, useState } from "react";
import { leerParam, navegarA } from "../lib/url";

/**
 * Estado de un parámetro del query string. La URL manda: el valor se inicializa desde ella
 * y vuelve a leerse en `popstate`, para que el botón atrás cambie de estado dentro de la
 * aplicación en lugar de salir de ella.
 *
 * Al navegar solo se escribe el parámetro propio, así que el resto se conservan.
 */
export function useUrlParam(nombre) {
  const [valor, setValor] = useState(() => leerParam(nombre));

  useEffect(() => {
    const onPopState = () => setValor(leerParam(nombre));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [nombre]);

  const seleccionar = useCallback(
    (nuevo) => {
      setValor(nuevo);
      navegarA({ [nombre]: nuevo });
    },
    [nombre]
  );

  return [valor, seleccionar];
}
