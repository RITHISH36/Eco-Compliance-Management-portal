import {
  FaCheckCircle,
  FaClipboardCheck,
  FaLightbulb,
  FaTrashAlt,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router";
import Header from "./Header";
import { getReports, getReportStats } from "../utils/reportStore";
import { fetchAwareness } from "../utils/api";

const DEFAULT_AWARENESS = {
  tips: "Switch off lights, fans, and projectors after class.\nPrefer natural daylight where possible.\nSet AC temperature to efficient levels (24-26 C).\nUnplug chargers and devices when not in use.",
  policies: "Single-use plastics are discouraged across campus zones.\nMonthly eco-audits are conducted block-wise.\nEvery department must report waste reduction actions.\nGreen volunteers support awareness drives each semester.",
  announcement: "Green Campus Drive starts this Friday.",
  complianceFormula: "(Resolved Issues / Total Issues) x 100",
};

const toListItems = (value, fallback) =>
  (value || fallback)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const EcoAwareness = () => {
  const [reports, setReports] = useState([]);
  const [awareness, setAwareness] = useState(DEFAULT_AWARENESS);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncReports = async () => {
      try {
        setReports(await getReports());
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load awareness metrics.");
      }
    };

    syncReports();
    window.addEventListener("eco-reports-changed", syncReports);
    return () => {
      window.removeEventListener("eco-reports-changed", syncReports);
    };
  }, []);

  useEffect(() => {
    const loadAwareness = async () => {
      try {
        const nextAwareness = await fetchAwareness();
        setAwareness({ ...DEFAULT_AWARENESS, ...nextAwareness });
      } catch (err) {
        setError(err.message || "Unable to load awareness content.");
      }
    };

    loadAwareness();
    window.addEventListener("eco-awareness-changed", loadAwareness);
    return () => window.removeEventListener("eco-awareness-changed", loadAwareness);
  }, []);

  const { total: totalIssues, resolved: resolvedIssues, complianceRate } =
    useMemo(() => getReportStats(reports), [reports]);

  return (
    <>
      <Header />
      <section className="eco-awareness-page">
        <div className="eco-awareness-shell">
          <h1>Eco Awareness</h1>
          <p>
            Learn practical sustainability actions for campus life beyond
            complaint reporting.
          </p>
          <div className="eco-announcement">
            <strong>Campus update</strong>
            <span>{awareness.announcement}</span>
          </div>
          {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

          <div className="eco-score-card">
            <h2>Campus Eco Compliance Rate: {complianceRate}%</h2>
            <p>
              Sustainability Score = {awareness.complianceFormula}
            </p>

            <div className="eco-score-progress">
              <span style={{ width: `${complianceRate}%` }} />
            </div>

            <div className="eco-score-stats">
              <div className="eco-stat-item">
                <FaCheckCircle />
                <strong>{complianceRate}%</strong>
                <span>Eco Compliance</span>
              </div>
              <div className="eco-stat-item">
                <FaCheckCircle />
                <strong>{resolvedIssues}</strong>
                <span>Resolved Issues</span>
              </div>
              <div className="eco-stat-item">
                <FaCheckCircle />
                <strong>{totalIssues}</strong>
                <span>Total Issues</span>
              </div>
            </div>
          </div>

          <div className="eco-awareness-grid">
            <article className="eco-awareness-card">
              <h3>
                <FaTrashAlt />
                Waste Segregation Guidelines
              </h3>
              <ul>
                <li>Use green bins for biodegradable waste.</li>
                <li>Use blue bins for paper, plastic, and dry recyclables.</li>
                <li>Do not mix food waste with recyclables.</li>
                <li>Dispose of e-waste only at designated e-waste points.</li>
              </ul>
              <NavLink to="/reportissue" className="eco-cta-btn">
                Submit Eco Issue
              </NavLink>
            </article>

            <article className="eco-awareness-card">
              <h3>
                <FaLightbulb />
                Energy Saving Tips
              </h3>
              <ul>
                {toListItems(awareness.tips, DEFAULT_AWARENESS.tips).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </article>

            <article className="eco-awareness-card">
              <h3>
                <FaClipboardCheck />
                Campus Sustainability Policies
              </h3>
              <ul>
                {toListItems(awareness.policies, DEFAULT_AWARENESS.policies).map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </>
  );
};

export default EcoAwareness;
