import React, { useEffect, useState } from "react";
import Spinner from "../components/ui/Spinner";
import { auth as apiAuth, API_BASE } from "../services/api";
import { useTranslation } from "../context/TranslationContext";

// The landing page reads ?auth_error and explains it to the user.
const FAIL_URL = "/?auth_error=provider";

// The OAuth fragment is a one-shot credential: we strip it from the URL the
// moment we read it so the access token can't linger in the address bar,
// browser history or a Referer header. That makes reading it *destructive* —
// and an effect in React StrictMode is mounted, torn down and mounted again,
// so a naive re-read finds an empty hash and reports a perfectly good login
// as a failure. Cache the parsed payload the first time and hand the same
// object to every later caller.
let cachedFragment = null;

function consumeOAuthFragment() {
  if (cachedFragment) return cachedFragment;

  const raw = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(raw);
  cachedFragment = {
    access: params.get("access"),
    preauth: params.get("preauth"),
    role: params.get("role"),
    login: params.get("login"),
    totp: params.get("totp"),
  };

  if (raw) {
    window.history.replaceState({}, "", window.location.pathname);
  }

  return cachedFragment;
}

function redirectByRole(user) {
  if (!user) {
    window.location.replace(FAIL_URL);
    return;
  }

  if (user.role === "LOGISTICS_STAFF") {
    window.location.replace("/admin");
    return;
  }

  if (user.role === "DRIVER") {
    window.location.replace("/driver");
    return;
  }

  if (user.role === "STUDENT") {
    if (!user.station) window.location.replace("/onboarding");
    else window.location.replace("/passenger");
    return;
  }

  window.location.replace(FAIL_URL);
}

export default function AuthCallback() {
  const { t } = useTranslation();
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [preauthToken, setPreauthToken] = useState(null);

  async function verifyTotpAndContinue() {
    setTotpLoading(true);
    setTotpError("");
    try {
      // Exchanges the pre-auth token + TOTP code for the real session. On
      // success the backend sets the refresh cookie and we get an access
      // token + the full user back — no session existed before this call.
      const user = await apiAuth.verifyTotpLogin(preauthToken, totpCode);
      redirectByRole(user);
    } catch (err) {
      setTotpError(err.message || t("twoFaInvalidCode"));
    } finally {
      setTotpLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const {
          access: hashAccess,
          preauth: hashPreauth,
          role: hashRole,
          login: hashLogin,
          totp: hashTotp,
        } = consumeOAuthFragment();

        // 2FA required: no session yet. Show the code prompt; the real
        // tokens only get minted once verifyTotpAndContinue() succeeds.
        if (hashTotp === "1" && hashPreauth) {
          if (active) {
            setPreauthToken(hashPreauth);
            setTotpRequired(true);
          }
          return;
        }

        if (!hashAccess) throw new Error("Missing OAuth callback payload.");

        // Fetch the canonical profile with the fresh access token (the
        // refresh token is already sitting in an HttpOnly cookie — this
        // page never sees it).
        const meRes = await fetch(`${API_BASE}/auth/me/`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${hashAccess}` },
        });
        if (!meRes.ok) throw new Error("Failed to fetch user profile.");
        const profile = await meRes.json();

        const user = {
          ...profile,
          role: profile.role || hashRole || "STUDENT",
          login_42: profile.login_42 || hashLogin || "",
        };

        apiAuth.completeLogin(hashAccess, user);

        if (active) redirectByRole(user);
      } catch (err) {
        console.error("[AuthCallback] Auth failed:", err?.message || err);
        if (active) window.location.replace(FAIL_URL);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, []);

  if (totpRequired) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
          padding: "var(--space-6)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "var(--space-8)",
            textAlign: "center",
            display: "grid",
            gap: "var(--space-4)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 48, color: "var(--blue)", justifySelf: "center" }}
          >
            security
          </span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            {t("twoFaTitle")}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--mid)" }}>
            {t("cbTwoFaDesc")}
          </p>
          <input
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            aria-label={t("twoFaCodeLabel")}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && totpCode.length === 6) verifyTotpAndContinue();
            }}
            style={{
              width: "100%",
              background: "var(--surface2)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px",
              fontSize: 24,
              fontFamily: "monospace",
              letterSpacing: "0.3em",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          />
          {totpError && (
            <span style={{ fontSize: 13, color: "var(--red)", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>error</span>
              {totpError}
            </span>
          )}
          <button
            type="button"
            onClick={verifyTotpAndContinue}
            disabled={totpLoading || totpCode.length !== 6}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "14px",
              background: totpCode.length === 6 ? "var(--blue)" : "var(--surface2)",
              color: totpCode.length === 6 ? "#fff" : "var(--dim)",
              fontWeight: 700,
              fontSize: 15,
              cursor: totpCode.length === 6 ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
            }}
          >
            {totpLoading ? t("loading") : t("cbVerify")}
          </button>
        </div>
      </div>
    );
  }

  return <Spinner size={42} text={t("cbFinalizing")} />;
}
