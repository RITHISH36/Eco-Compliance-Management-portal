import { useEffect, useState } from "react";
import { getSpamReports } from "./adminUtils";

const demoDuplicateReport = {
  reportNumber: "RPT-DEMO-001",
  type: "Network Issue",
  category: "Network Issue",
  location: "Academic Block A - Computer Lab",
  duplicateOf: "RPT-DEMO-000",
  duplicateReason: "Same network outage reported for this location.",
  duplicateConfidence: 0.96,
};

const AdminSpamReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        const nextReports = await getSpamReports();
        setReports(nextReports.length ? nextReports : [demoDuplicateReport]);
        setError(nextReports.length ? "" : "Showing demo duplicate data because no duplicate reports are available.");
      } catch {
        setReports([demoDuplicateReport]);
        setError("Showing demo duplicate data because the server could not be reached.");
      }
    };

    loadReports();
  }, []);

  return (
    <section className="admin-content-v2">
      <div className="admin-title-v2">
        <h1>Duplicate Reports</h1>
        <p>Reports identified as likely duplicates by Gemini are held here for review.</p>
      </div>
      {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

      <div className="admin-card-v2">
        <div className="table-top-v2">
          <h2>Duplicate Review Queue</h2>
          <span>{reports.length} duplicates</span>
        </div>

        {reports.length ? (
          <table className="admin-table-v2">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Duplicate Of</th>
                <th>AI Reason</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.reportNumber}>
                  <td>{report.reportNumber}</td>
                  <td>{report.type}</td>
                  <td>{report.location}</td>
                  <td>{report.duplicateOf || "Not provided"}</td>
                  <td>{report.duplicateReason || "Likely duplicate"}</td>
                  <td>{Math.round((report.duplicateConfidence || 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-line-v2">No duplicate reports have been flagged.</p>
        )}
      </div>
    </section>
  );
};

export default AdminSpamReportsPage;
