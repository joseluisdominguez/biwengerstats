Orden por dependencia. Los grupos 1 y 2 son independientes entre sí; el 6 depende del 3 y del 4. Ver `design.md` — Migration Plan para la compatibilidad entre fases: el bot nuevo puede desplegarse antes que la SPA nueva, pero la ventana entre el grupo 4 y el grupo 6 debe ser corta.

## 1. SPA: desacoplar la presentación del tamaño de liga

Desplegable por sí solo, sin nada de lo demás. Arregla el descuadre del colista en cuanto juguéis con 18.

- [x] 1.1 Ampliar `chartColors` (hoy 17 entradas) por encima del tamaño previsible de liga y comprobar que con 18 jugadores ninguna línea repite color
- [x] 1.2 En la tabla del Desastre, sustituir la derivación del importe por `Posicion === 17` (`App.jsx:465`) por la lectura de `Deuda_Generada`
- [x] 1.3 En la misma tabla, sustituir el tratamiento visual condicionado por `Posicion === 17` (`App.jsx:450`) por el basado en `Deuda_Generada`
- [x] 1.4 Verificar contra el CSV real que la suma de los importes mostrados en el detalle coincide con el Bote total

## 2. Bot: deuda en función del tamaño de la liga

- [x] 2.1 Escribir tests con `unittest` (stdlib, sin dependencias nuevas) para `compute_deuda` cubriendo los escenarios de `specs/debt-calculation`: N=16, N=17 y N=18 — deben fallar antes de 2.2
- [x] 2.2 Reescribir `compute_deuda(position, total)` con la regla: `position == total` → 2 €; `position > floor(total / 2)` → 1 €; resto → 0 €
- [x] 2.3 Confirmar con los tests que N=17 reproduce exactamente el comportamiento anterior (1-8 → 0 €, 9-16 → 1 €, 17 → 2 €)
- [x] 2.4 Derivar N del array de clasificación completo de la jornada, **antes** del filtro `if not lineup: continue`, y pasarlo a `compute_deuda`
- [x] 2.5 Sustituir los avisos "se esperaban 17 jugadores" (`bot.py:464` y `bot.py:500`) por la comparación contra el N real, manteniéndolos como advertencia y no como bloqueo

## 3. Bot: temporada y descubrimiento de jornadas

- [x] 3.1 Obtener la temporada en curso con `GET /rounds/{competicion}` sin id y extraer `data.season.slug`
- [x] 3.2 Sustituir el encadenado de `next.id` en `get_completed_round_ids()` por la lectura de `data.season.rounds[]`, filtrando por `status` finalizado y descartando los nombres terminados en `(aplazada)`
- [x] 3.3 Eliminar `BIWENGER_FIRST_ROUND_ID` de `bot.py` y de los comentarios de ambos workflows de cron
- [x] 3.4 Añadir el slug de temporada como séptimo valor en `build_historial_rows()`
- [x] 3.5 Abortar con mensaje explícito si la respuesta no trae información de temporada, sin escribir filas sin temporada
- [x] 3.6 Verificar que la deduplicación por columna A sigue siendo correcta con jornadas de dos temporadas (4484-4521 y 4899-4936)

## 4. Bot: cláusulas, manifiesto y roster

- [x] 4.1 Limpiar la pestaña `Clausulas` antes de escribirla, para que un descenso del número de participantes no deje columnas obsoletas del año anterior
- [x] 4.2 Añadir la fila `Temporada actual` con el slug en curso al escribir la pestaña `Clausulas`
- [x] 4.3 Obtener el roster de la liga del array de clasificación completo, de modo que funcione también con jornadas en estado `pending`; dejar constancia si no lo devuelve
- [x] 4.4 Acotar el fallback `get_all_players_from_historial_sheet()` a la temporada en curso, para que no devuelva los participantes de la temporada anterior

## 5. Datos y puesta en marcha

- [x] 5.1 Backfill de la columna G a `2025-2026` en las filas existentes de `Historial_Jornadas` (opcional: sin él se interpretan igual, ver `specs/season-history`)
- [x] 5.2 Lanzar el workflow del bot a mano (`workflow_dispatch`) y comprobar que la pestaña `Clausulas` refleja la temporada en curso y los participantes actuales
- [ ] 5.3 Tras la primera jornada disputada, comprobar que se registra con su columna `Temporada` y la deuda calculada con N=18

## 6. SPA: navegación por temporadas

- [x] 6.1 Leer la séptima columna del CSV de historial, interpretando su ausencia como `2025-2026`
- [x] 6.2 Leer la temporada en curso de la fila añadida al CSV de cláusulas, con fallback al slug mayor presente en el historial si no está disponible
- [x] 6.3 Añadir el estado de temporada seleccionada, inicializado desde `?temporada=<slug>` y reflejado en la URL con `history.pushState`; slug inválido o ausente → temporada en curso
- [x] 6.4 Añadir el selector de temporada en la cabecera, listando la temporada en curso y las que tengan registros, de más reciente a más antigua
- [x] 6.5 Acotar a la temporada seleccionada los agregados: `sortedJornadaIds`, `ultimaJornadaNombre`, `porJugador`, `topMorosos`, `boteTeorico`, `jugadoresList` y `chartDataDeuda`
- [x] 6.6 Derivar el título de la cabecera del slug seleccionado, eliminando el `25/26` fijo (`App.jsx:378`)
- [x] 6.7 Añadir los estados vacíos de una temporada sin jornadas: bote a 0 €, y mensajes en desastre por jornada y en la gráfica
- [x] 6.8 En la temporada en curso, componer el roster del top de morosos como unión de sus participantes registrados y los de la pestaña de cláusulas, en orden alfabético y con 0 € cuando no haya deuda
- [x] 6.9 Mostrar la sección de cláusulas solo en la temporada en curso, y sustituirla por el aviso "Las cláusulas solo aplican a la temporada en curso" en las demás

## 7. Verificación

- [x] 7.1 `python -m unittest` en verde
- [x] 7.2 `npm run lint` y `npm run build` en verde
- [x] 7.3 Verificar los tres estados en local: temporada en curso sin jornadas, temporada 2025-2026 con sus 646 filas, y enlace directo `?temporada=2025-2026`
- [x] 7.4 Verificar que el bote y el top de morosos de 2025-2026 coinciden con los valores que mostraba la aplicación antes del cambio
- [x] 7.5 Verificar tras el despliegue que las URLs de ambos CSV llegan al bundle de producción

## 8. Documentación

- [x] 8.1 Actualizar `GOOGLE_SHEET_ESTRUCTURA.md` con la séptima columna de `Historial_Jornadas` y la fila de temporada de `Clausulas`
- [x] 8.2 Actualizar `.github/workflows/README-BOT-CRON.md` retirando `BIWENGER_FIRST_ROUND_ID` de los secrets opcionales
