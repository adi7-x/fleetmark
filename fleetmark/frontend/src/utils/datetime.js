// One clock for the whole app. The service runs 21:00 → 06:00, so times are
// always 24-hour (en-GB / fr-FR), never "09:00 PM" on one page and "21:00"
// on the next.
const locale = () => (localStorage.getItem("fleetmark_lang") === "fr" ? "fr-FR" : "en-GB");

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });

export const fmtDateTime = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

// "4h 18m" / "25m" until a departure; null once it has left.
export function untilLabel(iso, now = Date.now()) {
  const mins = Math.round((new Date(iso) - now) / 60000);
  if (mins < 0) return null;
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

// Tonight's service window, 21:00 → 06:00. Before 06:00 we are still in last
// night's shift. Mirrors get_bus_day_bounds() on the backend.
export function tonightWindow(now = new Date()) {
  const start = new Date(now);
  if (now.getHours() < 6) start.setDate(start.getDate() - 1);
  start.setHours(21, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(6, 0, 0, 0);
  return [start, end];
}

export function inTonightWindow(iso, now = new Date()) {
  const [start, end] = tonightWindow(now);
  const d = new Date(iso);
  return d >= start && d <= end;
}
