import { useEffect, useState } from "react";
import { getAwarenessContent, saveAwarenessContent } from "./adminUtils";

const AdminEcoAwarenessPage = () => {
  const [content, setContent] = useState({
    tips: "",
    policies: "",
    announcement: "",
    complianceFormula: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setContent(await getAwarenessContent());
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load awareness content.");
      }
    };

    load();
  }, []);

  const save = async () => {
    try {
      await saveAwarenessContent(content);
      window.dispatchEvent(new Event("eco-awareness-changed"));
      setMessage("Awareness content updated.");
      setError("");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.message || "Unable to save awareness content.");
    }
  };

  return (
    <section className="admin-content-v2">
      <div className="admin-title-v2">
        <h1>Eco Awareness Content Management</h1>
        <p>Update tips, policies, announcements, and compliance formula.</p>
      </div>
      {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

      <div className="admin-grid-2">
        <div className="admin-card-v2">
          <h2>Edit Content</h2>
          <label>
            Sustainability Tips
            <textarea
              rows="4"
              value={content.tips}
              onChange={(e) => setContent((prev) => ({ ...prev, tips: e.target.value }))}
            />
          </label>
          <label>
            Campus Policies
            <textarea
              rows="4"
              value={content.policies}
              onChange={(e) => setContent((prev) => ({ ...prev, policies: e.target.value }))}
            />
          </label>
          <label>
            Eco Announcement
            <textarea
              rows="3"
              value={content.announcement}
              onChange={(e) => setContent((prev) => ({ ...prev, announcement: e.target.value }))}
            />
          </label>
          <label>
            Compliance Formula
            <input
              type="text"
              value={content.complianceFormula}
              onChange={(e) => setContent((prev) => ({ ...prev, complianceFormula: e.target.value }))}
            />
          </label>
          <button type="button" onClick={save}>Save Content</button>
          {message ? <p className="empty-line-v2">{message}</p> : null}
        </div>

        <div className="admin-card-v2">
          <h2>Preview</h2>
          <h3 className="section-subtitle-v2">Tips</h3>
          <pre className="note-box-v2">{content.tips}</pre>
          <h3 className="section-subtitle-v2">Policies</h3>
          <pre className="note-box-v2">{content.policies}</pre>
          <h3 className="section-subtitle-v2">Announcement</h3>
          <pre className="note-box-v2">{content.announcement}</pre>
          <h3 className="section-subtitle-v2">Formula</h3>
          <pre className="note-box-v2">{content.complianceFormula}</pre>
        </div>
      </div>
    </section>
  );
};

export default AdminEcoAwarenessPage;
