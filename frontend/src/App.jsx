import { useEffect, useMemo, useRef, useState } from "react";
import {
  CSV_CLAUSULAS,
  CSV_HISTORIAL,
  CSV_PALMARES,
  TEMPORADA_POR_DEFECTO,
  csvConfigurado,
} from "./config";
import { fetchClausulas, fetchHistorial, fetchPalmares } from "./lib/csv";
import { PARAM_TEMPORADA, PARAM_VISTA, VISTA_PALMARES } from "./lib/url";
import { temporadaCorta } from "./lib/temporada";
import { useUrlParam } from "./hooks/useUrlState";
import Header from "./components/layout/Header";
import DesastreJornada from "./components/jornada/DesastreJornada";
import JornadaModal from "./components/jornada/JornadaModal";
import TopMorosos from "./components/morosos/TopMorosos";
import EvolucionDeuda from "./components/grafica/EvolucionDeuda";
import TablaClausulas from "./components/clausulas/TablaClausulas";
import Palmares from "./components/palmares/Palmares";

const HAY_CLAUSULAS = csvConfigurado(CSV_CLAUSULAS);
const HAY_PALMARES = csvConfigurado(CSV_PALMARES);

export default function App() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clausulasData, setClausulasData] = useState([]);
  const [clausulasLoading, setClausulasLoading] = useState(HAY_CLAUSULAS);
  // Temporada en curso publicada por el bot; "" si no está disponible
  const [temporadaPublicada, setTemporadaPublicada] = useState("");
  // Temporada elegida por quien navega (o la del enlace); "" = usar la temporada en curso
  const [temporadaElegida, seleccionarTemporada] = useUrlParam(PARAM_TEMPORADA);
  // Vista activa. Un valor que no reconocemos deja la vista principal.
  const [vista, navegarAVista] = useUrlParam(PARAM_VISTA);
  const enPalmares = HAY_PALMARES && vista === VISTA_PALMARES;

  // El palmarés es histórico: no pasa por el filtro de temporada, y su CSV solo se pide la
  // primera vez que se entra en la vista, para no encarecer el arranque de la principal.
  // `null` significa "todavía sin cargar", así que el estado de carga se deriva y no se guarda.
  const [palmares, setPalmares] = useState(null);
  const [palmaresError, setPalmaresError] = useState(null);
  const palmaresPedido = useRef(false);
  const palmaresCargando = enPalmares && palmares === null && palmaresError === null;

  useEffect(() => {
    if (!enPalmares || palmaresPedido.current) return;
    palmaresPedido.current = true;
    fetchPalmares(CSV_PALMARES)
      .then((data) => setPalmares(Array.isArray(data) ? data : []))
      .catch((err) => setPalmaresError(err.message));
  }, [enPalmares]);

  useEffect(() => {
    fetchHistorial(CSV_HISTORIAL)
      .then((data) => setHistorial(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!HAY_CLAUSULAS) return;
    fetchClausulas(CSV_CLAUSULAS)
      .then((data) => {
        setClausulasData(Array.isArray(data?.jugadores) ? data.jugadores : []);
        setTemporadaPublicada(data?.temporadaActual || "");
      })
      .catch(() => setClausulasData([]))
      .finally(() => setClausulasLoading(false));
  }, []);

  const temporadasDisponibles = useMemo(() => {
    const set = new Set(historial.map((r) => r.Temporada).filter(Boolean));
    if (temporadaPublicada) set.add(temporadaPublicada);
    // Más reciente primero; los slugs AAAA-AAAA ordenan lexicográficamente
    return [...set].sort().reverse();
  }, [historial, temporadaPublicada]);

  // Si el bot no ha publicado la temporada en curso, se asume la más reciente con datos
  const temporadaEnCurso =
    temporadaPublicada || temporadasDisponibles[0] || TEMPORADA_POR_DEFECTO;

  // Un slug inválido o ausente en la URL cae en la temporada en curso
  const temporadaEfectiva = temporadasDisponibles.includes(temporadaElegida)
    ? temporadaElegida
    : temporadaEnCurso;

  const esTemporadaEnCurso = temporadaEfectiva === temporadaEnCurso;

  // El título de la pestaña también sigue a la temporada seleccionada
  useEffect(() => {
    document.title = `🏆La LigaDiarios📝🏆${temporadaCorta(temporadaEfectiva)}⚽`;
  }, [temporadaEfectiva]);

  // Único punto de filtrado por temporada: todo lo que se deriva de aquí queda acotado
  // (jornadas, bote, morosos, gráfica y lista de participantes).
  const normalizedHistorial = useMemo(() => {
    const rows = historial
      .filter((row) => (row.Temporada || TEMPORADA_POR_DEFECTO) === temporadaEfectiva)
      .map((row) => ({
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
  }, [historial, temporadaEfectiva]);

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

  // La jornada elegida se guarda junto a su temporada: al cambiar de temporada la
  // selección deja de aplicar sola y se vuelve a la última jornada, sin índices fuera de rango.
  const [jornadaElegida, setJornadaElegida] = useState({ temporada: null, index: null });
  const [showJornadaModal, setShowJornadaModal] = useState(false);

  const currentJornadaIndex =
    jornadaElegida.temporada === temporadaEfectiva ? jornadaElegida.index : null;

  const setCurrentJornadaIndex = (index) =>
    setJornadaElegida({ temporada: temporadaEfectiva, index });

  const effectiveJornadaIndex =
    currentJornadaIndex != null
      ? currentJornadaIndex
      : sortedJornadaIds.length > 0
        ? sortedJornadaIds.length - 1
        : 0;

  const currentJornadaId =
    sortedJornadaIds.length > 0 &&
    effectiveJornadaIndex >= 0 &&
    effectiveJornadaIndex < sortedJornadaIds.length
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
      ? (currentJornadaData[0].Nombre_Jornada || `Jornada ${currentJornadaId}`).trim() ||
        `Jornada ${currentJornadaId}`
      : `Jornada ${currentJornadaId ?? ""}`;

  const canGoPrev = effectiveJornadaIndex > 0;
  const canGoNext =
    sortedJornadaIds.length > 0 && effectiveJornadaIndex < sortedJornadaIds.length - 1;

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

  // Participantes de la temporada. En la temporada en curso se completan con los de la
  // pestaña de cláusulas, para que la lista salga aunque no se haya disputado ninguna jornada.
  const rosterTemporada = useMemo(() => {
    const set = new Set(normalizedHistorial.map((r) => r.Jugador).filter(Boolean));
    if (esTemporadaEnCurso) {
      for (const c of clausulasData) {
        if (c.Jugador) set.add(c.Jugador);
      }
    }
    return [...set];
  }, [normalizedHistorial, clausulasData, esTemporadaEnCurso]);

  const topMorosos = useMemo(() => {
    const deudaPorJugador = new Map(porJugador.map((j) => [j.Jugador, j.Deuda_Generada]));
    return rosterTemporada
      .map((nombre) => ({
        Jugador: nombre,
        Deuda_Generada: deudaPorJugador.get(nombre) ?? 0,
      }))
      .sort(
        (a, b) => b.Deuda_Generada - a.Deuda_Generada || a.Jugador.localeCompare(b.Jugador)
      );
  }, [rosterTemporada, porJugador]);

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

  // El palmarés se pinta sin esperar al histórico: no depende de él, así que un enlace
  // directo no tiene por qué quedarse en la pantalla de carga de la vista principal.
  if (enPalmares) {
    return (
      <div className="min-h-screen bg-[#0f0f12] text-[#e2e2e8]">
        <Header hayPalmares enPalmares onVolver={() => navegarAVista("")} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Palmares
            palmares={palmares ?? []}
            loading={palmaresCargando}
            error={palmaresError}
          />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <p className="text-[#00ff88] text-xl animate-pulse">Cargando datos del Muro…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12] p-4">
        <div className="bg-[#1a1a1f] border border-[#ff2d2d] rounded-xl p-6 max-w-md text-center">
          <p className="text-[#ff2d2d] font-semibold mb-2">Error al cargar</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-4">Revisa VITE_CSV_HISTORIAL en .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#e2e2e8]">
      <Header
        temporadaEfectiva={temporadaEfectiva}
        temporadasDisponibles={temporadasDisponibles}
        temporadaEnCurso={temporadaEnCurso}
        onSeleccionarTemporada={seleccionarTemporada}
        ultimaJornadaNombre={ultimaJornadaNombre}
        boteTeorico={boteTeorico}
        hayPalmares={HAY_PALMARES}
        enPalmares={false}
        onAbrirPalmares={() => navegarAVista(VISTA_PALMARES)}
      />

      {/* Grid principal: 50% Desastre, 50% Top Morosos */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DesastreJornada
            temporadaEfectiva={temporadaEfectiva}
            currentJornadaId={currentJornadaId}
            currentJornadaNombre={currentJornadaNombre}
            currentJornadaData={currentJornadaData}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onAnterior={() => setCurrentJornadaIndex(effectiveJornadaIndex - 1)}
            onSiguiente={() => setCurrentJornadaIndex(effectiveJornadaIndex + 1)}
            onElegirJornada={() => setShowJornadaModal(true)}
          />
          <TopMorosos topMorosos={topMorosos} temporadaEfectiva={temporadaEfectiva} />
        </div>

        {/* Modal: elegir jornada (fuera del grid para overlay) */}
        {showJornadaModal && (
          <JornadaModal
            jornadas={jornadasParaModal}
            jornadaActivaIndex={effectiveJornadaIndex}
            onSeleccionar={(index) => {
              setCurrentJornadaIndex(index);
              setShowJornadaModal(false);
            }}
            onCerrar={() => setShowJornadaModal(false)}
          />
        )}

        {/* Gráfica a ancho completo: evolución deuda acumulada (€) */}
        <div className="mt-6 w-full">
          <EvolucionDeuda
            chartDataDeuda={chartDataDeuda}
            jugadoresList={jugadoresList}
            temporadaEfectiva={temporadaEfectiva}
          />
        </div>

        {HAY_CLAUSULAS && (
          <TablaClausulas
            clausulasData={clausulasData}
            clausulasLoading={clausulasLoading}
            esTemporadaEnCurso={esTemporadaEnCurso}
          />
        )}
      </main>
    </div>
  );
}
