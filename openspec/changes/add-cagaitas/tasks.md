Orden por dependencia. El grupo 1 es manual y puede hacerse ya, en paralelo con el resto. Ver
`design.md` — Migration Plan para la secuencia de despliegue.

## 1. Sheet: pestaña manual de cagaitas

- [x] 1.1 Crear la pestaña `Cagaitas` en el Google Sheet con las columnas `Temporada`, `Jugador`, `Fecha`, `Futbolista` y apuntar las cagaitas que ya se hayan usado esta temporada — creada en el Sheet de test con una fila de prueba
- [x] 1.2 Publicarla en la web como CSV (Archivo → Compartir → Publicar en la web) y anotar la URL con su `gid` — `gid=1669603244` en el Sheet de test, ya en `frontend/.env`
- [x] 1.3 Comprobar que la URL publicada devuelve el CSV esperado y que ni `python bot.py` ni `python bot.py --clausulas` escriben en esa pestaña — el CSV llega con cabecera y la fila de prueba; el bot solo abre `Historial_Jornadas` y `Clausulas` por nombre (`bot.py:48-49`), comprobado leyendo el código sin ejecutarlo contra el Sheet

## 2. Datos y configuración

- [x] 2.1 Añadir `VITE_CSV_CAGAITAS` a `frontend/.env.example` con el marcador de ejemplo y a `frontend/.env` en local
- [x] 2.2 Añadir `CSV_CAGAITAS` a `src/config.js`, tratada como opcional con `csvConfigurado`
- [x] 2.3 Añadir a `src/lib/temporada.js` la normalización de `AAAA-AAAA` y `AAAA/AAAA` al slug con guion, devolviendo vacío para cualquier otra cosa
- [x] 2.4 Añadir `fetchCagaitas` a `src/lib/csv.js`: descarta las filas sin jugador o sin temporada reconocible (la cabecera incluida) y conserva `Fecha` y `Futbolista` como texto recortado — de paso, `descargarFilas` rechaza ahora las respuestas HTTP de error: antes parseaba la página de error de Google como si fuera el CSV, y sin eso el escenario "fallo de descarga" de la spec no se podía cumplir

## 3. Lógica de cruce

- [x] 3.1 Crear `src/lib/cagaitas.js` con una función pura que, dadas las cagaitas, la temporada y el roster, devuelva las cagaitas de cada participante y la lista de nombres sin asignar
- [x] 3.2 Emparejar nombres recortando espacios y sin distinguir mayúsculas, devolviendo siempre el nombre tal como está en el roster
- [x] 3.3 Con el roster vacío, no devolver ni marcas ni nombres sin asignar
- [x] 3.4 Agrupar varias cagaitas del mismo participante en la misma temporada bajo una sola entrada
- [x] 3.5 Añadir una función que componga el texto del detalle (`fecha · vendió a futbolista`, omitiendo lo que esté en blanco) para usarlo tanto en la línea desplegada como en el `title`

## 4. Carga en la aplicación

- [x] 4.1 En `App.jsx`, pedir el CSV de cagaitas al montar, solo si está configurado, en paralelo con el historial y sin entrar en su estado de carga
- [x] 4.2 Guardar el estado como `null` (sin cargar), datos o error, igual que el palmarés
- [x] 4.3 Derivar con `useMemo` las cagaitas de `temporadaEfectiva` cruzadas con `rosterTemporada` y pasarlas a `TopMorosos`

## 5. Presentación en Top Morosos

- [x] 5.1 Crear `components/morosos/MarcaCagaita.jsx`: `<button>` con 💩, `aria-expanded`, `aria-label` y `title` con el detalle, y estados de foco y hover acordes con la paleta
- [x] 5.2 En `TopMorosos.jsx`, mostrar la marca junto al nombre de quien tenga cagaita y, al activarla, la línea de detalle bajo el nombre dentro de la misma celda, sin cambiar orden ni importes
- [x] 5.3 Guardar qué filas están desplegadas junto a su temporada, para que cambiar de temporada no deje desplegada ninguna — se probó así y al volver a la temporada original reabría la fila; se cambió a montar `TopMorosos` con la temporada como `key` (ver `design.md`)
- [x] 5.4 Añadir al pie de la tarjeta, fuera de la zona con scroll, la leyenda: qué significa la marca y cuántos de cuántos participantes la han usado; solo cuando la temporada tenga alguna cagaita asignada o alguna sin asignar
- [x] 5.5 Mostrar en la leyenda las cagaitas sin asignar con sus nombres
- [x] 5.6 Mostrar en el pie un aviso discreto cuando la descarga de cagaitas haya fallado

## 6. Verificación

Sin test runner en el frontend: se comprueba como en los cambios anteriores, con scripts contra
las funciones puras y renderizando con `react-dom/server` (25 casos), y además en Chrome real con
Playwright contra el servidor de desarrollo y el Sheet de test (17 comprobaciones, 1440, 375 y
320 px, sin errores de consola).

- [x] 6.1 `npm run lint` y `npm run build` en verde
- [x] 6.2 Comprobar el parseo contra los escenarios de la spec: fila completa, temporada con barra, cabecera, fecha y futbolista en blanco, filas residuales
- [x] 6.3 Comprobar el cruce: temporada distinta, mayúsculas y espacios, nombre sin asignar, roster vacío y dos cagaitas del mismo participante
- [x] 6.4 Renderizar `TopMorosos` con y sin cagaitas y comprobar que orden e importes coinciden con la versión sin marcas, que la leyenda solo sale cuando toca y que el aviso de error sale cuando la descarga falla
- [x] 6.5 Comprobar con `VITE_CSV_CAGAITAS` vacía que no se pide el CSV y que Top Morosos queda idéntico a la versión actual — la URL no llega al bundle y no hay marcas ni pie. El marcado de la celda del nombre cambia (un `<span>` alrededor y `align-top` en las otras celdas), sin efecto visual en filas de una línea
- [x] 6.6 Pendiente de tu vistazo en el navegador: tocar la marca en móvil, usarla con teclado y cambiar de temporada con una fila desplegada — hecho con Playwright (toque con `hasTouch`, Intro y espacio, cambio de temporada). En móvil la marca pasaba al borde de la celda cuando el nombre partía en dos líneas; se pasó a ir en línea con el texto

## 7. Documentación y despliegue

- [x] 7.1 Documentar la pestaña `Cagaitas` en `GOOGLE_SHEET_ESTRUCTURA.md`: columnas, mantenimiento manual, formatos de temporada aceptados, que el nombre debe copiarse como aparece en la aplicación y que la norma de una por temporada no la impone la aplicación
- [x] 7.2 Añadir `VITE_CSV_CAGAITAS` a la tabla de variables del frontend en esa misma guía
- [x] 7.3 Añadir `VITE_CSV_CAGAITAS` al bloque `env:` del paso de build en `.github/workflows/deploy-pages.yml`
- [ ] 7.4 Pendiente de ti: crear el secret `VITE_CSV_CAGAITAS` en el repositorio y comprobar tras el despliegue que la URL llega al bundle de producción
