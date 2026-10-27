import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import {
  FaBars,
  FaBell,
  FaChartLine,
  FaCog,
  FaHome,
  FaLeaf,
  FaListUl,
  FaMapMarkerAlt,
  FaMoon,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaCopy,
  FaUser,
} from "react-icons/fa";
import "./AdminPortal.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: <FaHome /> },
  { to: "/admin/manage-issues", label: "Manage Issues", icon: <FaListUl /> },
  { to: "/admin/spam-reports", label: "Duplicate Reports", icon: <FaCopy /> },
  { to: "/admin/transparency-map", label: "Transparency Map", icon: <FaMapMarkerAlt /> },
  { to: "/admin/analytics", label: "Analytics", icon: <FaChartLine /> },
  { to: "/admin/users", label: "Users", icon: <FaUser /> },
  { to: "/admin/eco-awareness", label: "Eco Awareness", icon: <FaLeaf /> },
  { to: "/admin/settings", label: "Settings", icon: <FaCog /> },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("eco-theme");
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("eco-theme", theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem("ecoLoggedIn");
    localStorage.removeItem("ecoLoggedInName");
    localStorage.removeItem("ecoLoggedInUser");
    localStorage.removeItem("ecoAuthRole");
    window.dispatchEvent(new Event("eco-auth-changed"));
    navigate("/");
  };

  return (
    <div className="admin-portal-wrap">
      <div className="admin-portal">
        <aside className="admin-sidebar-v2">
          <div className="admin-brand-v2">
            <img src="/logo-removebg-preview.png" alt="Eco-Compliance Portal" />
            <h2>Eco-Compliance Portal</h2>
          </div>

          <nav className="admin-nav-v2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "admin-nav-v2-link active" : "admin-nav-v2-link"
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <button type="button" className="admin-nav-v2-link admin-logout-v2" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>

          <div className="admin-profile-v2">
            <img src="/logo-removebg-preview.png" alt="Admin" />
            <div>
              <strong>Admin</strong>
              <p>admin@campus.edu</p>
            </div>
          </div>
        </aside>

        <main className="admin-main-v2">
          <header className="admin-topbar-v2">
            <div className="admin-left-v2">
              <FaBars />
            </div>
            <div className="admin-right-v2">
              <label className="admin-search-v2">
                <FaSearch />
                <input type="text" placeholder="Search" />
              </label>
              <button type="button" className="notify-dot-v2"><FaBell /></button>
              <button
                type="button"
                className="admin-theme-toggle-v2"
                onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <FaSun /> : <FaMoon />}
              </button>
              <img src="/logo-removebg-preview.png" alt="Admin profile" />
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
