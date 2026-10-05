import React, { useState, useEffect } from 'react';
import { reports } from '../services/api';
import { useTranslation } from '../context/TranslationContext';

const ReportManager = () => {
  const { t } = useTranslation();
  const [reportList, setReportList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resolveError, setResolveError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reports.list();
      setReportList(data || []);
    } catch (err) {
      setError(err.message || t("reportsLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    setResolveError(null);
    try {
      await reports.update(id, { status: 'resolved' });
      loadReports();
    } catch (err) {
      setResolveError(t("reportsResolveFailed").replace("{{error}}", err.message || t("unknownError")));
    }
  };

  const filteredReports = reportList.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getCategoryLabel = (cat) => {
    const icons = {
      'late':     '🕒',
      'no_show':  '🚫',
      'full':     '👥',
      'accident': '⚠️',
      'other':    '📝',
    };
    return icons[cat] ? `${icons[cat]} ${t(`reportCat_${cat}`)}` : cat;
  };

  return (
    <div style={{
      border: "1px solid var(--line2)",
      borderRadius: "var(--radius-md)",
      background: "var(--surface)",
      padding: "var(--space-5)",
      display: "grid",
      gap: "var(--space-4)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          <span style={{ marginRight: 8 }}>📋</span>{t("reportsIncidentReports")}
        </h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface2)",
              color: "var(--ink)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="all">{t("reportsAll")}</option>
            <option value="pending">{t("reportsPendingReview")}</option>
            <option value="resolved">{t("reportsResolved")}</option>
          </select>
          <button
            onClick={loadReports}
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: "var(--surface2)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            {loading ? t("loading") : t("refresh")}
          </button>
        </div>
      </div>

      {/* Error banners */}
      {error && (
        <div style={{
          padding: 12,
          background: "var(--red-bg, color-mix(in srgb, var(--red) 10%, transparent))",
          color: "var(--red)",
          borderRadius: 8,
          border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
          fontSize: 13,
        }}>
          {error}
        </div>
      )}
      {resolveError && (
        <div style={{
          padding: 12,
          background: "color-mix(in srgb, var(--amber, orange) 10%, transparent)",
          color: "var(--amber, orange)",
          borderRadius: 8,
          border: "1px solid color-mix(in srgb, var(--amber, orange) 30%, transparent)",
          fontSize: 13,
        }}>
          {resolveError}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: "color-mix(in srgb, var(--surface) 30%, transparent)",
        border: "1px solid color-mix(in srgb, var(--line) 30%, transparent)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{
              textAlign: "left",
              borderBottom: "1px solid color-mix(in srgb, var(--line) 30%, transparent)",
            }}>
              {["colDate", "colReporter", "colTripInfo", "colCategory", "colStatus", "colActions"].map((col, i) => (
                <th
                  key={col}
                  scope="col"
                  style={{
                    padding: "14px 16px",
                    fontSize: 10,
                    color: "var(--mid)",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontWeight: 700,
                    textAlign: i === 5 ? "right" : "left",
                  }}
                >
                  {t(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    padding: "48px 16px",
                    textAlign: "center",
                    color: "var(--mid)",
                    fontSize: 14,
                  }}
                >
                  <div style={{ display: "grid", placeItems: "center", gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--dim)", opacity: 0.6 }}>
                      search_off
                    </span>
                    <span>{t("reportsNoneFilter")}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr
                  key={report.id}
                  style={{
                    borderTop: "1px solid color-mix(in srgb, var(--line) 20%, transparent)",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Date */}
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div className="mono" style={{ fontSize: 13 }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                      {new Date(report.created_at).toLocaleTimeString()}
                    </div>
                  </td>

                  {/* Reporter */}
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{report.reporter_name || "—"}</div>
                  </td>

                  {/* Trip Info */}
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    {report.trip_details ? (
                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{report.trip_details.route}</div>
                        <div style={{ fontSize: 12, color: "var(--mid)" }}>
                          {t("reportsDepartureAt").replace("{{time}}", new Date(report.trip_details.departure).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--mid)" }}>{t("reportsBusLine").replace("{{bus}}", report.trip_details.bus)}</div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--dim)", fontSize: 13 }}>{t("notAvailable")}</span>
                    )}
                  </td>

                  {/* Category */}
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      {getCategoryLabel(report.category)}
                    </div>
                    {report.description && (
                      <div style={{ fontSize: 12, color: "var(--mid)", maxWidth: 280, lineHeight: 1.45 }}>
                        {report.description}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                    <span
                      className="mono"
                      style={{
                        padding: "3px 10px",
                        borderRadius: 4,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        background: report.status === "resolved"
                          ? "color-mix(in srgb, var(--green) 12%, transparent)"
                          : "color-mix(in srgb, var(--amber, orange) 12%, transparent)",
                        color: report.status === "resolved" ? "var(--green)" : "var(--amber, orange)",
                        border: `1px solid ${
                          report.status === "resolved"
                            ? "color-mix(in srgb, var(--green) 30%, transparent)"
                            : "color-mix(in srgb, var(--amber, orange) 30%, transparent)"
                        }`,
                      }}
                    >
                      {t(`reportStatus_${report.status}`)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 16px", textAlign: "right", verticalAlign: "top" }}>
                    {report.status === "pending" && (
                      <button
                        onClick={() => handleResolve(report.id)}
                        style={{
                          padding: "7px 14px",
                          background: "color-mix(in srgb, var(--green) 12%, transparent)",
                          color: "var(--green)",
                          border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                        {t("reportsResolve")}
                      </button>
                    )}
                    {report.status === "resolved" && (
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--green)", fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportManager;
