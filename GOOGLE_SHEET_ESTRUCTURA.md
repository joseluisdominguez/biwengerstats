# Estructura del Google Sheet (Base de Datos)

Publica la pestaña **Historial_Jornadas** en **Archivo → Compartir → Publicar en la web** como **Valores separados por comas (.csv)**. La SPA consume solo esa URL (sin cabecera en el CSV).

## Pestaña: `Historial_Jornadas`

El CSV publicado **no incluye fila de cabecera**; las columnas son (por orden):

| Columna        | Tipo   | Descripción                                      |
|----------------|--------|--------------------------------------------------|
| Jornada        | int    | ID de la jornada en Biwenger (ej. 4484, 4485…) — mismo valor que el argumento del bot |
| Nombre_Jornada | string | Nombre de la jornada en la API (ej. "Jornada 1", "Jornada 2") |
| Jugador        | string | Nombre del jugador                               |
| Puntos         | int    | Puntos de esa jornada                            |
| Posicion       | int    | Posición en la clasificación (1-N)               |
| Deuda_Generada | int    | 0, 1 o 2 según la regla de deuda (ver abajo)     |
| Temporada      | string | Slug de la temporada (ej. `2025-2026`, `2026-2027`) |

Ejemplo de filas del CSV (sin cabecera):
```
4899,Jornada 1,ChochoMojao 💦,22,1,0,2026-2027
4899,Jornada 1,Peluteam,52,2,0,2026-2027
4899,Jornada 1,Palo Verde Fc,33,18,2,2026-2027
```

**Temporada va la última a propósito**: así los índices de columna que lee el bot no se
desplazan (columna A = Jornada para deduplicar, columna C = Jugador). Las filas anteriores a
la introducción de esta columna se quedan vacías y tanto el bot como la SPA las interpretan
como `2025-2026`, así que el backfill es opcional.

## Regla de deuda

El número de participantes cambia cada temporada, así que la regla se calcula sobre el
tamaño real de la liga (N), no sobre una cifra fija:

- posición N (colista): **2 €**
- posición mayor que `N / 2` (redondeando a la baja) y distinta de N: **1 €**
- resto: **0 €**

Con N=17 esto equivale a la regla anterior (17 → 2€, 9-16 → 1€). Con N=18: 1-9 → 0€,
10-17 → 1€, 18 → 2€.

La deuda queda **congelada como dato** en el momento de escribir la fila, así que un cambio
en el tamaño de la liga no altera las temporadas ya registradas.

## Configuración del bot

En local, copia `.env.example` a `.env` y rellena los valores; `bot.py` lo carga al arrancar.
`.env` está en `.gitignore`. **Las variables de entorno ya definidas tienen prioridad sobre el
`.env`**, así que en GitHub Actions mandan los secrets y un `.env` local nunca puede pisarlos.
Conviene que el `.env` apunte al Sheet de desarrollo, no al de producción.

```bash
cp .env.example .env      # rellena BIWENGER_* y GOOGLE_SHEET_ID
python bot.py             # jornadas disputadas pendientes de registrar
python bot.py clausulas   # solo la pestaña Clausulas
python bot.py 4899        # una jornada concreta
```

El Sheet destino debe estar compartido **como Editor** con el `client_email` de la cuenta de
servicio de `credentials.json`.

### Variables disponibles

- `BIWENGER_BEARER_TOKEN`: Token Bearer de la API Biwenger Token Bearer de la API Biwenger
- `BIWENGER_LEAGUE_ID`: ID de la liga
- `BIWENGER_USER_ID`: ID de usuario (se envía en el header X-User)
- `GOOGLE_SHEET_ID`: ID del Sheet (en la URL: `docs.google.com/spreadsheets/d/<ID>/edit`)
- `GOOGLE_APPLICATION_CREDENTIALS`: Ruta al JSON de cuenta de servicio (opcional, por defecto `credentials.json`)
- `BIWENGER_COMPETITION`: Competición (opcional, por defecto `la-liga`)
- `BIWENGER_SKIP_SSL_VERIFY`: `1` desactiva la verificación TLS (solo para proxies corporativos)
- `JORNADA`: **ID de la jornada** (ej. 4484 para Jornada 1), no el número 1, 2, 3… Opcional si se pasa como argumento: `python bot.py 4484`

## Cómo descubre el bot las jornadas y la temporada

El bot **no necesita configuración por temporada**. La API pública, sin autenticación, devuelve
la jornada actual y con ella la temporada en curso y su lista completa de jornadas:

- Temporada en curso: `https://cf.biwenger.com/api/v2/rounds/la-liga?score=5&lang=es` (sin id)
- Una jornada concreta: `https://cf.biwenger.com/api/v2/rounds/la-liga/{id}?score=5&lang=es`

En ambos casos, `data.season` trae `{id, name, slug, rounds[]}`, y `rounds[]` incluye el id, el
nombre y el `status` de cada jornada de esa temporada. El bot usa `get_current_season()` y
`get_finished_round_ids()` para quedarse con las jornadas `finished` que no sean "(aplazada)".

> **Por qué no se encadena `data.next.id`:** los IDs no son contiguos entre temporadas
> (2025/2026 va de 4484 a 4832 y 2026/2027 empieza en 4899) y la última jornada de cada
> temporada tiene `next: null`. Encadenar desde un ID fijo nunca llega a la temporada nueva.

---

## Pestaña: `Clausulas`

Rellenada por el bot con **`python bot.py clausulas`** (solo esta pestaña; no toca Historial_Jornadas). Obtiene las transferencias tipo cláusula del board de la liga (API paginada) y guarda por jugador las **2 fechas más recientes** de “hacer” y “2 de “recibir” (ventana de 7 días).

| Fila | Columna A   | Columnas B, C, … |
|------|-------------|------------------|
| 1    | Jugador     | Nombre de cada jugador |
| 2    | Fecha 1 recibir | Fecha/hora 1ª cláusula recibida |
| 3    | Fecha 2 recibir | Fecha/hora 2ª cláusula recibida |
| 4    | Fecha 1 hacer | Fecha/hora 1ª cláusula hecha |
| 5    | Fecha 2 hacer | Fecha/hora 2ª cláusula hecha |
| 6    | Temporada actual | Slug de la temporada en curso (ej. `2026-2027`) |

La pestaña se **limpia y reescribe entera** en cada ejecución, para que un cambio en el número
de participantes no deje columnas obsoletas del año anterior.

### Fila 6: manifiesto de temporada

La fila `Temporada actual` es el contrato con la SPA: le permite saber cuál es la temporada en
curso **aunque todavía no se haya disputado ninguna jornada**. Sin ella, la SPA cae al slug más
reciente presente en el historial, lo que al arrancar una temporada nueva mostraría la anterior
como si fuera la vigente. La SPA busca la fila por su etiqueta en la columna A, no por posición.

Las cláusulas solo tienen sentido en la temporada en curso (el límite es de 2 por ventana de 7
días), así que la SPA oculta la tabla al consultar temporadas pasadas y no se guarda histórico.

Para que la SPA muestre la tabla de cláusulas, publica esta pestaña en la web como CSV y configura en el frontend la variable de entorno **`VITE_CSV_CLAUSULAS`** con la URL (incluyendo el `gid` de la pestaña Clausulas).
