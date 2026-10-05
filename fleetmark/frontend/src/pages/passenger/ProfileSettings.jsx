import React, { useState } from "react";
import StopPicker from "../../components/shared/StopPicker";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/TranslationContext";
import { API_BASE, authFetch, errorMessage } from "../../services/api";

const section = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  background: "var(--surface)",
  padding: "var(--space-6)",
  display: "grid",
  gap: "var(--space-4)",
  boxShadow: "var(--shadow-sm)",
};

const btn = (tone) => ({
  border: `1px solid var(--${tone}-border)`,
  borderRadius: 10,
  padding: "10px 18px",
  background: `var(--${tone}-light)`,
  color: `var(--${tone})`,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  justifySelf: "start",
});

function Message({ msg }) {
  if (!msg) return null;
  const ok = msg.type === "ok";
  return (
    <span role={ok ? "status" : "alert"} style={{ fontSize: 12, color: ok ? "var(--green)" : "var(--red)", display: "flex", alignItems: "center", gap: 4 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{ok ? "check_circle" : "error"}</span>
      {msg.text}
    </span>
  );
}

export default function ProfileSettings() {
  const { user, setUser, logout } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const [selected, setSelected] = useState(user?.station || "");
  const [stationMsg, setStationMsg] = useState(null);
  const [dataMsg, setDataMsg] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.totp_enabled || false);
  const [twoFASetup, setTwoFASetup] = useState(null); // { secret, qr_code }
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMsg, setTwoFAMsg] = useState(null);

  async function post(path, body) {
    return authFetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function saveStation() {
    setStationMsg(null);
    try {
      const res = await authFetch(`${API_BASE}/auth/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station: selected }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, t("saveStationFailed")));
      // Through AuthContext so the header's station chip updates too.
      setUser(await res.json());
      setStationMsg({ type: "ok", text: t("saved") });
    } catch (err) {
      setStationMsg({ type: "err", text: err.message });
    }
  }

  async function signOut() {
    await logout();
    window.location.replace("/");
  }

  async function handleExportData() {
    setExporting(true);
    setDataMsg(null);
    try {
      const res = await authFetch(`${API_BASE}/auth/me/export/`);
      if (!res.ok) throw new Error(await errorMessage(res, t("exportFailed")));
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fleetmark-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDataMsg({ type: "err", text: err.message });
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await post("auth/me/delete/");
      if (!res.ok) throw new Error(await errorMessage(res, t("deleteFailed")));
      await signOut();
    } catch (err) {
      setDataMsg({ type: "err", text: err.message });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSetup2FA() {
    setTwoFALoading(true);
    setTwoFAMsg(null);
    try {
      const res = await post("auth/2fa/setup/");
      if (!res.ok) throw new Error(await errorMessage(res, t("twoFaSetupFailed")));
      setTwoFASetup(await res.json());
    } catch (err) {
      setTwoFAMsg({ type: "err", text: err.message });
    } finally {
      setTwoFALoading(false);
    }
  }

  async function submitCode(path, enable) {
    setTwoFALoading(true);
    setTwoFAMsg(null);
    try {
      const res = await post(path, { code: twoFACode });
      if (!res.ok) throw new Error(await errorMessage(res, t("twoFaInvalidCode")));
      setTwoFAEnabled(enable);
      setTwoFASetup(null);
      setTwoFACode("");
      setUser({ ...user, totp_enabled: enable });
      setTwoFAMsg({ type: "ok", text: enable ? t("twoFaEnabledMsg") : t("twoFaDisabledMsg") });
    } catch (err) {
      setTwoFAMsg({ type: "err", text: err.message });
    } finally {
      setTwoFALoading(false);
    }
  }

  const login = user?.login_42 || "";
  const roleLabel = { STUDENT: t("roleStudent"), LOGISTICS_STAFF: t("roleStaff"), DRIVER: t("roleDriver") }[user?.role] || user?.role;
  const codeReady = twoFACode.length === 6 && !twoFALoading;

  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-5)", maxWidth: 640 }}>
      {/* Identity */}
      <section style={{ ...section, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto", overflow: "hidden", background: "linear-gradient(135deg, var(--blue), var(--blue2, var(--blue)))", display: "grid", placeItems: "center" }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" width={80} height={80} style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{login.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{login}</h2>
          <p style={{ margin: "4px 0 0", color: "var(--mid)", fontSize: 13 }}>{user?.email}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-5)", flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div>
            <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--dim)", fontWeight: 700 }}>{t("usersRole")}</span>
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>{roleLabel}</div>
          </div>
          <div>
            <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--dim)", fontWeight: 700 }}>{t("statMyStop")}</span>
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600 }}>{user?.station_name || t("statNotSet")}</div>
          </div>
        </div>
      </section>

      {/* Home station */}
      <section style={section}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("homeStation")}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--mid)" }}>{t("homeStationDesc")}</p>
        </div>
        <StopPicker selected={selected} onSelect={setSelected} />
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={saveStation} disabled={!selected || selected === user?.station} style={{ ...btn("blue"), opacity: !selected || selected === user?.station ? 0.5 : 1 }}>
            {t("saveStation")}
          </button>
          <Message msg={stationMsg} />
        </div>
      </section>

      {/* Language */}
      <section style={section}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("language")}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--mid)" }}>{t("languageDesc")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ id: "en", label: "English" }, { id: "fr", label: "Français" }].map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              style={{
                flex: 1,
                border: lang === l.id ? "2px solid var(--blue)" : "1px solid var(--border)",
                borderRadius: 10,
                padding: "12px 8px",
                background: lang === l.id ? "var(--blue-light)" : "var(--surface2)",
                color: lang === l.id ? "var(--blue)" : "var(--text-primary)",
                fontWeight: lang === l.id ? 700 : 500,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* Two-factor authentication */}
      <section style={section}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: twoFAEnabled ? "var(--green)" : "var(--amber)" }}>
            {twoFAEnabled ? "verified_user" : "security"}
          </span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("twoFaTitle")}</h3>
          {twoFAEnabled ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", border: "1px solid var(--green)", borderRadius: 999, padding: "2px 10px" }}>{t("twoFaOn")}</span>
          ) : null}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mid)" }}>{twoFAEnabled ? t("twoFaOnDesc") : t("twoFaOffDesc")}</p>

        {twoFASetup && !twoFAEnabled ? (
          <div style={{ padding: "var(--space-4)", borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--line2)", display: "grid", gap: "var(--space-3)", justifyItems: "start" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{t("twoFaScan")}</p>
            {twoFASetup.qr_code ? (
              <img src={twoFASetup.qr_code} alt={t("twoFaQrAlt")} width={180} height={180} style={{ background: "#fff", padding: 10, borderRadius: 10 }} />
            ) : null}
            <p style={{ margin: 0, fontSize: 12, color: "var(--dim)" }}>{t("twoFaManual")}</p>
            <code style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, wordBreak: "break-all", color: "var(--mid)" }}>
              {twoFASetup.secret}
            </code>
          </div>
        ) : null}

        {twoFASetup || twoFAEnabled ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              aria-label={t("twoFaCodeLabel")}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{ width: 130, background: "var(--surface2)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: "monospace", letterSpacing: "0.2em", textAlign: "center" }}
            />
            {twoFAEnabled ? (
              <button type="button" disabled={!codeReady} onClick={() => submitCode("auth/2fa/disable/", false)} style={{ ...btn("red"), opacity: codeReady ? 1 : 0.5 }}>
                {twoFALoading ? t("loading") : t("twoFaDisable")}
              </button>
            ) : (
              <button type="button" disabled={!codeReady} onClick={() => submitCode("auth/2fa/verify/", true)} style={{ ...btn("green"), opacity: codeReady ? 1 : 0.5 }}>
                {twoFALoading ? t("loading") : t("twoFaEnable")}
              </button>
            )}
          </div>
        ) : (
          <button type="button" onClick={handleSetup2FA} disabled={twoFALoading} style={btn("blue")}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
            {twoFALoading ? t("loading") : t("twoFaSetup")}
          </button>
        )}
        <Message msg={twoFAMsg} />
      </section>

      {/* Your data (GDPR) */}
      <section style={section}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--blue)" }}>shield</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("yourData")}</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mid)" }}>{t("yourDataDesc")}</p>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={handleExportData} disabled={exporting} style={{ ...btn("blue"), opacity: exporting ? 0.6 : 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            {exporting ? t("loading") : t("exportData")}
          </button>
          {!showDeleteConfirm ? (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} style={btn("red")}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
              {t("deleteAccount")}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid var(--red-border)", borderRadius: 10, background: "var(--red-light)", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>{t("deleteAccountConfirm")}</span>
              <button type="button" onClick={handleDeleteAccount} disabled={deleting} style={{ border: "none", borderRadius: 8, padding: "6px 14px", background: "var(--red)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                {deleting ? t("loading") : t("confirm")}
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{ border: "none", background: "transparent", color: "var(--mid)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {t("cancel")}
              </button>
            </div>
          )}
        </div>
        <Message msg={dataMsg} />
      </section>

      {/* Sign out */}
      <section style={{ ...section, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t("navLogout")}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--mid)" }}>{t("signOutDesc")}</p>
        </div>
        <button type="button" onClick={signOut} style={btn("red")}>{t("navLogout")}</button>
      </section>
    </div>
  );
}
