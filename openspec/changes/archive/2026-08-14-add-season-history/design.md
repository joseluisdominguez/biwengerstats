## Context

Ver `proposal.md` — Why para la motivación, y los ficheros de `specs/` para los requisitos.

Restricciones que condicionan el enfoque:

- **La arquitectura es un pipeline de una sola dirección**: `bot.py` (GitHub Actions cada 2 h) → Google Sheet → CSV publicado → SPA estática en GitHub Pages. No hay backend, ni base de datos, ni build en respuesta a los datos. Todo lo que la SPA sabe llega por CSV.
- **La liga arranca en 48 h** con las 40 jornadas de 2026/2027 en estado `pending`. El primer despliegue tiene que funcionar con cero filas de la temporada nueva.
- **El fallo actual del bot es "no escribe", no "escribe mal"**: la cadena `next.id` muere en la jornada 4521, así que no hay riesgo de datos corruptos acumulándose mientras esto se implementa; solo retraso en el registro.
- **La API pública de Biwenger ya expone todo lo necesario** (verificado): `data.season` trae `{id, name, slug, rounds[]}` con el estado de cada jornada, y `GET /rounds/{competicion}` sin id devuelve la jornada actual, y con ella la temporada en curso.

## Goals / Non-Goals

**Goals:**

- Que el cambio de temporada deje de requerir intervención manual, ahora y en agosto de 2027.
- Que la interfaz sea indiferente al tamaño de la liga sin configuración.
- Que un despliegue parcial no rompa nada: cada fase debe ser desplegable por separado.

**Non-Goals:**

- Optimizar el peso del CSV. Con 646 filas por temporada (~30 KB) no hay problema durante años, y no merece complejidad preventiva.
- Introducir router, gestor de estado o librerías nuevas en la SPA.
- Corregir deudas ya registradas. Ver `specs/debt-calculation` — Inmutabilidad de la deuda registrada.

## Decisions

### D1 — La temporada va como columna G de `Historial_Jornadas`, no como pestaña ni sheet aparte

**Alternativas consideradas:** una pestaña por temporada; un Google Sheet por temporada.

Ambas alternativas obligan, **cada agosto**, a crear la pestaña, publicarla como CSV, copiar el `gid`, actualizar un secret y redesplegar. Es exactamente la clase de paso manual olvidable que ha causado el fallo que estamos arreglando (`first_round_id` cableado a 4484). El argumento a su favor —fetch más ligero— no aplica: cinco temporadas son ~150 KB.

**Y dentro de la opción "columna", va al final (G) y no al principio (A):** el bot lee `col_values(1)` para deduplicar jornadas y `col_values(3)` para la lista de jugadores. Insertar al principio desplaza ambos índices y obliga a reescribir las 646 filas existentes. Al final, esos índices no se mueven y las filas antiguas quedan con la columna vacía, que se interpreta como `2025-2026` con el mismo mecanismo de compatibilidad por longitud de fila que la SPA ya usa hoy para el CSV legacy de 5 columnas. El backfill pasa de obligatorio a opcional.

### D2 — El identificador de temporada es el slug (`2025-2026`), no el `season.id`

La API ofrece `season.id = "2026"` para la temporada 2025/2026. Ese identificador es activamente confuso dentro de un CSV que alguien va a mirar a mano en Google Sheets. El slug es autoexplicativo, ordena lexicográficamente en el orden correcto, y el texto para mostrar se deriva de él (`2026-2027` → `26/27`), así que no hay que almacenar el nombre por separado.

### D3 — El bot descubre jornadas por `season.rounds[]`, no encadenando `next.id`

La cadena `next.id` tiene dos defectos: cuesta N peticiones y **no cruza la frontera de temporada** (`next: null` en la última jornada). Arreglarla añadiendo un `first_round_id` por temporada reintroduce la configuración manual anual.

`GET /rounds/{competicion}` sin id devuelve la jornada actual y con ella la temporada en curso; el `season.rounds[]` de esa respuesta trae los 40 identificadores con su `status` en **una sola petición**. El bot pasa a ser auto-descubridor y `BIWENGER_FIRST_ROUND_ID` desaparece.

El filtro de jornadas aplazadas (`name` termina en `(aplazada)`) se mantiene tal cual: en 2025/2026 había 42 entradas para 38 jornadas.

### D4 — El manifiesto de temporada en curso vive en una fila extra de la pestaña `Clausulas`

**Alternativa considerada:** una pestaña `Temporadas` propia.

La SPA necesita saber cuál es la temporada en curso *aunque no tenga ni una fila* (requisito duro: arrancamos en 48 h con todo `pending`). Una pestaña propia implica publicar + secret + tocar `deploy-pages.yml`. Una fila extra en `Clausulas` no implica nada de eso: el bot ya sobrescribe esa pestaña entera cada 2 h y la SPA ya la descarga. Cero URLs nuevas, cero secrets nuevos, cero fetches nuevos.

El coste es de cohesión: metemos metadato de temporada en una pestaña llamada "Clausulas". Se sostiene porque esa pestaña ya es, de hecho, "el estado vivo de la liga ahora mismo", y la temporada en curso es exactamente eso.

**Verificado durante el diseño:** un build con `VITE_CSV_HISTORIAL` y `VITE_CSV_CLAUSULAS` como variables de entorno mete esos valores en el bundle y descarta los de `.env.production`. Es el comportamiento documentado de Vite (las env vars preexistentes tienen prioridad sobre los ficheros `.env`). Los secrets de `deploy-pages.yml` llegan a producción, así que esta vía es segura.

**Fallback:** si `VITE_CSV_CLAUSULAS` no está configurado, la temporada en curso se toma como el slug mayor presente en el historial. Es incorrecto durante los primeros días de temporada, pero degrada de forma comprensible en lugar de romper.

### D5 — La SPA lee la deuda del dato; deja de derivarla de la posición

Hoy la tabla del Desastre hace `Posicion === 17 ? "2 €" : "1 €"`, mientras que `Deuda_Generada` viene ya calculada en la misma fila. Con 18 jugadores eso mostraría "1 €" al colista y descuadraría con el Bote total.

Leer `Deuda_Generada` no es solo el arreglo del bug: hace la interfaz **inmune al tamaño de la liga y al reglamento para siempre**. Si en 2028 la regla cambia a 3 €, la SPA no se entera y sigue siendo correcta. Es la decisión que más complejidad futura elimina de todo el cambio.

### D6 — N se toma de la posición más alta de la jornada, no del número de miembros

**Corregido durante la implementación tras comprobarlo contra la API autenticada.**

`compute_deuda(pos, N)` es sensible a N: con N=17 en una liga de 18, toda la franja de pagadores se desplaza una posición. La primera intención fue derivar N del array de clasificación completo (todos los miembros), en lugar de la lista filtrada por alineación.

Los datos reales lo desmienten. Para la J38 de 2025/2026 la API devuelve:

```
standings completo = 18   ← la plantilla de HOY, no la de aquella jornada
con alineación     = 16   ← falta quien se fue; los 2 que entraron no tienen lineup
posiciones         = [1..6, 8..17]
max(position)      = 17   ← el tamaño real con el que se disputó
```

Es decir, `standings[]` refleja la liga **actual**, no la del momento de la jornada. Usar su longitud daría N=18 para una jornada jugada con 17, y el colista cobraría 1 € en vez de 2 €.

La posición más alta de la clasificación sí es propia de la jornada. Y es fiable: en una jornada finalizada Biwenger asigna posición a todos los participantes — las 38 jornadas de 2025/2026 tienen exactamente 17 filas cada una (646 / 38 = 17,0). Para una jornada pendiente, sin clasificación, se recurre a la plantilla actual, que es lo único conocido.

Verificado: con la plantilla actual de 18, la cadena `compute_league_size` → `compute_deuda` reproduce las **646 filas** de la temporada de 17 sin una sola discrepancia.

`members` (la plantilla actual) se sigue devolviendo, pero para el roster de la pestaña de cláusulas, donde lo correcto sí es la plantilla de hoy.

### D7 — El roster del día 0 se resuelve por dos vías complementarias

Antes de la primera jornada no hay filas de las que sacar los 18 nombres, y el fallback actual devuelve los 17 de la temporada pasada.

- **En el bot:** tomar los nombres del array de clasificación completo (D6) funciona también para una jornada `pending`, si el array los incluye. Pendiente de confirmar (ver Open Questions).
- **En la SPA:** cuando la temporada seleccionada es la actual, el roster es la unión de los participantes de sus filas y los de la pestaña `Clausulas`. Para temporadas pasadas, solo sus filas.

Las dos son independientes: si la primera no funciona, la segunda sigue cubriendo el requisito de `season-navigation` (lista alfabética con 0 €).

### D8 — Estado de temporada en el querystring, sin router

`?temporada=<slug>` leído al montar y actualizado con `history.pushState`. La SPA no tiene router y este cambio no justifica introducir uno. El `base: '/biwengerstats/'` de Vite afecta a rutas de assets, no a query params, así que no interfiere.

### D9 — Paleta de colores ampliada, asignación por índice dentro de la temporada

`chartColors` tiene 17 entradas y este año son 18: dos jugadores compartirían color. Se amplía la paleta por encima del tamaño previsible de la liga.

Se descarta asignar color por hash del nombre (que daría color estable entre temporadas): el beneficio es puramente cosmético y complica la paleta a cambio de nada funcional.

## Risks / Trade-offs

- **La J1 se juega antes de que esto esté desplegado** → No hay riesgo de datos incorrectos: el bot actual no escribe nada (cadena muerta en 4521). El registro se recupera solo en la primera ejecución tras el despliegue, porque el modo "todas" procesa las jornadas disputadas que falten.
- **N mal derivado corrompe la deuda de una jornada entera** → D6 más el escenario "Un participante no alinea equipo" en `specs/debt-calculation`. Es el punto de mayor impacto silencioso del cambio.
- **`VITE_CSV_CLAUSULAS` sin configurar deja a la SPA sin saber la temporada en curso** → Fallback al slug mayor del historial (D4). Degrada, no rompe.
- **Se añade una dependencia sobre la forma de `data.season` en la API de Biwenger** → Es la misma API pública de la que ya depende el descubrimiento de jornadas; no es superficie nueva, pero sí más superficie de la misma. Si `season` desaparece, el bot debe fallar en voz alta y no escribir filas sin temporada (`specs/season-history`).
- **La pestaña `Clausulas` se sobrescribe por rango, no se limpia** → Si en el futuro la liga encoge, quedan columnas obsoletas a la derecha del rango escrito. Es un defecto preexistente que este cambio no introduce, pero que la variabilidad anual del tamaño de liga vuelve más probable. Conviene limpiar la pestaña antes de escribir.
- **Coste de cohesión del manifiesto en `Clausulas`** (D4) → Aceptado a cambio de eliminar el ritual anual. Si un día hace falta más metadato de temporada, se migra a pestaña propia.

## Migration Plan

Cuatro fases, cada una desplegable y útil por sí sola:

1. **SPA: leer la deuda del dato + ampliar paleta** (D5, D9). Independiente del resto. Arregla ya el descuadre del colista en cuanto la liga sea de 18, aunque no exista todavía nada de temporadas.
2. **Bot: `compute_deuda(pos, N)`, descubrimiento por `season.rounds[]`, columna `Temporada`, manifiesto en `Clausulas`** (D1, D2, D3, D4, D6, D7). Es la fase que devuelve el registro automático a la vida.
3. **Backfill opcional** de la columna G a `2025-2026` en las filas existentes.
4. **SPA: selector, agregados acotados, cláusulas condicionadas** (D4, D7, D8).

**Compatibilidad entre fases.** El orden 2 → 4 es seguro: la SPA actual parsea por longitud de fila (`row.length >= 6`), así que ignora una séptima columna sin romperse, y `fetchClausulasCsv` exige `rows.length >= 5` y lee las cinco primeras, así que ignora una sexta fila. Es decir, **el bot nuevo puede desplegarse antes que la SPA nueva sin romper nada**.

Matiz honesto: durante esa ventana la SPA vieja seguiría mezclando temporadas en el bote y el top de morosos. No se cae, pero da números erróneos en cuanto se registre la primera jornada de 2026/2027. La ventana entre fase 2 y fase 4 debe ser corta, o hacerse ambas en el mismo despliegue.

**Rollback.** Revertir la SPA es seguro en cualquier momento (los datos no cambian de forma incompatible). Revertir el bot deja de escribir la columna G, y las filas nuevas se leerían como `2025-2026`: eso sí ensucia el historial, así que un rollback del bot debe ir acompañado de borrar las filas escritas mientras tanto.

## Open Questions

Ambas resueltas durante la implementación:

- ~~**¿El array de clasificación de una jornada `pending` incluye ya a los 18 miembros?**~~ **Sí.** `GET /rounds/league/4899` (J1 de 2026/2027, `pending`) devuelve 18 miembros y 0 con alineación. La vía (a) de D7 funciona, así que el roster del día 0 sale de la propia API y no depende solo de la pestaña `Clausulas`.
- ~~**¿El aviso de "se esperaban N jugadores" debe impedir la escritura?**~~ **Se mantiene como advertencia**, según `specs/debt-calculation` — Verificación del tamaño esperado de la liga. Con N derivado de la posición más alta (D6) y no del número de miembros, una clasificación incompleta ya no falsea el cálculo, así que bloquear la escritura no aporta.
