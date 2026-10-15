## Context

Ver `proposal.md` — Why para la motivación y `specs/cagaitas/spec.md` para los requisitos.

Lo que condiciona el enfoque:

- **El patrón de pestaña manual ya existe.** El palmarés se lee de una pestaña rellenada a mano,
  con su `VITE_CSV_*` opcional (`config.js`, `csvConfigurado`) y su parseo en `lib/csv.js`. Las
  cagaitas son el mismo tipo de dato: nadie puede derivarlas de la API.
- **Todo lo de temporada nace de `temporadaEfectiva`.** `App.jsx` filtra el historial por ella y
  de ahí sale `rosterTemporada`, que es justo la lista de filas de Top Morosos. En la temporada
  en curso ese roster se completa con la pestaña de cláusulas, para que salga aunque no se haya
  jugado ninguna jornada.
- **Top Morosos es una tabla de altura fija con scroll propio** (`h-[420px] lg:h-[480px]`,
  `overflow-y-auto`). Lo que se despliegue dentro tiene que caber en ese flujo.
- **No hay test runner en el frontend.** Los cambios anteriores se verificaron con scripts contra
  funciones puras y renderizando componentes con `react-dom/server`.

## Goals / Non-Goals

**Goals:**

- Que la marca sea lo único nuevo que se vea en la home, y solo donde aplica.
- Que la lógica de cruce (temporada, nombres, sin asignar) sea una función pura, verificable sin
  navegador.
- Que una hoja mal rellenada se note en pantalla en lugar de perderse sin aviso.

**Non-Goals:**

- Añadir un test runner o dependencias nuevas.
- Normalizar o parsear fechas.
- Tocar el bot o el cron.

## Decisions

### La marca vive en Top Morosos, no en una sección propia

Se valoraron tres ubicaciones: una franja plegable bajo la gráfica, un icono en la cabecera que
abra una vista `?vista=cagaitas` como el palmarés, y una marca junto al nombre en Top Morosos. Se
eligió la marca porque es la más discreta: Top Morosos ya lista a todos los participantes de la
temporada seleccionada, así que la información cabe en una tabla existente y no añade ni una
sección ni una vista a la home.

Lo que se pierde frente a la franja es un listado cronológico aparte. Con como mucho una cagaita
por participante y temporada, la tabla de participantes ya hace de listado.

### El detalle se despliega en línea, no en un tooltip flotante

La marca es un `<button>` con `aria-expanded` que despliega, bajo el nombre y dentro de la misma
celda, una línea con la fecha y el futbolista. Además lleva `title` con el mismo texto para quien
pase el ratón.

Alternativas descartadas:

- **Solo `title`.** No funciona en móvil, que es donde más se mira la liga, ni es fiable con
  teclado.
- **Popover posicionado.** La tabla tiene scroll y altura fija: un elemento absoluto se recorta en
  las últimas filas o obliga a sacarlo con un portal y recolocarlo al hacer scroll. Desplegar en
  línea empuja las filas de abajo y no necesita nada de eso.

Qué filas están desplegadas es estado de interfaz de Top Morosos, y `App.jsx` monta el componente
con la temporada como `key`: al cambiar de temporada se empieza siempre con todo plegado.

Alternativa descartada: guardar las filas junto a su temporada, como `jornadaElegida`. Evita
arrastrar una fila a otra temporada, pero al volver a la original la reabre. Se probó así y el
resultado era confuso. Remontar es más simple y además devuelve el scroll de la tabla arriba, que
es lo esperable cuando cambia todo su contenido.

### Una fila por cagaita, con la temporada como columna

La pestaña es un registro: `Temporada, Jugador, Fecha, Futbolista`. Es la forma más natural de
apuntar algo que ocurre de vez en cuando, y una temporada nueva no exige tocar la estructura de la
hoja.

Alternativas descartadas: una pestaña por temporada (una URL y un secret más cada año) y una
columna por temporada con los jugadores en filas (no deja sitio para la fecha ni el futbolista).

### La validez de la temporada sustituye a la detección de cabecera

En el palmarés la cabecera se detecta mirando si las columnas de recuento son números. Aquí basta
con una regla más general: **una fila sin temporada reconocible se ignora**. La cabecera
(`Temporada` no es una temporada) cae sola, igual que las filas residuales de editar a mano, sin
lógica especial.

Se acepta `AAAA-AAAA` y `AAAA/AAAA` porque la aplicación muestra las temporadas con barra
(`temporadaLarga`) y es lo que alguien tenderá a copiar. Ambas se normalizan al slug con guion,
que es el que usa el resto de la aplicación.

### La fecha se muestra tal cual

Google Sheets publica cada fecha con el formato regional de la hoja, y en una hoja manual puede
llegar escrita de cualquier manera. Ningún cálculo depende de ella, así que parsearla solo
añadiría formas de fallar. Se muestra el texto de la celda.

Alternativa descartada: reutilizar `parseClausulaDateUTC`. Exige `DD/MM/YYYY HH:mm`, que es el
formato que escribe el bot, no el que escribe una persona.

### El cruce de nombres es tolerante pero no adivina

Para emparejar el jugador de la hoja con un participante se recortan los espacios de los extremos
y se comparan sin distinguir mayúsculas. No se hace nada más (ni quitar emojis ni buscar nombres
parecidos): un emparejamiento aproximado acabaría asignando una cagaita a quien no es.

Lo que no empareja **no se descarta**: la leyenda lo nombra como "sin asignar". Así un nombre mal
copiado se ve en la propia aplicación en vez de quedarse en una marca que no aparece y nadie
echa de menos.

El cruce es contra `rosterTemporada`, el mismo conjunto que pinta Top Morosos, de modo que una
marca nunca puede apuntar a una fila que no está. Si el roster está vacío (temporada sin
participantes conocidos todavía), no se calcula nada: Top Morosos mantiene su aviso y la leyenda
no aparece. Eso además evita un falso "sin asignar" mientras la pestaña de cláusulas está
cargando al empezar una temporada.

### Lógica pura en `lib/cagaitas.js`

Una función recibe las cagaitas, la temporada y el roster y devuelve, por participante, sus
cagaitas de esa temporada, más la lista de nombres sin asignar. `App.jsx` la llama dentro de un
`useMemo` y pasa el resultado a Top Morosos, igual que hace con `topMorosos`. Así toda la lógica
de la spec se puede comprobar sin React.

### Carga al arrancar, en paralelo y sin bloquear

A diferencia del palmarés, que se pide la primera vez que se entra en su vista, las cagaitas se
piden al montar la aplicación: se ven en la home. La petición va en paralelo con la del historial
y no forma parte de su estado de carga, así que la home se pinta en cuanto llega el historial y
las marcas aparecen después. El estado distingue "sin cargar" (`null`), datos y error, igual que
el palmarés.

## Risks / Trade-offs

- **[Riesgo] Google cachea los CSV publicados varios minutos** → una cagaita recién apuntada
  tarda en verse. Es lo mismo que ya ocurre con el palmarés; se documenta.
- **[Riesgo] Los nombres con emoji son fáciles de copiar mal** (`ChochoMojao 💦`) → la leyenda
  señala lo que no se ha podido asignar, y la documentación recomienda copiar el nombre desde la
  propia aplicación o desde `Historial_Jornadas`.
- **[Trade-off] Cagaitas de temporadas pasadas** → solo se ven si alguien las apunta. La norma es
  nueva y lo normal es que las temporadas anteriores no tengan ninguna; no se muestra nada en ellas
  y no hace falta rellenarlas.
- **[Trade-off] Sin listado aparte** → para ver todas las cagaitas de una temporada hay que mirar
  las marcas de Top Morosos. Con la escala de la liga (unos 18 participantes) es suficiente.

## Migration Plan

1. Crear la pestaña `Cagaitas` en el Sheet, publicarla como CSV y anotar la URL con su `gid`.
2. Crear el secret `VITE_CSV_CAGAITAS` en el repositorio y añadirlo al bloque `env:` del paso de
   build en `.github/workflows/deploy-pages.yml`.
3. Desplegar. Sin el secret, la aplicación se comporta como hoy, así que el orden entre el código
   y el secret no importa.

**Rollback:** borrar el secret (o vaciarlo) y redesplegar con `workflow_dispatch`. La
funcionalidad desaparece sin tocar código.
