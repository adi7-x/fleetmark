import React, { useEffect, useMemo, useState } from "react";
import SkeletonTable from "../../components/ui/SkeletonTable";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/TranslationContext";
import { API_BASE, authFetch, errorMessage } from "../../services/api";
import { fmtDate } from "../../utils/datetime";

const ROLES = [
  { value: "STUDENT", key: "roleStudent" },
  { value: "LOGISTICS_STAFF", key: "roleStaff" },
];

const th = { padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" };
const td = { padding: "12px 16px", fontSize: 13 };

/**
 * Users & roles. Everyone signs in with 42, and only ADMIN_42_LOGIN is made
 * staff automatically — this is where that admin promotes other staff.
 */
export default function Users() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [savingId, setSavingId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/auth/users/`);
      if (!res.ok) throw new Error(await errorMessage(res, t("usersLoadFailed")));
      const data = await res.json();
      // GDPR-deleted accounts survive only as anonymised rows; not real users.
      setUsers((Array.isArray(data) ? data : []).filter((u) => !(u.email || "").endsWith("@anonymised.local")));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener("fleetmark:refresh", load);
    return () => window.removeEventListener("fleetmark:refresh", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  async function update(target, patch) {
    setSavingId(target.id);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/auth/users/${target.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await errorMessage(res, t("usersSaveFailed")));
      const saved = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
      setNotice(t("usersSaved").replace("{{login}}", saved.login_42 || saved.email));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter((u) => !q || (u.login_42 || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
      .sort((a, b) => (a.login_42 || a.email).localeCompare(b.login_42 || b.email));
  }, [users, query, roleFilter]);

  const staffCount = users.filter((u) => u.role === "LOGISTICS_STAFF").length;

  if (loading) return <SkeletonTable cols={5} rows={6} />;

  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      <div>
        <p style={{ margin: 0, color: "var(--mid)", fontSize: 14 }}>
          {t("usersSubtitle").replace("{{total}}", users.length).replace("{{staff}}", staffCount)}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("usersSearch")}
          aria-label={t("usersSearch")}
          style={{ flex: "1 1 240px", background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("usersRole")}
          style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
        >
          <option value="all">{t("usersAllRoles")}</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
        </select>
      </div>

      {notice ? <p role="status" style={{ color: "var(--green)", margin: 0 }}>{notice}</p> : null}
      {error ? <p role="alert" style={{ color: "var(--red)", margin: 0 }}>{error}</p> : null}

      <div style={{ border: "1px solid color-mix(in srgb, var(--line) 30%, transparent)", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid color-mix(in srgb, var(--line) 30%, transparent)" }}>
              <th scope="col" style={th}>{t("usersUser")}</th>
              <th scope="col" style={th}>{t("usersRole")}</th>
              <th scope="col" style={th}>{t("usersStation")}</th>
              <th scope="col" style={th}>{t("usersAccess")}</th>
              <th scope="col" style={th}>{t("usersJoined")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const isMe = u.id === me?.id;
              const busy = savingId === u.id;
              return (
                <tr key={u.id} style={{ borderTop: "1px solid color-mix(in srgb, var(--line) 20%, transparent)", opacity: u.is_active ? 1 : 0.6 }}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>
                      {u.login_42 || "—"}
                      {isMe ? <span style={{ marginLeft: 8, fontSize: 11, color: "var(--blue)" }}>({t("usersYou")})</span> : null}
                    </div>
                    <div style={{ color: "var(--mid)", fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td style={td}>
                    <select
                      value={u.role}
                      disabled={isMe || busy}
                      onChange={(e) => update(u, { role: e.target.value })}
                      aria-label={`${t("usersRole")} — ${u.login_42}`}
                      title={isMe ? t("usersSelfLocked") : undefined}
                      style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", cursor: isMe ? "not-allowed" : "pointer" }}
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                      {u.role === "DRIVER" ? <option value="DRIVER">{t("roleDriver")}</option> : null}
                    </select>
                  </td>
                  <td style={{ ...td, color: "var(--mid)" }}>{u.station_name || "—"}</td>
                  <td style={td}>
                    <button
                      type="button"
                      disabled={isMe || busy}
                      onClick={() => update(u, { is_active: !u.is_active })}
                      title={isMe ? t("usersSelfLocked") : undefined}
                      style={{
                        border: `1px solid ${u.is_active ? "var(--green-border, var(--line))" : "var(--line)"}`,
                        background: u.is_active ? "var(--green-light, transparent)" : "var(--surface2)",
                        color: u.is_active ? "var(--green)" : "var(--mid)",
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isMe ? "not-allowed" : "pointer",
                      }}
                    >
                      {u.is_active ? t("usersActive") : t("usersBlocked")}
                    </button>
                  </td>
                  <td className="mono" style={{ ...td, color: "var(--mid)" }}>
                    {u.created_at ? fmtDate(u.created_at) : "—"}
                  </td>
                </tr>
              );
            })}
            {!visible.length ? (
              <tr>
                <td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--mid)", padding: 32 }}>{t("usersNone")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p style={{ margin: 0, color: "var(--dim)", fontSize: 12 }}>{t("usersHint")}</p>
    </div>
  );
}
