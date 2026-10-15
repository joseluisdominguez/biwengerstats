# cagaitas Specification

## Purpose
Deja constancia de qué participantes han gastado su cagaita —el perdón de una venta al mercado
hecha por error, uno por temporada— y lo señala de forma discreta en Top Morosos de la temporada
seleccionada, a partir de una pestaña del Sheet que se mantiene a mano.
## Requirements
### Requirement: Origen manual de los datos de cagaitas

Las cagaitas SHALL leerse de una pestaña del Google Sheet publicada como CSV, cuya URL se
configura en la variable de entorno `VITE_CSV_CAGAITAS`. Cada fila SHALL representar una cagaita
y sus columnas SHALL ser, por orden: `Temporada`, `Jugador`, `Fecha`, `Futbolista`.

`Temporada` y `Jugador` SHALL ser obligatorias. `Fecha` y `Futbolista` SHALL ser opcionales y
mostrarse tal como estén escritas en la hoja, sin reinterpretarlas.

Una temporada SHALL aceptarse escrita como `AAAA-AAAA` o como `AAAA/AAAA`, y ambas formas SHALL
referirse a la misma temporada. Una fila cuya columna `Temporada` no tenga ninguna de esas formas,
o que no traiga jugador, SHALL ignorarse.

Esa pestaña se mantiene a mano y ningún proceso automático SHALL escribir en ella.

#### Scenario: Lectura de una fila completa

- **WHEN** el CSV contiene la fila `2026-2027,Peluteam,12/10/2026,Pedri`
- **THEN** el sistema registra una cagaita de `Peluteam` en la temporada 2026-2027, con fecha
  `12/10/2026` y futbolista `Pedri`

#### Scenario: Temporada escrita con barra

- **WHEN** una fila trae `2026/2027` en la columna `Temporada`
- **THEN** el sistema la trata como la temporada 2026-2027

#### Scenario: La cabecera de la hoja no se toma como cagaita

- **WHEN** la primera fila del CSV es `Temporada,Jugador,Fecha,Futbolista`
- **THEN** el sistema la descarta, porque su columna `Temporada` no es una temporada

#### Scenario: Fecha y futbolista en blanco

- **WHEN** una fila trae temporada y jugador pero deja en blanco la fecha y el futbolista
- **THEN** el sistema registra la cagaita igualmente, sin fecha ni futbolista

#### Scenario: Filas residuales de la edición manual

- **WHEN** el CSV incluye filas sin jugador o sin temporada reconocible
- **THEN** el sistema las ignora

### Requirement: Funcionalidad opcional

Cuando `VITE_CSV_CAGAITAS` no esté configurada, la aplicación NO SHALL mostrar ninguna marca ni
leyenda de cagaitas y SHALL comportarse como si la funcionalidad no existiera.

#### Scenario: Cagaitas sin configurar

- **WHEN** `VITE_CSV_CAGAITAS` está vacía o conserva el marcador de ejemplo sin sustituir
- **THEN** Top Morosos se muestra sin marcas ni leyenda de cagaitas y no se pide ningún CSV de
  cagaitas

### Requirement: Cagaitas acotadas a la temporada seleccionada

La aplicación SHALL mostrar únicamente las cagaitas de la temporada seleccionada. Al cambiar de
temporada, las marcas y la leyenda SHALL pasar a reflejar las cagaitas de la nueva temporada.

#### Scenario: Cagaita en otra temporada

- **WHEN** `Peluteam` tiene una cagaita en 2025-2026 y ninguna en 2026-2027, y la temporada
  seleccionada es 2026-2027
- **THEN** `Peluteam` aparece en Top Morosos sin marca

#### Scenario: Cambio de temporada

- **WHEN** se selecciona 2025-2026 en el escenario anterior
- **THEN** `Peluteam` aparece en Top Morosos con la marca

### Requirement: Marca en Top Morosos

En Top Morosos, cada participante que tenga al menos una cagaita en la temporada seleccionada
SHALL mostrar una marca 💩 junto a su nombre. La marca NO SHALL alterar el orden de la tabla ni
los importes de deuda.

El nombre de la hoja SHALL emparejarse con el del participante ignorando los espacios de los
extremos y las diferencias entre mayúsculas y minúsculas.

#### Scenario: Participante con cagaita

- **WHEN** `Palo Verde Fc` tiene una cagaita en la temporada seleccionada
- **THEN** su fila de Top Morosos muestra la marca junto al nombre, en la misma posición y con
  la misma deuda que sin ella

#### Scenario: Participante sin cagaita

- **WHEN** un participante no tiene ninguna cagaita en la temporada seleccionada
- **THEN** su fila de Top Morosos se muestra sin marca

#### Scenario: Diferencias de mayúsculas y espacios

- **WHEN** la hoja trae ` peluteam ` y el participante se llama `Peluteam`
- **THEN** la cagaita se asigna a `Peluteam`

### Requirement: Detalle de la cagaita a demanda

La marca SHALL poder activarse con el ratón, con el dedo y con el teclado. Al activarla SHALL
mostrarse, junto al nombre, el detalle de cada cagaita de ese participante en la temporada: la
fecha y el futbolista vendido, omitiendo los que estén en blanco. Activarla de nuevo SHALL
ocultar el detalle.

En dispositivos con puntero, el mismo detalle SHALL estar disponible también al pasar el ratón
sobre la marca.

#### Scenario: Consultar el detalle

- **WHEN** se toca la marca de `Peluteam`, cuya cagaita es del `12/10/2026` y vendió a `Pedri`
- **THEN** se muestra junto a su nombre `12/10/2026 · vendió a Pedri`

#### Scenario: Detalle sin datos opcionales

- **WHEN** se toca la marca de un participante cuya cagaita no tiene fecha ni futbolista
- **THEN** se muestra que usó su cagaita, sin fecha ni futbolista

#### Scenario: Ocultar el detalle

- **WHEN** se vuelve a tocar la marca con el detalle visible
- **THEN** el detalle se oculta

#### Scenario: Uso con teclado

- **WHEN** se llega a la marca con el tabulador y se pulsa Intro o espacio
- **THEN** el detalle se muestra o se oculta igual que con el ratón

### Requirement: Leyenda discreta

Cuando la temporada seleccionada tenga al menos una cagaita, Top Morosos SHALL mostrar al pie una
leyenda que explique la marca e indique cuántos participantes de la temporada la han usado sobre
el total de participantes. Cuando la temporada no tenga ninguna, la leyenda NO SHALL mostrarse.

Si alguna cagaita de la temporada no coincide con ningún participante, la leyenda SHALL indicarlo
y nombrar los jugadores de la hoja que no se han podido asignar, en lugar de descartarlos sin
aviso.

#### Scenario: Temporada con cagaitas

- **WHEN** 3 de los 18 participantes de la temporada seleccionada tienen cagaita
- **THEN** la leyenda indica que 3 de 18 la han usado

#### Scenario: Temporada sin cagaitas

- **WHEN** ningún participante tiene cagaita en la temporada seleccionada
- **THEN** Top Morosos se muestra sin leyenda

#### Scenario: Nombre que no coincide con ningún participante

- **WHEN** la hoja trae una cagaita de `Pelu Team` en la temporada seleccionada y ningún
  participante se llama así
- **THEN** la leyenda indica que hay una cagaita sin asignar y nombra a `Pelu Team`

#### Scenario: Participantes aún desconocidos

- **WHEN** la temporada seleccionada tiene cagaitas pero todavía no se conoce ningún participante
- **THEN** Top Morosos mantiene su aviso de participantes desconocidos y no muestra leyenda ni
  cagaitas sin asignar

### Requirement: La aplicación no impone la norma

La norma de una cagaita por temporada SHALL aplicarla la liga, no la aplicación: la aplicación
SHALL mostrar todas las cagaitas que recoja la hoja. Un participante con varias cagaitas en la
misma temporada SHALL contar una sola vez en la leyenda, y su detalle SHALL listarlas todas.

#### Scenario: Dos cagaitas del mismo participante en una temporada

- **WHEN** la hoja trae dos cagaitas de `Peluteam` en 2026-2027
- **THEN** `Peluteam` muestra una sola marca, su detalle lista las dos y la leyenda lo cuenta una
  vez

### Requirement: Carga independiente de la vista principal

El CSV de cagaitas SHALL pedirse al cargar la aplicación sin retrasar la presentación de la vista
principal. Si la descarga falla, la vista principal SHALL seguir funcionando y Top Morosos SHALL
indicar de forma discreta que las cagaitas no se han podido cargar.

#### Scenario: Descarga lenta

- **WHEN** el historial ya se ha cargado y el CSV de cagaitas todavía no
- **THEN** la vista principal se muestra completa y las marcas aparecen cuando llega el CSV

#### Scenario: Fallo de descarga

- **WHEN** la URL de cagaitas no responde o devuelve un error
- **THEN** la vista principal funciona con normalidad y el pie de Top Morosos indica que las
  cagaitas no se han podido cargar

