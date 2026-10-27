import { FaMoon, FaShieldAlt, FaSun, FaUserCircle } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { HashLink } from "react-router-hash-link";
import { clearSession, getCurrentUser, isLoggedIn } from "../utils/session";

const getInitialTheme = () => {
    if (typeof window === "undefined") return "light";

    const savedTheme = window.localStorage.getItem("eco-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const Header = (props) => {
    const { setisopen } = props
    const navigate = useNavigate()
    const [authState, setAuthState] = useState({
        isLoggedIn: false,
        name: "",
        role: "",
    })
    const [showProfileMenu, setshowProfileMenu] = useState(false)
    const [theme, setTheme] = useState(getInitialTheme)
    const profileMenuRef = useRef(null)

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem("eco-theme", theme);
    }, [theme])

    useEffect(() => {
        const syncAuth = () => {
            const user = getCurrentUser()
            setAuthState({
                isLoggedIn: isLoggedIn(),
                name: user?.name || "User",
                role: user?.role || "",
            })
        }

        syncAuth()
        window.addEventListener("storage", syncAuth)
        window.addEventListener("eco-auth-changed", syncAuth)

        return () => {
            window.removeEventListener("storage", syncAuth)
            window.removeEventListener("eco-auth-changed", syncAuth)
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setshowProfileMenu(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const openlogin = () => {
        if (setisopen) {
            setisopen(true);
        }
    }
    const openadmin = () => {
        if (authState.isLoggedIn && authState.role === "user") {
            navigate("/admin-login", {
                state: {
                    message: "You are logged in as user. Logout first to continue as admin.",
                },
            })
            return
        }
        if (authState.isLoggedIn && authState.role === "admin") {
            navigate("/admin/dashboard")
            return
        }
        navigate("/admin-login")
    }
    const handleLogout = () => {
        clearSession()
        setshowProfileMenu(false)
        navigate("/")
    }

    const toggleTheme = () => {
        setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark")
    }
    return (
        <>
            <div className="header">
                <div className="header-option">
                    <span className="nav"><HashLink smooth to="/#home" className="nav-link">Home</HashLink></span>
                    <span className="nav"><HashLink smooth to="/#about" className="nav-link">About</HashLink></span>
                    <span className="nav"><NavLink to="/reportissue" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Report</NavLink></span>
                    <span className="nav"><NavLink to="/checkstatus" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Check status</NavLink></span>
                    <span className="nav"><NavLink to="/transparencymap" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Transparency map</NavLink></span>
                    <span className="nav"><NavLink to="/eco-awareness" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Eco Awareness</NavLink></span>
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    >
                        {theme === "dark" ? <FaSun /> : <FaMoon />}
                    </button>
                    {authState.isLoggedIn ? (
                        <div className="profile-menu" ref={profileMenuRef}>
                            <button
                                type="button"
                                className="profile-chip"
                                onClick={() => setshowProfileMenu(!showProfileMenu)}
                            >
                                <FaUserCircle className="profile-avatar" />
                                {authState.name}
                            </button>
                            {showProfileMenu ? (
                                <div className="profile-dropdown">
                                    <button type="button" onClick={handleLogout}>Logout</button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <span className="login" onClick={openlogin}>Login</span>
                    )}
                    <span className="admin-login" onClick={openadmin}><FaShieldAlt />Admin</span>
                </div>
                <div className="header-logo">
                    <img src="/logo-removebg-preview.png" alt="Campus Maintenance Portal Logo" />
                    <h3>Campus Maintenance Portal</h3>
                </div>
            </div>
        </>
    )
}
export default Header;
