import React, { useEffect, useState } from "react";
import { useTranslation } from "../../context/TranslationContext";
import UserIdentity from "../ui/UserIdentity";
import Button from "../ui/Button";
import DarkModeToggle from "../ui/DarkModeToggle";
import { API_BASE, getAccessToken, authFetch } from "../../services/api";

/* Labels match the page titles in App.jsx (STUDENT_TITLES). Also used as the
   mobile bottom tabs; notifications stay on the header bell. */
const navItems = [
  { id: "dashboard", labelKey: "navDashboard",  path: "/passenger",          icon: "dashboard"      },
  { id: "bookings",  labelKey: "quickBookSeat", path: "/passenger/reserve",  icon: "event_seat"     },
  { id: "history",   labelKey: "quickMyTrips",  path: "/passenger/history",  icon: "history"        },
  { id: "tracker",   labelKey: "navTracker",    path: "/passenger/live-map", icon: "directions_bus" },
  { id: "profile",   labelKey: "navProfile",    path: "/passenger/settings", icon: "person"         },
];

export default function StudentLayout({
  user,
  activePath,
  onNavigate,
  onLogout,
  children,
  pageTitle = "Overview",
}) {
  const login       = user?.login_42 || "student";
  const { t, lang, setLang } = useTranslation();
  const stationName = user?.station_name || t("noStationSet");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchUnread() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await authFetch(`${API_BASE}/announcements/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && active) {
          const data = await res.json();
          setUnread(data.filter(a => !a.is_dismissed).length);
        }
      } catch { /* ignore */ }
    }

    fetchUnread();
    window.addEventListener("fleetmark:refresh", fetchUnread);
    window.addEventListener("fleetmark:badge", fetchUnread);
    return () => {
      active = false;
      window.removeEventListener("fleetmark:refresh", fetchUnread);
      window.removeEventListener("fleetmark:badge", fetchUnread);
    };
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [activePath]);

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function handleNavigate(path) {
    onNavigate?.(path);
    setDrawerOpen(false);
  }

  function isActive(itemPath) {
    const path = (activePath || "").replace(/\/+$/, "") || "/";
    if (itemPath === "/passenger") return path === "/passenger";
    return path === itemPath || path.startsWith(`${itemPath}/`);
  }
  const onNotifications = isActive("/passenger/notifications");

  const sidebar = (
    <>
      {/* Logo */}
      <div style={{ padding: "0 var(--space-3)" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: "var(--font-extrabold)",
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Fleetmark
        </div>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            marginTop: 2,
            fontWeight: "var(--font-medium)",
          }}
        >
          {t("appTagline")}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.path)}
              className={`nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{
                  fontSize: 20,
                  flexShrink: 0,
                  lineHeight: 1,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              {t(item.labelKey)}
            </button>
          );
        })}
      </nav>

      {/* Language + CTA + User identity + logout */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "var(--space-3)",
          display: "grid",
          gap: "var(--space-1)",
        }}
      >
        {/* Language switcher */}
        <div style={{ display: "flex", gap: 4, padding: "2px var(--space-3) 6px" }}>
          {["en", "fr"].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                flex: 1,
                border: lang === l ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: 8,
                padding: "4px 0",
                background: lang === l ? "var(--accent-light)" : "transparent",
                color: lang === l ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: lang === l ? 700 : 500,
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: "0.02em",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ padding: "var(--space-1) var(--space-3)" }}>
          <Button
            variant="primary"
            size="md"
            icon="event_seat"
            onClick={() => handleNavigate("/passenger/reserve")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {t("navNewBooking")}
          </Button>
        </div>
        <UserIdentity login={login} role={t("roleStudent")} />
        <button
          type="button"
          className="nav-item"
          onClick={onLogout}
        >
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>
            logout
          </span>
          {t("navLogout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="layout-root" style={{ '--accent': '#818cf8', '--accent2': '#a78bfa', '--accent-light': 'rgba(99,102,241,0.1)', '--accent-mid': 'rgba(99,102,241,0.15)', '--accent-border': 'rgba(99,102,241,0.28)', '--accent-glow': 'rgba(99,102,241,0.25)', '--accent-dim': '#ede9fe' }}>
      {/* Skip-to-content link — Fix 3c */}
      <a href="#main-content" className="skip-link">{t("skipToContent")}</a>
      {/* Mobile backdrop */}
      {drawerOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t("closeMenu")}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — desktop only */}
      <aside className={`layout-sidebar${drawerOpen ? " drawer-open" : ""}`}>
        {sidebar}
      </aside>

      <main id="main-content" className="layout-main layout-main-student">
        <header className="layout-header">
          {/* Hamburger — CSS hides this on desktop */}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon sidebar-hamburger"
            aria-label={t("openMenu")}
            title={t("openMenu")}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>menu</span>
          </button>

          {/* Title + station pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: "1 1 auto", minWidth: 0 }}>
            <div
              className="header-title"
              style={{
                margin: 0,
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-bold)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
              role="heading"
              aria-level="1"
            >
              {pageTitle}
            </div>
            {/* Station pill — hidden at <=768px via CSS */}
            <div
              className="header-station-pill"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "5px 10px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ fontSize: 13, color: "var(--green)", lineHeight: 1, fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                  fontWeight: "var(--font-medium)",
                  whiteSpace: "nowrap",
                }}
              >
                {stationName}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
            {/* User avatar — hidden at <=768px via CSS (shown in drawer) */}
            <div
              className="header-avatar"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--blue), var(--blue2, var(--blue)))",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
              title={login}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>
                {login.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <DarkModeToggle />
            {/* Notification bell */}
            <button
              type="button"
              onClick={() => onNavigate?.("/passenger/notifications")}
              style={{
                position: "relative",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 6,
                display: "grid",
                placeItems: "center",
              }}
              title={t("navNotifications")}
              aria-label={t("navNotifications")}
              aria-current={onNotifications ? "page" : undefined}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{
                  fontSize: 22,
                  color: onNotifications ? "var(--accent)" : "var(--text-secondary)",
                  fontVariationSettings: onNotifications ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                notifications
              </span>
              {unread > 0 && (
                <span
                  className="bell-badge-pulse"
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: "var(--red)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    padding: "0 4px",
                    lineHeight: 1,
                  }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            <Button
              variant="ghost"
              size="sm"
              icon="refresh"
              iconOnly
              title={t("refresh")}
              aria-label={t("refresh")}
              onClick={() => window.dispatchEvent(new CustomEvent("fleetmark:refresh"))}
            />
          </div>
        </header>

        <div className="layout-content layout-content-student">
          {children}
        </div>
        <footer
          style={{
            padding: "12px var(--page-padding-x, 32px)",
            borderTop: "1px solid var(--line2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "var(--dim)",
          }}
        >
          <span>© 2026 Fleetmark</span>
          <span>·</span>
          <a href="/privacy" style={{ color: "var(--dim)", textDecoration: "none", fontWeight: 600 }}>{t("privacy")}</a>
          <span>·</span>
          <a href="/terms" style={{ color: "var(--dim)", textDecoration: "none", fontWeight: 600 }}>{t("terms")}</a>
        </footer>
      </main>

      {/* ── Mobile bottom navigation ──────────── */}
      <nav className="student-bottom-nav">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              className={`student-bottom-nav-item${active ? " active" : ""}`}
              onClick={() => handleNavigate(item.path)}
              aria-current={active ? "page" : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              <span className="student-bottom-nav-label">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
