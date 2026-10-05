import React, { useCallback, useEffect, useState } from "react";
import EmptyState from "../../components/ui/EmptyState";
import ReportModal from "../../components/ui/ReportModal";
import { useNavigate } from "react-router-dom";
import { API_BASE, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import { fmtDateTime } from "../../utils/datetime";

function ReservationsSkeleton() {
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div className="skeleton" style={{ height: 38, width: 220, borderRadius: 999 }} />
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ border: "1px solid var(--line2)", borderRadius: "var(--radius-md)", background: "var(--surface)", padding: "var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="skeleton" style={{ height: 14, width: 160, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: 120, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ height: 36, width: 70, borderRadius: "var(--radius-sm)" }} />
        </div>
      ))}
    </div>
  );
}



export default function MyReservations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [reportingTrip, setReportingTrip] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [uRes, pRes] = await Promise.all([
        authFetch(`${API_BASE}/reservations/`),
        authFetch(`${API_BASE}/reservations/history/`),
      ]);
      if (!uRes.ok || !pRes.ok) throw new Error(t("couldntLoad"));
      const [uData, pData] = await Promise.all([uRes.json(), pRes.json()]);
      const byDeparture = (a, b) => new Date(a.trip_details?.departure_datetime) - new Date(b.trip_details?.departure_datetime);
      setUpcoming((Array.isArray(uData) ? uData : []).sort(byDeparture));
      setPast((Array.isArray(pData) ? pData : []).sort((a, b) => byDeparture(b, a)));
    } catch (err) {
      setError(err.message || t("couldntLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!confirmCancel) return undefined;
    const onKey = (e) => e.key === "Escape" && setConfirmCancel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmCancel]);

  // Listen for header refresh button
  useEffect(() => {
    window.addEventListener("fleetmark:refresh", load);
    return () => window.removeEventListener("fleetmark:refresh", load);
  }, [load]);

  async function cancelReservation(id) {
    setConfirmCancel(null);
    try {
      const res = await authFetch(`${API_BASE}/reservations/${id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, t("cancelFailed")));
      setUpcoming((prev) => prev.filter((item) => item.id !== id));
      setNotice(t("cancelDone"));
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setError(err.message || t("cancelFailed"));
    }
  }

  const current = tab === "upcoming" ? upcoming : past;
  if (loading) return <ReservationsSkeleton />;
  if (error && !upcoming.length && !past.length) return <EmptyState icon="cloud_off" title={t("couldntLoad")} subtitle={error} />;

  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      {reportingTrip && (
        <ReportModal 
          trip={reportingTrip.trip_details || reportingTrip} 
          onClose={() => setReportingTrip(null)} 
          onExpectedSuccess={() => {
            setReportingTrip(null);
            setNotice(t("reportSent"));
            setTimeout(() => setNotice(""), 4000);
          }} 
        />
      )}
      
      {/* Header with tabs and refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--line2)", borderRadius: "999px", overflow: "hidden" }}>
          {[
            ["upcoming", `${t("tabUpcoming")} (${upcoming.length})`],
            ["past", `${t("tabPast")} (${past.length})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              style={{
                border: "none",
                padding: "9px 14px",
                cursor: "pointer",
                background: tab === id ? "var(--blue-bg)" : "var(--surface2)",
                color: tab === id ? "var(--blue)" : "var(--mid)",
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
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

      {notice ? <p role="status" style={{ color: "var(--green)", margin: 0, fontWeight: 600 }}>{notice}</p> : null}
      {error ? <p role="alert" style={{ color: "var(--red)", margin: 0 }}>{error}</p> : null}

      {!current.length ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 14,
            background: "var(--surface)",
            padding: "var(--space-8) var(--space-6)",
            textAlign: "center",
            display: "grid",
            placeItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface2)", display: "grid", placeItems: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--dim)" }}>confirmation_number</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            {tab === "upcoming" ? t("noUpcomingTitle") : t("noPastTitle")}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--mid)", maxWidth: 300 }}>
            {tab === "upcoming" ? t("noUpcomingDesc") : t("noPastDesc")}
          </p>
          {tab === "upcoming" && (
            <button
              type="button"
              onClick={() => navigate("/passenger/reserve")}
              style={{
                border: "1px solid var(--blue-border, var(--blue))",
                background: "var(--blue-light)",
                color: "var(--blue)",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              {t("quickBookSeat")} →
            </button>
          )}
        </div>
      ) : (
        current.map((item) => {
          const departure = item.trip_details?.departure_datetime || null;
          const departed = departure && new Date(departure) < new Date();
          return (
            <article key={item.id} style={{ border: "1px solid var(--line2)", borderRadius: "var(--radius-md)", background: "var(--surface)", padding: "var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
              <div>
                <h3 style={{ margin: 0 }}>{item.trip_details?.route_name}</h3>
                <p className="mono" style={{ margin: "var(--space-2) 0 0", color: "var(--mid)" }}>
                  {departure ? fmtDateTime(departure) : "—"}
                  {item.trip_details?.bus_name ? ` · ${item.trip_details.bus_name}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setReportingTrip(item)}
                  style={{
                    border: "none", background: "transparent", color: "var(--mid)",
                    fontSize: 12, cursor: "pointer", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>report</span>
                  {t("reportIssue")}
                </button>
              {tab === "upcoming" && !departed ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(item)}
                  style={{
                    border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)",
                    background: "var(--red-bg)",
                    color: "var(--red)",
                    borderRadius: "var(--radius-sm)",
                    padding: "9px 12px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {t("cancel")}
                </button>
              ) : null}
              </div>
            </article>
          );
        })
      )}

      {/* Cancel Confirmation Modal */}
      {confirmCancel ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(420px,90vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <h3 style={{ margin: 0 }}>{t("cancelTitle")}</h3>
            <p style={{ margin: 0, color: "var(--mid)" }}>
              {t("cancelConfirm").replace("{{route}}", confirmCancel.trip_details?.route_name || "").replace("{{time}}", confirmCancel.trip_details ? fmtDateTime(confirmCancel.trip_details.departure_datetime) : "")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setConfirmCancel(null)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("keepSeat")}
              </button>
              <button type="button" onClick={() => cancelReservation(confirmCancel.id)} style={{ border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", background: "var(--red-bg)", color: "var(--red)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {t("cancelReservation")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
