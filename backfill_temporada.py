#!/usr/bin/env python3
"""
Rellena la columna Temporada (G) de Historial_Jornadas en las filas anteriores a su
introducción, marcándolas como 2025-2026.

Es opcional: tanto el bot como la SPA interpretan una celda vacía como 2025-2026. Sirve
para dejar el Sheet explícito y legible a simple vista.

Es idempotente y conservador: solo escribe en filas cuya columna G está vacía, así que
nunca pisa una temporada ya puesta. Por defecto hace un ensayo en seco; para escribir
de verdad hay que pasar --apply.

Uso:
    python backfill_temporada.py            # ensayo en seco
    python backfill_temporada.py --apply    # escribe

El Sheet destino sale de GOOGLE_SHEET_ID (fichero .env o variable de entorno).
Se puede borrar este script una vez hecho el backfill en todos los entornos.
"""

import sys

from bot import (
    GOOGLE_SHEET_ID,
    SHEET_TAB_HISTORIAL,
    TEMPORADA_POR_DEFECTO,
    _col_letter,
)

COLUMNA_TEMPORADA = 7  # G


def main() -> None:
    import gspread
    from google.oauth2.service_account import Credentials
    import os

    aplicar = "--apply" in sys.argv

    scope = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
    creds = Credentials.from_service_account_file(creds_path, scopes=scope)
    sheet = gspread.authorize(creds).open_by_key(GOOGLE_SHEET_ID)
    worksheet = sheet.worksheet(SHEET_TAB_HISTORIAL)

    filas = worksheet.get_all_values()
    print(f"Sheet '{sheet.title}' / pestaña '{SHEET_TAB_HISTORIAL}': {len(filas)} filas leídas.")

    valores = []   # una celda por fila, en el orden del rango G1:G{n}
    pendientes = 0
    ya_puestas = 0
    for fila in filas:
        jornada = (fila[0] if len(fila) >= 1 else "").strip()
        actual = (fila[COLUMNA_TEMPORADA - 1] if len(fila) >= COLUMNA_TEMPORADA else "").strip()
        if not jornada.isdigit():
            valores.append([actual])          # fila sin datos: se deja como está
        elif actual:
            valores.append([actual])          # ya tiene temporada: no se toca
            ya_puestas += 1
        else:
            valores.append([TEMPORADA_POR_DEFECTO])
            pendientes += 1

    print(f"  filas con temporada ya puesta: {ya_puestas}")
    print(f"  filas a rellenar con '{TEMPORADA_POR_DEFECTO}': {pendientes}")

    if pendientes == 0:
        print("Nada que hacer.")
        return
    if not aplicar:
        print("\nEnsayo en seco. Repite con --apply para escribir.")
        return

    col = _col_letter(COLUMNA_TEMPORADA)
    worksheet.update(values=valores, range_name=f"{col}1:{col}{len(valores)}",
                     value_input_option="USER_ENTERED")
    print(f"Hecho: {pendientes} filas marcadas como {TEMPORADA_POR_DEFECTO}.")


if __name__ == "__main__":
    main()
