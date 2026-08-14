# season-history Specification

## Purpose
Convierte la temporada en una dimensión de primera clase del historial de jornadas, de modo que los datos de varias temporadas puedan convivir en la misma fuente sin mezclarse y el registro automático siga funcionando al cambiar de temporada.
## Requirements
### Requirement: Identificación de temporada en cada registro

Cada registro del historial de jornadas SHALL llevar asociado un identificador de temporada en formato slug `AAAA-AAAA` (por ejemplo `2025-2026`). El identificador SHALL derivarse de la información que la propia fuente de datos de la competición asocia a la jornada, y no de configuración manual.

#### Scenario: Se registra una jornada de la temporada en curso

- **WHEN** el proceso de registro guarda las clasificaciones de una jornada
- **THEN** cada fila guardada incluye el slug de la temporada a la que pertenece esa jornada

#### Scenario: La fuente no expone la temporada de una jornada

- **WHEN** la información de temporada no está disponible para una jornada
- **THEN** el proceso no guarda esa jornada y deja constancia del motivo, en lugar de guardarla sin temporada

### Requirement: Descubrimiento de jornadas independiente de la temporada anterior

El proceso de registro SHALL descubrir las jornadas a procesar a partir del conjunto de jornadas que la competición declara para la temporada en curso, sin depender de encadenar jornadas desde un identificador inicial fijo.

#### Scenario: Comienza una temporada nueva

- **WHEN** la temporada en curso cambia y sus identificadores de jornada no son contiguos con los de la temporada anterior
- **THEN** el proceso descubre y registra las jornadas de la temporada nueva sin necesidad de reconfigurar ningún identificador inicial

#### Scenario: Solo se registran jornadas disputadas

- **WHEN** la temporada en curso declara jornadas todavía no disputadas
- **THEN** el proceso omite esas jornadas y registra únicamente las que ya han finalizado

#### Scenario: Jornadas aplazadas

- **WHEN** una jornada declarada por la competición está marcada como aplazada
- **THEN** el proceso la omite, igual que hace hoy

### Requirement: Compatibilidad con registros anteriores a este cambio

Los registros guardados antes de la introducción de la temporada SHALL seguir siendo legibles y SHALL interpretarse como pertenecientes a la temporada `2025-2026`.

#### Scenario: Se lee un registro sin identificador de temporada

- **WHEN** un consumidor lee un registro del historial que no incluye identificador de temporada
- **THEN** lo trata como perteneciente a la temporada `2025-2026`

### Requirement: Deduplicación de jornadas ya registradas

El proceso de registro SHALL evitar duplicar jornadas ya guardadas, considerando registrada una jornada cuando su identificador ya aparece en el historial.

#### Scenario: Reejecución sobre jornadas ya registradas

- **WHEN** el proceso se ejecuta y todas las jornadas disputadas de la temporada en curso ya están en el historial
- **THEN** no añade ningún registro nuevo

#### Scenario: Coexistencia de temporadas

- **WHEN** el historial contiene jornadas de más de una temporada
- **THEN** la deduplicación no confunde jornadas de temporadas distintas entre sí

### Requirement: Agregados acotados a una temporada

Todo agregado derivado del historial —bote total, deuda acumulada por jugador, evolución de la deuda y lista de participantes— SHALL calcularse considerando únicamente los registros de una temporada.

#### Scenario: Bote de una temporada

- **WHEN** se calcula el bote de una temporada
- **THEN** el resultado suma solo la deuda generada en los registros de esa temporada y excluye los de cualquier otra

#### Scenario: Evolución de la deuda acumulada

- **WHEN** se representa la evolución de la deuda acumulada de una temporada
- **THEN** la serie parte de cero en la primera jornada de esa temporada y no arrastra deuda de temporadas anteriores

#### Scenario: Participantes de una temporada

- **WHEN** se obtiene la lista de participantes de una temporada
- **THEN** incluye solo a quienes aparecen en registros de esa temporada, sin arrastrar participantes de otras

### Requirement: Publicación de la temporada en curso

El sistema SHALL publicar cuál es la temporada en curso de forma legible por la interfaz, de manera independiente de que existan o no jornadas registradas para ella.

#### Scenario: Temporada en curso sin jornadas disputadas

- **WHEN** la temporada en curso ha comenzado pero aún no se ha disputado ninguna jornada
- **THEN** la interfaz puede determinar cuál es la temporada en curso a partir de la información publicada

#### Scenario: La temporada en curso avanza

- **WHEN** la competición pasa a una temporada nueva
- **THEN** la información publicada refleja la temporada nueva sin intervención manual

