import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import { API_BASE, getUser, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import { fmtDateTime, fmtTime, inTonightWindow, untilLabel } from "../../utils/datetime";

const card = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "var(--space-6)",
  display: "grid",
  gap: "var(--space-4)",
  boxShadow: "var(--shadow-sm)",
};

// A trip stays "current" for 30 min after it leaves, then drops off.
const STILL_CURRENT_MS = 30 * 60 * 1000;

/**
 * Trip status. There is no GPS feed yet, so this shows only what the system
 * actually knows: the student's booked trip, its scheduled departure from
 * 1337, and the real ordered stops with the student's stop highlighted.
 */
export default function TripTracker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user] = useState(() => getUser());
  const [trip, setTrip] = useState(null);
  const [booked, setBooked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, hRes] = await Promise.all([
        authFetch(`${API_BASE}/reservations/`),
        authFetch(`${API_BASE}/reservations/history/`),
      ]);
      if (!res.ok) throw new Error(await errorMessage(res, t("couldntLoad")));
      const reservations = await res.json();
      const history = hRes.ok ? await hRes.json() : [];
      const cutoff = Date.now() - STILL_CURRENT_MS;
      const mine = (Array.isArray(reservations) ? reservations : [])
        .map((r) => r.trip_details)
        .filter((tr) => tr && new Date(tr.departure_datetime).getTime() >= cutoff)
        .sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime));
      // Already rode tonight (trip archived after departure): show that, not a trip to book.
      const rodeTonight = [...(Array.isArray(reservations) ? reservations : []), ...(Array.isArray(history) ? history : [])]
        .map((r) => r.trip_details)
        .find((tr) => tr && inTonightWindow(tr.departure_datetime));
      if (mine.length || rodeTonight) {
        setTrip(mine[0] || rodeTonight);
        setBooked(true);
        return;
      }
      setBooked(false);
      if (!user?.station) {
        setTrip(null);
        return;
      }
      const aRes = await authFetch(`${API_BASE}/trips/available/?station_id=${encodeURIComponent(user.station)}`);
      if (!aRes.ok) throw new Error(await errorMessage(aRes, t("couldntLoad")));
      const available = await aRes.json();
      setTrip((Array.isArray(available) ? available : [])[0] || null);
    } catch (err) {
      setError(err.message || t("couldntLoad"));
    } finally {
      setLoading(false);
    }
  }, [t, user?.station]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener("fleetmark:refresh", load);
    return () => window.removeEventListener("fleetmark:refresh", load);
  }, [load]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "var(--space-5)" }}>
        <div className="skeleton-card animate-in">
          <div className="skeleton-bar" style={{ width: "60%", height: 22 }} />
          <div className="skeleton-bar" style={{ width: "40%", height: 14 }} />
          <div className="skeleton-bar" style={{ width: "80%", height: 60 }} />
        </div>
      </div>
    );
  }

  if (error && !trip) return <EmptyState icon="cloud_off" title={t("couldntLoad")} subtitle={error} />;

  if (!trip) {
    return (
      <div className="animate-in" style={{ ...card, textAlign: "center", placeItems: "center" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--dim)" }}>directions_bus</span>
        <h3 style={{ margin: 0, fontSize: 16 }}>{t("trackerNoTripTitle")}</h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mid)", maxWidth: 340 }}>{t("trackerNoTripDesc")}</p>
        <button type="button" className="student-quick-action" onClick={() => navigate("/passenger/reserve")}>
          {t("browseSchedule")}
        </button>
      </div>
    );
  }

  const departure = new Date(trip.departure_datetime).getTime();
  const minsLeft = (departure - now) / 60000;
  const status = minsLeft < 0 ? "departed" : minsLeft <= 30 ? "soon" : "scheduled";
  const statusStyle = {
    scheduled: { color: "var(--blue)", bg: "var(--blue-light)", label: t("statusScheduled") },
    soon: { color: "var(--amber)", bg: "var(--amber-light)", label: t("statusBoardingSoon") },
    departed: { color: "var(--green)", bg: "var(--green-light)", label: t("statusDeparted") },
  }[status];
  const stops = trip.route_stops || [];
  const myStop = user?.station_name;

  return (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      <section className="animate-in" style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: statusStyle.bg, color: statusStyle.color }}>
              {statusStyle.label}
            </span>
            <h2 style={{ margin: "12px 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{trip.route_name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--mid)" }}>
              {fmtDateTime(trip.departure_datetime)} · {trip.bus_name} · {stops.length} {t("stops")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--dim)", fontWeight: 700, letterSpacing: "0.08em" }}>
              {status === "departed" ? t("departedAt") : t("departsIn")}
            </span>
            <div className="mono" style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1, marginTop: 4 }}>
              {status === "departed" ? fmtTime(trip.departure_datetime) : untilLabel(trip.departure_datetime, now)}
            </div>
            {status !== "departed" ? (
              <span className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>{t("atTime").replace("{{time}}", fmtTime(trip.departure_datetime))}</span>
            ) : null}
          </div>
        </div>

        {booked && status === "departed" ? null : booked ? (
          <p style={{ margin: 0, padding: "10px 14px", borderRadius: 10, background: "var(--green-light)", color: "var(--green)", fontSize: 13, fontWeight: 600 }}>
            {t("trackerBooked")}
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 10, background: "var(--surface2)" }}>
            <span style={{ fontSize: 13, color: "var(--mid)", flex: 1 }}>{t("trackerNotBooked")}</span>
            <button type="button" className="student-quick-action" onClick={() => navigate("/passenger/reserve")}>{t("reserveNow")}</button>
          </div>
        )}
      </section>

      <section className="animate-in" style={card}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mid)" }}>
          {t("trackerStops")}
        </h3>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
          {["1337", ...stops].map((name, i, all) => {
            const isMine = name === myStop;
            const isStart = i === 0;
            return (
              <li key={`${name}-${i}`} style={{ display: "flex", gap: 14, minHeight: 40 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 18 }}>
                  <span style={{ width: isMine || isStart ? 14 : 9, height: isMine || isStart ? 14 : 9, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: isMine ? "var(--blue)" : isStart ? "var(--ink)" : "var(--surface3)", boxShadow: isMine ? "0 0 0 4px var(--accent-glow)" : "none" }} />
                  {i < all.length - 1 ? <span style={{ flex: 1, width: 2, background: "var(--border)", minHeight: 18 }} /> : null}
                </div>
                <div style={{ paddingBottom: 10, fontSize: 14, fontWeight: isMine || isStart ? 700 : 400, color: isMine ? "var(--blue)" : "var(--text-primary)" }}>
                  {isStart ? t("trackerStart") : name}
                  {isMine ? <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700 }}>· {t("yourStop")}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
        <p style={{ margin: 0, fontSize: 12, color: "var(--dim)" }}>{t("trackerNoGps")}</p>
      </section>
    </div>
  );
}
