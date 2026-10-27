import { BrowserRouter } from "react-router";
import Home from "./components/Home";
import { Routes } from "react-router";
import { Route } from "react-router";
import { Navigate } from "react-router";
import { useLocation } from "react-router";
import Register from "./components/Register";
import Reportissue from "./components/Reportissue";
import Transparencymap from "./components/Transparencymap";
import Checkstatus from "./components/Checkstatus";
import EcoAwareness from "./components/EcoAwareness";
import AdminLogin from "./components/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./components/admin/AdminDashboardPage";
import AdminManageIssuesPage from "./components/admin/AdminManageIssuesPage";
import AdminSpamReportsPage from "./components/admin/AdminSpamReportsPage";
import AdminTransparencyMapPage from "./components/admin/AdminTransparencyMapPage";
import AdminAnalyticsPage from "./components/admin/AdminAnalyticsPage";
import AdminUsersPage from "./components/admin/AdminUsersPage";
import AdminEcoAwarenessPage from "./components/admin/AdminEcoAwarenessPage";
import AdminSettingsPage from "./components/admin/AdminSettingsPage";
import { isAdmin, isLoggedIn } from "./utils/session";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const loggedIn = isLoggedIn();

  if (!loggedIn) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          redirectTo: location.pathname,
          loginRequired: true,
          message: "Please login first to access this page.",
        }}
      />
    );
  }

  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();

  if (!loggedIn || !admin) {
    return (
      <Navigate
        to="/admin-login"
        replace
        state={{ message: "Please login as admin to continue.", redirectTo: location.pathname }}
      />
    );
  }

  return children;
};

const App=()=>{
  return(
  <>
  <BrowserRouter>
  <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/admin-login" element={<AdminLogin />} />
    <Route path="/transparencymap" element={<Transparencymap/>}/>
    <Route
      path="/reportissue"
      element={
        <ProtectedRoute>
          <Reportissue />
        </ProtectedRoute>
      }
    />
    <Route
      path="/checkstatus"
      element={
        <ProtectedRoute>
          <Checkstatus />
        </ProtectedRoute>
      }
    />
    <Route path="/eco-awareness" element={<EcoAwareness/>}/>
    <Route
      path="/admin"
      element={
        <AdminProtectedRoute>
          <AdminLayout />
        </AdminProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="manage-issues" element={<AdminManageIssuesPage />} />
      <Route path="spam-reports" element={<AdminSpamReportsPage />} />
      <Route path="transparency-map" element={<AdminTransparencyMapPage />} />
      <Route path="analytics" element={<AdminAnalyticsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="eco-awareness" element={<AdminEcoAwarenessPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
    </Route>
  </Routes>
  </BrowserRouter>
  
  </>
  )
 }
 export default App;
