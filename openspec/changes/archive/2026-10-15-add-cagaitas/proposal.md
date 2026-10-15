## Why

En la liga a veces alguien vende un futbolista al mercado sin querer: lo hace medio dormido o le
baila el dedo. Para eso existe una norma de perdón: **una "cagaita" por participante y
temporada**, que deshace el error. Hoy no queda apuntado en ningún sitio quién la ha gastado ya,
así que la norma depende de la memoria del grupo y nadie puede comprobarlo.

## What Changes

- Nueva pestaña **`Cagaitas`** en el Google Sheet, **rellenada a mano** y publicada como CSV.
  Una fila por cagaita: `Temporada`, `Jugador`, `Fecha`, `Futbolista`. Sin bot y sin cron: la
  API de Biwenger no puede saber si una venta fue un error.
- Nueva variable de entorno **`VITE_CSV_CAGAITAS`**. Si no está configurada, la funcionalidad no
  existe para quien navega y la aplicación se comporta exactamente como hoy.
- **Marca 💩 en Top Morosos** junto al nombre de quien ya ha usado su cagaita en la temporada
  seleccionada. Al tocar la marca se despliega bajo el nombre la fecha y el futbolista vendido;
  en escritorio también se ve al pasar el ratón.
- **Leyenda discreta** al pie de Top Morosos, solo cuando la temporada tiene alguna cagaita, con
  cuántos participantes la han usado. Si alguna fila de la hoja no coincide con ningún
  participante, la leyenda lo dice en lugar de esconderla.
- Las cagaitas **siguen al selector de temporada**: cada temporada muestra solo las suyas.

No hay vista nueva ni sección nueva en la home: la funcionalidad se apoya en una tabla que ya
lista a todos los participantes de la temporada.

## Capabilities

### New Capabilities

- `cagaitas`: registro manual de las cagaitas por temporada y su señalización en Top Morosos de
  la temporada seleccionada, con el detalle de cada una a demanda.

### Modified Capabilities

Ninguna. El orden y los importes de Top Morosos no cambian, y que las cagaitas sigan al selector
de temporada ya lo exige `season-navigation` ("todas las secciones de la página pasan a mostrar
los datos de esa temporada").

## Impact

**Código**

- `frontend/src/config.js`: `CSV_CAGAITAS`.
- `frontend/src/lib/csv.js`: `fetchCagaitas`.
- `frontend/src/lib/cagaitas.js` (nuevo): normalización del slug de temporada y cruce de las
  cagaitas de una temporada con sus participantes.
- `frontend/src/App.jsx`: carga del CSV al arrancar, en paralelo y sin bloquear la home.
- `frontend/src/components/morosos/TopMorosos.jsx` y un componente nuevo para la marca.

**Configuración y despliegue**

- `frontend/.env.example`: `VITE_CSV_CAGAITAS`.
- `.github/workflows/deploy-pages.yml`: pasar el secret `VITE_CSV_CAGAITAS` al build. Hace falta
  crear ese secret en el repositorio.
- El Sheet necesita la pestaña `Cagaitas` publicada en la web como CSV con su propio `gid`.

**Documentación**

- `GOOGLE_SHEET_ESTRUCTURA.md`: sección de la pestaña `Cagaitas`, dejando claro que es manual,
  que el nombre del jugador debe escribirse como aparece en la aplicación y que la norma de una
  por temporada no la impone la aplicación.

**Fuera de alcance**

- El bot (`bot.py`) y los workflows del cron.
- Hacer cumplir la norma de una por temporada: la aplicación muestra lo que dice la hoja.
- Efectos de la cagaita sobre la deuda o el bote: son cosas independientes.
- Una vista o listado propio de cagaitas fuera de Top Morosos.
