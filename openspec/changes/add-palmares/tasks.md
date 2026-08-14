Orden por dependencia. El grupo 1 es manual y puede hacerse ya, en paralelo con todo lo demás.
Los grupos 2 y 3 son el refactor y **no cambian comportamiento**: se verifican por sí solos en el
grupo 4 antes de tocar nada de la feature. Ver `design.md` — Decisions para el porqué de ese
orden, y `design.md` — Migration Plan para la secuencia de despliegue.

## 1. Sheet: pestaña manual de palmarés

- [x] 1.1 Crear la pestaña `Palmares` en el Google Sheet con las columnas `Jugador`, `Ligas`, `Copas`, `Champions` y rellenar los títulos históricos a mano
- [x] 1.2 Publicarla en la web como CSV (Archivo → Compartir → Publicar en la web) y anotar la URL con su `gid`
- [x] 1.3 Comprobar que la URL publicada devuelve el CSV esperado y que ni `python bot.py` ni `python bot.py clausulas` escriben en esa pestaña

## 2. Refactor: extraer lo que no es presentación

Sin cambio de comportamiento. Cada extracción deja `App.jsx` importando lo movido.

- [x] 2.1 Crear `src/config.js` con `CSV_HISTORIAL`, `CSV_CLAUSULAS`, `DEUDA_ALTA`, `TEMPORADA_POR_DEFECTO` y `CLAUSULAS_LABEL_TEMPORADA`
- [x] 2.2 Crear `src/lib/csv.js` con `parseNum` y las funciones de descarga y parseo de `Historial_Jornadas` y `Clausulas` (`App.jsx:32-36`, `App.jsx:55-88`, `App.jsx:139-170`)
- [x] 2.3 Crear `src/lib/temporada.js` con `temporadaCorta` y `temporadaLarga` (`App.jsx:39-48`)
- [x] 2.4 Crear `src/lib/fechas.js` con `parseClausulaDateUTC`, `add7Days` y `formatDateLocal` (`App.jsx:91-115`)
- [x] 2.5 Crear `src/lib/url.js` con la lectura y escritura de `?temporada=`, dejando sitio para `?vista=` (`App.jsx:50-53`, `App.jsx:233-238`)
- [x] 2.6 Crear `src/hooks/useUrlState.js` que encapsule el estado sincronizado con la URL y la suscripción a `popstate` (`App.jsx:209-213`)
- [x] 2.7 Mover `chartColors` fuera del cuerpo de `App()` al ámbito de módulo (`App.jsx:397-422`)

## 3. Refactor: extraer la presentación a componentes

- [x] 3.1 Extraer `components/layout/Header.jsx` con título, selector de temporada y bote (`App.jsx:488-531`)
- [x] 3.2 Extraer `components/jornada/DesastreJornada.jsx` (`App.jsx:537-624`) y `components/jornada/JornadaModal.jsx` (`App.jsx:670-717`)
- [x] 3.3 Extraer `components/morosos/TopMorosos.jsx` (`App.jsx:627-666`)
- [x] 3.4 Extraer `components/grafica/LegendDeuda.jsx` **fuera del cuerpo de `App()`**, corrigiendo el remontaje en cada render (`App.jsx:424-450`)
- [x] 3.5 Extraer `components/grafica/EvolucionDeuda.jsx` (`App.jsx:720-783`)
- [x] 3.6 Extraer `components/clausulas/ClausulaCell.jsx` (`App.jsx:116-137`) y `components/clausulas/TablaClausulas.jsx` (`App.jsx:786-826`)
- [x] 3.7 Dejar `App.jsx` como contenedor: carga de datos, derivación de agregados y paso de props, sin JSX de presentación propio

## 4. Verificación del refactor (antes de empezar la feature)

No hay navegador de automatización en el entorno, así que en lugar de mirar la pantalla se
comprobó por equivalencia contra la versión de `git HEAD`, que es más estricto: el parseo de
ambos CSV produce estructuras idénticas sobre los datos reales, los 21 bloques de agregados son
idénticos token a token, los componentes se renderizan con `react-dom/server` sobre datos reales
y el multiconjunto de `className` (426 clases, 141 distintas) coincide exactamente. Queda
pendiente de tu vistazo en el navegador antes de desplegar.

- [x] 4.1 `npm run lint` y `npm run build` en verde
- [x] 4.2 Comprobar en local que la temporada `2025-2026` mantiene idénticos el bote, el top de morosos, la gráfica y el modal de jornada — 646 filas, 38 jornadas, bote 380 €, 17 participantes
- [x] 4.3 Comprobar que la temporada en curso, el selector, el enlace `?temporada=2025-2026` y el botón atrás siguen comportándose igual — verificado sobre `lib/url.js` con `window` simulado
- [x] 4.4 Comprobar que la tabla de cláusulas y sus marcas de "libre el…" siguen igual en la temporada en curso, y que sigue oculta en las pasadas
- [x] 4.5 Comprobar que la leyenda de la gráfica ya no se remonta al alternar jugadores o cambiar de jornada — `LegendDeuda` pasa a ámbito de módulo, con identidad estable entre renders

## 5. Palmarés: datos y configuración

- [x] 5.1 Añadir `VITE_CSV_PALMARES` a `frontend/.env.example` con el marcador de ejemplo y a `frontend/.env` en local
- [x] 5.2 Añadir `CSV_PALMARES` a `src/config.js`, tratando como no configurada la cadena vacía y el marcador de ejemplo sin sustituir
- [x] 5.3 Añadir `fetchPalmares` a `src/lib/csv.js`: descarta la primera fila cuando sus columnas de recuento no son numéricas, ignora las filas sin nombre de jugador y aplica `parseNum` a los tres recuentos
- [x] 5.4 Implementar la derivación de una clasificación por trofeo: excluir los 0, ordenar por títulos descendente, desempatar con `localeCompare` y asignar numeral compartido a los empatados — en `src/lib/palmares.js`

## 6. Palmarés: navegación entre vistas

- [x] 6.1 Añadir a `src/lib/url.js` la lectura y escritura de `?vista=`, con caída a la vista principal ante un valor desconocido
- [x] 6.2 Añadir en `App.jsx` el estado de vista sincronizado con la URL, conservando el parámetro `temporada` al entrar en el palmarés
- [x] 6.3 Añadir el acceso con icono de medalla en `Header.jsx`, visible solo cuando `CSV_PALMARES` está configurada
- [x] 6.4 Ocultar el selector de temporada y el bote en la cabecera cuando la vista activa es el palmarés, y ofrecer el retorno a la vista principal
- [x] 6.5 Renderizar la vista principal o la de palmarés según la vista activa, sin desmontar los datos ya cargados del histórico — además el palmarés no espera al histórico, así que un enlace directo no pasa por su pantalla de carga

## 7. Palmarés: presentación

- [x] 7.1 Crear `components/palmares/RankingTrofeo.jsx`: un bloque con su título, sus posiciones y su estado vacío "aún sin ganadores"
- [x] 7.2 Crear `components/palmares/Palmares.jsx` componiendo los tres bloques —Ligas, Copas y Champions— en tres columnas en escritorio y apilados en móvil
- [x] 7.3 Pedir el CSV del palmarés solo la primera vez que se entra en la vista y conservarlo durante la sesión
- [x] 7.4 Añadir los estados de carga, de hoja sin datos utilizables y de error de descarga, sin que el fallo afecte a la vista principal
- [x] 7.5 Ajustar el tratamiento visual a la paleta existente (`index.css`), destacando las tres primeras posiciones de cada bloque — acento por trofeo (oro / naranja / azul) y podio en oro, plata y bronce

## 8. Verificación de la feature

Comprobado con los mismos medios que el grupo 4: lógica contra los escenarios del spec y
componentes renderizados con `react-dom/server`. Falta tu vistazo en el navegador con la
pestaña real (8.4 y 8.5 en su parte interactiva).

- [x] 8.1 `npm run lint` y `npm run build` en verde
- [x] 8.2 Comprobar contra el CSV real que cada bloque ordena por su columna y que quien tiene 0 títulos en un trofeo no aparece en él — 12 casos de parseo y clasificación + 12 de render
- [x] 8.3 Comprobar con un empate provocado en la hoja que los empatados salen por orden alfabético y comparten numeral, y que el siguiente salta el hueco
- [x] 8.4 Comprobar que el palmarés no cambia al alternar entre temporadas y que la temporada consultada se recupera al volver atrás — el palmarés no lee `temporadaEfectiva`, y `navegarA` conserva `?temporada=`
- [x] 8.5 Comprobar el enlace directo `?vista=palmares` en frío y el botón atrás desde la vista de palmarés
- [x] 8.6 Comprobar con `VITE_CSV_PALMARES` vacía que no aparece el icono, que la vista no es alcanzable y que el resto de la aplicación funciona igual
- [x] 8.7 Comprobar con una URL de palmarés inválida que la vista informa del error y la vista principal sigue funcionando

## 9. Documentación y despliegue

- [x] 9.1 Documentar la pestaña `Palmares` en `GOOGLE_SHEET_ESTRUCTURA.md`: columnas, mantenimiento manual, que el bot no la toca y que el orden de las filas no influye en lo que se muestra
- [x] 9.2 Documentar `VITE_CSV_PALMARES` junto a las otras dos variables del frontend
- [x] 9.3 ~~Añadir `VITE_CSV_PALMARES` a `frontend/.env.production`~~ — **la tarea estaba mal planteada**: ese fichero está en `.gitignore` y no se versiona, así que nunca llega al despliegue. En producción las URL salen de secrets del repositorio inyectados en `.github/workflows/deploy-pages.yml`, que ya se ha actualizado para pasar `VITE_CSV_PALMARES`. Queda pendiente de ti crear el secret con ese nombre
- [ ] 9.4 Verificar tras el despliegue que la URL llega al bundle de producción y que el palmarés se ve en GitHub Pages
