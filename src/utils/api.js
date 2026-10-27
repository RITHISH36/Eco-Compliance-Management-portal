import { getAuthToken } from "./session";

const DEFAULT_API_ORIGIN = "https://eco-compliance-management-portal-backend-fml7.onrender.com";

const normalizeApiBaseUrl = (baseUrl) => {
  const normalizedBaseUrl = (baseUrl || DEFAULT_API_ORIGIN).replace(/\/+$/, "");
  return normalizedBaseUrl.endsWith("/api")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const buildUrl = (path, query) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const request = async (path, { method = "GET", data, query, headers = {} } = {}) => {
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };
  const token = getAuthToken();

  if (data !== undefined && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  const text = await response.text();
  let responseData = null;
  if (text) {
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(responseData?.message || `Request failed with status ${response.status}`);
  }

  return responseData;
};

export const registerUser = (payload) =>
  request("/auth/register", {
    method: "POST",
    data: payload,
  });

export const loginUser = (payload) =>
  request("/auth/login", {
    method: "POST",
    data: payload,
  });

export const loginAdmin = (payload) =>
  request("/auth/admin-login", {
    method: "POST",
    data: payload,
  });

export const requestPhoneOtp = (payload) =>
  request("/auth/phone/request-otp", {
    method: "POST",
    data: payload,
  });

export const verifyPhoneOtp = (payload) =>
  request("/auth/phone/verify-otp", {
    method: "POST",
    data: payload,
  });

export const fetchReports = (query) =>
  request("/reports", {
    query,
  });

export const fetchSpamReports = () => request("/reports/spam");

export const fetchMyReports = () => request("/reports/my");

export const fetchHomeStats = () => request("/reports/summary");

export const createReport = (payload) =>
  request("/reports", {
    method: "POST",
    data: payload,
  });

export const patchReportStatus = (reportNumber, status) =>
  request(`/reports/${reportNumber}/status`, {
    method: "PATCH",
    data: { status },
  });

export const patchReportMeta = (reportNumber, payload) =>
  request(`/reports/${reportNumber}/meta`, {
    method: "PATCH",
    data: payload,
  });

export const postInternalNote = (reportNumber, note) =>
  request(`/reports/${reportNumber}/notes`, {
    method: "PATCH",
    data: { note },
  });

export const fetchUsers = () => request("/users");

export const toggleUserDisabledApi = (userId) =>
  request(`/users/${userId}/toggle-disabled`, {
    method: "PATCH",
  });

export const toggleUserVolunteerApi = (userId) =>
  request(`/users/${userId}/toggle-volunteer`, {
    method: "PATCH",
  });

export const fetchAwareness = () => request("/awareness");

export const saveAwareness = (payload) =>
  request("/awareness", {
    method: "PUT",
    data: payload,
  });

export const fetchSettings = () => request("/settings");

export const saveSettings = (payload) =>
  request("/settings", {
    method: "PUT",
    data: payload,
  });

export const fetchNotifications = () => request("/notifications");

export const createNotification = (payload) =>
  request("/notifications", {
    method: "POST",
    data: payload,
  });
