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
| Posicion       | int    | Posición en la clasificación (1-17)              |
| Deuda_Generada | int    | 0, 1 o 2 según reglas (17→2€, 9-16→1€)          |

Ejemplo de filas del CSV (sin cabecera):
```
4484,Jornada 1,ChochoMojao 💦,22,1,0
4484,Jornada 1,Peluteam,52,2,0
4484,Jornada 1,Palo Verde Fc,33,17,2
```

## Variables de entorno para el bot

- `BIWENGER_BEARER_TOKEN`: Token Bearer de la API Biwenger Token Bearer de la API Biwenger
- `BIWENGER_LEAGUE_ID`: ID de la liga
- `BIWENGER_USER_ID`: ID de usuario (se envía en el header X-User)
- `GOOGLE_SHEET_ID`: ID del Sheet (en la URL: `docs.google.com/spreadsheets/d/<ID>/edit`)
- `GOOGLE_APPLICATION_CREDENTIALS`: Ruta al JSON de cuenta de servicio (opcional, por defecto `credentials.json`)
- `JORNADA`: **ID de la jornada** (ej. 4484 para Jornada 1), no el número 1, 2, 3… Opcional si se pasa como argumento: `python bot.py 4484`

## Cómo obtener los IDs de jornada

El bot usa el **ID de jornada** (ej. 4484). Para listar todos los IDs de jornadas disputadas puedes usar la API pública sin autenticación:

- URL: `https://cf.biwenger.com/api/v2/rounds/la-liga/{id}?score=5&lang=es`
- En la respuesta, `data.next.id` es el ID de la siguiente jornada. Iterando desde el ID de la Jornada 1 (4484) puedes obtener todos los IDs.

En el bot hay una función helper `get_completed_round_ids(competition_slug="la-liga", first_round_id=4484)` que hace esta iteración y devuelve la lista de IDs; puedes usarla desde un script para ejecutar el bot sobre varias jornadas.

---

## Pestaña: `Clausulas`

Rellenada por el bot con **`python bot.py clausulas`** (solo esta pestaña; no toca Historial_Jornadas). Obtiene las transferencias tipo cláusula del board de la liga (API paginada) y guarda por jugador las **2 fechas más recientes** de “hacer” y “2 de “recibir” (ventana de 7 días).

| Fila | Columna A   | Columnas B, C, … |
|------|-------------|------------------|
| 1    | Jugador     | Nombre de cada jugador |
| 2    | Fecha 1 hacer | Fecha/hora 1ª cláusula hecha |
| 3    | Fecha 2 hacer | Fecha/hora 2ª cláusula hecha |
| 4    | Fecha 1 recibir | Fecha/hora 1ª cláusula recibida |
| 5    | Fecha 2 recibir | Fecha/hora 2ª cláusula recibida |

Para que la SPA muestre la tabla de cláusulas, publica esta pestaña en la web como CSV y configura en el frontend la variable de entorno **`VITE_CSV_CLAUSULAS`** con la URL (incluyendo el `gid` de la pestaña Clausulas).
