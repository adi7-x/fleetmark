import React, { useEffect, useState } from "react";
import SkeletonTable from "../../components/ui/SkeletonTable";
import SetupProgress from "../../components/ui/SetupProgress";
import AdminEmptyState from "../../components/ui/AdminEmptyState";
import { API_BASE, getAccessToken, authFetch, errorMessage } from "../../services/api";
import { useTranslation } from "../../context/TranslationContext";


const emptyForm = { name: "", plate: "", seat_capacity: "" };

export default function BusManagement() {
  const { t } = useTranslation();
  const [buses, setBuses] = useState([]);
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const bRes = await authFetch(`${API_BASE}/buses/`, { headers });
      if (!bRes.ok) throw new Error(t("busesLoadFailed"));
      const bData = await bRes.json();
      setBuses(Array.isArray(bData) ? bData : []);
    } catch (err) {
      setError(err.message || t("busesLoadUnable"));
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

  function openEdit(bus) {
    setEditing(bus);
    setForm({
      name: bus.name || "",
      plate: bus.plate || "",
      seat_capacity: String(bus.seat_capacity ?? ""),
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.plate || !form.seat_capacity) {
      setError(t("allFieldsRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        plate: form.plate,
        seat_capacity: Number(form.seat_capacity),
      };
      const endpoint = editing ? `${API_BASE}/buses/${editing.id}/` : `${API_BASE}/buses/`;
      const method = editing ? "PUT" : "POST";
      const res = await authFetch(endpoint, { method, headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await errorMessage(res, t("saveFailed")));
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      const res = await authFetch(`${API_BASE}/buses/${id}/`, { method: "DELETE", headers });
      setConfirmDelete(null);
      if (!res.ok) throw new Error(await errorMessage(res, t("itemDeleteFailed")));
      await load();
    } catch (err) {
      setError(err.message || t("itemDeleteFailed"));
    }
  }

  if (loading) return (
    <div style={{ display: "grid", gap: "var(--section-gap)" }}>
      <SkeletonTable cols={5} rows={5} />
    </div>
  );

  return (
    <div className="animate-in" style={{ display: "grid", gap: "var(--space-4)" }}>
      <SetupProgress currentStep="buses" done={buses.length > 0} />
      <div className="animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, color: "var(--mid)", fontSize: 14 }}>{t("busesHint")}</p>
        <button
          type="button"
          onClick={openCreate}
          style={{
            border: "1px solid var(--blue-bdr)",
            background: "var(--blue-bg)",
            color: "var(--blue)",
            borderRadius: 7,
            padding: "8px 14px",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          {t("busesNew")}
        </button>
      </div>

      {error ? <p style={{ color: "var(--red)", margin: 0 }}>{error}</p> : null}

      {!buses.length ? (
        <AdminEmptyState variant="buses" onAction={openCreate} />
      ) : (
      <div className="animate-in" style={{ background: "color-mix(in srgb, var(--surface) 30%, transparent)", border: "1px solid color-mix(in srgb, var(--line) 30%, transparent)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid color-mix(in srgb, var(--line) 30%, transparent)" }}>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colName")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("colPlate")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{t("busesSeatCapacity")}</th>
              <th scope="col" style={{ padding: "14px 16px", fontSize: 10, color: "var(--mid)", textTransform: "uppercase", letterSpacing: "0.14em", textAlign: "right" }}>{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => {
              return (
              <tr key={bus.id} className="animate-in" style={{ borderTop: "1px solid color-mix(in srgb, var(--line) 20%, transparent)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700 }}>{bus.name}</td>
                <td className="mono" style={{ padding: "12px 16px" }}>{bus.plate}</td>
                <td className="mono" style={{ padding: "12px 16px" }}>{bus.seat_capacity}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button type="button" aria-label={t("editNamed").replace("{{name}}", bus.name)} title={t("edit")} onClick={() => openEdit(bus)} style={{ border: "none", background: "transparent", color: "var(--mid)", cursor: "pointer" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    <button type="button" aria-label={t("deleteNamed").replace("{{name}}", bus.name)} title={t("delete")} onClick={() => setConfirmDelete(bus)} style={{ border: "none", background: "transparent", color: "var(--red)", cursor: "pointer" }}>
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
      )}

      {open ? (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" style={{ width: "min(520px,92vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
            <h3 style={{ margin: 0 }}>{editing ? t("busesEdit") : t("busesAdd")}</h3>
            {error ? <p role="alert" style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>{error}</p> : null}
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mid)", fontWeight: 700 }}>{t("busesName")}</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("busesNamePh")}
                style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
              />
            </div>
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mid)", fontWeight: 700 }}>{t("busesPlate")}</label>
              <input
                value={form.plate}
                onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))}
                placeholder={t("busesPlatePh")}
                style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
              />
            </div>
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mid)", fontWeight: 700 }}>{t("busesSeatCapacity")}</label>
              <input
                type="number"
                min="1"
                value={form.seat_capacity}
                onChange={(e) => setForm((p) => ({ ...p, seat_capacity: e.target.value }))}
                placeholder={t("busesCapacityPh")}
                style={{ background: "var(--surface2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
              />
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
            <h3 style={{ margin: 0 }}>{t("busesDeleteTitle")}</h3>
            <p style={{ margin: 0, color: "var(--mid)" }}>
              {t("confirmDeleteLead")} <strong>{confirmDelete.name}</strong> ({confirmDelete.plate}){t("qMark")} {t("cannotUndo")}
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
