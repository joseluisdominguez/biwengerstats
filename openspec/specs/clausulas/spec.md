# clausulas Specification

## Purpose
Acota la información de cláusulas a la temporada en curso, que es la única en la que el límite de dos cláusulas por ventana de siete días tiene efecto, y evita presentar movimientos actuales bajo la etiqueta de una temporada pasada.
## Requirements
### Requirement: Cláusulas acotadas a la temporada en curso

La información de cláusulas SHALL corresponder siempre a la temporada en curso y SHALL mostrarse únicamente cuando la temporada seleccionada es la temporada en curso.

#### Scenario: Temporada en curso seleccionada

- **WHEN** la temporada seleccionada es la temporada en curso y hay datos de cláusulas disponibles
- **THEN** se muestra la tabla de cláusulas por participante

#### Scenario: Temporada pasada seleccionada

- **WHEN** la temporada seleccionada no es la temporada en curso
- **THEN** no se muestra la tabla de cláusulas

### Requirement: Aviso explicativo en temporadas pasadas

Al consultar una temporada que no es la temporada en curso, la sección de cláusulas SHALL sustituirse por un aviso que indique que las cláusulas solo aplican a la temporada en curso, en lugar de desaparecer sin explicación.

#### Scenario: Aviso al consultar una temporada pasada

- **WHEN** la temporada seleccionada no es la temporada en curso
- **THEN** en el lugar de la tabla se muestra un aviso indicando que las cláusulas solo aplican a la temporada en curso

### Requirement: Participantes de la temporada en curso

La lista de participantes que alimenta la tabla de cláusulas SHALL corresponder a los participantes de la temporada en curso, incluso antes de que se haya disputado la primera jornada.

#### Scenario: Temporada en curso sin jornadas disputadas

- **WHEN** la temporada en curso no tiene ninguna jornada disputada
- **THEN** la lista de participantes corresponde a los participantes actuales de la liga y no a los de la temporada anterior

#### Scenario: Participantes con movimientos de cláusula

- **WHEN** un participante aparece en movimientos de cláusula
- **THEN** figura en la tabla aunque no aparezca en la clasificación de ninguna jornada disputada

#### Scenario: No se conocen los participantes actuales

- **WHEN** no es posible determinar los participantes actuales de la liga
- **THEN** la tabla no lista participantes de temporadas anteriores como si fueran los actuales

### Requirement: Sin histórico de cláusulas

El sistema no SHALL conservar histórico de cláusulas de temporadas pasadas. La información de cláusulas refleja únicamente la ventana vigente de la temporada en curso.

#### Scenario: Comienzo de una temporada nueva

- **WHEN** comienza una temporada nueva
- **THEN** la información de cláusulas pasa a reflejar la temporada nueva y no se conserva la de la temporada anterior

