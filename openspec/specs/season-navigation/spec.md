# season-navigation Specification

## Purpose
Permite a los miembros de la liga consultar los datos de cualquier temporada registrada desde la propia aplicación, entrando siempre por la temporada en curso y pudiendo compartir por enlace la vista de una temporada concreta.
## Requirements
### Requirement: Selector de temporada

La interfaz SHALL ofrecer un selector de temporada en la cabecera, junto al título. El selector SHALL listar la temporada en curso y todas las temporadas con registros en el historial, ordenadas de más reciente a más antigua.

#### Scenario: Hay registros de varias temporadas

- **WHEN** el historial contiene registros de 2025-2026 y de 2026-2027
- **THEN** el selector ofrece ambas temporadas

#### Scenario: La temporada en curso aún no tiene registros

- **WHEN** la temporada en curso ha comenzado pero no tiene ninguna jornada registrada
- **THEN** el selector la ofrece igualmente, junto a las temporadas que sí tienen registros

#### Scenario: Cambio de temporada

- **WHEN** la persona usuaria selecciona una temporada distinta
- **THEN** todas las secciones de la página pasan a mostrar los datos de esa temporada

### Requirement: Temporada por defecto

Al abrir la aplicación sin indicar temporada, la interfaz SHALL mostrar la temporada en curso, tenga o no jornadas registradas.

#### Scenario: Entrada sin temporada indicada

- **WHEN** se abre la aplicación sin parámetro de temporada
- **THEN** se muestra la temporada en curso seleccionada

#### Scenario: Temporada en curso vacía y temporada anterior con datos

- **WHEN** la temporada en curso no tiene registros y la anterior sí
- **THEN** se muestra la temporada en curso, no la anterior

### Requirement: Temporada seleccionada reflejada en la URL

La temporada seleccionada SHALL reflejarse en el querystring con el parámetro `temporada` y el slug de la temporada, de modo que la vista sea compartible por enlace.

#### Scenario: Selección manual

- **WHEN** la persona usuaria selecciona una temporada
- **THEN** la URL pasa a incluir `?temporada=<slug>` sin recargar la página

#### Scenario: Apertura de un enlace con temporada

- **WHEN** se abre una URL con `?temporada=2025-2026`
- **THEN** la aplicación muestra la temporada 2025-2026 seleccionada

#### Scenario: Temporada inexistente en la URL

- **WHEN** se abre una URL cuyo parámetro `temporada` no corresponde a ninguna temporada disponible
- **THEN** la aplicación muestra la temporada en curso en lugar de un error

### Requirement: Identidad visual de la temporada seleccionada

El título y el resumen de la cabecera SHALL corresponder a la temporada seleccionada y no SHALL contener ninguna temporada fija.

#### Scenario: Título de la temporada seleccionada

- **WHEN** está seleccionada la temporada 2026-2027
- **THEN** el título muestra esa temporada y no una temporada codificada de forma fija

#### Scenario: Resumen de la última jornada registrada

- **WHEN** está seleccionada una temporada con jornadas registradas
- **THEN** el resumen indica la última jornada registrada de esa temporada

### Requirement: Temporada sin jornadas registradas

Cuando la temporada seleccionada no tiene ninguna jornada registrada, la interfaz SHALL mostrar estados vacíos explicativos en lugar de errores o secciones en blanco sin contexto.

#### Scenario: Bote de una temporada sin jornadas

- **WHEN** la temporada seleccionada no tiene registros
- **THEN** el bote total se muestra como 0 €

#### Scenario: Secciones dependientes de jornadas

- **WHEN** la temporada seleccionada no tiene registros
- **THEN** las secciones de desastre por jornada y de evolución de la deuda indican que la temporada aún no ha comenzado

#### Scenario: Participantes conocidos sin jornadas disputadas

- **WHEN** la temporada seleccionada es la temporada en curso, no tiene registros, y se conocen sus participantes
- **THEN** la clasificación de morosos lista a esos participantes por orden alfabético con 0 € cada uno

