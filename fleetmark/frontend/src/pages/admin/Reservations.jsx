import React, { useEffect, useState } from "react";
import SkeletonTable from "../../components/ui/SkeletonTable";
import EmptyState from "../../components/ui/EmptyState";
import { API_BASE, getAccessToken, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";
import { fmtDateTime } from "../../utils/datetime";


export default function Reservations() {
  const { t } = useTranslation();
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  async function loadInitial() {
    setLoading(true);
    setError("");
    try {
      const token = getAccessToken();
      const headers = { 
        Authorization: `Bearer ${token}`,
      };
      const [uRes] = await Promise.all([
        authFetch(`${API_BASE}/auth/users/`, { headers }),
      ]);
      if (!uRes.ok) throw new Error(t("resvLoadFailed"));
      const [uData] = await Promise.all([uRes.json()]);
      setUsers(Array.isArray(uData) ? uData : []);
    } catch (err) {
      setError(err.message || t("resvLoadUnable"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    if (e) e.preventDefault();
    setIsSearching(true);
    setError("");
    try {
      const token = getAccessToken();
      const headers = { 
        Authorization: `Bearer ${token}`,
      };
      const searchParams = new URLSearchParams();
      if (query.trim()) searchParams.append("login", query.trim());
      if (dateFrom) searchParams.append("date_from", dateFrom);
      if (dateTo) searchParams.append("date_to", dateTo);

      const res = await authFetch(`${API_BASE}/reservations/search/?${searchParams.toString()}`, { headers });
      if (!res.ok) throw new Error(await errorMessage(res, t("resvSearchFailed")));
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || t("resvSearchUnable"));
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      loadInitial();
      if (hasSearched) handleSearch();
    };
    window.addEventListener("fleetmark:refresh", onRefresh);
    return () => window.removeEventListener("fleetmark:refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSearched, query, dateFrom, dateTo]);

  if (loading) return <SkeletonTable cols={5} rows={5} />;

  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      <p style={{ margin: 0, color: "var(--mid)", fontSize: 14 }}>{t("resvHint")}</p>
      
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", background: "var(--surface)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--line2)" }}>
        <div style={{ display: "grid", flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{t("resvStudentLogin")}</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("resvLoginPh")}
            style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}
          />
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{t("resvFrom")}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}
          />
        </div>
        <div style={{ display: "grid" }}>
          <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{t("resvTo")}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}
          />
        </div>
        <button 
          type="submit" 
          disabled={isSearching}
          style={{ padding: "11px 20px", background: "var(--blue)", color: "white", borderRadius: "var(--radius-sm)", border: "none", fontWeight: 700, cursor: "pointer", height: 42, display: "flex", alignItems: "center", gap: 6 }}
        >
          {isSearching ? <span className="spinner-border" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>}
          {t("search")}
        </button>
      </form>

      {error ? <p style={{ color: "var(--red)" }}>{error}</p> : null}

      {!hasSearched ? (
        <EmptyState icon="🔍" title={t("resvSearchTitle")} subtitle={t("resvSearchSub")} />
      ) : !reservations.length ? (
        <EmptyState icon="🎫" title={t("resvNoResults")} subtitle={t("resvNoneFound")} />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid var(--line2)", borderRadius: 10, overflow: "hidden" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--surface)" }}>
              <th scope="col" style={{ padding: 10 }}>{t("roleStudent")}</th>
              <th scope="col" style={{ padding: 10 }}>{t("colTrip")}</th>
              <th scope="col" style={{ padding: 10 }}>{t("colDeparture")}</th>
              <th scope="col" style={{ padding: 10 }}>{t("colStatus")}</th>
              <th scope="col" style={{ padding: 10 }}>{t("resvBookedAt")}</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const user = users.find((item) => item.id === reservation.student);
              
              let status = { label: t("statusUnknown"), color: "var(--mid)" };
              const departure = reservation.trip_details?.departure_datetime;
              if (departure) {
                const departureDate = new Date(departure);
                const now = new Date();
                status = departureDate > now ? { label: t("tabUpcoming"), color: "var(--blue)" } : { label: t("completed"), color: "var(--green)" };
              }

              return (
                <tr key={reservation.id} style={{ borderTop: "1px solid var(--line2)" }}>
                  <td style={{ padding: 10 }}>{user?.login_42 || user?.username || reservation.student}</td>
                  <td style={{ padding: 10 }}>{reservation.trip_details?.route_name || reservation.trip}</td>
                  <td className="mono" style={{ padding: 10 }}>
                    {departure ? fmtDateTime(departure) : "-"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: status.color,
                      background: `color-mix(in srgb, ${status.color} 10%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${status.color} 30%, transparent)`,
                    }}>
                      {status.label}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: 10 }}>{reservation.created_at ? fmtDateTime(reservation.created_at) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
