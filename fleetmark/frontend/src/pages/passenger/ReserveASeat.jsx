import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuccessCheckmark from "../../components/ui/SuccessCheckmark";
import EmptyState from "../../components/ui/EmptyState";
import { API_BASE, getUser, getAccessToken, authFetch, errorMessage } from "../../services/api";
import { fmtTime, inTonightWindow } from "../../utils/datetime";
import ReportModal from "../../components/ui/ReportModal";
import { useTranslation } from "../../context/TranslationContext";

/** Skeleton matching reserve page layout (Fix 7a) */
function ReserveSeatSkeleton() {
  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="skeleton-bar" style={{ width: 180, height: 22, borderRadius: 6 }} />
        <div className="skeleton-bar" style={{ width: 34, height: 34, borderRadius: "50%" }} />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="skeleton-card"
          style={{
            padding: "var(--space-5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-4)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div style={{ flex: 1, display: "grid", gap: 10 }}>
            <div className="skeleton-bar" style={{ width: "55%", height: 18 }} />
            <div className="skeleton-bar" style={{ width: "40%", height: 14 }} />
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              <div className="skeleton-bar" style={{ width: 80, height: 12 }} />
              <div className="skeleton-bar" style={{ width: 70, height: 12 }} />
            </div>
          </div>
          <div className="skeleton-bar" style={{ width: 120, height: 40, borderRadius: "var(--radius-sm)" }} />
        </div>
      ))}
    </div>
  );
}

export default function ReserveASeat() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(() => getUser());
  const [trips, setTrips] = useState([]);
  const [reservedTripIds, setReservedTripIds] = useState([]);
  // Tonight's booking comes from /reservations/, not the trip list: the list
  // drops full and departed trips, which would unlock the other trips.
  const [bookedTrip, setBookedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [reportSent, setReportSent] = useState(false);
  /** null | 'check' (1.5s SVG) | 'toast' — Fix 1e */
  const [successPhase, setSuccessPhase] = useState(null);
  const [reportingTrip, setReportingTrip] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated.");

      const headers = { Authorization: `Bearer ${token}` };

      const fetchWithTimeout = async (url, opts = {}) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        try {
          const r = await authFetch(url, { ...opts, headers, signal: controller.signal });
          clearTimeout(id);
          if (!r.ok) throw new Error(await errorMessage(r, t("couldntLoad")));
          return r.json();
        } catch (err) {
          clearTimeout(id);
          throw err.name === "AbortError" ? new Error(t("couldntLoad")) : err;
        }
      };

      // Fetch fresh profile with timeout — never blocks if API is slow
      const meData = await fetchWithTimeout(`${API_BASE}/auth/me/`).catch(() => null);
      let activeUser = getUser();
      if (meData && meData.id) {
        localStorage.setItem("fleetmark_user", JSON.stringify(meData));
        activeUser = meData;
        setUser(meData);
      }

      if (!activeUser?.station) {
        setTrips([]);
        return;
      }

      const [tData, rData, hData] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/trips/available/?station_id=${encodeURIComponent(activeUser.station)}`),
        fetchWithTimeout(`${API_BASE}/reservations/`),
        // A trip archived after departure still uses tonight's one seat.
        fetchWithTimeout(`${API_BASE}/reservations/history/`),
      ]);
      setTrips(Array.isArray(tData) ? tData : []);
      const mine = Array.isArray(rData) ? rData : [];
      setReservedTripIds(mine.map((item) => item.trip_details?.id || item.trip));
      setBookedTrip([...mine, ...(Array.isArray(hData) ? hData : [])].map((item) => item.trip_details).find((tr) => tr && inTonightWindow(tr.departure_datetime)) || null);
    } catch (err) {
      setError(err.message || "Unable to load trips.");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener("fleetmark:refresh", load);
    return () => window.removeEventListener("fleetmark:refresh", load);
  }, [load]);

  async function reserve(tripId) {
    setSavingId(tripId);
    setError("");
    setToast("");
    setSuccessPhase(null);
    try {
      const token = getAccessToken();
      const res = await authFetch(`${API_BASE}/reservations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trip: tripId }),
      });
      // e.g. "You already have a reservation for this day." — say why.
      if (!res.ok) throw new Error(await errorMessage(res, t("reservationFailed")));
      setReservedTripIds((prev) => [...new Set([...prev, tripId])]);
      setTrips((prev) => prev.map((tr) => (tr.id === tripId ? { ...tr, seats_left: Math.max(0, (tr.seats_left ?? 1) - 1) } : tr)));
      setBookedTrip(trips.find((tr) => tr.id === tripId) || null);
      setSuccessPhase("check");
      setTimeout(() => {
        setSuccessPhase("toast");
        setToast("reserved");
        setTimeout(() => {
          setToast("");
          setSuccessPhase(null);
        }, 2200);
      }, 1500);
    } catch (err) {
      setError(err.message || t("reservationFailed"));
    } finally {
      setSavingId("");
    }
  }

  function seatColor(seatsLeft, capacity) {
    if (!capacity || capacity <= 0) return "var(--mid)";
    const pct = seatsLeft / capacity;
    if (pct <= 0.2) return "var(--red)";
    if (pct <= 0.5) return "#e67e22";
    return "var(--green)";
  }

  if (loading) return <ReserveSeatSkeleton />;

  if (!user?.station) return (
    <div className="animate-in" style={{ display: "grid", gap: 20, placeItems: "center", textAlign: "center", padding: "40px 0" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: "var(--amber)", fontVariationSettings: "'FILL' 1" }}>my_location</span>
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t("noStationTitle")}</h3>
        <p style={{ margin: "8px auto 0", fontSize: 14, color: "var(--mid)", maxWidth: 340, lineHeight: 1.6 }}>
          {t("noStationDesc")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate("/onboarding")}
        style={{
          border: "none",
          background: "var(--amber)",
          color: "#fff",
          borderRadius: 10,
          padding: "12px 28px",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        {t("chooseMyStop").replace(" →", "").replace(" ←", "")}
      </button>
    </div>
  );

  if (error && !trips.length) {
    return (
      <div className="animate-in" style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <EmptyState icon="cloud_off" title={t("couldntLoad")} subtitle={error} />
        <button type="button" onClick={load} className="student-quick-action">{t("tryAgain")}</button>
      </div>
    );
  }


  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      {reportingTrip && (
        <ReportModal 
          trip={reportingTrip} 
          onClose={() => setReportingTrip(null)} 
          onExpectedSuccess={() => {
            setReportingTrip(null);
            setReportSent(true);
            setTimeout(() => setReportSent(false), 4000);
          }} 
        />
      )}

      {successPhase === "check" ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            background: "color-mix(in srgb, var(--bg) 75%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "grid", placeItems: "center", gap: 16 }}>
            <SuccessCheckmark size={72} />
            <span className="mono" style={{ fontSize: 12, color: "var(--mid)", fontWeight: 600 }}>{t("confirmingSeat")}</span>
          </div>
        </div>
      ) : null}

      <style>{`
        .student-trip-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .student-trip-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: color-mix(in srgb, var(--line) 60%, transparent);
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{t("tonightsTrips")}</h2>
          <span style={{ fontSize: 12, color: "var(--mid)", display: "inline-block", marginTop: 4 }}>
            {t("fromTo")}
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          aria-label={t("refresh")}
          title={t("refresh")}
          style={{
            border: "1px solid var(--line2)",
            background: "var(--surface)",
            color: "var(--dim)",
            borderRadius: "50%",
            width: 34,
            height: 34,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
        </button>
      </div>

      {successPhase === "toast" && toast === "reserved" ? (
        <div
          className="animate-in"
          style={{
            border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: "var(--green)", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <p style={{ margin: 0, fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>{t("seatReserved")}</p>
        </div>
      ) : null}
      {reportSent ? (
        <div role="status" className="animate-in" style={{ border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "12px 16px", color: "var(--green)", fontWeight: 600, fontSize: 14 }}>
          {t("reportSent")}
        </div>
      ) : null}
      {error ? (
        <div role="alert" style={{ border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>
          {error}
        </div>
      ) : null}
      {bookedTrip ? (
        <div style={{ border: "1px solid var(--blue-bdr)", background: "var(--blue-bg)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--blue)", fontSize: 20 }}>confirmation_number</span>
          <span style={{ flex: 1, minWidth: 200 }}>
            {t(new Date(bookedTrip.departure_datetime) < new Date() ? "bookedTonightDeparted" : "bookedTonightBanner").replace("{{route}}", bookedTrip.route_name).replace("{{time}}", fmtTime(bookedTrip.departure_datetime))}
          </span>
          <button type="button" onClick={() => navigate("/passenger/history")} style={{ border: "none", background: "transparent", color: "var(--blue)", fontWeight: 700, cursor: "pointer" }}>
            {t("quickMyTrips")} →
          </button>
        </div>
      ) : null}

      {!trips.length ? (
        <EmptyState icon="nightlight" title={t("noTripsTonightTitle")} subtitle={t("noTripsTonightDesc")} />
      ) : (
        trips.map((trip, idx) => {
          const alreadyReserved = reservedTripIds.includes(trip.id);
          const isFull = typeof trip.seats_left === "number" && trip.seats_left <= 0;
          const lockedByOtherBooking = !!bookedTrip && !alreadyReserved;
          const state = alreadyReserved ? `${t("reserved")} ✓` : isFull ? t("full") : lockedByOtherBooking ? t("oneSeatPerNight") : t("reserveArrow");
          const cap = Number(trip.bus_seat_capacity ?? 0);
          const left = Number(trip.seats_left ?? 0);

          return (
            <article
              key={trip.id}
              className="animate-in student-trip-card"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
                padding: "var(--space-5)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-4)",
                animationDelay: `${idx * 0.05}s`
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{trip.route_name}</h3>
                </div>
                <p className="mono" style={{ margin: 0, color: "var(--mid)", fontSize: 13 }}>
                  {fmtTime(trip.departure_datetime)}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
                  {trip.bus_name ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mid)" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>directions_bus</span>
                      {trip.bus_name}
                    </span>
                  ) : null}
                  {cap > 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: seatColor(left, cap), fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event_seat</span>
                      {left}/{cap} {t("seats")}
                    </span>
                  ) : typeof trip.seats_left === "number" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mid)", fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event_seat</span>
                      {left} {t("seatsLeftLabel")}
                    </span>
                  ) : null}
                  {trip.route_stops?.length ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mid)" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                      {trip.route_stops.length} {t("stops")}
                    </span>
                  ) : null}
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  disabled={alreadyReserved || isFull || lockedByOtherBooking || savingId === trip.id || successPhase === "check"}
                  onClick={() => reserve(trip.id)}
                  style={{
                    minWidth: 120,
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    background: alreadyReserved ? "var(--green-bg)" : isFull ? "var(--red-bg)" : lockedByOtherBooking ? "var(--surface2)" : "var(--blue-bg)",
                    color: alreadyReserved ? "var(--green)" : isFull ? "var(--red)" : lockedByOtherBooking ? "var(--dim)" : "var(--blue)",
                    cursor: alreadyReserved || isFull || lockedByOtherBooking ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {savingId === trip.id ? (
                    <span className="spinner-border" style={{ width: 16, height: 16, borderWidth: 2 }} aria-label={t("loading")} />
                  ) : (
                    state
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setReportingTrip(trip)}
                  style={{
                    border: "none", background: "transparent", color: "var(--mid)",
                    fontSize: 12, cursor: "pointer", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>report</span>
                  {t("reportIssue")}
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
