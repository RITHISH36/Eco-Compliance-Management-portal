import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaBullhorn,
  FaLock,
  FaMapMarkedAlt,
  FaSearch,
  FaShieldAlt,
  FaTags,
} from "react-icons/fa";
import {
  getAdminNotifications,
  getAdminSettings,
  getRegisteredUsers,
  pushAdminNotification,
  saveAdminSettings,
} from "./adminUtils";
import { useToast } from "../ui/ToastProvider";

const SETTINGS_ITEMS = [
  {
    id: "users",
    group: "Accounts",
    title: "User Management",
    description: "User access, roles, and account overview",
    icon: FaTags,
  },
  {
    id: "zones",
    group: "System",
    title: "Campus Zones",
    description: "Location lists, block naming, zone visibility",
    icon: FaMapMarkedAlt,
  },
  {
    id: "security",
    group: "Privacy & security",
    title: "Security",
    description: "Password hint, access reminders, admin safety",
    icon: FaLock,
  },
  {
    id: "resolved",
    group: "Notifications",
    title: "Resolved Alerts",
    description: "Send updates when complaints are completed",
    icon: FaBell,
  },
  {
    id: "campaign",
    group: "Notifications",
    title: "Campaign Alerts",
    description: "Push eco campaign messages to users",
    icon: FaBullhorn,
  },
  {
    id: "broadcast",
    group: "Notifications",
    title: "Broadcast Center",
    description: "Announce campus-wide updates and notices",
    icon: FaShieldAlt,
  },
];

const groupBy = (items) =>
  items.reduce((acc, item) => {
    acc[item.group] = [...(acc[item.group] || []), item];
    return acc;
  }, {});

const splitList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    categories: "",
    zones: "",
    adminName: "",
    adminEmail: "",
    password: "",
    passwordHint: "",
  });
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaignMsg, setCampaignMsg] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [resolvedMsg, setResolvedMsg] = useState("Your reported issue has been resolved.");
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeItem, setActiveItem] = useState("users");
  const [isSaving, setIsSaving] = useState(false);
  const [sendingType, setSendingType] = useState("");
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [nextSettings, nextNotifications] = await Promise.all([
          getAdminSettings(),
          getAdminNotifications(),
        ]);
        const nextUsers = await getRegisteredUsers();
        setSettings(nextSettings);
        setNotifications(nextNotifications);
        setUsers(nextUsers);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to load settings.");
      }
    };

    load();
  }, []);

  const save = async () => {
    try {
      setIsSaving(true);
      await saveAdminSettings(settings);
      setSaveMsg("Settings updated.");
      setError("");
      toast.success("Settings updated.");
      setTimeout(() => setSaveMsg(""), 1800);
    } catch (err) {
      const message = err.message || "Unable to save settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const sendNotify = async (type, message) => {
    if (!message.trim()) return;
    try {
      setSendingType(type);
      await pushAdminNotification(type, message.trim());
      setNotifications(await getAdminNotifications());
      setError("");
      toast.success("Notification sent.");
    } catch (err) {
      const nextMessage = err.message || "Unable to send notification.";
      setError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setSendingType("");
    }
  };

  const listCount = (value) => splitList(value).length;

  const zonesCount = listCount(settings.zones);
  const zonesPreview = splitList(settings.zones).slice(0, 8);
  const activeUsersCount = users.filter((user) => !user.disabled).length;
  const volunteerUsersCount = users.filter((user) => user.volunteer).length;
  const usersPreview = users.slice(0, 5);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SETTINGS_ITEMS;
    return SETTINGS_ITEMS.filter((item) =>
      [item.group, item.title, item.description].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [search]);

  const groupedItems = groupBy(filteredItems);
  const selectedItem =
    SETTINGS_ITEMS.find((item) => item.id === activeItem) || SETTINGS_ITEMS[0];

  const renderPage = () => {
    if (activeItem === "users") {
      return (
        <>
          <div className="settings-page-hero-v4">
            <div>
              <p>Accounts</p>
              <h1>User Management</h1>
              <span>Review registered users, access availability, and volunteer participation across the portal.</span>
            </div>
            <div className="settings-page-hero-actions-v4">
              <article>
                <strong>{users.length}</strong>
                <span>Total users</span>
              </article>
              <article>
                <strong>{activeUsersCount}</strong>
                <span>Active users</span>
              </article>
            </div>
          </div>

          <div className="settings-page-grid-v4">
            <div className="settings-editor-card-v2">
              <div className="settings-editor-head-v2">
                <h3>User Overview</h3>
                <span>Recent accounts</span>
              </div>
              <div className="settings-list-v4">
                {usersPreview.length ? (
                  usersPreview.map((user) => (
                    <div key={user.id || user._id || user.email} className="settings-list-row-v4">
                      <div>
                        <strong>{user.name || "User"}</strong>
                        <span>{user.email}</span>
                      </div>
                      <small>{user.disabled ? "Disabled" : "Active"}</small>
                    </div>
                  ))
                ) : (
                  <p className="empty-line-v2">No users available.</p>
                )}
              </div>
            </div>

            <div className="settings-sidepanel-v4">
              <div className="settings-info-card-v2">
                <h3>Volunteer users</h3>
                <p>{volunteerUsersCount} users currently have volunteer access enabled.</p>
              </div>
              <div className="settings-info-card-v2">
                <h3>Manage more</h3>
                <p>Use the main Users page for detailed actions such as enabling, disabling, and updating volunteer access.</p>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeItem === "zones") {
      return (
        <>
          <div className="settings-page-hero-v4">
            <div>
              <p>System</p>
              <h1>Campus Zones</h1>
              <span>Organize the places users can choose while filing reports around the campus.</span>
            </div>
            <div className="settings-page-hero-actions-v4">
              <article>
                <strong>{zonesCount}</strong>
                <span>Configured zones</span>
              </article>
            </div>
          </div>

          <div className="settings-page-grid-v4">
            <div className="settings-editor-card-v2">
              <div className="settings-editor-head-v2">
                <h3>Location Directory</h3>
                <span>Visible in reporting flow</span>
              </div>
              <label>
                Zones
                <textarea
                  rows="8"
                  value={settings.zones}
                  onChange={(e) => setSettings((prev) => ({ ...prev, zones: e.target.value }))}
                />
              </label>
              <button type="button" onClick={save} className={isSaving ? "btn-loading" : ""} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Zones"}
              </button>
            </div>

            <div className="settings-sidepanel-v4">
              <div className="settings-info-card-v2">
                <h3>Zone preview</h3>
                <div className="settings-chip-grid-v4">
                  {zonesPreview.map((item) => (
                    <span key={item} className="settings-chip-v4">{item}</span>
                  ))}
                </div>
              </div>
              <div className="settings-info-card-v2">
                <h3>Suggestion</h3>
                <p>Keep block names short and public areas human-friendly so users can find them fast.</p>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeItem === "security") {
      return (
        <>
          <div className="settings-page-hero-v4">
            <div>
              <p>Privacy & security</p>
              <h1>Security</h1>
              <span>Keep the admin environment safe with password guidance and access-related reminders.</span>
            </div>
          </div>

          <div className="settings-page-grid-v4">
            <div className="settings-editor-card-v2">
              <div className="settings-editor-head-v2">
                <h3>Password controls</h3>
                <span>Security helper information</span>
              </div>
              <label>
                Password Preview
                <input
                  type="password"
                  value={settings.password}
                  onChange={(e) => setSettings((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Local preview field"
                />
              </label>
              <label>
                Password Hint
                <textarea
                  rows="6"
                  value={settings.passwordHint}
                  onChange={(e) => setSettings((prev) => ({ ...prev, passwordHint: e.target.value }))}
                />
              </label>
              <button type="button" onClick={save} className={isSaving ? "btn-loading" : ""} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Security Text"}
              </button>
            </div>

            <div className="settings-sidepanel-v4">
              <div className="settings-info-card-v2">
                <h3>Current support</h3>
                <p>This page stores helper text for now. Full password update API can be added next.</p>
              </div>
              <div className="settings-info-card-v2">
                <h3>Recommended next steps</h3>
                <p>Add current-password verification, strength rules, last change date, and session history.</p>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeItem === "resolved") {
      return (
        <>
          <div className="settings-page-hero-v4">
            <div>
              <p>Notifications</p>
              <h1>Resolved Alerts</h1>
              <span>Send issue resolution updates to users once complaints are completed.</span>
            </div>
          </div>

          <div className="settings-page-grid-v4">
            <div className="settings-editor-card-v2">
              <div className="settings-editor-head-v2">
                <h3>Resolved alert message</h3>
                <span>Direct update</span>
              </div>
              <label>
                Message
                <textarea rows="7" value={resolvedMsg} onChange={(e) => setResolvedMsg(e.target.value)} />
              </label>
              <button
                type="button"
                onClick={() => sendNotify("resolved", resolvedMsg)}
                className={sendingType === "resolved" ? "btn-loading" : ""}
                disabled={sendingType === "resolved"}
              >
                {sendingType === "resolved" ? "Sending..." : "Send Resolved Alert"}
              </button>
            </div>

            <div className="settings-log-panel-v2">
              <h3>Recent activity</h3>
              <div className="map-list-v2">
                {notifications.filter((item) => item.type === "resolved").length ? (
                  notifications
                    .filter((item) => item.type === "resolved")
                    .map((item) => (
                      <div key={item.id} className="map-row-v2">
                        <span>{new Date(item.at).toLocaleString()}</span>
                        <small>{item.message}</small>
                      </div>
                    ))
                ) : (
                  <p className="empty-line-v2">No resolved notifications sent yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeItem === "campaign") {
      return (
        <>
          <div className="settings-page-hero-v4">
            <div>
              <p>Notifications</p>
              <h1>Campaign Alerts</h1>
              <span>Create eco-awareness pushes and targeted campaign messages for users.</span>
            </div>
          </div>

          <div className="settings-page-grid-v4">
            <div className="settings-editor-card-v2">
              <div className="settings-editor-head-v2">
                <h3>Campaign message</h3>
                <span>Eco awareness push</span>
              </div>
              <label>
                Message
                <textarea rows="7" value={campaignMsg} onChange={(e) => setCampaignMsg(e.target.value)} />
              </label>
              <button
                type="button"
                onClick={() => sendNotify("campaign", campaignMsg)}
                className={sendingType === "campaign" ? "btn-loading" : ""}
                disabled={sendingType === "campaign"}
              >
                {sendingType === "campaign" ? "Sending..." : "Send Campaign Alert"}
              </button>
            </div>

            <div className="settings-log-panel-v2">
              <h3>Recent activity</h3>
              <div className="map-list-v2">
                {notifications.filter((item) => item.type === "campaign").length ? (
                  notifications
                    .filter((item) => item.type === "campaign")
                    .map((item) => (
                      <div key={item.id} className="map-row-v2">
                        <span>{new Date(item.at).toLocaleString()}</span>
                        <small>{item.message}</small>
                      </div>
                    ))
                ) : (
                  <p className="empty-line-v2">No campaign notifications sent yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="settings-page-hero-v4">
          <div>
            <p>Notifications</p>
            <h1>Broadcast Center</h1>
            <span>Share wide announcements and important updates with everyone in the system.</span>
          </div>
        </div>

        <div className="settings-page-grid-v4">
          <div className="settings-editor-card-v2">
            <div className="settings-editor-head-v2">
              <h3>Announcement message</h3>
              <span>All users</span>
            </div>
            <label>
              Announcement
              <textarea rows="7" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} />
            </label>
            <button
              type="button"
              onClick={() => sendNotify("broadcast", broadcastMsg)}
              className={sendingType === "broadcast" ? "btn-loading" : ""}
              disabled={sendingType === "broadcast"}
            >
              {sendingType === "broadcast" ? "Sending..." : "Send Broadcast"}
            </button>
          </div>

          <div className="settings-log-panel-v2">
            <h3>Notification Log</h3>
            <div className="map-list-v2">
              {notifications.length ? (
                notifications.map((item) => (
                  <div key={item.id} className="map-row-v2">
                    <span>{new Date(item.at).toLocaleString()} - {item.type}</span>
                    <small>{item.message}</small>
                  </div>
                ))
              ) : (
                <p className="empty-line-v2">No notifications have been sent yet.</p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <section className="admin-content-v2 settings-page-v3">
      {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

      <div className="settings-desktop-v3">
        <aside className="settings-sidebar-v3">
          <div className="settings-sidebar-top-v3">
            <button type="button" className="settings-back-v3">Settings</button>
            <label className="settings-search-v3">
              <FaSearch />
              <input
                type="text"
                placeholder="Find a setting"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="settings-sidebar-list-v3">
            {Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} className="settings-sidebar-group-v3">
                <p>{group}</p>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`settings-side-item-v3 ${activeItem === item.id ? "active" : ""}`}
                      onClick={() => setActiveItem(item.id)}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <div className="settings-main-v3">
          {!filteredItems.length ? (
            <div className="settings-empty-v3">
              <strong>No settings found</strong>
              <span>Try a different search keyword.</span>
            </div>
          ) : (
            <div className="settings-detail-wrap-v3">
              {renderPage()}
              {saveMsg ? <p className="empty-line-v2">{saveMsg}</p> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminSettingsPage;
