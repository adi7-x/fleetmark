import React, { useState } from "react";
import StopPicker from "../../components/shared/StopPicker";
import Spinner from "../../components/ui/Spinner";
import { API_BASE, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher";


export default function Onboarding() {
  const { t, lang, setLang } = useTranslation();
  const { user } = useAuth();
  const [selectedStation, setSelectedStation] = useState(user?.station || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!selectedStation) return;
    setLoading(true);
    setError("");

    try {
      const res = await authFetch(`${API_BASE}/auth/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station: selectedStation }),
      });

      if (!res.ok) throw new Error(await errorMessage(res, t("saveStationFailed")));
      const updated = await res.json();
      localStorage.setItem("fleetmark_user", JSON.stringify(updated));
      window.location.replace("/passenger");
    } catch (err) {
      setError(err.message || t("saveStationFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner size={36} text={t("savingStation")} />;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", color: "var(--ink)", padding: "var(--space-6)" }}>
      <section className="animate-in" style={{ width: "100%", maxWidth: 760, boxSizing: "border-box", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "var(--space-7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "var(--space-5)" }}>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Fleetmark</span>
          <LanguageSwitcher value={lang} onChange={setLang} />
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(26px, 6vw, 34px)", letterSpacing: "-0.03em" }}>{t("onbTitle")}</h1>
        <p style={{ color: "var(--mid)", marginTop: "var(--space-2)" }}>
          {t("onbDesc")}
        </p>

        <div style={{ marginTop: "var(--space-6)" }}>
          <StopPicker selected={selectedStation} onSelect={setSelectedStation} />
        </div>

        {error ? <p style={{ color: "var(--red)", marginTop: "var(--space-4)" }}>{error}</p> : null}

        <div style={{ marginTop: "var(--space-6)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => window.location.replace("/passenger")}
            style={{
              border: "1px solid var(--line2)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 16px",
              background: "var(--surface2)",
              color: "var(--mid)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("skip")}
          </button>
          <button
            type="button"
            disabled={!selectedStation}
            onClick={handleSave}
            style={{
              border: "1px solid var(--blue-bdr)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 16px",
              background: selectedStation ? "var(--blue-bg)" : "var(--surface2)",
              color: selectedStation ? "var(--blue)" : "var(--dim)",
              fontWeight: 700,
              cursor: selectedStation ? "pointer" : "not-allowed",
            }}
          >
            {t("continue")}
          </button>
        </div>
      </section>
    </div>
  );
}
