#!/usr/bin/env python3
"""
Biwenger Stats Bot - Extrae clasificación por jornada y actualiza Google Sheet.
Reglas: Pos 17 → 2€, Pos 9-16 → 1€, resto → 0€.
"""

import os
import sys
from typing import Optional

# --- Configuración (variables de entorno o constantes) ---
BIWENGER_BEARER_TOKEN = os.environ.get("BIWENGER_BEARER_TOKEN", "TU_BEARER_TOKEN_AQUI")
BIWENGER_LEAGUE_ID = os.environ.get("BIWENGER_LEAGUE_ID", "TU_LEAGUE_ID_AQUI")
BIWENGER_USER_ID = os.environ.get("BIWENGER_USER_ID", "TU_USER_ID_AQUI")
GOOGLE_SHEET_ID = os.environ.get("GOOGLE_SHEET_ID", "TU_GOOGLE_SHEET_ID_AQUI")

# URL base de la API de Biwenger (ajustar si la API oficial cambia)
BIWENGER_API_BASE = "https://biwenger.as.com/api/v2"

# Nombre de la pestaña en el Sheet
SHEET_TAB_HISTORIAL = "Historial_Jornadas"

# API pública para listar jornadas (sin auth). Competición por defecto.
BIWENGER_PUBLIC_API_BASE = "https://cf.biwenger.com/api/v2"

# Headers para la API pública (evitan 403 por User-Agent de script)
PUBLIC_API_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Referer": "https://biwenger.as.com/",
}


def get_completed_round_ids(competition_slug: str = "la-liga", first_round_id: Optional[int] = None) -> list[int]:
    """
    Obtiene los IDs de todas las jornadas disputadas iterando por la API pública.
    Empieza en first_round_id (o 4484 para la-liga J1) y sigue data.next.id hasta que no haya next.
    Las jornadas cuyo data.name termina en "(aplazada)" se omiten.
    """
    import requests
    import certifi

    if first_round_id is None:
        first_round_id = 4484 if competition_slug == "la-liga" else 4484
    skip_verify = os.environ.get("BIWENGER_SKIP_SSL_VERIFY", "").strip().lower() in ("1", "true", "yes")
    verify_ssl = False if skip_verify else certifi.where()

    round_ids = []
    current_id = first_round_id
    seen = set()

    while current_id and current_id not in seen:
        seen.add(current_id)
        url = f"{BIWENGER_PUBLIC_API_BASE}/rounds/{competition_slug}/{current_id}"
        params = {"score": 5, "lang": "es"}
        resp = requests.get(url, params=params, headers=PUBLIC_API_HEADERS, timeout=15, verify=verify_ssl)
        resp.raise_for_status()
        data = resp.json()
        # No incluir jornadas aplazadas (ej. "Jornada 6 (aplazada)")
        round_name = (data.get("data") or {}).get("name") or ""
        if not round_name.strip().endswith("(aplazada)"):
            round_ids.append(current_id)
        next_round = data.get("data", {}).get("next") or data.get("next")
        current_id = next_round.get("id") if isinstance(next_round, dict) else None

    return round_ids


def get_round_name_public(round_id: int, competition_slug: str = "la-liga") -> str:
    """
    Obtiene el nombre de la jornada desde la API pública (data.name).
    Mismo endpoint y campo que se usa para filtrar "(aplazada)".
    """
    import requests
    import certifi

    skip_verify = os.environ.get("BIWENGER_SKIP_SSL_VERIFY", "").strip().lower() in ("1", "true", "yes")
    verify_ssl = False if skip_verify else certifi.where()
    url = f"{BIWENGER_PUBLIC_API_BASE}/rounds/{competition_slug}/{round_id}"
    params = {"score": 5, "lang": "es"}
    try:
        resp = requests.get(url, params=params, headers=PUBLIC_API_HEADERS, timeout=15, verify=verify_ssl)
        resp.raise_for_status()
        data = resp.json()
        return ((data.get("data") or {}).get("name") or "").strip()
    except Exception:
        return ""


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
    Retorna {"standings": list[dict]}. El nombre de la jornada se obtiene por separado con get_round_name_public().
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

    for i, entry in enumerate(raw_list, start=1):
        if not isinstance(entry, dict):
            continue
        lineup = entry.get("lineup")
        if not lineup:
            continue  # jornada aún no disputada para este jugador / no cuenta
        name = entry.get("name") or f"Jugador_{i}"
        points = int(lineup.get("points", 0))
        position = int(lineup.get("position", 0))
        standings.append({"name": name, "points": points, "position": position})

    return {"standings": standings}


def compute_deuda(position: int) -> int:
    """Reglas: posición 17 → 2€, posiciones 9-16 → 1€, resto → 0€."""
    if position == 17:
        return 2
    if 9 <= position <= 16:
        return 1
    return 0


def build_historial_rows(jornada: int, round_name: str, standings: list[dict]) -> list[list]:
    """Genera las filas para append en Historial_Jornadas: Jornada, Nombre_Jornada, Jugador, Puntos, Posicion, Deuda_Generada."""
    rows = []
    for s in standings:
        pos = s["position"]
        rows.append([
            jornada,
            round_name,
            s["name"],
            s["points"],
            pos,
            compute_deuda(pos),
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


def run(round_id: Optional[int] = None) -> None:
    """
    Flujo principal.
    - Si se pasa un ID de jornada (JORNADA=... o argumento): solo esa jornada.
    - Si no se pasa nada: obtiene todas las jornadas completadas, omite las ya en el Sheet,
      y vuelca el resto (todas las jornadas pendientes de registrar).
    """
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
        round_name = get_round_name_public(round_id, competition)
        if not standings:
            print(f"Jornada {round_id} aún no disputada (sin lineup) o sin datos. No se escribe nada.")
            return
        if len(standings) != 17:
            print(f"Advertencia: se obtuvieron {len(standings)} jugadores (se esperaban 17).")
        rows = build_historial_rows(round_id, round_name, standings)
        append_to_google_sheet(rows)
        return

    # Modo "todas las jornadas": completadas según API pública, sin repetir las ya en el Sheet
    competition = os.environ.get("BIWENGER_COMPETITION", "la-liga").strip()
    first_id = os.environ.get("BIWENGER_FIRST_ROUND_ID")
    first_round_id = int(first_id) if first_id and str(first_id).isdigit() else None
    try:
        completed_ids = get_completed_round_ids(competition_slug=competition, first_round_id=first_round_id)
    except Exception as e:
        print(f"Error obteniendo jornadas completadas: {e}")
        print("Uso: python bot.py   (todas) | python bot.py <ID_jornada>   (una sola)")
        sys.exit(1)
    if not completed_ids:
        print("No se encontraron jornadas completadas.")
        return
    try:
        existing = get_existing_jornada_ids_in_sheet()
    except Exception as e:
        print(f"Error leyendo el Sheet (se volcarán todas): {e}")
        existing = set()
    to_process = [r for r in completed_ids if r not in existing]
    if not to_process:
        print("Todas las jornadas completadas ya están en el Sheet. Nada que añadir.")
        return
    print(f"Jornadas completadas: {len(completed_ids)}. Ya en Sheet: {len(existing)}. A añadir: {len(to_process)}.")
    for rid in to_process:
        result = get_round_standings(rid)
        standings = result["standings"]
        round_name = get_round_name_public(rid, competition)
        if not standings:
            print(f"Jornada {rid} aún no disputada (sin lineup). Se omite.")
            continue
        if len(standings) != 17:
            print(f"Advertencia jornada {rid}: {len(standings)} jugadores (se esperaban 17).")
        rows = build_historial_rows(rid, round_name, standings)
        append_to_google_sheet(rows)


if __name__ == "__main__":
    run()
