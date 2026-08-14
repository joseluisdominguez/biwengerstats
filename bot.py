#!/usr/bin/env python3
"""
Biwenger Stats Bot - Extrae clasificación por jornada y actualiza Google Sheet.
Reglas de deuda: la mitad de abajo paga 1€, el colista paga 2€ (ver compute_deuda).
"""

import os
import sys
import time
from typing import Optional


def load_dotenv(path: str = ".env") -> None:
    """
    Carga variables de un fichero .env para desarrollo local.

    Las variables ya presentes en el entorno tienen prioridad: en GitHub Actions los
    secrets llegan como variables reales y un .env no debe poder pisarlos.
    """
    try:
        with open(path, encoding="utf-8") as f:
            lineas = f.readlines()
    except FileNotFoundError:
        return
    for linea in lineas:
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        clave = clave.strip()
        valor = valor.strip().strip('"').strip("'")
        if clave and clave not in os.environ:
            os.environ[clave] = valor


load_dotenv()

# --- Configuración (variables de entorno o .env) ---
BIWENGER_BEARER_TOKEN = os.environ.get("BIWENGER_BEARER_TOKEN", "TU_BEARER_TOKEN_AQUI")
BIWENGER_LEAGUE_ID = os.environ.get("BIWENGER_LEAGUE_ID", "TU_LEAGUE_ID_AQUI")
BIWENGER_USER_ID = os.environ.get("BIWENGER_USER_ID", "TU_USER_ID_AQUI")
GOOGLE_SHEET_ID = os.environ.get("GOOGLE_SHEET_ID", "TU_GOOGLE_SHEET_ID_AQUI")

# URL base de la API de Biwenger (ajustar si la API oficial cambia)
BIWENGER_API_BASE = "https://biwenger.as.com/api/v2"

# Nombre de la pestaña en el Sheet
SHEET_TAB_HISTORIAL = "Historial_Jornadas"
SHEET_TAB_CLAUSULAS = "Clausulas"

# Etiqueta de la fila de la pestaña Clausulas que publica la temporada en curso.
# Es el contrato con la SPA: le permite saber cuál es la temporada actual aunque
# todavía no tenga ninguna jornada registrada.
CLAUSULAS_LABEL_TEMPORADA = "Temporada actual"

# Temporada de las filas del historial anteriores a la introducción de la columna Temporada.
TEMPORADA_POR_DEFECTO = "2025-2026"

# API pública para listar jornadas (sin auth). Competición por defecto.
BIWENGER_PUBLIC_API_BASE = "https://cf.biwenger.com/api/v2"

# Headers para la API pública (evitan 403 por User-Agent de script)
PUBLIC_API_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Referer": "https://biwenger.as.com/",
}


def _fetch_public_round(round_id: Optional[int], competition_slug: str) -> dict:
    """
    GET /rounds/{competicion}[/{id}] en la API pública (sin auth).
    Sin round_id devuelve la jornada actual. Retorna el objeto `data` de la respuesta.
    """
    import requests
    import certifi

    skip_verify = os.environ.get("BIWENGER_SKIP_SSL_VERIFY", "").strip().lower() in ("1", "true", "yes")
    verify_ssl = False if skip_verify else certifi.where()
    url = f"{BIWENGER_PUBLIC_API_BASE}/rounds/{competition_slug}"
    if round_id is not None:
        url = f"{url}/{round_id}"
    resp = requests.get(url, params={"score": 5, "lang": "es"}, headers=PUBLIC_API_HEADERS, timeout=15, verify=verify_ssl)
    resp.raise_for_status()
    return resp.json().get("data") or {}


def get_current_season(competition_slug: str = "la-liga") -> dict:
    """
    Temporada en curso según la API pública: la jornada actual (endpoint sin id) trae
    la temporada a la que pertenece, con la lista completa de sus jornadas.

    Retorna {"slug": str, "name": str, "rounds": list[dict]}.

    Los IDs de jornada no son contiguos entre temporadas (25/26 acaba en 4521 y 26/27
    empieza en 4899, y la última jornada de una temporada tiene next=None), por eso no
    se puede descubrir la temporada nueva encadenando jornadas desde un ID fijo.
    """
    data = _fetch_public_round(None, competition_slug)
    season = data.get("season") or {}
    slug = (season.get("slug") or "").strip()
    if not slug:
        raise RuntimeError(f"La API no devolvió temporada para la competición '{competition_slug}'.")
    return {
        "slug": slug,
        "name": (season.get("name") or "").strip(),
        "rounds": season.get("rounds") or [],
    }


def get_round_public_info(round_id: int, competition_slug: str = "la-liga") -> dict:
    """Nombre y temporada de una jornada concreta. Retorna {"name": str, "season_slug": str}."""
    data = _fetch_public_round(round_id, competition_slug)
    season = data.get("season") or {}
    slug = (season.get("slug") or "").strip()
    if not slug:
        raise RuntimeError(f"La API no devolvió temporada para la jornada {round_id}.")
    return {"name": (data.get("name") or "").strip(), "season_slug": slug}


def is_jornada_aplazada(round_name: str) -> bool:
    """Las jornadas aplazadas (ej. "Jornada 6 (aplazada)") no cuentan para la deuda."""
    return (round_name or "").strip().endswith("(aplazada)")


def get_finished_round_ids(season: dict) -> list[int]:
    """IDs de las jornadas ya disputadas de una temporada, en orden y sin aplazadas."""
    ids = []
    for r in season.get("rounds") or []:
        if not isinstance(r, dict) or r.get("status") != "finished":
            continue
        if is_jornada_aplazada(r.get("name")):
            continue
        rid = r.get("id")
        if isinstance(rid, int):
            ids.append(rid)
    return ids


def get_season_round_ids(season: dict) -> list[int]:
    """Todos los IDs de jornada de una temporada, estén disputadas o no."""
    return [
        r["id"]
        for r in season.get("rounds") or []
        if isinstance(r, dict) and isinstance(r.get("id"), int)
    ]


def get_round_names(season: dict) -> dict[int, str]:
    """Mapa id -> nombre de jornada, para no pedir el nombre una vez por jornada."""
    names = {}
    for r in season.get("rounds") or []:
        if isinstance(r, dict) and isinstance(r.get("id"), int):
            names[r["id"]] = (r.get("name") or "").strip()
    return names


def _biwenger_headers() -> dict:
    """Headers comunes para todas las peticiones a la API de Biwenger."""
    return {
        "Authorization": f"Bearer {BIWENGER_BEARER_TOKEN}",
        "Content-Type": "application/json",
        "X-League": str(BIWENGER_LEAGUE_ID),
        "X-User": str(BIWENGER_USER_ID),
    }


def get_round_standings(round_id: int) -> dict:
    """
    Obtiene la clasificación de una jornada desde la API de Biwenger (autenticada).
    round_id: ID de la jornada (ej. 4484 para Jornada 1). Endpoint: GET /rounds/league/{round_id}
    Solo incluye jugadores con lineup (jornada disputada); puntos y posición vienen de standings[].lineup.

    Retorna {"standings": list[dict], "members": list[str], "league_size": int}:
    - standings: solo quienes tienen alineación (filas de puntuación)
    - members: TODOS los miembros actuales de la liga, tengan alineación o no
    - league_size: participantes con los que se jugó la jornada (ver compute_league_size)
    El nombre y la temporada de la jornada se obtienen por separado de la API pública.
    """
    import requests
    import certifi

    headers = _biwenger_headers()
    # SSL: por defecto certifi; si hay proxy corporativo, usa BIWENGER_SKIP_SSL_VERIFY=1
    skip_verify = os.environ.get("BIWENGER_SKIP_SSL_VERIFY", "").strip().lower() in ("1", "true", "yes")
    verify_ssl = False if skip_verify else certifi.where()
    if skip_verify:
        import warnings
        warnings.warn("SSL verification disabled (BIWENGER_SKIP_SSL_VERIFY). Use only on trusted networks.")

    url = f"{BIWENGER_API_BASE}/rounds/league/{round_id}"
    resp = requests.get(url, headers=headers, timeout=30, verify=verify_ssl)
    resp.raise_for_status()
    data = resp.json()

    # data.league.standings[] con { name, lineup: { points, position } }; sin lineup = jornada no disputada
    standings = []
    try:
        league = data.get("data", {}).get("league", {})
        raw_list = league.get("standings", [])
    except AttributeError:
        raw_list = []

    members = []
    for i, entry in enumerate(raw_list, start=1):
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or f"Jugador_{i}"
        members.append(name)
        lineup = entry.get("lineup")
        if not lineup:
            continue  # jornada aún no disputada para este jugador / no cuenta
        points = int(lineup.get("points", 0))
        position = int(lineup.get("position", 0))
        standings.append({"name": name, "points": points, "position": position})

    return {
        "standings": standings,
        "members": members,
        "league_size": compute_league_size(standings, members),
    }


def compute_league_size(standings: list[dict], members: list[str]) -> int:
    """
    Tamaño de la liga con el que se jugó una jornada, a partir de su clasificación.

    Se toma de la posición más alta y NO del número de miembros: `standings` refleja la
    plantilla de HOY, así que quien se haya ido desde entonces ya no aparece y quien haya
    entrado después aparece sin alineación. Verificado contra la API: la J38 de 2025/2026
    devuelve 18 miembros actuales, solo 16 con alineación y posiciones [1..6, 8..17];
    max(position)=17 es el tamaño real con el que se disputó.

    En una jornada finalizada Biwenger asigna posición a todos los participantes (las 38
    jornadas de 2025/2026 tienen 17 filas cada una), así que la posición más alta equivale
    al número de participantes. Sin clasificación (jornada pendiente) se usa la plantilla
    actual, que es lo único conocido.
    """
    return max((s["position"] for s in standings), default=len(members))


def compute_deuda(position: int, total: int) -> int:
    """
    Regla: "la mitad de abajo paga, el colista paga doble".

    - colista (position == total): 2€
    - por debajo de la mitad de la tabla (position > total // 2): 1€
    - resto: 0€

    El tamaño de la liga varía cada temporada, por eso `total` es obligatorio.
    Para total=17 reproduce la regla anterior (17 → 2€, 9-16 → 1€).
    """
    if position == total:
        return 2
    if position > total // 2:
        return 1
    return 0


def build_historial_rows(
    jornada: int,
    round_name: str,
    standings: list[dict],
    league_size: int,
    temporada: str,
) -> list[list]:
    """
    Genera las filas para append en Historial_Jornadas:
    Jornada, Nombre_Jornada, Jugador, Puntos, Posicion, Deuda_Generada, Temporada.

    Temporada va la última para no desplazar los índices de columna que lee el bot
    (columna A = Jornada para deduplicar, columna C = Jugador).
    """
    rows = []
    for s in standings:
        pos = s["position"]
        rows.append([
            jornada,
            round_name,
            s["name"],
            s["points"],
            pos,
            compute_deuda(pos, league_size),
            temporada,
        ])
    return rows


def append_to_google_sheet(rows: list[list]) -> None:
    """Añade las filas a la pestaña Historial_Jornadas del Google Sheet usando gspread."""
    import gspread
    from google.oauth2.service_account import Credentials

    scope = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]
    # Credenciales: archivo JSON o variable de entorno con path
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    creds = Credentials.from_service_account_file(creds_path, scopes=scope)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(GOOGLE_SHEET_ID)
    worksheet = sheet.worksheet(SHEET_TAB_HISTORIAL)
    worksheet.append_rows(rows, value_input_option="USER_ENTERED")
    print(f"Append correcto: {len(rows)} filas en '{SHEET_TAB_HISTORIAL}'.")


def get_existing_jornada_ids_in_sheet() -> set[int]:
    """Lee la columna Jornada (A) del Sheet y devuelve los IDs de jornada ya guardados."""
    import gspread
    from google.oauth2.service_account import Credentials

    scope = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    creds = Credentials.from_service_account_file(creds_path, scopes=scope)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(GOOGLE_SHEET_ID)
    worksheet = sheet.worksheet(SHEET_TAB_HISTORIAL)
    col_a = worksheet.col_values(1)  # Jornada
    existing = set()
    for val in col_a:
        s = (val or "").strip()
        if s.isdigit():
            existing.add(int(s))
    return existing


def get_all_players_from_historial_sheet(temporada: str) -> list[str]:
    """
    Jugadores registrados en el historial para una temporada concreta (respaldo si la API falla).

    Se acota por temporada para no devolver la plantilla del año anterior: sin este filtro,
    al arrancar una temporada nueva se listarían los participantes de la anterior.
    Las filas sin columna Temporada son anteriores a este cambio y cuentan como
    TEMPORADA_POR_DEFECTO.
    """
    import gspread
    from google.oauth2.service_account import Credentials

    scope = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    creds = Credentials.from_service_account_file(creds_path, scopes=scope)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(GOOGLE_SHEET_ID)
    worksheet = sheet.worksheet(SHEET_TAB_HISTORIAL)
    return filter_players_by_temporada(worksheet.get_all_values(), temporada)


def filter_players_by_temporada(rows: list[list], temporada: str) -> list[str]:
    """Nombres únicos (columna C) de las filas del historial que pertenecen a `temporada`."""
    names = set()
    for row in rows:
        if not isinstance(row, list) or len(row) < 3:
            continue
        name = (row[2] or "").strip()
        if not name:
            continue
        fila_temporada = (row[6].strip() if len(row) >= 7 else "") or TEMPORADA_POR_DEFECTO
        if fila_temporada == temporada:
            names.add(name)
    return sorted(names)


# --- Clausulas: board API, agregación y escritura en sheet ---

# Ventana relevante: solo cláusulas en los últimos 7 días limitan hacer/recibir (2 por 7 días).
SECONDS_PER_DAY = 86400
CLAUSULAS_DAYS_WINDOW = 7


def fetch_league_board_all() -> list[dict]:
    """
    Obtiene todos los ítems del board de la liga con paginación (offset/limit=50).
    Para de paginar cuando encuentra ítems con date < (now - 7 días): lo anterior ya no afecta
    al límite de 2 cláusulas por 7 días.
    Retorna lista de objetos con al menos 'type', 'content', 'date'.
    """
    import requests
    import certifi

    headers = _biwenger_headers()
    skip_verify = os.environ.get("BIWENGER_SKIP_SSL_VERIFY", "").strip().lower() in ("1", "true", "yes")
    verify_ssl = False if skip_verify else certifi.where()
    cutoff = int(time.time()) - (CLAUSULAS_DAYS_WINDOW * SECONDS_PER_DAY)
    base_url = f"{BIWENGER_API_BASE}/league/{BIWENGER_LEAGUE_ID}/board"
    all_items: list[dict] = []
    offset = 0
    limit = 50

    while True:
        resp = requests.get(
            base_url,
            params={"offset": offset, "limit": limit},
            headers=headers,
            timeout=30,
            verify=verify_ssl,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data") if isinstance(data, dict) else []
        if not isinstance(items, list):
            break
        for item in items:
            if not isinstance(item, dict):
                continue
            ts = item.get("date")
            if isinstance(ts, (int, float)) and ts < cutoff:
                # Ítem fuera de ventana: no añadirlo y no pedir más páginas
                return all_items
            all_items.append(item)
        if len(items) < limit:
            break
        offset += limit

    return all_items


def build_clausulas_data(
    board_items: list[dict],
) -> tuple[dict[str, list[int]], dict[str, list[int]], list[str]]:
    """
    Filtra type=transfer y content[].type=clause; agrega por jugador las fechas de hacer y recibir.
    Devuelve (hacer, recibir, jugadores_ordenados) con como máximo 2 timestamps por jugador en cada lado.
    """
    hacer: dict[str, list[int]] = {}
    recibir: dict[str, list[int]] = {}

    for item in board_items:
        if item.get("type") != "transfer":
            continue
        content = item.get("content") or []
        parent_date = item.get("date")
        if not isinstance(parent_date, (int, float)):
            continue
        ts = int(parent_date)
        for c in content:
            if not isinstance(c, dict) or c.get("type") != "clause":
                continue
            from_name = (c.get("from") or {}).get("name") or ""
            to_name = (c.get("to") or {}).get("name") or ""
            # to = quien hace la cláusula (límite para volver a hacer); from = quien la recibe (límite para recibir más)
            if to_name:
                hacer.setdefault(to_name, []).append(ts)
            if from_name:
                recibir.setdefault(from_name, []).append(ts)

    def take_two_desc(l: list[int]) -> list[int]:
        return sorted(l, reverse=True)[:2]

    for d in (hacer, recibir):
        for k in d:
            d[k] = take_two_desc(d[k])

    all_names = sorted(set(hacer.keys()) | set(recibir.keys()))
    return hacer, recibir, all_names


def write_clausulas_sheet(
    hacer: dict[str, list[int]],
    recibir: dict[str, list[int]],
    jugadores: list[str],
    temporada: str,
) -> None:
    """
    Escribe la pestaña Clausulas: fila 1 = jugadores, filas 2-5 = Fecha 1/2 recibir y hacer,
    y una última fila con la temporada en curso (ver CLAUSULAS_LABEL_TEMPORADA).
    """
    import gspread
    from google.oauth2.service_account import Credentials
    from datetime import datetime, timezone

    scope = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    creds = Credentials.from_service_account_file(creds_path, scopes=scope)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(GOOGLE_SHEET_ID)

    try:
        worksheet = sheet.worksheet(SHEET_TAB_CLAUSULAS)
    except Exception:
        worksheet = sheet.add_worksheet(title=SHEET_TAB_CLAUSULAS, rows=7, cols=max(len(jugadores) + 1, 2))

    # La pestaña se reescribe entera cada vez. Limpiarla antes evita que, si la liga
    # encoge respecto al año anterior, queden columnas obsoletas a la derecha del
    # rango que se escribe (el tamaño de la liga cambia cada temporada).
    worksheet.clear()

    def ts_to_str(ts: int) -> str:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m/%Y %H:%M")

    row_labels = ["Jugador", "Fecha 1 recibir", "Fecha 2 recibir", "Fecha 1 hacer", "Fecha 2 hacer"]
    num_cols = max(len(jugadores) + 1, 2)
    matrix = []
    matrix.append([row_labels[0]] + jugadores)
    for row_idx, label in enumerate(row_labels[1:], start=2):
        row = [label]
        for j in jugadores:
            if label == "Fecha 1 hacer":
                vals = hacer.get(j, [])
                row.append(ts_to_str(vals[0]) if len(vals) >= 1 else "")
            elif label == "Fecha 2 hacer":
                vals = hacer.get(j, [])
                row.append(ts_to_str(vals[1]) if len(vals) >= 2 else "")
            elif label == "Fecha 1 recibir":
                vals = recibir.get(j, [])
                row.append(ts_to_str(vals[0]) if len(vals) >= 1 else "")
            else:
                vals = recibir.get(j, [])
                row.append(ts_to_str(vals[1]) if len(vals) >= 2 else "")
        matrix.append(row)

    # Manifiesto de temporada en curso, rellenado hasta num_cols para no dejar la fila irregular
    matrix.append([CLAUSULAS_LABEL_TEMPORADA, temporada] + [""] * (num_cols - 2))

    range_str = f"A1:{_col_letter(num_cols)}{len(matrix)}"
    worksheet.update(values=matrix, range_name=range_str, value_input_option="USER_ENTERED")
    print(f"Sheet '{SHEET_TAB_CLAUSULAS}' actualizado: {len(jugadores)} jugadores, temporada {temporada}.")


def _col_letter(n: int) -> str:
    """1 -> A, 2 -> B, ..., 27 -> AA."""
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s or "A"


def get_all_league_players(season: Optional[dict] = None) -> list[str]:
    """
    Miembros actuales de la liga.

    Usa la clasificación completa (members), no solo quienes tienen alineación, para que
    también funcione antes de disputarse la primera jornada: al arrancar la temporada no
    hay ninguna jornada disputada y la lista de participantes tiene que salir igualmente.
    """
    if season is None:
        competition = os.environ.get("BIWENGER_COMPETITION", "la-liga").strip()
        try:
            season = get_current_season(competition)
        except Exception as e:
            print(f"No se pudo obtener la temporada en curso: {e}")
            return []

    finished = get_finished_round_ids(season)
    all_ids = get_season_round_ids(season)
    # Última jornada disputada si la hay; si no, la primera de la temporada (aún pendiente)
    probe_ids = [finished[-1]] if finished else all_ids[:1]

    for rid in probe_ids:
        try:
            result = get_round_standings(rid)
        except Exception as e:
            print(f"No se pudo leer la clasificación de la jornada {rid}: {e}")
            continue
        members = result.get("members") or []
        if members:
            return sorted(members)

    print("La API no devolvió los miembros de la liga.")
    return []


def run_clausulas() -> None:
    """Obtiene el board, filtra cláusulas, agrega por jugador (2 hacer + 2 recibir) y escribe la pestaña Clausulas."""
    competition = os.environ.get("BIWENGER_COMPETITION", "la-liga").strip()
    try:
        season = get_current_season(competition)
    except Exception as e:
        # Sin temporada no se reescribe la pestaña: dejarla con el manifiesto anterior
        # es mejor que publicar cláusulas sin saber a qué temporada pertenecen.
        print(f"Error obteniendo la temporada en curso: {e}")
        sys.exit(1)

    try:
        board_items = fetch_league_board_all()
    except Exception as e:
        print(f"Error obteniendo el board de la liga: {e}")
        sys.exit(1)
    hacer, recibir, jugadores_from_clauses = build_clausulas_data(board_items)
    # Lista completa: miembros de la liga (API) + los que salen en cláusulas; si la API falla,
    # respaldo desde el Historial acotado a la temporada en curso
    jugadores_api = get_all_league_players(season)
    if jugadores_api:
        jugadores = sorted(set(jugadores_api) | set(jugadores_from_clauses))
    else:
        jugadores_sheet = get_all_players_from_historial_sheet(season["slug"])
        jugadores = sorted(set(jugadores_sheet) | set(jugadores_from_clauses)) if jugadores_sheet else jugadores_from_clauses
    if not jugadores:
        print("No se encontraron jugadores (API ni Sheet). La pestaña se actualizará vacía.")
    write_clausulas_sheet(hacer, recibir, jugadores, season["slug"])


def run(round_id: Optional[int] = None) -> None:
    """
    Flujo principal.
    - Si el primer argumento es 'clausulas' o '--clausulas': solo rellena la pestaña Clausulas y termina.
    - Si se pasa un ID de jornada (JORNADA=... o argumento): solo esa jornada.
    - Si no se pasa nada: obtiene todas las jornadas completadas, omite las ya en el Sheet,
      y vuelca el resto (todas las jornadas pendientes de registrar).
    Uso: python bot.py | python bot.py <ID_jornada> | python bot.py clausulas
    """
    if len(sys.argv) > 1 and str(sys.argv[1]).strip().lower() in ("clausulas", "--clausulas"):
        run_clausulas()
        return

    if round_id is None:
        round_id_str = os.environ.get("JORNADA") or (sys.argv[1] if len(sys.argv) > 1 else None)
        if round_id_str and str(round_id_str).strip().lower() not in ("all", "todas", ""):
            round_id = int(str(round_id_str).strip())
        else:
            round_id = None  # modo "todas"

    if round_id is not None:
        # Una sola jornada (comportamiento clásico)
        competition = os.environ.get("BIWENGER_COMPETITION", "la-liga").strip()
        result = get_round_standings(round_id)
        standings = result["standings"]
        league_size = result["league_size"]
        try:
            info = get_round_public_info(round_id, competition)
        except Exception as e:
            # Sin temporada no se escribe nada: una fila sin temporada ensucia el historial.
            print(f"Error obteniendo la temporada de la jornada {round_id}: {e}")
            sys.exit(1)
        if not standings:
            print(f"Jornada {round_id} aún no disputada (sin lineup) o sin datos. No se escribe nada.")
            return
        if len(standings) != league_size:
            print(f"Advertencia: {len(standings)} jugadores con alineación de {league_size} en la liga.")
        rows = build_historial_rows(round_id, info["name"], standings, league_size, info["season_slug"])
        append_to_google_sheet(rows)
        return

    # Modo "todas las jornadas" de la temporada en curso, sin repetir las ya en el Sheet
    competition = os.environ.get("BIWENGER_COMPETITION", "la-liga").strip()
    try:
        season = get_current_season(competition)
    except Exception as e:
        print(f"Error obteniendo la temporada en curso: {e}")
        print("Uso: python bot.py   (todas) | python bot.py <ID_jornada>   (una sola)")
        sys.exit(1)
    completed_ids = get_finished_round_ids(season)
    round_names = get_round_names(season)
    if not completed_ids:
        print(f"Temporada {season['slug']}: aún no hay jornadas disputadas.")
        return
    try:
        existing = get_existing_jornada_ids_in_sheet()
    except Exception as e:
        print(f"Error leyendo el Sheet (se volcarán todas): {e}")
        existing = set()
    # Los IDs de jornada no se repiten entre temporadas, así que basta con deduplicar por ID
    to_process = [r for r in completed_ids if r not in existing]
    if not to_process:
        print(f"Temporada {season['slug']}: todas las jornadas disputadas ya están en el Sheet. Nada que añadir.")
        return
    print(f"Temporada {season['slug']}. Jornadas disputadas: {len(completed_ids)}. Ya en Sheet: {len(existing)}. A añadir: {len(to_process)}.")
    for rid in to_process:
        result = get_round_standings(rid)
        standings = result["standings"]
        league_size = result["league_size"]
        round_name = round_names.get(rid) or f"Jornada {rid}"
        if not standings:
            print(f"Jornada {rid} aún no disputada (sin lineup). Se omite.")
            continue
        if len(standings) != league_size:
            print(f"Advertencia jornada {rid}: {len(standings)} jugadores con alineación de {league_size} en la liga.")
        rows = build_historial_rows(rid, round_name, standings, league_size, season["slug"])
        append_to_google_sheet(rows)


if __name__ == "__main__":
    run()
