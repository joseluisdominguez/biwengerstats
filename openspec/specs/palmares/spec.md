# palmares Specification

## Purpose
Publica el palmarés histórico de la liga: cuántas Ligas, Copas y Champions ha ganado cada
participante a lo largo de todas las temporadas, en tres clasificaciones independientes
alimentadas por una pestaña del Sheet que se mantiene a mano.
## Requirements
### Requirement: Origen manual de los datos de palmarés

El palmarés SHALL leerse de una pestaña del Google Sheet publicada como CSV, cuya URL se
configura en la variable de entorno `VITE_CSV_PALMARES`. Las columnas SHALL ser, por orden:
`Jugador`, `Ligas`, `Copas`, `Champions`.

Esa pestaña se mantiene a mano y ningún proceso automático SHALL escribir en ella: el palmarés
no se deriva de `Historial_Jornadas` ni de ninguna llamada a la API de Biwenger.

#### Scenario: Lectura de una fila completa

- **WHEN** el CSV contiene la fila `ChochoMojao 💦,3,1,2`
- **THEN** el sistema registra a `ChochoMojao 💦` con 3 Ligas, 1 Copa y 2 Champions

#### Scenario: La cabecera de la hoja no se toma como jugador

- **WHEN** la primera fila del CSV es `Jugador,Ligas,Copas,Champions`, es decir, sus columnas
  de recuento no contienen números
- **THEN** el sistema la descarta y no la muestra como participante

#### Scenario: El CSV no lleva cabecera

- **WHEN** la primera fila del CSV es ya la de un jugador, con recuentos numéricos
- **THEN** el sistema la trata como participante y no descarta ningún dato

#### Scenario: Celda de recuento vacía

- **WHEN** una fila trae el nombre del jugador pero deja en blanco alguna de las tres columnas
- **THEN** el sistema interpreta esa columna como 0 títulos

#### Scenario: Filas residuales de la edición manual

- **WHEN** el CSV incluye filas sin nombre de jugador, como las que deja una hoja editada a mano
- **THEN** el sistema las ignora y no aparecen en ninguna clasificación

### Requirement: Acceso al palmarés desde la cabecera

Cuando `VITE_CSV_PALMARES` esté configurada, la cabecera SHALL ofrecer un acceso identificado
con un icono de medalla que lleve a la vista de palmarés. Cuando no lo esté, ese acceso NO SHALL
mostrarse y la vista NO SHALL ser alcanzable.

#### Scenario: Palmarés configurado

- **WHEN** `VITE_CSV_PALMARES` tiene una URL válida y se carga la aplicación
- **THEN** la cabecera muestra el acceso al palmarés

#### Scenario: Palmarés sin configurar

- **WHEN** `VITE_CSV_PALMARES` está vacía o conserva el marcador de ejemplo sin sustituir
- **THEN** la cabecera no muestra el acceso y la aplicación se comporta como si el palmarés no
  existiera

### Requirement: El palmarés es una vista con URL propia

El palmarés SHALL ocupar una vista propia identificada en la URL mediante el parámetro
`vista=palmares`, de modo que su dirección pueda compartirse y abrirse en frío. La navegación
entre la vista principal y el palmarés SHALL integrarse en el historial del navegador: el botón
atrás devuelve a la vista anterior en lugar de abandonar la aplicación.

Al entrar en el palmarés, el parámetro `temporada` presente en la URL SHALL conservarse, de modo
que al volver se recupere la misma temporada que se estaba consultando.

#### Scenario: Abrir el palmarés

- **WHEN** se activa el acceso del palmarés desde la vista principal
- **THEN** la URL pasa a incluir `vista=palmares` y se muestra la vista de palmarés

#### Scenario: Volver con el botón atrás

- **WHEN** se pulsa el botón atrás del navegador estando en la vista de palmarés
- **THEN** se vuelve a la vista principal sin salir de la aplicación

#### Scenario: Enlace directo al palmarés

- **WHEN** se abre en frío una URL que contiene `vista=palmares`
- **THEN** la aplicación muestra directamente la vista de palmarés

#### Scenario: La temporada consultada sobrevive a la visita

- **WHEN** se consulta la temporada `2025-2026`, se entra en el palmarés y se vuelve atrás
- **THEN** la vista principal sigue mostrando la temporada `2025-2026`

#### Scenario: Valor desconocido en el parámetro de vista

- **WHEN** la URL trae un valor de `vista` que no corresponde a ninguna vista conocida
- **THEN** la aplicación muestra la vista principal

### Requirement: El palmarés es independiente de la temporada seleccionada

El palmarés SHALL reflejar los títulos acumulados de todas las temporadas y NO SHALL verse
afectado por la temporada seleccionada en la vista principal.

Dado que ni el selector de temporada ni el bote acumulado tienen significado sobre datos
históricos, la vista de palmarés NO SHALL mostrarlos.

#### Scenario: Cambiar de temporada no altera el palmarés

- **WHEN** se consulta el palmarés tras haber seleccionado una temporada u otra en la vista
  principal
- **THEN** las tres clasificaciones muestran exactamente los mismos datos en ambos casos

#### Scenario: Cabecera de la vista de palmarés

- **WHEN** se muestra la vista de palmarés
- **THEN** la cabecera no ofrece el selector de temporada ni el bote de la temporada

### Requirement: Tres clasificaciones independientes por trofeo

La vista SHALL presentar tres clasificaciones separadas —Ligas, Copas y Champions—, cada una
ordenada por su propio número de títulos de mayor a menor.

Los empates SHALL resolverse por orden alfabético del nombre del jugador, y los jugadores
empatados SHALL compartir el mismo numeral de posición, de forma que tras dos empatados en el
primer puesto el siguiente ocupe el tercero.

#### Scenario: Orden por número de títulos

- **WHEN** en Ligas hay jugadores con 3, 2 y 1 títulos
- **THEN** la clasificación de Ligas los presenta de mayor a menor número de títulos

#### Scenario: Empate resuelto alfabéticamente

- **WHEN** `Peluteam` y `Nemo FC` tienen ambos 2 Copas
- **THEN** la clasificación de Copas muestra `Nemo FC` antes que `Peluteam`

#### Scenario: Numeral compartido entre empatados

- **WHEN** dos jugadores encabezan una clasificación empatados a títulos y un tercero les sigue
  con menos
- **THEN** los dos primeros figuran ambos en la posición 1 y el tercero en la posición 3

#### Scenario: Cada trofeo ordena por su propia columna

- **WHEN** un jugador es el primero en Ligas y el último en Copas
- **THEN** aparece en cabeza de la clasificación de Ligas y al final de la de Copas

### Requirement: Los jugadores sin títulos no aparecen en ese trofeo

Un jugador con 0 títulos en un trofeo NO SHALL aparecer en la clasificación de ese trofeo, con
independencia de los títulos que tenga en los otros dos.

#### Scenario: Presente en un trofeo y ausente en otro

- **WHEN** un jugador tiene 2 Ligas y 0 Champions
- **THEN** aparece en la clasificación de Ligas y no aparece en la de Champions

#### Scenario: Jugador sin ningún título

- **WHEN** un jugador figura en la hoja con 0 en los tres trofeos
- **THEN** no aparece en ninguna de las tres clasificaciones

### Requirement: Estados de carga, vacío y error del palmarés

La vista SHALL informar de su estado mientras se obtienen los datos y cuando no haya nada que
mostrar, sin dejar la pantalla en blanco ni presentar una clasificación vacía como si fuera un
resultado.

Un fallo al obtener el CSV del palmarés NO SHALL impedir el uso del resto de la aplicación.

#### Scenario: Datos en camino

- **WHEN** la vista de palmarés se muestra y sus datos todavía se están obteniendo
- **THEN** la vista indica que está cargando

#### Scenario: Trofeo sin ganadores todavía

- **WHEN** ningún jugador tiene títulos en uno de los tres trofeos
- **THEN** ese bloque indica que aún no tiene ganadores, y los otros dos se muestran con normalidad

#### Scenario: Hoja sin datos

- **WHEN** el CSV del palmarés no contiene ninguna fila de jugador utilizable
- **THEN** la vista indica que todavía no hay palmarés registrado

#### Scenario: Fallo al obtener el CSV

- **WHEN** la descarga del CSV del palmarés falla
- **THEN** la vista de palmarés informa del error y la vista principal sigue funcionando con
  normalidad

