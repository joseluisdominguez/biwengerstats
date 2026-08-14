#!/usr/bin/env python3
"""
Tests de las reglas de deuda del bot.

Regla: "la mitad de abajo paga, el colista paga doble".
Ver openspec/changes/add-season-history/specs/debt-calculation/spec.md
"""

import unittest

from bot import (
    build_historial_rows,
    compute_deuda,
    compute_league_size,
    filter_players_by_temporada,
    get_finished_round_ids,
    get_round_names,
    get_season_round_ids,
    is_jornada_aplazada,
)

# Forma real de season.rounds[] devuelta por la API pública de Biwenger
SEASON_EJEMPLO = {
    "slug": "2026-2027",
    "name": "Temporada 2026/2027",
    "rounds": [
        {"id": 4899, "name": "Jornada 1", "short": "J1", "status": "finished"},
        {"id": 4900, "name": "Jornada 1 (aplazada)", "short": "J1", "status": "finished"},
        {"id": 4901, "name": "Jornada 2", "short": "J2", "status": "finished"},
        {"id": 4902, "name": "Jornada 3", "short": "J3", "status": "pending"},
        {"id": 4903, "name": "Jornada 4", "short": "J4", "status": "pending"},
    ],
}


class TestComputeDeuda(unittest.TestCase):
    """Escenarios de specs/debt-calculation - Deuda en función del tamaño de la liga."""

    def assert_reparto(self, total: int, gratis: range, un_euro: range) -> None:
        """Comprueba el reparto completo de una liga de `total` participantes."""
        for pos in gratis:
            with self.subTest(total=total, posicion=pos, esperado=0):
                self.assertEqual(compute_deuda(pos, total), 0)
        for pos in un_euro:
            with self.subTest(total=total, posicion=pos, esperado=1):
                self.assertEqual(compute_deuda(pos, total), 1)
        with self.subTest(total=total, posicion=total, esperado=2):
            self.assertEqual(compute_deuda(total, total), 2)

    def test_liga_de_18(self):
        """1-9 generan 0 €, 10-17 generan 1 €, el 18 genera 2 €."""
        self.assert_reparto(18, gratis=range(1, 10), un_euro=range(10, 18))

    def test_liga_de_17(self):
        """1-8 generan 0 €, 9-16 generan 1 €, el 17 genera 2 €. Comportamiento previo al cambio."""
        self.assert_reparto(17, gratis=range(1, 9), un_euro=range(9, 17))

    def test_liga_de_16(self):
        """1-8 generan 0 €, 9-15 generan 1 €, el 16 genera 2 €."""
        self.assert_reparto(16, gratis=range(1, 9), un_euro=range(9, 16))

    def test_solo_el_colista_paga_doble(self):
        """Sea cual sea el tamaño de la liga, exactamente un participante genera 2 €."""
        for total in range(2, 25):
            with self.subTest(total=total):
                dobles = [p for p in range(1, total + 1) if compute_deuda(p, total) == 2]
                self.assertEqual(dobles, [total])

    def test_la_mitad_de_arriba_nunca_paga(self):
        """El número de participantes que no generan deuda es floor(N / 2)."""
        for total in range(2, 25):
            with self.subTest(total=total):
                gratis = [p for p in range(1, total + 1) if compute_deuda(p, total) == 0]
                self.assertEqual(len(gratis), total // 2)


class TestComputeDeudaRegresion(unittest.TestCase):
    """La regla nueva debe reproducir exactamente la anterior para una liga de 17."""

    def test_reproduce_la_regla_cableada_de_17(self):
        def regla_anterior(position: int) -> int:
            if position == 17:
                return 2
            if 9 <= position <= 16:
                return 1
            return 0

        for pos in range(1, 18):
            with self.subTest(posicion=pos):
                self.assertEqual(compute_deuda(pos, 17), regla_anterior(pos))


class TestDescubrimientoDeJornadas(unittest.TestCase):
    """Escenarios de specs/season-history - Descubrimiento de jornadas."""

    def test_solo_jornadas_disputadas(self):
        """Las jornadas pendientes no se registran."""
        self.assertNotIn(4902, get_finished_round_ids(SEASON_EJEMPLO))
        self.assertNotIn(4903, get_finished_round_ids(SEASON_EJEMPLO))

    def test_omite_aplazadas(self):
        """Una jornada aplazada no cuenta aunque esté finalizada."""
        self.assertNotIn(4900, get_finished_round_ids(SEASON_EJEMPLO))

    def test_conserva_el_orden(self):
        self.assertEqual(get_finished_round_ids(SEASON_EJEMPLO), [4899, 4901])

    def test_temporada_sin_jornadas_disputadas(self):
        """Al arrancar la temporada todas están pendientes y no hay nada que registrar."""
        pendiente = {"rounds": [dict(r, status="pending") for r in SEASON_EJEMPLO["rounds"]]}
        self.assertEqual(get_finished_round_ids(pendiente), [])

    def test_temporada_sin_rounds(self):
        self.assertEqual(get_finished_round_ids({}), [])
        self.assertEqual(get_season_round_ids({}), [])

    def test_todos_los_ids_incluyen_las_pendientes(self):
        self.assertEqual(get_season_round_ids(SEASON_EJEMPLO), [4899, 4900, 4901, 4902, 4903])

    def test_nombres_por_id(self):
        self.assertEqual(get_round_names(SEASON_EJEMPLO)[4901], "Jornada 2")

    def test_deteccion_de_aplazada(self):
        self.assertTrue(is_jornada_aplazada("Jornada 6 (aplazada)"))
        self.assertFalse(is_jornada_aplazada("Jornada 6"))
        self.assertFalse(is_jornada_aplazada(None))


class TestComputeLeagueSize(unittest.TestCase):
    """Escenarios de specs/debt-calculation - Tamaño de la liga determinado por la propia jornada."""

    def test_jornada_normal(self):
        """Todos alinean: la posición más alta es el número de participantes."""
        standings = [{"position": p} for p in range(1, 19)]
        self.assertEqual(compute_league_size(standings, ["x"] * 18), 18)

    def test_plantilla_actual_mayor_que_la_de_la_jornada(self):
        """
        Caso real de la J38 de 2025/2026: la API devuelve 18 miembros (los de hoy) pero
        la jornada se jugó con 17. Usar len(members) daría 18 y desplazaría la franja
        de pagadores, cobrando 1 € al colista en vez de 2 €.
        """
        posiciones = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        standings = [{"position": p} for p in posiciones]
        self.assertEqual(compute_league_size(standings, ["x"] * 18), 17)

    def test_la_deuda_resultante_es_la_correcta(self):
        """Con N=17 el colista de esa jornada genera 2 €, no 1 €."""
        posiciones = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        n = compute_league_size([{"position": p} for p in posiciones], ["x"] * 18)
        self.assertEqual(compute_deuda(17, n), 2)

    def test_jornada_pendiente_usa_la_plantilla_actual(self):
        """Sin clasificación (jornada pendiente) lo único conocido es la plantilla de hoy."""
        self.assertEqual(compute_league_size([], ["x"] * 18), 18)


class TestBuildHistorialRows(unittest.TestCase):
    """Escenarios de specs/season-history - Identificación de temporada en cada registro."""

    STANDINGS = [
        {"name": "Primero", "points": 80, "position": 1},
        {"name": "Decimo", "points": 30, "position": 10},
        {"name": "Colista", "points": 5, "position": 18},
    ]

    def test_cada_fila_lleva_la_temporada_al_final(self):
        rows = build_historial_rows(4899, "Jornada 1", self.STANDINGS, 18, "2026-2027")
        for row in rows:
            with self.subTest(row=row):
                self.assertEqual(len(row), 7)
                self.assertEqual(row[6], "2026-2027")

    def test_deuda_calculada_con_el_tamano_de_liga(self):
        rows = build_historial_rows(4899, "Jornada 1", self.STANDINGS, 18, "2026-2027")
        deuda_por_jugador = {r[2]: r[5] for r in rows}
        self.assertEqual(deuda_por_jugador, {"Primero": 0, "Decimo": 1, "Colista": 2})

    def test_las_seis_primeras_columnas_no_cambian_de_orden(self):
        """El orden previo se conserva: la SPA anterior parsea por longitud de fila."""
        row = build_historial_rows(4899, "Jornada 1", self.STANDINGS[:1], 18, "2026-2027")[0]
        self.assertEqual(row[:6], [4899, "Jornada 1", "Primero", 80, 1, 0])


class TestFiltroDeJugadoresPorTemporada(unittest.TestCase):
    """Escenarios de specs/clausulas - Participantes de la temporada en curso,
    y de specs/season-history - Compatibilidad con registros anteriores."""

    # Filas sin columna Temporada (anteriores al cambio) y filas con ella
    HISTORIAL = [
        ["4484", "Jornada 1", "SeFue", "22", "17", "2"],
        ["4484", "Jornada 1", "SigueJugando", "52", "3", "0"],
        ["4899", "Jornada 1", "SigueJugando", "40", "5", "0", "2026-2027"],
        ["4899", "Jornada 1", "Nuevo", "10", "18", "2", "2026-2027"],
    ]

    def test_no_devuelve_la_plantilla_del_ano_anterior(self):
        """Quien no juega esta temporada no aparece: es el fallo del día 0."""
        actuales = filter_players_by_temporada(self.HISTORIAL, "2026-2027")
        self.assertEqual(actuales, ["Nuevo", "SigueJugando"])
        self.assertNotIn("SeFue", actuales)

    def test_filas_sin_temporada_cuentan_como_2025_2026(self):
        anteriores = filter_players_by_temporada(self.HISTORIAL, "2025-2026")
        self.assertEqual(anteriores, ["SeFue", "SigueJugando"])

    def test_temporada_sin_registros(self):
        self.assertEqual(filter_players_by_temporada(self.HISTORIAL, "2027-2028"), [])

    def test_ignora_filas_incompletas_o_sin_nombre(self):
        rows = [["4899"], ["4899", "Jornada 1", "   ", "0", "1", "0", "2026-2027"], []]
        self.assertEqual(filter_players_by_temporada(rows, "2026-2027"), [])


if __name__ == "__main__":
    unittest.main()
