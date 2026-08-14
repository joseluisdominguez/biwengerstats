// Formato del sheet: DD/MM/YYYY HH:mm (en UTC)
const FECHA_SHEET = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;

export function parseClausulaDateUTC(str) {
  if (!str || !String(str).trim()) return null;
  const m = String(str).trim().match(FECHA_SHEET);
  if (!m) return null;
  const [, day, month, year, hour, min] = m;
  const ms = Date.UTC(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(min, 10)
  );
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function add7Days(date) {
  const out = new Date(date);
  out.setDate(out.getDate() + 7);
  return out;
}

/** Formatea la fecha en la zona horaria y locale del cliente */
export function formatDateLocal(date) {
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
