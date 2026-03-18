import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
// URL del CSV publicado del Google Sheet (Archivo → Compartir → Publicar en la web)
// El CSV no tiene cabecera: columnas Jornada,Nombre_Jornada,Jugador,Puntos,Posicion,Deuda_Generada (o 5 cols sin Nombre_Jornada)
const CSV_HISTORIAL =
  import.meta.env.VITE_CSV_HISTORIAL ||
  "https://docs.google.com/spreadsheets/d/TU_SHEET_ID/export?format=csv&gid=0";
// CSV de la pestaña Clausulas (opcional): fila 1 = jugadores, filas 2-5 = Fecha 1/2 hacer, Fecha 1/2 recibir
const CSV_CLAUSULAS = import.meta.env.VITE_CSV_CLAUSULAS || "";

function parseNum(val) {
  if (val === "" || val == null) return 0;
  const n = Number(String(val).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function fetchCsv(url) {
  return fetch(url)
    .then((r) => r.text())
    .then((text) => {
      const result = Papa.parse(text, { header: false, skipEmptyLines: true });
      const rows = result.data || [];
      // 6 columnas: Jornada, Nombre_Jornada, Jugador, Puntos, Posicion, Deuda_Generada
      // 5 columnas (legacy): Jornada, Jugador, Puntos, Posicion, Deuda_Generada
      return rows
        .filter((row) => Array.isArray(row) && row.length >= 5)
        .map((row) =>
          row.length >= 6
            ? {
                Jornada: parseNum(row[0]),
                Nombre_Jornada: String(row[1] ?? "").trim(),
                Jugador: String(row[2] ?? "").trim(),
                Puntos: parseNum(row[3]),
                Posicion: parseNum(row[4]),
                Deuda_Generada: parseNum(row[5]),
              }
            : {
                Jornada: parseNum(row[0]),
                Nombre_Jornada: "",
                Jugador: String(row[1] ?? "").trim(),
                Puntos: parseNum(row[2]),
                Posicion: parseNum(row[3]),
                Deuda_Generada: parseNum(row[4]),
              }
        );
    });
}

// Formato del sheet: DD/MM/YYYY HH:mm (en UTC)
function parseClausulaDateUTC(str) {
  if (!str || !String(str).trim()) return null;
  const s = String(str).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, day, month, year, hour, min] = m;
  const ms = Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hour, 10), parseInt(min, 10));
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}
function add7Days(date) {
  const out = new Date(date);
  out.setDate(out.getDate() + 7);
  return out;
}
/** Formatea la fecha en la zona horaria y locale del cliente */
function formatDateLocal(date) {
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function ClausulaCell({ value, now }) {
  if (!value || !String(value).trim()) {
    return <span className="text-[#00ff88]" aria-hidden>✓</span>;
  }
  const parsed = parseClausulaDateUTC(value);
  const freeAt = parsed ? add7Days(parsed) : null;
  const isFree = freeAt && freeAt.getTime() < now;
  return (
    <>
      {parsed ? formatDateLocal(parsed) : value}
      {freeAt && (
        <span className="text-gray-500 text-xs ml-1">(libre el {formatDateLocal(freeAt)})</span>
      )}
      {isFree && (
        <>
          {" "}
          <span className="text-[#00ff88]" aria-hidden>✓</span>
        </>
      )}
    </>
  );
}

function fetchClausulasCsv(url) {
  return fetch(url)
    .then((r) => r.text())
    .then((text) => {
      const result = Papa.parse(text, { header: false, skipEmptyLines: false });
      const rows = result.data || [];
      if (rows.length < 5) return [];
      const row0 = rows[0] || [];
      const row1 = rows[1] || [];
      const row2 = rows[2] || [];
      const row3 = rows[3] || [];
      const row4 = rows[4] || [];
      const out = [];
      for (let col = 1; col < row0.length; col++) {
        const jugador = String(row0[col] ?? "").trim();
        if (!jugador) continue;
        out.push({
          Jugador: jugador,
          Fecha1Recibir: String(row1[col] ?? "").trim(),
          Fecha2Recibir: String(row2[col] ?? "").trim(),
          Fecha1Hacer: String(row3[col] ?? "").trim(),
          Fecha2Hacer: String(row4[col] ?? "").trim(),
        });
      }
      return out;
    });
}

export default function App() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clausulasData, setClausulasData] = useState([]);
  const [clausulasLoading, setClausulasLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCsv(CSV_HISTORIAL)
      .then((data) => setHistorial(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!CSV_CLAUSULAS || CSV_CLAUSULAS.includes("TU_")) {
      setClausulasData([]);
      return;
    }
    setClausulasLoading(true);
    fetchClausulasCsv(CSV_CLAUSULAS)
      .then((data) => setClausulasData(Array.isArray(data) ? data : []))
      .catch(() => setClausulasData([]))
      .finally(() => setClausulasLoading(false));
  }, []);

  const normalizedHistorial = useMemo(() => {
    const rows = historial.map((row) => ({
      Jornada: row.Jornada ?? 0,
      Nombre_Jornada: row.Nombre_Jornada ?? "",
      Jugador: row.Jugador ?? "",
      Puntos: row.Puntos ?? 0,
      Posicion: row.Posicion ?? 0,
      Deuda_Generada: row.Deuda_Generada ?? 0,
    }));
    // Ordenar por ID de jornada (y por posición dentro de cada jornada)
    return rows.sort((a, b) => {
      if (a.Jornada !== b.Jornada) return a.Jornada - b.Jornada;
      return a.Posicion - b.Posicion;
    });
  }, [historial]);

  const sortedJornadaIds = useMemo(() => {
    const ids = [...new Set(normalizedHistorial.map((r) => r.Jornada))];
    return ids.sort((a, b) => a - b);
  }, [normalizedHistorial]);

  const ultimaJornadaNombre = useMemo(() => {
    if (sortedJornadaIds.length === 0) return "";
    const lastId = sortedJornadaIds[sortedJornadaIds.length - 1];
    const row = normalizedHistorial.find((r) => r.Jornada === lastId);
    return (row?.Nombre_Jornada || "").trim() || `Jornada ${lastId}`;
  }, [sortedJornadaIds, normalizedHistorial]);

  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(null);
  const [showJornadaModal, setShowJornadaModal] = useState(false);
  const [selectedJugadoresDeuda, setSelectedJugadoresDeuda] = useState(new Set());

  const effectiveJornadaIndex =
    currentJornadaIndex != null
      ? currentJornadaIndex
      : sortedJornadaIds.length > 0
        ? sortedJornadaIds.length - 1
        : 0;

  const currentJornadaId =
    sortedJornadaIds.length > 0 && effectiveJornadaIndex >= 0 && effectiveJornadaIndex < sortedJornadaIds.length
      ? sortedJornadaIds[effectiveJornadaIndex]
      : null;

  const currentJornadaData = useMemo(() => {
    if (currentJornadaId == null) return [];
    return normalizedHistorial
      .filter((r) => r.Jornada === currentJornadaId)
      .sort((a, b) => a.Posicion - b.Posicion);
  }, [normalizedHistorial, currentJornadaId]);

  const currentJornadaNombre =
    currentJornadaData.length > 0
      ? (currentJornadaData[0].Nombre_Jornada || `Jornada ${currentJornadaId}`).trim() || `Jornada ${currentJornadaId}`
      : `Jornada ${currentJornadaId ?? ""}`;

  const canGoPrev = effectiveJornadaIndex > 0;
  const canGoNext = sortedJornadaIds.length > 0 && effectiveJornadaIndex < sortedJornadaIds.length - 1;

  useEffect(() => {
    if (!showJornadaModal) return;
    const onEscape = (e) => {
      if (e.key === "Escape") setShowJornadaModal(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showJornadaModal]);

  const jornadasParaModal = useMemo(() => {
    return sortedJornadaIds.map((id, index) => {
      const row = normalizedHistorial.find((r) => r.Jornada === id);
      const name = (row?.Nombre_Jornada || "").trim() || `Jornada ${id}`;
      return { id, index, name };
    });
  }, [sortedJornadaIds, normalizedHistorial]);

  const porJugador = useMemo(() => {
    const map = new Map();
    for (const r of normalizedHistorial) {
      if (!r.Jugador) continue;
      const prev = map.get(r.Jugador) || {
        Jugador: r.Jugador,
        Deuda_Generada: 0,
      };
      prev.Deuda_Generada += r.Deuda_Generada;
      map.set(r.Jugador, prev);
    }
    return Array.from(map.values());
  }, [normalizedHistorial]);

  const topMorosos = useMemo(() => {
    return [...porJugador]
      .filter((j) => j.Deuda_Generada > 0)
      .sort((a, b) => b.Deuda_Generada - a.Deuda_Generada);
  }, [porJugador]);

  const boteTeorico = useMemo(
    () => normalizedHistorial.reduce((s, r) => s + r.Deuda_Generada, 0),
    [normalizedHistorial]
  );

  const jugadoresList = useMemo(() => {
    const set = new Set(normalizedHistorial.map((r) => r.Jugador).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [normalizedHistorial]);

  const chartDataDeuda = useMemo(() => {
    return sortedJornadaIds.map((jornadaId, idx) => {
      const hastaJornadas = sortedJornadaIds.slice(0, idx + 1);
      const row = normalizedHistorial.find((r) => r.Jornada === jornadaId);
      const nombre = (row?.Nombre_Jornada || "").trim() || `Jornada ${idx + 1}`;
      const point = { JornadaNombre: nombre, fullName: nombre };
      for (const jugador of jugadoresList) {
        point[jugador] = normalizedHistorial
          .filter((r) => r.Jugador === jugador && hastaJornadas.includes(r.Jornada))
          .reduce((s, r) => s + r.Deuda_Generada, 0);
      }
      return point;
    });
  }, [sortedJornadaIds, normalizedHistorial, jugadoresList]);

  const chartColors = [
    "#00ff88",
    "#ff8c00",
    "#3b82f6",
    "#a855f7",
    "#ec4899",
    "#14b8a6",
    "#eab308",
    "#f97316",
    "#6366f1",
    "#84cc16",
    "#06b6d4",
    "#d946ef",
    "#ef4444",
    "#22c55e",
    "#8b5cf6",
    "#0ea5e9",
    "#f43f5e",
  ];

  function LegendDeuda({ jugadoresList, chartColors, selectedJugadoresDeuda, onToggle }) {
    if (!jugadoresList || !jugadoresList.length) return null;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2" style={{ fontSize: "12px" }}>
        {jugadoresList.map((name, i) => {
          const color = chartColors[i % chartColors.length];
          const isSelected = selectedJugadoresDeuda.size === 0 || selectedJugadoresDeuda.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className="inline-flex items-center gap-1.5 hover:opacity-100 transition-opacity"
              style={{
                opacity: isSelected ? 1 : 0.4,
                color,
                cursor: "pointer",
              }}
            >
              <span style={{ width: 10, height: 2, backgroundColor: color }} aria-hidden />
              {name.length > 14 ? name.slice(0, 12) + "…" : name}
            </button>
          );
        })}
      </div>
    );
  }

  const handleLegendToggleDeuda = (name) => {
    setSelectedJugadoresDeuda((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <p className="text-[#00ff88] text-xl animate-pulse">
          Cargando datos del Muro…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12] p-4">
        <div className="bg-[#1a1a1f] border border-[#ff2d2d] rounded-xl p-6 max-w-md text-center">
          <p className="text-[#ff2d2d] font-semibold mb-2">Error al cargar</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-4">
            Revisa VITE_CSV_HISTORIAL en .env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#e2e2e8]">
      {/* Header */}
      <header className="border-b border-[#2a2a32] bg-[#1a1a1f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              <span className="text-white">🏆La LigaDiarios📝🏆25/26⚽</span>
              <span className="text-[#00ff88]"> — Biwenger</span>
            </h1>
            {ultimaJornadaNombre && (
              <p className="text-gray-400 text-sm mt-1">
                Datos hasta la {ultimaJornadaNombre}
              </p>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-400 text-sm">Bote total (deuda generada):</span>
            <span className="text-[#ff2d2d] font-mono font-bold text-lg drop-shadow-[0_0_8px_rgba(255,45,45,0.5)]">
              {boteTeorico} €
            </span>
          </div>
        </div>
      </header>

      {/* Grid principal: 50% Desastre, 50% Top Morosos */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tarjeta 1: Desastre por jornada (carrusel) */}
          <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg flex flex-col h-[420px] lg:h-[480px]">
              <div className="px-5 py-3 border-b border-[#2a2a32] flex items-center justify-between gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentJornadaIndex(effectiveJornadaIndex - 1)}
                  disabled={!canGoPrev}
                  className="flex-shrink-0 w-10 h-10 rounded-lg border border-[#2a2a32] bg-[#25252b] text-[#e2e2e8] hover:bg-[#2a2a32] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg"
                  aria-label="Jornada anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setShowJornadaModal(true)}
                  className="min-w-0 flex-1 text-lg font-semibold text-[#ff8c00] text-center hover:text-[#ff9c20] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/50 rounded px-1 py-0.5 inline-flex items-center justify-center gap-1"
                  title="Elegir jornada"
                >
                  <span className="truncate">Desastre de la {currentJornadaNombre || "…"}</span>
                  <svg className="flex-shrink-0 w-4 h-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentJornadaIndex(effectiveJornadaIndex + 1)}
                  disabled={!canGoNext}
                  className="flex-shrink-0 w-10 h-10 rounded-lg border border-[#2a2a32] bg-[#25252b] text-[#e2e2e8] hover:bg-[#2a2a32] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg"
                  aria-label="Jornada siguiente"
                >
                  ›
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-auto min-h-0 flex-1">
                {currentJornadaData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-[#2a2a32]">
                        <th className="text-left py-3 px-4">Pos</th>
                        <th className="text-left py-3 px-4">Jugador</th>
                        <th className="text-right py-3 px-4">Puntos</th>
                        <th className="text-right py-3 px-4">Deuda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentJornadaData
                        .filter((r) => r.Deuda_Generada > 0)
                        .map((r) => (
                          <tr
                            key={`${r.Jornada}-${r.Jugador}`}
                            className={
                              r.Posicion === 17
                                ? "bg-[#ff2d2d]/15 border-l-4 border-[#ff2d2d]"
                                : "bg-[#ff8c00]/10 border-l-4 border-[#ff8c00]"
                            }
                          >
                            <td className="py-2.5 px-4 font-mono">
                              {r.Posicion}
                            </td>
                            <td className="py-2.5 px-4 font-medium">
                              {r.Jugador}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {r.Puntos}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold">
                              {r.Posicion === 17 ? (
                                <span className="text-[#ff2d2d]">2 €</span>
                              ) : (
                                <span className="text-[#ff8c00]">1 €</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-5 text-gray-500">
                    {currentJornadaId != null
                      ? "No hay jugadores con deuda en esta jornada."
                      : "Aún no hay datos de jornadas."}
                  </p>
                )}
            </div>
          </section>

          {/* Tarjeta 2: Top Morosos */}
          <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg flex flex-col h-[420px] lg:h-[480px]">
            <h2 className="px-5 py-3 text-lg font-semibold border-b border-[#2a2a32] text-[#ff2d2d] flex-shrink-0">
              Top Morosos Históricos
            </h2>
            <div className="overflow-x-auto overflow-y-auto min-h-0 flex-1">
                {topMorosos.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#1a1a1f]">
                      <tr className="text-gray-400 border-b border-[#2a2a32]">
                        <th className="text-left py-3 px-4">#</th>
                        <th className="text-left py-3 px-4">Jugador</th>
                        <th className="text-right py-3 px-4">Deuda generada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMorosos.map((j, i) => (
                        <tr
                          key={j.Jugador}
                          className="border-b border-[#2a2a32]/60 hover:bg-white/5"
                        >
                          <td className="py-2.5 px-4 font-mono text-gray-400">
                            {i + 1}
                          </td>
                          <td className="py-2.5 px-4 font-medium">
                            {j.Jugador}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-[#ff2d2d]">
                            {j.Deuda_Generada} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-5 text-gray-500">
                    No hay morosos (o no hay datos aún).
                  </p>
                )}
            </div>
          </section>
        </div>

        {/* Modal: elegir jornada (fuera del grid para overlay) */}
        {showJornadaModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowJornadaModal(false)}
                role="dialog"
                aria-modal="true"
                aria-label="Seleccionar jornada"
              >
                <div
                  className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 py-3 border-b border-[#2a2a32] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#ff8c00]">Elegir jornada</h3>
                    <button
                      type="button"
                      onClick={() => setShowJornadaModal(false)}
                      className="w-8 h-8 rounded-lg border border-[#2a2a32] bg-[#25252b] text-gray-400 hover:text-[#e2e2e8] hover:bg-[#2a2a32] flex items-center justify-center"
                      aria-label="Cerrar"
                    >
                      ×
                    </button>
                  </div>
                  <div className="overflow-y-auto p-2">
                    {jornadasParaModal.map(({ id, index, name }) => {
                      const isSelected = index === effectiveJornadaIndex;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setCurrentJornadaIndex(index);
                            setShowJornadaModal(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            isSelected
                              ? "bg-[#ff8c00]/20 border-[#ff8c00] text-[#ff8c00] font-medium"
                              : "border-transparent hover:bg-white/5 text-[#e2e2e8]"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

        {/* Gráfica a ancho completo: evolución deuda acumulada (€) */}
        <div className="mt-6 w-full">
          <section className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg p-4 w-full">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">
              Evolución de deuda acumulada (€) por jornada
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              Haz clic en un nombre para mostrar solo esa línea; clic en varios para comparar. Vuelve a hacer clic para quitar. Las leyendas siempre muestran todos los jugadores.
            </p>
            <div className="h-80 w-full">
              {chartDataDeuda.length > 0 && jugadoresList.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartDataDeuda}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
                    <XAxis
                      dataKey="JornadaNombre"
                      stroke="#6b7280"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1f",
                        border: "1px solid #2a2a32",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`${value} €`, ""]}
                      labelFormatter={(label) => label}
                    />
                    <Legend
                      content={() => (
                        <LegendDeuda
                          jugadoresList={jugadoresList}
                          chartColors={chartColors}
                          selectedJugadoresDeuda={selectedJugadoresDeuda}
                          onToggle={handleLegendToggleDeuda}
                        />
                      )}
                    />
                    {(selectedJugadoresDeuda.size === 0 ? jugadoresList : jugadoresList.filter((j) => selectedJugadoresDeuda.has(j))).map((jugador) => (
                      <Line
                        key={jugador}
                        type="monotone"
                        dataKey={jugador}
                        name={jugador}
                        stroke={chartColors[jugadoresList.indexOf(jugador) % chartColors.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 flex items-center justify-center h-full">No hay datos para la gráfica.</p>
              )}
            </div>
          </section>
        </div>

        {/* Tabla Cláusulas (datos del sheet Clausulas) */}
        {(CSV_CLAUSULAS && !CSV_CLAUSULAS.includes("TU_")) && (
          <section className="mt-6 bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden shadow-lg p-4 w-full">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">
              Cláusulas por jugador (últimas fechas hacer/recibir)
            </h2>
            {clausulasLoading ? (
              <p className="text-gray-500 text-sm">Cargando cláusulas…</p>
            ) : clausulasData.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay datos de cláusulas o la URL no está configurada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2a2a32]">
                      <th className="text-left py-3 px-4">Jugador</th>
                      <th className="text-left py-3 px-4">Clausula 1 hacer</th>
                      <th className="text-left py-3 px-4">Clausula 2 hacer</th>
                      <th className="text-left py-3 px-4">Clausula 1 recibir</th>
                      <th className="text-left py-3 px-4">Clausula 2 recibir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clausulasData.map((r) => (
                      <tr key={r.Jugador} className="border-b border-[#2a2a32]/60 hover:bg-white/5">
                        <td className="py-2.5 px-4 font-medium">{r.Jugador}</td>
                        <td className="py-2.5 px-4 text-gray-300"><ClausulaCell value={r.Fecha1Hacer} now={now} /></td>
                        <td className="py-2.5 px-4 text-gray-300"><ClausulaCell value={r.Fecha2Hacer} now={now} /></td>
                        <td className="py-2.5 px-4 text-gray-300"><ClausulaCell value={r.Fecha1Recibir} now={now} /></td>
                        <td className="py-2.5 px-4 text-gray-300"><ClausulaCell value={r.Fecha2Recibir} now={now} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
