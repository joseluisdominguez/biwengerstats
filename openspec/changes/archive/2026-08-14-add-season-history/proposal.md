## Why

La aplicación asume que todos los datos pertenecen a un único torneo continuo: no existe el concepto de temporada en ninguna de las tres capas (bot, Google Sheet, SPA). Con el arranque de la temporada 2026/2027 esto provoca tres fallos simultáneos:

1. **El bot está roto en silencio.** `get_completed_round_ids()` descubre jornadas encadenando `data.next.id` desde la 4484. La J38 de 2025/2026 (id 4521) devuelve `next: null`, así que la cadena termina ahí y nunca alcanza la 2026/2027 (ids 4899–4936). El bot seguirá ejecutándose cada 2 horas informando "todas las jornadas ya están en el Sheet" sin volver a registrar nada.
2. **Las reglas de deuda están cableadas a una liga de 17.** La liga pasa a 18 participantes esta temporada y el número varía cada año. Tanto `compute_deuda()` como el renderizado de la tabla de Desastre asumen que el colista es la posición 17.
3. **Los datos de 2025/2026 se mezclarían con los de 2026/2027.** Bote, top de morosos y gráfica de deuda acumulada suman todas las filas del CSV sin distinción.

## What Changes

- Se añade la **temporada** como dimensión de primera clase en el historial: nueva columna `Temporada` (slug tipo `2025-2026`) al final de `Historial_Jornadas`, poblada por el bot desde `data.season.slug` de la propia API de Biwenger.
- El bot deja de encadenar `next.id` y pasa a **descubrir la temporada actual y sus jornadas por sí mismo** (`GET /rounds/{competicion}` sin id → `data.season.rounds[]`), eliminando la necesidad de `BIWENGER_FIRST_ROUND_ID`.
- **BREAKING (comportamiento de cálculo):** `compute_deuda()` pasa a depender del tamaño de la liga: la mitad inferior paga 1 €, el colista paga 2 €. Para N=17 el resultado es idéntico al actual, por lo que las 646 filas ya almacenadas de 2025/2026 siguen siendo correctas y no requieren recálculo.
- La SPA incorpora un **selector de temporada en la cabecera**, con la temporada en curso por defecto y el estado reflejado en el querystring (`?temporada=2026-2027`).
- Todos los agregados (bote total, top de morosos, gráfica de deuda acumulada, título y "datos hasta la…") pasan a **acotarse a la temporada seleccionada**.
- La tabla del Desastre deja de derivar el importe y el color de `Posicion` y pasa a **leer `Deuda_Generada`**, que ya viene calculado en el dato. Esto la hace inmune al tamaño de la liga de forma permanente.
- La sección de **cláusulas queda acotada a la temporada en curso**; al consultar una temporada pasada se sustituye por un aviso explicativo en lugar de desaparecer sin explicación.
- El bot publica **cuál es la temporada en curso** en un manifiesto que la SPA consume, para que la temporada por defecto sea correcta incluso antes de que se dispute la primera jornada.

### Non-goals

- No se construye una clasificación de morosos *all-time* que agregue varias temporadas. El top de morosos se acota a la temporada seleccionada.
- No se conserva histórico de cláusulas de temporadas pasadas.
- No se versiona el reglamento de deuda por temporada: la deuda queda congelada como dato en cada fila en el momento de escribirla.

## Capabilities

### New Capabilities

- `season-history`: la temporada como dimensión del historial de jornadas — cómo se identifica, se persiste, se descubre y se acota cada agregado.
- `season-navigation`: selección de temporada en la interfaz — temporada por defecto, estado compartible en la URL y comportamiento con temporadas sin datos.
- `debt-calculation`: cálculo de la deuda generada en función del tamaño de la liga y su presentación fiel al dato almacenado.
- `clausulas`: alcance temporal de la sección de cláusulas y del roster que la alimenta.

### Modified Capabilities

Ninguna: el proyecto todavía no tiene specs en `openspec/specs/`.

## Impact

**Datos**

- `Historial_Jornadas`: nueva columna G `Temporada`. Las filas existentes quedan vacías en esa columna y se interpretan como `2025-2026`; el backfill es opcional. Al añadir al final, los índices que usa el bot (`col_values(1)` para deduplicar jornadas, `col_values(3)` para la lista de jugadores) no se desplazan.
- `Clausulas`: se sobrescribe entera en cada ejecución; se le añade el manifiesto de temporada en curso.
- Los IDs de jornada no colisionan entre temporadas (4484–4521 vs 4899–4936), así que la deduplicación por ID sigue siendo válida sin cambios.

**`bot.py`**

- `get_completed_round_ids()`, `get_all_league_players()`, `get_all_players_from_historial_sheet()`, `build_historial_rows()`, `compute_deuda()`, `write_clausulas_sheet()`, `run()`.
- Se elimina la dependencia del env `BIWENGER_FIRST_ROUND_ID`.
- Los avisos "se esperaban 17 jugadores" pasan a comparar contra el tamaño real de la liga.

**`frontend/src/App.jsx`**

- `fetchCsv()` (7ª columna), `fetchClausulasCsv()` (fila de manifiesto), y todos los `useMemo` de agregación: `normalizedHistorial`, `sortedJornadaIds`, `ultimaJornadaNombre`, `porJugador`, `topMorosos`, `boteTeorico`, `jugadoresList`, `chartDataDeuda`.
- Cabecera (título con temporada dinámica + selector), tabla de Desastre (líneas 450 y 465) y sección de cláusulas.
- `chartColors` tiene 17 entradas: con 18 jugadores dos comparten color.

**Documentación**

- `GOOGLE_SHEET_ESTRUCTURA.md` documenta 6 columnas y la estructura de 5 filas de `Clausulas`; ambas cambian.

**Riesgo a verificar antes de implementar**

- `frontend/.env.production` define `VITE_CSV_HISTORIAL` y `deploy-pages.yml` inyecta además `VITE_CSV_HISTORIAL` y `VITE_CSV_CLAUSULAS` como secrets. Hay que confirmar cuál gana en el build de producción antes de colgar la detección de temporada del CSV de cláusulas.
