import { add7Days, formatDateLocal, parseClausulaDateUTC } from "../../lib/fechas";

export default function ClausulaCell({ value, now }) {
  if (!value || !String(value).trim()) {
    return (
      <span className="text-[#00ff88]" aria-hidden>
        ✓
      </span>
    );
  }
  const parsed = parseClausulaDateUTC(value);
  const freeAt = parsed ? add7Days(parsed) : null;
  const isFree = freeAt && freeAt.getTime() < now;
  return (
    <>
      {parsed ? formatDateLocal(parsed) : value}
      {freeAt && (
        <span className="text-gray-500 text-xs ml-1">
          (libre el {formatDateLocal(freeAt)})
        </span>
      )}
      {isFree && (
        <>
          {" "}
          <span className="text-[#00ff88]" aria-hidden>
            ✓
          </span>
        </>
      )}
    </>
  );
}
