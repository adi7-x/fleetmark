import React, { useEffect, useState } from "react";
import { API_BASE, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import { fmtDateTime } from "../../utils/datetime";

const CATEGORIES = [
  ["late", "reportLate"],
  ["no_show", "reportNoShow"],
  ["full", "reportFull"],
  ["accident", "reportAccident"],
  ["other", "reportOther"],
];

const field = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface2)",
  color: "var(--ink)",
  fontSize: 14,
};

export default function ReportModal({ trip, onClose, onExpectedSuccess }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("late");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/reports/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: trip.id || trip.trip_id || trip.trip, category, description }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, t("reportFailed")));
      onExpectedSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!trip) return null;

  return (
    <div
      className="modal-backdrop-anim"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        style={{ width: "min(420px, 92vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 id="report-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t("reportIssue")}</h3>
          <button type="button" onClick={onClose} aria-label={t("close")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mid)", padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ marginBottom: 16, padding: 12, background: "var(--surface2)", borderRadius: 8, fontSize: 13, color: "var(--mid)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ink)" }}>{trip.route_name}</strong>
          <br />
          {fmtDateTime(trip.departure_datetime || trip.created_at)}
        </div>

        {error ? <div role="alert" style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
            {t("reportType")}
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>
              {CATEGORIES.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
            {t("reportDetails")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("reportDetailsPlaceholder")}
              maxLength={1000}
              style={{ ...field, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "9px 16px", borderRadius: 8, background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", cursor: "pointer", fontWeight: 700 }}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "9px 16px", borderRadius: 8, background: "var(--red)", color: "#fff", border: "none", cursor: loading ? "wait" : "pointer", fontWeight: 700, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? t("sending") : t("reportSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
