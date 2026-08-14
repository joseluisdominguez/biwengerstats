## Context

Ver `proposal.md` — Why para la motivación, y `specs/palmares/spec.md` para los requisitos.

Restricciones que condicionan el enfoque:

- **SPA sin router.** El frontend es Vite + React desplegado en GitHub Pages, sin
  `react-router` ni servidor que reescriba rutas. El estado navegable ya existente vive en el
  query string (`?temporada=<slug>`), leído al montar y en `popstate`, y escrito con
  `history.pushState` (`App.jsx:50-53`, `App.jsx:209-213`, `App.jsx:233-238`).
- **Todo el estado de datos nace del filtro por temporada.** `normalizedHistorial`
  (`App.jsx:247`) filtra por `temporadaEfectiva` y de ahí cuelgan bote, morosos, jornadas y
  gráfica. El palmarés es el primer dato que no pasa por ese filtro.
- **Un único componente de 830 líneas.** `App.jsx` mezcla constantes, parseo de CSV, helpers de
  fecha, estado, agregados y toda la presentación.
- **Dos CSV publicados de Google Sheets** se descargan al montar. Google los cachea unos
  minutos, así que una edición manual no se refleja de inmediato.

## Goals / Non-Goals

**Goals:**

- Que el palmarés viva fuera del eje de temporada sin que eso sea un accidente del código.
- Que la vista sea compartible por URL y coherente con el patrón de navegación ya existente.
- Dejar `App.jsx` como contenedor delgado, con la presentación en componentes puros por feature.
- Que el refactor sea verificable por separado de la feature.

**Non-Goals:**

- Introducir un router o una librería de estado. El caso no lo pide y el bundle es un
  presupuesto real en un despliegue estático.
- Generalizar un sistema de vistas. Hay dos vistas; una condición basta.
- Migrar a TypeScript, reorganizar el bot o tocar los workflows.

## Decisions

### El desempate es alfabético, no el orden de la hoja

La idea inicial era respetar el orden de las filas del Excel. Al pasar a tres clasificaciones
independientes eso dejó de ser posible: una sola hoja con una fila por jugador no puede
codificar tres ordenaciones distintas. Cada bloque ordena por su columna de mayor a menor y
resuelve empates por nombre.

Consecuencia práctica: **el orden de las filas en la hoja deja de influir en lo que se ve**. Es
solo comodidad para quien la rellena, y conviene que la documentación lo diga para que nadie
intente ordenar la hoja esperando un efecto en la aplicación.

Alternativa descartada: usar el orden de la hoja como desempate. `Array.prototype.sort` es
estable, así que habría salido gratis, pero produce empates resueltos por un criterio invisible
para quien mira la pantalla. El alfabético es reproducible desde lo que se ve.

Para el desempate se usa `localeCompare`, igual que en `topMorosos` (`App.jsx:368`) y
`jugadoresList` (`App.jsx:379`), que ya tratan correctamente acentos y nombres con emoji.

### Numeral compartido entre empatados

Dos jugadores con los mismos títulos comparten posición y el siguiente salta el hueco
(`1, 1, 3`). Es lo propio de un palmarés: numerarlos `1, 2, 3` inventaría una jerarquía que los
datos no contienen. El orden alfabético decide cuál se pinta antes, no cuál va por delante.

### La vista se identifica con `?vista=palmares`

Se reutiliza el mecanismo del selector de temporada: `pushState` al navegar, `popstate` para
recuperar el estado al volver atrás, y validación del valor leído con caída a la vista
principal cuando no se reconoce —el mismo trato que ya recibe un slug de temporada inválido
(`App.jsx:227-229`).

El parámetro `temporada` se conserva al entrar en el palmarés en lugar de borrarse: el palmarés
lo ignora, pero al volver atrás la vista principal recupera la temporada que se estaba
consultando.

Alternativas descartadas:

- **Modal.** Más barato, y hay precedente (el modal de jornada, `App.jsx:670`), pero no da URL
  compartible. El palmarés es justo el contenido que se pasa por el grupo.
- **Ruta con `history.pushState` sobre el path.** GitHub Pages devolvería 404 al abrir la URL en
  frío sin un `404.html` que reescriba. El query string no tiene ese problema.
- **Hash (`#palmares`).** Funciona, pero convive mal con el `?temporada=` ya existente y
  arrastra el comportamiento de scroll del navegador.

### En la vista de palmarés la cabecera oculta selector de temporada y bote

Ambos son datos de temporada y sobre un histórico no significan nada. Dejarlos visibles pero
inertes —un selector que no cambia lo que se ve— es peor que no mostrarlos. La cabecera del
palmarés se queda con el título, el retorno a la vista principal y la medalla en estado activo.

### El CSV del palmarés se pide solo al entrar en la vista

Los otros dos CSV se siguen pidiendo al montar. El del palmarés se descarga la primera vez que
se entra en la vista y se conserva mientras dure la sesión: es una sección que se visita poco y
no debe encarecer el arranque de la pantalla principal.

Contrapartida aceptada: quien abra en frío un enlace `?vista=palmares` descargará también el
histórico y las cláusulas sin usarlos de inmediato. A cambio, volver a la vista principal es
instantáneo y no hay que coordinar dos rutas de carga distintas. Con 646 filas el coste es
asumible.

### La cabecera del CSV se detecta, no se asume

`Historial_Jornadas` no lleva cabecera porque la escribe el bot. `Palmares` la rellena una
persona, que casi con seguridad querrá una fila de títulos para no perderse — pero podría no
ponerla. En lugar de fijar una de las dos formas, se descarta la primera fila cuando sus
columnas de recuento no contienen números. Así la hoja funciona en ambos casos y nadie pierde
datos por un detalle de formato.

### El parseo reutiliza `parseNum`

`parseNum` (`App.jsx:32`) ya devuelve 0 ante celda vacía, nula o no numérica, que es
exactamente la semántica que pide el palmarés. Se extrae a `lib/csv.js` y se usa tal cual.

### Estructura del refactor: por feature, contenedor delgado

```
src/
├── App.jsx                       ← elige vista, carga datos, deriva agregados
├── config.js                     ← URLs de CSV y constantes
├── lib/
│   ├── csv.js                    ← fetchHistorial · fetchClausulas · fetchPalmares · parseNum
│   ├── temporada.js              ← temporadaCorta · temporadaLarga
│   ├── fechas.js                 ← parseClausulaDateUTC · add7Days · formatDateLocal
│   └── url.js                    ← lectura y escritura de ?temporada= y ?vista=
├── hooks/
│   └── useUrlState.js            ← estado sincronizado con la URL + popstate
└── components/
    ├── layout/    Header.jsx
    ├── jornada/   DesastreJornada.jsx · JornadaModal.jsx
    ├── morosos/   TopMorosos.jsx
    ├── grafica/   EvolucionDeuda.jsx · LegendDeuda.jsx
    ├── clausulas/ TablaClausulas.jsx · ClausulaCell.jsx
    └── palmares/  Palmares.jsx · RankingTrofeo.jsx
```

`App.jsx` conserva la carga de datos y el cálculo de agregados, y pasa el resultado como props a
componentes presentacionales sin estado propio. Los `useMemo` de agregados no se mueven a hooks
de dominio: hoy dependen unos de otros en cadena y separarlos ahora añadiría indirección sin
resolver ningún problema.

El refactor arregla de paso dos defectos reales:

- **`LegendDeuda` se declara dentro del cuerpo de `App()`** (`App.jsx:424`). Cada render crea una
  función nueva, React la interpreta como un tipo de componente distinto y desmonta y remonta la
  leyenda entera. Al extraerla a su módulo pasa a tener identidad estable.
- **`chartColors`** (`App.jsx:397`) reconstruye un array de 24 elementos en cada render; pertenece
  al ámbito de módulo.

### El refactor va antes que la feature, y se verifica solo

Mezclar movimiento de código y comportamiento nuevo en un mismo paso hace que cualquier
regresión tenga dos culpables posibles. El orden es: extraer sin tocar comportamiento, comprobar
que la aplicación se ve y se comporta igual, y solo entonces añadir el palmarés sobre una base ya
limpia.

## Risks / Trade-offs

- **El refactor toca todo el fichero y no hay tests de frontend** (el proyecto solo tiene
  `test_bot.py`, en Python) → se hace en un paso propio y verificable, y se comprueba a mano
  contra las dos temporadas con datos: bote, top de morosos, gráfica, modal de jornada y
  cláusulas deben quedar idénticos antes de empezar la feature.
- **Datos manuales sin validación** → nombres mal escritos o recuentos erróneos se publican tal
  cual. Se asume: es una liga de amigos y el coste de equivocarse es corregir una celda. El
  parseo sí se protege de lo que rompe la pantalla (filas vacías, celdas no numéricas, cabecera).
- **Nombres desacoplados de `Historial_Jornadas`** → el mismo jugador puede aparecer escrito de
  dos formas distintas en dos secciones. Es deliberado: cruzarlos obligaría a mantener una tabla
  de equivalencias por un beneficio que hoy nadie ha pedido.
- **Caché del CSV publicado de Google** → una corrección en la hoja tarda unos minutos en verse.
  Con datos que cambian una vez por temporada no compensa ninguna mitigación; basta con
  documentarlo.
- **Duplicados en la hoja** → si un jugador aparece en dos filas, se muestran las dos entradas
  sin fusionar. Sumarlas ocultaría el error tipográfico que casi seguro las causó.
- **El bundle crece** con una vista más → sigue muy por debajo del presupuesto; `recharts`, ya
  presente, domina el tamaño y el palmarés no añade dependencias.

## Migration Plan

Nada que migrar: no hay datos existentes que transformar ni contrato que romper.

El despliegue tiene un orden natural, y cada paso es seguro por sí solo:

1. **Crear y publicar la pestaña `Palmares`** en el Sheet. No afecta a nada: el bot no la lee ni
   la escribe, y la aplicación desplegada todavía la ignora.
2. **Desplegar el refactor.** Sin cambio funcional; si algo se rompe, se revierte sin perder
   ninguna feature.
3. **Desplegar la vista de palmarés con `VITE_CSV_PALMARES` configurada.** En producción la
   variable no sale de `frontend/.env.production` —ese fichero está en `.gitignore` y no se
   versiona, es solo comodidad local—, sino de un **secret del repositorio** inyectado en el
   paso de build de `.github/workflows/deploy-pages.yml`, como ya se hace con
   `VITE_CSV_HISTORIAL` y `VITE_CSV_CLAUSULAS`. Hacen falta las dos mitades: crear el secret y
   añadirlo al bloque `env:` del workflow; sin la segunda, el secret nunca llega al build.

Si la URL no llegara al bundle de producción, la aplicación no muestra el acceso y queda
exactamente como antes del cambio: el fallo se degrada solo, sin pantallas rotas.

Rollback: revertir el commit correspondiente. Borrar el secret `VITE_CSV_PALMARES` y volver a
desplegar oculta la sección sin tocar código.
