import React, { useEffect, useState } from "react";
import SkeletonTable from "../../components/ui/SkeletonTable";
import SetupProgress from "../../components/ui/SetupProgress";
import AdminEmptyState from "../../components/ui/AdminEmptyState";
import { API_BASE, getAccessToken, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";


const emptyForm = { name: "", window: "peak", station_ids: [] };

export default function Routes() {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState([]);
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const token = getAccessToken();
  const headers = { 
    Authorization: `Bearer ${token}`, 
    "Content-Type": "application/json",
  };

  async function load(preserveSelectionId = null) {
    setLoading(true);
    setError("");
    try {
      const [rRes, sRes] = await Promise.all([
        authFetch(`${API_BASE}/routes/`, { 
          headers: { 
            Authorization: `Bearer ${token}`,
          } 
        }),
        authFetch(`${API_BASE}/stations/`, { 
          headers: { 
            Authorization: `Bearer ${token}`,
          } 
        }),
      ]);
      if (!rRes.ok) throw new Error(t("routesLoadFailed"));
      const [rData, sData] = await Promise.all([rRes.json(), sRes.json()]);
      const list = Array.isArray(rData) ? rData : [];
      setRoutes(list);
      setStations(Array.isArray(sData) ? sData : []);
      if (preserveSelectionId) {
        setSelected(list.find((r) => r.id === preserveSelectionId) || list[0] || null);
      } else {
        setSelected(list[0] || null);
      }
    } catch (err) {
      setError(err.message || t("routesLoadUnable"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener("fleetmark:refresh", onRefresh);
    return () => window.removeEventListener("fleetmark:refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(route) {
    setEditing(route);
    setForm({
      name: route.name || "",
      window: route.window || "peak",
      station_ids: (route.stations || []).map((s) => s.station.id),
    });
    setError("");
    setOpen(true);
  }

  function toggleStation(stationId) {
    setForm((prev) => {
      const ids = prev.station_ids.includes(stationId)
        ? prev.station_ids.filter((id) => id !== stationId)
        : [...prev.station_ids, stationId];
      return { ...prev, station_ids: ids };
    });
  }

  async function save() {
    if (!form.name || !form.window || !form.station_ids.length) {
      setError(t("routesValidation"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name, window: form.window, station_ids: form.station_ids };
      const endpoint = editing ? `${API_BASE}/routes/${editing.id}/` : `${API_BASE}/routes/`;
      const method = editing ? "PUT" : "POST";
      const res = await authFetch(endpoint, { method, headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await errorMessage(res, t("saveFailed")));
      const savedRoute = await res.json();
      setOpen(false);
      await load(savedRoute.id);
    } catch (err) {
      setError(err.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      const res = await authFetch(`${API_BASE}/routes/${id}/`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(await errorMessage(res, t("itemDeleteFailed")));
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setConfirmDelete(null);
      setError(err.message || t("itemDeleteFailed"));
    }
  }

  if (loading) return (
    <div style={{ display: "grid", gap: "var(--section-gap)" }}>
      <SkeletonTable cols={3} rows={6} />
    </div>
  );

  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      <SetupProgress currentStep="routes" done={routes.length > 0} />
      
      {!routes.length && !error ? (
        <AdminEmptyState variant="routes" onAction={openCreate} />
      ) : (
      <div className="animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--space-5)" }}>
      {/* Sidebar with Route List */}
      <aside style={{ border: "1px solid var(--line2)", borderRadius: "var(--radius-md)", background: "var(--surface)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{t("navRoutes")}</h2>
          <button
            type="button"
            onClick={openCreate}
            style={{
              border: "1px solid var(--blue-bdr)",
              background: "var(--blue-bg)",
              color: "var(--blue)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            {t("newShort")}
          </button>
        </div>
        
        {error ? <p style={{ color: "var(--red)", margin: 0, fontSize: 14 }}>{error}</p> : null}
        
        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          {routes.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => setSelected(route)}
              style={{
                textAlign: "left",
                border: "1px solid var(--line2)",
                borderRadius: "var(--radius-sm)",
                background: selected?.id === route.id ? "var(--blue-bg)" : "var(--surface2)",
                color: selected?.id === route.id ? "var(--blue)" : "var(--ink)",
                padding: "10px 12px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span>{route.name}</span>
                <span className="mono" style={{ display: "block", fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
                  {t("stopsCount").replace("{{n}}", route.stations?.length || 0)}
                </span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: selected?.id === route.id ? "var(--blue)" : "var(--dim)" }}>chevron_right</span>
            </button>
          ))}
          {!routes.length ? <p style={{ color: "var(--mid)", margin: 0, fontSize: 14 }}>{t("routesNone")}</p> : null}
        </div>
      </aside>

      {/* Main Content Area */}
      <section style={{ border: "1px solid var(--line2)", borderRadius: "var(--radius-md)", background: "var(--surface)", padding: "var(--space-5)" }}>
        {selected ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
              <div>
                <h2 style={{ margin: "0 0 var(--space-2) 0" }}>{selected.name}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("routesWindowLabel")}</span>
                  <span style={{ 
                    background: "var(--surface2)", 
                    padding: "2px 8px", 
                    borderRadius: 4, 
                    fontSize: 12, 
                    textTransform: "capitalize",
                    color: "var(--ink)"
                  }}>
                    {selected.window ? t(`window_${selected.window}`) : "-"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => openEdit(selected)} style={{ border: "1px solid var(--line2)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  {t("edit")}
                </button>
                <button type="button" onClick={() => setConfirmDelete(selected)} style={{ border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", background: "var(--red-bg)", color: "var(--red)", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  {t("delete")}
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: 14, color: "var(--mid)", marginTop: "var(--space-6)", marginBottom: "var(--space-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("routesStations")}</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {(selected.stations || []).map((stop) => (
                <span key={`${stop.order}-${stop.station.id}`} className="mono" style={{ border: "1px solid var(--line2)", borderRadius: "999px", padding: "6px 10px", background: "var(--surface2)", color: "var(--ink)", fontSize: 13 }}>
                  {stop.order}. {stop.station.name}
                </span>
              ))}
              {!selected.stations?.length ? <p style={{ color: "var(--mid)", margin: 0, fontSize: 14 }}>{t("routesNoStops")}</p> : null}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--mid)", textAlign: "center" }}>
            <div>
              <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }}>map</span>
              <p style={{ margin: 0 }}>{t("routesSelectHint")}</p>
            </div>
          </div>
        )}
      </section>
      </div>
      )}

      {/* Create / Edit Modal */}
      {open ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(560px,92vw)", maxHeight: "85vh", overflowY: "auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
            <h3 style={{ margin: 0 }}>{editing ? t("routesEdit") : t("routesAdd")}</h3>
            {error ? <p role="alert" style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>{error}</p> : null}
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mid)", fontWeight: 700 }}>{t("routesName")}</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("routesNamePh")}
                style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
              />
            </div>
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mid)", fontWeight: 700 }}>{t("routesServiceWindow")}</label>
              <select
                value={form.window}
                onChange={(e) => setForm((p) => ({ ...p, window: e.target.value }))}
                style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
              >
                <option value="peak">{t("window_peak")}</option>
                <option value="consolidated">{t("window_consolidated")}</option>
              </select>
            </div>

            {/* Station Picker */}
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mid)", fontWeight: 700 }}>
                {t("routesStationsPicker").replace("{{n}}", form.station_ids.length)}
              </label>
              <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 8, maxHeight: 220, overflowY: "auto", display: "grid", gap: 4 }}>
                {stations.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--dim)", fontSize: 13, padding: 8, textAlign: "center" }}>{t("routesNoStations")}</p>
                ) : (
                  stations.map((station) => {
                    const checked = form.station_ids.includes(station.id);
                    return (
                      <label
                        key={station.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: checked ? "var(--blue-bg)" : "var(--surface2)",
                          border: `1px solid ${checked ? "var(--blue-bdr)" : "transparent"}`,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStation(station.id)}
                          style={{ accentColor: "var(--blue)", width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? "var(--blue)" : "var(--ink)", flex: 1 }}>
                          {station.name}
                        </span>
                        {checked ? (
                          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)" }}>
                            #{form.station_ids.indexOf(station.id) + 1}
                          </span>
                        ) : null}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: "var(--space-2)" }}>
              <button type="button" onClick={() => setOpen(false)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={save} disabled={saving} style={{ border: "1px solid var(--blue-bdr)", background: "var(--blue-bg)", color: "var(--blue)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {saving ? t("savingDots") : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {confirmDelete ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(420px,90vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <h3 style={{ margin: 0 }}>{t("routesDeleteTitle")}</h3>
            <p style={{ margin: 0, color: "var(--mid)" }}>
              {t("routesDeleteLead")} <strong>{confirmDelete.name}</strong>{t("qMark")} {t("cannotUndo")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} style={{ border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={() => remove(confirmDelete.id)} style={{ border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", background: "var(--red-bg)", color: "var(--red)", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
