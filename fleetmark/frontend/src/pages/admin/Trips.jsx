import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SkeletonTable from "../../components/ui/SkeletonTable";
import SetupProgress from "../../components/ui/SetupProgress";
import AdminEmptyState from "../../components/ui/AdminEmptyState";
import useCountUp from "../../hooks/useCountUp";
import { API_BASE, getAccessToken, authFetch, errorMessage } from "../../services/api";
import { fmtTime, fmtDate } from "../../utils/datetime";
import { useTranslation } from "../../context/TranslationContext";


const emptyForm = { route: "", bus: "", driver: "", departure_datetime: "" };

// <input type="datetime-local"> wants local wall-clock time. toISOString()
// is UTC, which shifted every edited trip by the UTC offset (1h in Morocco).
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Translation keys, resolved with t() at render.
const STATUS_KEYS = {
  scheduled: "statusScheduled",
  near_full: "tripsNearFull",
  full: "full",
  departed: "statusDeparted",
  archived: "tripsArchived",
};

/** Stat card with count-up — must be a separate component (rules of hooks). */
function TripStatCard({ label, numericTarget, suffix, decimals = 0 }) {
  const n = numericTarget == null || Number.isNaN(Number(numericTarget)) ? null : Number(numericTarget);
  const animated = useCountUp(n ?? 0, 650);
  const display =
    n == null ? "—" : decimals > 0 ? animated.toFixed(decimals) : String(animated);

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid color-mix(in srgb, var(--line) 30%, transparent)",
        borderRadius: 8,
        padding: "16px 16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 108,
      }}
    >
      <span className="mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--mid)" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{display}</span>
        {suffix ? (
          <span className="mono" style={{ fontSize: 11, color: "var(--mid)", paddingBottom: 2 }}>
            {suffix}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export default function Trips() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("upcoming");
  const [routeFilter, setRouteFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmDeleteListed, setConfirmDeleteListed] = useState(false);
  const [notice, setNotice] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState("regular");
  const [bulkForm, setBulkForm] = useState({ start_date: "", end_date: "", dates: "", route: "", bus: "", driver: "", skip_weekends: true });

  const token = getAccessToken();
  const headers = useMemo(() => ({ 
    Authorization: `Bearer ${token}`, 
    "Content-Type": "application/json",
  }), [token]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [tRes, r, b, d] = await Promise.all([
        authFetch(`${API_BASE}/trips/`, { headers }),
        authFetch(`${API_BASE}/routes/`, { headers }),
        authFetch(`${API_BASE}/buses/`, { headers }),
        authFetch(`${API_BASE}/drivers/`, { headers }),
      ]);
      if (!tRes.ok || !r.ok || !b.ok || !d.ok) throw new Error(t("tripsLoadFailed"));
      const [tData, rData, bData, dData] = await Promise.all([tRes.json(), r.json(), b.json(), d.json()]);
      setTrips(tData || []);
      setRoutes(rData || []);
      setBuses(bData || []);
      setDrivers(dData || []);
    } catch (err) {
      setError(err.message || t("tripsLoadUnable"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (location.state?.openTripForm) {
      openCreate();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.openTripForm, location.pathname, navigate]);

  useEffect(() => {
    window.addEventListener("fleetmark:new-trip", openCreate);
    return () => window.removeEventListener("fleetmark:new-trip", openCreate);
  }, []);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener("fleetmark:refresh", onRefresh);
    return () => window.removeEventListener("fleetmark:refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCountdown(departureStr) {
    const ms = new Date(departureStr) - new Date();
    if (ms < 0) return t("statusDeparted");
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return t("tripsInHM").replace("{{h}}", h).replace("{{m}}", m);
    return t("tripsInM").replace("{{m}}", m);
  }

  function getRowStatus(trip) {
    if (trip.archived_at) return "archived";
    if (new Date(trip.departure_datetime) < new Date()) return "departed";
    const seatsLeft = Number(trip.seats_left ?? 0);
    const capacity = Number(trip.bus_seat_capacity || 0);
    if (seatsLeft <= 0) return "full";
    if (capacity > 0 && seatsLeft / capacity <= 0.2) return "near_full";
    return "scheduled";
  }

  function capacityForTrip(trip) {
    const direct = Number(trip.bus_seat_capacity ?? trip.seat_capacity ?? 0);
    if (direct > 0) return direct;
    const bus = buses.find((item) => item.id === trip.bus);
    return Number(bus?.seat_capacity ?? bus?.capacity ?? 0);
  }

  const filtered = trips.filter((trip) => {
    const rowStatus = getRowStatus(trip);
    if (statusFilter === "upcoming") {
      if (rowStatus === "archived" || rowStatus === "departed") return false;
    } else if (statusFilter !== "all" && statusFilter !== rowStatus) return false;
    if (routeFilter !== "all" && trip.route !== routeFilter) return false;
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(trip) {
    setEditing(trip);
    setForm({
      route: trip.route,
      bus: trip.bus,
      driver: trip.driver,
      departure_datetime: toLocalInput(trip.departure_datetime),
    });
    setOpen(true);
  }

  function openBulkCreate(type) {
    setBulkType(type);
    setBulkForm({ start_date: "", end_date: "", dates: "", route: "", bus: "", driver: "", skip_weekends: true });
    setBulkOpen(true);
  }

  function openGenerateWeekly() {
    const today = new Date();

    // Find current week's Monday (or most recent)
    const nextMonday = new Date(today);
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    nextMonday.setDate(today.getDate() + diff);
    
    // Sunday is 6 days after Monday
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    
    // Format to YYYY-MM-DD local
    const toYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setBulkType("regular");
    setBulkForm({ 
      start_date: toYMD(nextMonday), 
      end_date: toYMD(nextSunday), 
      dates: "", 
      route: "", 
      bus: "", 
      driver: "", 
      skip_weekends: false  // Weekends matter for Mon-Sun
    });
    setBulkOpen(true);
  }

  async function saveBulk() {
    setLoading(true);
    setError("");

    // ── 1. Validate date range ──────────────────────────────────
    if (bulkType === "regular" && bulkForm.end_date) {
      const eDate = new Date(bulkForm.end_date);
      const today = new Date();
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 15);
      if (eDate > maxDate) {
        setError(t("tripsMax15Days"));
        setLoading(false);
        return;
      }
    }

    try {
      // ── 2. Build the list of target dates ─────────────────────
      let datesToGenerate = [];

      if (bulkType === "regular") {
        if (!bulkForm.start_date || !bulkForm.end_date) {
          setError(t("tripsDatesRequired"));
          setLoading(false);
          return;
        }
        const start = new Date(bulkForm.start_date + "T00:00:00");
        const end   = new Date(bulkForm.end_date   + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
          if (bulkForm.skip_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
          datesToGenerate.push(new Date(d));
        }
      } else {
        // specific dates
        if (!bulkForm.dates) {
          setError(t("tripsEnterDate"));
          setLoading(false);
          return;
        }
        const today = new Date();
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 15);
        const items = bulkForm.dates.split(",").map(s => s.trim()).filter(Boolean);
        for (const ds of items) {
          const parsed = new Date(ds + "T00:00:00");
          if (isNaN(parsed.getTime())) continue;
          if (parsed > maxDate) {
            setError(t("tripsMax15Days"));
            setLoading(false);
            return;
          }
          datesToGenerate.push(parsed);
        }
      }

      if (!datesToGenerate.length) {
        setError(t("tripsNoValidDates"));
        setLoading(false);
        return;
      }

      // ── 3. Resolve routes / buses / driver by name ────────────
      const find = (arr, ...names) => arr.find(item =>
        names.some(n => (item.name || "").toLowerCase().includes(n.toLowerCase()))
      );

      const routeOcp     = find(routes, "OCP");
      const routeCb      = find(routes, "Coin Blue", "CoinBlue");
      const routeUnified = find(routes, "Unified", "Night Route");

      const busOcp     = find(buses, "OCP");
      const busCb      = find(buses, "Coin Blue", "CoinBlue", "CB");
      const busUnified = find(buses, "Unified", "Night Route", "UNI");

      const defaultDriver = drivers.find((d) => d.status === "active") || null;

      // Fallbacks: use first available if specific ones not found
      const fallbackRoute = routes[0];
      const fallbackBus   = buses[0];

      if (!fallbackRoute || !fallbackBus || !defaultDriver) {
        setError(t("tripsNeedResources"));
        setLoading(false);
        return;
      }

      // ── 4. Build trip payloads ────────────────────────────────
      // Hours: 21, 22, 23, 0, 1, 3, 4, 5, 6  (02:00 is excluded)
      const HOURS = [21, 22, 23, 0, 1, 3, 4, 5, 6];
      const PEAK  = new Set([21, 22, 1]);

      const payloads = [];

      for (const targetDate of datesToGenerate) {
        for (const h of HOURS) {
          // For hours after midnight (0-6), the calendar day is target_date + 1
          const actualDate = new Date(targetDate);
          if (h < 12) actualDate.setDate(actualDate.getDate() + 1);

          const departureISO = new Date(
            actualDate.getFullYear(),
            actualDate.getMonth(),
            actualDate.getDate(),
            h, 0, 0
          ).toISOString();

          if (PEAK.has(h)) {
            // Peak: 2 trips — OCP Route + Coin Blue Route
            payloads.push({
              route:              (routeOcp || fallbackRoute).id,
              bus:                (busOcp   || fallbackBus).id,
              driver:             defaultDriver.id,
              departure_datetime: departureISO,
            });
            payloads.push({
              route:              (routeCb || routeUnified || fallbackRoute).id,
              bus:                (busCb   || busUnified   || fallbackBus).id,
              driver:             defaultDriver.id,
              departure_datetime: departureISO,
            });
          } else {
            // Normal: 1 trip — Unified Night Route
            payloads.push({
              route:              (routeUnified || fallbackRoute).id,
              bus:                (busUnified   || fallbackBus).id,
              driver:             defaultDriver.id,
              departure_datetime: departureISO,
            });
          }
        }
      }

      // ── 5. Deduplicate against existing trips ─────────────────
      const existingKeys = new Set(
        // Compare instants: the API returns "+01:00" offsets, the payloads are UTC "Z".
        trips.map((t) => `${t.route}|${new Date(t.departure_datetime).getTime()}`)
      );

      const newPayloads = payloads.filter((p) => {
        const key = `${p.route}|${new Date(p.departure_datetime).getTime()}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);   // also deduplicate within the batch
        return true;
      });

      if (!newPayloads.length) {
        setError(t("tripsAllExist"));
        setLoading(false);
        return;
      }

      // ── 6. Create trips (batched, 5 at a time) ────────────────
      let created = 0;
      const BATCH = 5;
      for (let i = 0; i < newPayloads.length; i += BATCH) {
        const batch = newPayloads.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((p) =>
            authFetch(`${API_BASE}/trips/`, {
              method: "POST",
              headers,
              body: JSON.stringify(p),
            })
          )
        );
        created += results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
      }

      setBulkOpen(false);
      await load();
      const failed = newPayloads.length - created;
      setNotice(created === 1 ? t("tripsGeneratedOne") : t("tripsGeneratedMany").replace("{{n}}", created));
      if (failed > 0) setError(failed === 1 ? t("tripsFailedOne") : t("tripsFailedMany").replace("{{n}}", failed));
    } catch (err) {
      setError(err.message || t("tripsGenFailed"));
      setLoading(false);
    }
  }

  async function save() {
    setError("");
    if (!form.route || !form.bus || !form.driver || !form.departure_datetime) {
      setError(t("tripsFieldsRequired"));
      return;
    }
    try {
      const payload = { ...form, departure_datetime: new Date(form.departure_datetime).toISOString() };
      const endpoint = editing ? `${API_BASE}/trips/${editing.id}/` : `${API_BASE}/trips/`;
      const method = editing ? "PUT" : "POST";
      const res = await authFetch(endpoint, { method, headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await errorMessage(res, t("saveFailed")));
      setOpen(false);
      setNotice(editing ? t("tripsUpdated") : t("tripsCreated"));
      await load();
    } catch (err) {
      setError(err.message || t("saveFailed"));
    }
  }

  // The backend refuses an unscoped wipe, so delete exactly the trips the
  // admin is looking at (current filters) and nothing else.
  async function deleteListed() {
    setConfirmDeleteListed(false);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/trips/bulk-delete/`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ confirm: true, ids: filtered.map((t) => t.id) }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, t("itemDeleteFailed")));
      const data = await res.json().catch(() => ({}));
      setNotice(data.detail || t("tripsDeleted"));
      await load();
    } catch (err) {
      setError(err.message || t("itemDeleteFailed"));
    }
  }

  async function archive(trip) {
    try {
      const res = await authFetch(`${API_BASE}/trips/${trip.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ archived_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, t("tripsArchiveFailed")));
      setNotice(t("tripsArchivedNotice"));
      await load();
    } catch (err) {
      setError(err.message || t("tripsArchiveFailed"));
    }
  }

  async function remove(id) {
    try {
      const res = await authFetch(`${API_BASE}/trips/${id}/`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(await errorMessage(res, t("itemDeleteFailed")));
      setNotice(t("tripsDeletedOne"));
      await load();
    } catch (err) {
      setError(err.message || t("itemDeleteFailed"));
    }
  }

  if (loading) return (
    <div style={{ display: "grid", gap: "var(--section-gap)" }}>
      <SkeletonTable cols={6} rows={6} />
    </div>
  );

  return (
    <div className="animate-in" style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 26 }}>
      <SetupProgress currentStep="trips" done={trips.filter(t => !t.archived_at).length > 0} />
      <style>{`
        .trip-row .row-actions { opacity: 0.35; transition: opacity 0.2s; }
        .trip-row:hover .row-actions, .trip-row:focus-within .row-actions { opacity: 1; }
      `}</style>
      <div className="animate-in" style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span className="mono" style={{ color: "var(--blue)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700 }}>
            {t("tripsEyebrow")}
          </span>
          <h2 style={{ margin: "8px 0 0", fontSize: 32, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            {t("navTrips")}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setConfirmDeleteListed(true)}
            disabled={!filtered.length}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface)",
              color: "var(--red)",
              border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 700,
              cursor: filtered.length ? "pointer" : "not-allowed",
              opacity: filtered.length ? 1 : 0.5,
              fontSize: 14,
              boxShadow: "var(--shadow-sm)",
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete_sweep</span>
            {t("tripsDeleteListed").replace("{{n}}", filtered.length)}
          </button>
          <button
            type="button"
            onClick={openGenerateWeekly}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid color-mix(in srgb, var(--line) 50%, transparent)",
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "var(--shadow-sm)",
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>date_range</span>
            {t("tripsWeekly")}
          </button>
          <button
            type="button"
            onClick={() => openBulkCreate("regular")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid color-mix(in srgb, var(--line) 50%, transparent)",
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "var(--shadow-sm)",
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>event</span>
            {t("tripsCustomDates")}
          </button>
          <button
            type="button"
            onClick={openCreate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "var(--shadow-md), 0 4px 12px color-mix(in srgb, var(--blue) 30%, transparent)",
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>add_box</span>
            {t("navNewTrip")}
          </button>
        </div>
      </div>

      <div className="animate-in" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "14px 0", borderTop: "1px solid color-mix(in srgb, var(--line) 30%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--line) 30%, transparent)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", background: "var(--surface)", padding: 4, borderRadius: 8 }}>
          {[
            ["upcoming", "tabUpcoming"],
            ["near_full", "tripsNearFull"],
            ["full", "full"],
            ["departed", "statusDeparted"],
            ["archived", "tripsArchived"],
            ["all", "filterAll"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              style={{
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                background: statusFilter === value ? "var(--blue-bg)" : "transparent",
                color: statusFilter === value ? "var(--blue)" : "var(--mid)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: "color-mix(in srgb, var(--line) 40%, transparent)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono" style={{ fontSize: 10, textTransform: "uppercase", color: "var(--mid)", letterSpacing: "0.12em" }}>
            {t("tripsRouteFilter")}
          </span>
          <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid color-mix(in srgb, var(--line) 30%, transparent)", borderRadius: 6, padding: "7px 10px" }}>
            <option value="all">{t("tripsAllRoutes")}</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {notice ? (
        <p role="status" style={{ color: "var(--green)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
          {notice}
        </p>
      ) : null}
      {error ? <p role="alert" style={{ color: "var(--red)", margin: 0 }}>{error}</p> : null}

      {trips.length > 0 && !filtered.length ? (
        <p style={{ color: "var(--mid)", margin: 0 }}>{t("tripsNoMatch")}</p>
      ) : null}

      {!filtered.length && trips.length === 0 ? (
        <AdminEmptyState variant="trips" onAction={openCreate} />
      ) : (
      <>
      <div className="animate-in trips-table-desktop" style={{ background: "color-mix(in srgb, var(--surface) 30%, transparent)", border: "1px solid color-mix(in srgb, var(--line) 30%, transparent)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid color-mix(in srgb, var(--line) 30%, transparent)" }}>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colDeparture")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colRoute")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colBusDriver")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colCapacity")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colStatus")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em", textAlign: "right" }}>{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((trip) => {
              const rowStatus = getRowStatus(trip);
              const cap = capacityForTrip(trip);
              const left = Number(trip.seats_left ?? 0);
              const used = cap > 0 ? Math.max(0, cap - left) : 0;
              const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
              const b = buses.find((item) => item.id === trip.bus);
              const d = drivers.find((item) => item.id === trip.driver);
              return (
                <tr key={trip.id} className="trip-row" style={{ borderTop: "1px solid color-mix(in srgb, var(--line) 20%, transparent)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="mono" style={{ color: "var(--blue)", fontSize: 14 }}>
                        {fmtTime(trip.departure_datetime)}
                      </div>
                      <div className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface2)", color: "var(--ink2)", fontWeight: 700 }}>
                        {getCountdown(trip.departure_datetime)}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", marginTop: 4 }}>
                      {fmtDate(trip.departure_datetime)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{trip.route_name || trip.route}</div>
                    <div style={{ fontSize: 11, color: "var(--mid)" }}>
                      {trip.route_stops?.length ? t("stopsCount").replace("{{n}}", trip.route_stops.length) : ""}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                    <div style={{ display: "grid", gap: 4, maxWidth: 220 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                        {b?.name || trip.bus_name || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.35 }}>
                        <span style={{ opacity: 0.75 }}>{t("roleDriver")}</span>{" "}
                        <span style={{ fontWeight: 600, color: "var(--ink2)" }}>{d?.name || trip.driver_name || "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", width: 180, verticalAlign: "top" }}>
                    <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--mid)", marginBottom: 6 }}>
                      <span>
                        {cap > 0 ? `${used} / ${cap}` : "—"}
                      </span>
                      <span>{cap > 0 ? `${pct}%` : ""}</span>
                    </div>
                    <div style={{ height: 5, width: "100%", background: "var(--surface2)", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: cap > 0 ? `${pct}%` : "0%",
                          background:
                            rowStatus === "full" || rowStatus === "near_full"
                              ? "var(--red)"
                              : "var(--blue)",
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      className="mono"
                      style={{
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        border:
                          rowStatus === "full" || rowStatus === "near_full"
                            ? "1px solid color-mix(in srgb, var(--red) 40%, transparent)"
                            : "1px solid color-mix(in srgb, var(--blue) 40%, transparent)",
                        background:
                          rowStatus === "full" || rowStatus === "near_full"
                            ? "var(--red-bg)"
                            : "color-mix(in srgb, var(--blue) 10%, transparent)",
                        color:
                          rowStatus === "full" || rowStatus === "near_full"
                            ? "var(--red)"
                            : "var(--blue)",
                      }}
                    >
                      {t(STATUS_KEYS[rowStatus])}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div className="row-actions" style={{ display: "inline-flex", gap: 6 }}>
                      <button type="button" aria-label={t("tripsEditAria")} title={t("edit")} onClick={() => openEdit(trip)} style={{ border: "none", background: "transparent", color: "var(--mid)", cursor: "pointer" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                      </button>
                      {!trip.archived_at && new Date(trip.departure_datetime) < new Date() ? (
                        <button type="button" aria-label={t("tripsArchiveAria")} title={t("archive")} onClick={() => setConfirmArchive(trip)} style={{ border: "none", background: "transparent", color: "var(--mid)", cursor: "pointer" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>package_2</span>
                        </button>
                      ) : null}
                      <button type="button" aria-label={t("tripsDeleteAria")} title={t("delete")} onClick={() => setConfirmDelete(trip)} style={{ border: "none", background: "transparent", color: "var(--red)", cursor: "pointer" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="animate-in trips-cards-mobile">
        {filtered.map((trip) => {
          const rowStatus = getRowStatus(trip);
          const cap = capacityForTrip(trip);
          const left = Number(trip.seats_left ?? 0);
          const used = cap > 0 ? Math.max(0, cap - left) : 0;
          const b = buses.find((item) => item.id === trip.bus);
          const d = drivers.find((item) => item.id === trip.driver);
          return (
            <div key={trip.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{trip.route_name || trip.route}</div>
                  <div className="mono" style={{ color: "var(--blue)", fontSize: 13, marginTop: 4 }}>
                    {fmtTime(trip.departure_datetime)}
                  </div>
                </div>
                <span
                  className="mono"
                  style={{ borderRadius: 4, padding: "2px 6px", fontSize: 9, textTransform: "uppercase", fontWeight: 700, 
                  border: rowStatus === "full" || rowStatus === "near_full" ? "1px solid color-mix(in srgb, var(--red) 40%, transparent)" : "1px solid color-mix(in srgb, var(--blue) 40%, transparent)",
                  background: rowStatus === "full" || rowStatus === "near_full" ? "var(--red-bg)" : "var(--blue-light)",
                  color: rowStatus === "full" || rowStatus === "near_full" ? "var(--red)" : "var(--blue)" }}
                >
                  {t(STATUS_KEYS[rowStatus])}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, background: "var(--surface2)", padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ color: "var(--mid)", display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>{t("bus")}</span>
                  {b?.name || trip.bus_name || "—"}
                </div>
                <div>
                  <span style={{ color: "var(--mid)", display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>{t("colCapacity")}</span>
                  {cap > 0 ? `${used} / ${cap}` : "—"}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: "var(--mid)" }}>{d?.name || trip.driver_name || t("tripsNoDriver")}</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button type="button" aria-label={t("tripsEditAria")} onClick={() => openEdit(trip)} className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--mid)", cursor: "pointer", border: "none", background: "transparent", padding: 4 }}>edit</button>
                  {!trip.archived_at && new Date(trip.departure_datetime) < new Date() && <button type="button" aria-label={t("tripsArchiveAria")} onClick={() => setConfirmArchive(trip)} className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--mid)", cursor: "pointer", border: "none", background: "transparent", padding: 4 }}>package_2</button>}
                  <button type="button" aria-label={t("tripsDeleteAria")} onClick={() => setConfirmDelete(trip)} className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--red)", cursor: "pointer", border: "none", background: "transparent", padding: 4 }}>delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      <section className="animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 16 }}>
        {(() => {
          const activeTrips = trips.filter((t) => !t.archived_at && new Date(t.departure_datetime) >= new Date());
          const totalCap = activeTrips.reduce((sum, t) => sum + capacityForTrip(t), 0);
          const totalUsed = activeTrips.reduce((sum, t) => {
            const cap = capacityForTrip(t);
            const left = Number(t.seats_left ?? 0);
            return sum + (cap > 0 ? Math.max(0, cap - left) : 0);
          }, 0);
          const utilNum = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : null;
          const totalReserved = totalUsed;
          return [
            { label: t("tripsStatUtil"), numericTarget: utilNum, suffix: totalCap > 0 ? "%" : "", decimals: 0 },
            { label: t("tripsStatBooked"), numericTarget: totalReserved, suffix: t("tripsSufUpcoming"), decimals: 0 },
            { label: t("navDrivers"), numericTarget: drivers.length, suffix: t("tripsSufRegistered"), decimals: 0 },
            { label: t("tripsStatUpcoming"), numericTarget: activeTrips.length, suffix: t("tripsSufScheduled"), decimals: 0 },
          ];
        })().map((item) => (
          <TripStatCard key={item.label} label={item.label} numericTarget={item.numericTarget} suffix={item.suffix} decimals={item.decimals} />
        ))}
      </section>

      {bulkOpen ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(520px,92vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
            <h3 style={{ margin: 0 }}>{bulkType === "regular" ? t("tripsGenSchedule") : t("tripsGenSpecific")}</h3>
            <p style={{ margin: 0, color: "var(--mid)", fontSize: 13, lineHeight: 1.4 }}>
              {bulkType === "regular" 
                ? t("tripsGenRangeDesc")
                : t("tripsGenDatesDesc")}
            </p>

            <div style={{ background: "color-mix(in srgb, var(--blue) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--blue) 30%, transparent)", borderRadius: 8, padding: 12, display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 12, color: "var(--blue)", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                {t("tripsAutoRouting")}
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "var(--mid)" }}>
                <strong>{t("tripsPeakLabel")}</strong> {t("tripsPeakDesc")}<br/>
                <strong>{t("tripsNormalLabel")}</strong> {t("tripsNormalDesc")}
              </p>
            </div>

            {bulkType === "regular" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>{t("tripsStartDate")}</label>
                    <input type="date" value={bulkForm.start_date} onChange={(e) => setBulkForm((p) => ({ ...p, start_date: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>{t("tripsEndDate")}</label>
                    <input type="date" value={bulkForm.end_date} onChange={(e) => setBulkForm((p) => ({ ...p, end_date: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }} />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                  <input type="checkbox" checked={bulkForm.skip_weekends} onChange={(e) => setBulkForm((p) => ({ ...p, skip_weekends: e.target.checked }))} />
                  <span>{t("tripsSkipWeekends")}</span>
                </label>
              </>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>{t("tripsSpecificDates")}</label>
                <input type="text" placeholder={t("tripsDatesPlaceholder")} value={bulkForm.dates} onChange={(e) => setBulkForm((p) => ({ ...p, dates: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }} />
              </div>
            )}

            {error && <p style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setBulkOpen(false)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={saveBulk} disabled={loading} style={{ border: "1px solid var(--blue-bdr)", background: "var(--blue-bg)", color: "var(--blue)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? t("tripsGenerating") : t("tripsGenSchedule")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(520px,92vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
            <h3 style={{ margin: 0 }}>{editing ? t("tripsEditAria") : t("tripsCreate")}</h3>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--mid)", fontWeight: 600 }}>
            {t("colRoute")}
            <select value={form.route} onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))} style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
              <option value="">{t("tripsSelectRoute")}</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--mid)", fontWeight: 600 }}>
            {t("bus")}
            <select value={form.bus} onChange={(e) => setForm((p) => ({ ...p, bus: e.target.value }))} style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
              <option value="">{t("tripsSelectBus")}</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.name} ({bus.plate})
                </option>
              ))}
            </select>
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--mid)", fontWeight: 600 }}>
            {t("roleDriver")}
            <select value={form.driver} onChange={(e) => setForm((p) => ({ ...p, driver: e.target.value }))} style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
              <option value="">{t("tripsSelectDriver")}</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id} disabled={driver.status !== "active"}>
                  {driver.name}{driver.status !== "active" ? ` ${t("tripsDriverInactive")}` : ""}
                </option>
              ))}
            </select>
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--mid)", fontWeight: 600 }}>
            {t("tripsDepartureLabel")}
            <input type="datetime-local" value={form.departure_datetime} onChange={(e) => setForm((p) => ({ ...p, departure_datetime: e.target.value }))} style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }} />
            </label>
            {error ? <p role="alert" style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>{error}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => { setOpen(false); setError(""); }} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={save} style={{ border: "1px solid var(--blue-bdr)", background: "var(--blue-bg)", color: "var(--blue)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {confirmDelete ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(420px,90vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <h3 style={{ margin: 0 }}>{t("tripsDeleteTitle")}</h3>
            <p style={{ margin: 0, color: "var(--mid)" }}>
              {t("tripsDeleteBody")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={() => { remove(confirmDelete.id); setConfirmDelete(null); }} style={{ border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", background: "var(--red-bg)", color: "var(--red)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteListed ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="del-listed-title" style={{ width: "min(420px,90vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <h3 id="del-listed-title" style={{ margin: 0 }}>{filtered.length === 1 ? t("tripsDeleteListedOne") : t("tripsDeleteListedMany").replace("{{n}}", filtered.length)}</h3>
            <p style={{ margin: 0, color: "var(--mid)" }}>
              {t("tripsDeleteListedBody")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setConfirmDeleteListed(false)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={deleteListed} style={{ border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", background: "var(--red-bg)", color: "var(--red)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {t("deleteN").replace("{{n}}", filtered.length)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Archive Confirmation Modal */}
      {confirmArchive ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(420px,90vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <h3 style={{ margin: 0 }}>{t("tripsArchiveTitle")}</h3>
            <p style={{ margin: 0, color: "var(--mid)" }}>
              {t("tripsArchiveBody")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setConfirmArchive(null)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={() => { archive(confirmArchive); setConfirmArchive(null); }} style={{ border: "1px solid var(--blue-bdr)", background: "var(--blue-bg)", color: "var(--blue)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {t("archive")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
