## Why

La aplicación solo cuenta lo que pasa dentro de una temporada: deuda, morosos y cláusulas
nacen todos del filtro por `temporadaEfectiva`. Los títulos ganados a lo largo de los años no
están en ninguna parte, y son justo el dato que la liga presume entre temporadas. No existe
ninguna fuente automática para ellos (Biwenger no expone el histórico de campeones de una liga
privada), así que la única vía realista es mantenerlos a mano.

Además, `App.jsx` acumula 830 líneas con parseo de CSV, estado, cálculo de agregados y toda la
presentación en un único componente. Ya supera el máximo de 800 líneas del proyecto, y añadir
una sección nueva encima lo empeora en lugar de arreglarlo.

## What Changes

- Nueva pestaña **`Palmares`** en el Google Sheet, **rellenada a mano** y publicada como CSV.
  Columnas: `Jugador`, `Ligas`, `Copas`, `Champions`. Sin bot y sin cron.
- Nueva variable de entorno **`VITE_CSV_PALMARES`**. Si no está configurada, la sección no
  existe para quien navega: ni icono ni vista.
- **Icono de medalla en la cabecera** que lleva a una vista propia con URL compartible
  (`?vista=palmares`), navegable con el botón atrás como ya ocurre con `?temporada=`.
- La vista muestra **tres clasificaciones independientes** (Ligas, Copas, Champions), cada una
  ordenada por su propio número de títulos de mayor a menor, con desempate alfabético y
  numeral compartido entre empatados. Quien tenga 0 títulos en un trofeo no aparece en esa
  clasificación.
- El palmarés es **histórico y ajeno a la temporada seleccionada**: es el primer dato de la
  aplicación que no pasa por `temporadaEfectiva`.
- **Refactor de `App.jsx`** en módulos por feature (`lib/`, `hooks/`, `components/<feature>/`),
  sin cambio de comportamiento, como paso previo verificable a la nueva vista.

No hay cambios rupturistas: todo lo existente sigue funcionando igual, y sin
`VITE_CSV_PALMARES` la aplicación se comporta exactamente como hoy.

## Capabilities

### New Capabilities

- `palmares`: clasificaciones históricas de títulos por trofeo, alimentadas por una pestaña
  manual del Sheet, accesibles desde una vista propia con URL compartible e independientes de
  la temporada seleccionada.

### Modified Capabilities

Ninguna. `openspec/specs/` está vacío todavía (las capacidades de `add-season-history` siguen
sin archivar) y este cambio no altera ningún requisito de comportamiento existente: la deuda,
las jornadas, los morosos y las cláusulas quedan intactos. El refactor de `App.jsx` es puro
detalle de implementación y por definición no toca specs.

## Impact

**Código**

- `frontend/src/App.jsx` (830 líneas) se descompone en `config.js`, `lib/`, `hooks/` y
  `components/<feature>/`. Al extraerlos se corrigen de paso dos defectos reales: `LegendDeuda`
  se declara hoy dentro del cuerpo de `App()` (`App.jsx:424`), lo que remonta la leyenda entera
  en cada render, y `chartColors` (`App.jsx:397`) reconstruye un array de 24 elementos también
  en cada render.
- Ficheros nuevos para la vista de palmarés y su parseo de CSV.

**Configuración y despliegue**

- `frontend/.env.example` y `frontend/.env.production`: nueva `VITE_CSV_PALMARES`.
- El Sheet necesita la pestaña `Palmares` publicada en la web como CSV con su propio `gid`.

**Documentación**

- `GOOGLE_SHEET_ESTRUCTURA.md`: sección para la pestaña `Palmares`, dejando claro que es
  manual y que no la toca el bot.

**Fuera de alcance**

- El bot (`bot.py`), los workflows de GitHub Actions y cualquier automatización del palmarés.
- Cruzar los nombres del palmarés con los de `Historial_Jornadas` o `Clausulas`: las tres
  pestañas quedan desacopladas a propósito.
- Registrar el detalle de qué temporada corresponde a cada título: solo se guardan totales.
