import { useEffect, useMemo, useState } from "react";
import Transparencymap from "../Transparencymap";
import {
  WORKFLOW_OPTIONS,
  getAdminReports,
  getZoneMaintenance,
  toggleZoneMaintenance,
  updateReportStatus,
} from "./adminUtils";
import { getCampusPoint } from "../../utils/campusMap";

const AdminTransparencyMapPage = () => {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [maintenance, setMaintenance] = useState(() => getZoneMaintenance());
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = async () => {
      try {
        setReports(await getAdminReports());
        setMaintenance(getZoneMaintenance());
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load map data.");
      }
    };
    sync();
    window.addEventListener("eco-reports-changed", sync);
    return () => window.removeEventListener("eco-reports-changed", sync);
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(reports.map((item) => item.category || item.type || "General"))],
    [reports]
  );

  const filteredReports = reports.filter((item) => {
    if (categoryFilter === "All") return true;
    return (item.category || item.type || "General") === categoryFilter;
  });

  const points = useMemo(
    () =>
      filteredReports.map((report, index) => {
        const block = report.block || report.location?.split("-")[0]?.trim() || "Block B";
        return { ...report, block, zone: getCampusPoint(block, index).zone };
      }),
    [filteredReports]
  );

  const zoneCounts = useMemo(() => {
    const grouped = points.reduce((acc, item) => {
      acc[item.zone] = (acc[item.zone] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([zone, count]) => ({ zone, count })).sort((a, b) => b.count - a.count);
  }, [points]);

  return (
    <section className="admin-content-v2">
      <div className="admin-title-v2">
        <h1>Transparency Map Control</h1>
        <p>Heatmap-style zone load, category filters, and maintenance control.</p>
      </div>
      {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

      <div className="admin-card-v2">
        <div className="table-top-v2">
          <h2>Map Controls</h2>
          <div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="admin-transparency-map-shell">
        <Transparencymap embedded categoryFilter={categoryFilter} onIssueSelect={setSelected} />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card-v2">
          <h2>Issue Detail / Status</h2>
          {selected ? (
            <div className="map-detail-v2">
              <p><strong>Report:</strong> {selected.reportNumber}</p>
              <p><strong>Issue:</strong> {selected.type || selected.issue}</p>
              <p><strong>Zone:</strong> {selected.zone}</p>
              <select
                value={selected.status}
                onChange={async (e) => {
                  try {
                    setReports(await updateReportStatus(selected.reportNumber, e.target.value));
                    setSelected((prev) => (prev ? { ...prev, status: e.target.value } : prev));
                    window.dispatchEvent(new Event("eco-reports-changed"));
                    setError("");
                  } catch (err) {
                    setError(err.message || "Unable to update status.");
                  }
                }}
              >
                {WORKFLOW_OPTIONS.map((status) => (
                  <option key={`selected-${status}`} value={status}>{status}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="empty-line-v2">Click marker to update status.</p>
          )}

          <h3 className="section-subtitle-v2">Zone-wise Issue Count (Heatmap Data)</h3>
          <div className="zone-grid-v2">
            {zoneCounts.map((zone) => (
              <div key={zone.zone} className="zone-card-v2">
                <strong>{zone.zone}</strong>
                <p>{zone.count} issues</p>
                <button
                  type="button"
                  className={maintenance[zone.zone] ? "active" : ""}
                  onClick={() => setMaintenance(toggleZoneMaintenance(zone.zone))}
                >
                  {maintenance[zone.zone] ? "Under Maintenance" : "Mark Under Maintenance"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminTransparencyMapPage;
