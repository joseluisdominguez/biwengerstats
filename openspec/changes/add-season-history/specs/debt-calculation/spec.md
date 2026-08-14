## Purpose

Define cómo se calcula la deuda que genera cada participante en una jornada cuando el número de participantes de la liga cambia de una temporada a otra, y garantiza que lo mostrado en pantalla coincida siempre con lo registrado.

## ADDED Requirements

### Requirement: Deuda en función del tamaño de la liga

La deuda generada por un participante en una jornada SHALL calcularse en función de su posición en esa jornada y del número total de participantes de la liga (N), según la regla "la mitad de abajo paga, el colista paga doble":

- posición igual a N: 2 €
- posición mayor que `floor(N / 2)` y distinta de N: 1 €
- resto de posiciones: 0 €

#### Scenario: Liga de 18 participantes

- **WHEN** la liga tiene 18 participantes
- **THEN** las posiciones 1 a 9 generan 0 €, las posiciones 10 a 17 generan 1 €, y la posición 18 genera 2 €

#### Scenario: Liga de 17 participantes

- **WHEN** la liga tiene 17 participantes
- **THEN** las posiciones 1 a 8 generan 0 €, las posiciones 9 a 16 generan 1 €, y la posición 17 genera 2 €

#### Scenario: Liga de 16 participantes

- **WHEN** la liga tiene 16 participantes
- **THEN** las posiciones 1 a 8 generan 0 €, las posiciones 9 a 15 generan 1 €, y la posición 16 genera 2 €

### Requirement: Tamaño de la liga determinado por la propia jornada

El número de participantes usado para calcular la deuda de una jornada SHALL determinarse a partir de la clasificación completa de esa jornada, de modo que no dependa de configuración manual ni de que todos los participantes hayan alineado equipo.

#### Scenario: Un participante no alinea equipo

- **WHEN** en una jornada uno de los participantes no tiene alineación registrada
- **THEN** el tamaño de la liga usado para calcular la deuda sigue siendo el número real de participantes de la liga

#### Scenario: El tamaño de la liga cambia entre temporadas

- **WHEN** una temporada nueva tiene un número de participantes distinto al de la anterior
- **THEN** la deuda de la temporada nueva se calcula con su propio número de participantes, sin requerir cambios de configuración

### Requirement: Inmutabilidad de la deuda registrada

La deuda generada SHALL quedar registrada como dato junto a cada jornada en el momento de guardarla, y no SHALL recalcularse al consultarla. Un cambio en el tamaño de la liga no SHALL alterar la deuda ya registrada de temporadas anteriores.

#### Scenario: La liga cambia de tamaño

- **WHEN** la liga pasa de 17 a 18 participantes
- **THEN** las jornadas ya registradas de la temporada de 17 participantes conservan la deuda con la que fueron guardadas

### Requirement: Presentación fiel al dato registrado

La interfaz SHALL derivar el importe mostrado y su tratamiento visual de la deuda registrada en el propio dato, y no SHALL inferirlos a partir de la posición del participante.

#### Scenario: Colista de una liga de 18

- **WHEN** se muestra la jornada de una liga de 18 participantes y el participante en posición 18 tiene 2 € de deuda registrada
- **THEN** la interfaz muestra 2 € con el tratamiento visual de deuda máxima

#### Scenario: Coherencia entre el detalle y el total

- **WHEN** se muestran conjuntamente el detalle de deuda por jornada y el bote total de la temporada
- **THEN** la suma de los importes mostrados en el detalle coincide con el bote total mostrado

### Requirement: Verificación del tamaño esperado de la liga

El proceso de registro SHALL avisar cuando el número de participantes obtenido para una jornada difiera del número de participantes de la liga, sin asumir ninguna cifra fija.

#### Scenario: Clasificación incompleta

- **WHEN** una jornada devuelve menos participantes de los que tiene la liga
- **THEN** el proceso deja constancia del aviso indicando la cifra obtenida y la esperada
