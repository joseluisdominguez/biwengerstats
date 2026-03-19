# Bot en modo cron (GitHub Actions, 0€)

El workflow **Bot Biwenger (cron)** ejecuta `bot.py` en los servidores de GitHub según la programación (por defecto diario a las 09:00 UTC). No corre en tu PC y no cuesta dinero.

## 1. Activar el workflow

El archivo está en `.github/workflows/bot-cron.yml`. Se ejecuta:

- **Automáticamente:** según el `schedule` (cron).
- **A mano:** en el repo → pestaña **Actions** → "Bot Biwenger (cron)" → **Run workflow**.

## 2. Configurar secrets

En el repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

### Obligatorios

| Secret | Descripción |
|--------|-------------|
| `BIWENGER_BEARER_TOKEN` | Token Bearer de la API Biwenger |
| `BIWENGER_LEAGUE_ID` | ID de la liga |
| `BIWENGER_USER_ID` | ID de usuario (X-User) |
| `GOOGLE_SHEET_ID` | ID del Google Sheet (de la URL) |
| `GOOGLE_CREDENTIALS_JSON_B64` | **Base64** del JSON de la cuenta de servicio de Google |

Para generar el base64 del JSON de Google (en tu PC):

```bash
base64 -w0 credentials.json
```

Pega el resultado completo en el secret `GOOGLE_CREDENTIALS_JSON_B64`.  
En macOS:

```bash
base64 -i credentials.json | tr -d '\n'
```

### Opcionales

| Secret | Descripción |
|--------|-------------|
| `BIWENGER_COMPETITION` | Por defecto `la-liga` |
| `BIWENGER_FIRST_ROUND_ID` | ID de la primera jornada si no es 4484 |

## 3. Cambiar horario

Edita `.github/workflows/bot-cron.yml` y modifica la línea `cron:`:

```yaml
- cron: "0 9 * * *"   # 09:00 UTC todos los días
```

Formato: minuto hora día-del-mes mes día-de-la-semana (ej. `0 8 * * 1` = lunes a las 08:00 UTC).

## 4. Límites gratis

En repos **públicos**, GitHub Actions tiene minutos gratuitos generosos. En **privados**, unos 2000 min/mes gratis. Cada ejecución del bot suele ser de 1–2 minutos.
