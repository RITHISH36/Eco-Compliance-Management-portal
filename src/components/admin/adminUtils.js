import {
  createNotification,
  fetchAwareness,
  fetchNotifications,
  fetchReports,
  fetchSpamReports,
  fetchSettings,
  fetchUsers,
  patchReportMeta,
  patchReportStatus,
  postInternalNote,
  saveAwareness,
  saveSettings,
  toggleUserDisabledApi,
  toggleUserVolunteerApi,
} from "../../utils/api";
import { normalizeReport, notifyReportsChanged } from "../../utils/reportStore";
import { CAMPUS_BLOCKS, normalizeCampusBlock } from "../../utils/campusBlocks";

const ZONE_MAINTENANCE_KEY = "ecoZoneMaintenance";

export const WORKFLOW_OPTIONS = ["Pending", "In Progress", "Resolved", "Reopened"];
export const WORKER_DEPARTMENTS = [
  "Unassigned",
  "Sanitation",
  "Electrician",
  "Plumber",
  "Maintenance",
  "Eco Cell",
  "General",
];

export const WORKER_CONTACT_DIRECTORY = {
  Unassigned: [],
  Sanitation: [
    { name: "Ravi Kumar", role: "Sanitation Supervisor", phone: "+91 98765 11001" },
    { name: "Mohana", role: "Waste Collection Lead", phone: "+91 98765 11002" },
    { name: "Arun Prakash", role: "Field Sanitation Staff", phone: "+91 98765 11003" },
  ],
  Electrician: [
    { name: "Suresh", role: "Senior Electrician", phone: "+91 98765 22001" },
    { name: "Dinesh", role: "Electrical Technician", phone: "+91 98765 22002" },
    { name: "Prabhu", role: "Streetlight Maintenance", phone: "+91 98765 22003" },
  ],
  Plumber: [
    { name: "Mani", role: "Lead Plumber", phone: "+91 98765 33001" },
    { name: "Karthik", role: "Pipe Maintenance", phone: "+91 98765 33002" },
    { name: "Naveen", role: "Waterline Technician", phone: "+91 98765 33003" },
  ],
  Maintenance: [
    { name: "Senthil Kumar", role: "Maintenance Coordinator", phone: "+91 98765 44001" },
    { name: "Ajith", role: "General Repair Team", phone: "+91 98765 44002" },
    { name: "Vignesh", role: "Campus Facility Support", phone: "+91 98765 44003" },
  ],
  "Eco Cell": [
    { name: "Priya", role: "Eco Cell Lead", phone: "+91 98765 55001" },
    { name: "Harini", role: "Volunteer Coordinator", phone: "+91 98765 55002" },
    { name: "Gokul", role: "Awareness Campaign Staff", phone: "+91 98765 55003" },
  ],
  General: [{ name: "Control Room", role: "Central Operations", phone: "+91 98765 99000" }],
};

export const getWorkersByDepartment = (department) =>
  WORKER_CONTACT_DIRECTORY[department] || [];

export const DEFAULT_ADMIN_EMAIL = "admin@ecoportal.com";
export const DEFAULT_ADMIN_PASSWORD = "admin123";

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getAdminReports = async () => {
  const reports = await fetchReports();
  return reports.map(normalizeReport);
};

export const getSpamReports = async () => {
  const reports = await fetchSpamReports();
  return reports.map(normalizeReport);
};

export const updateReportStatus = async (reportNumber, status) => {
  await patchReportStatus(reportNumber, status);
  notifyReportsChanged();
  return getAdminReports();
};

export const updateReportMeta = async (reportNumber, patch) => {
  await patchReportMeta(reportNumber, patch);
  notifyReportsChanged();
  return getAdminReports();
};

export const addInternalNote = async (reportNumber, note) => {
  if (!note.trim()) return getAdminReports();
  await postInternalNote(reportNumber, note);
  notifyReportsChanged();
  return getAdminReports();
};

export const getRegisteredUsers = async () => fetchUsers();

export const toggleUserDisabled = async (userId) => {
  await toggleUserDisabledApi(userId);
  return getRegisteredUsers();
};

export const toggleUserVolunteer = async (userId) => {
  await toggleUserVolunteerApi(userId);
  return getRegisteredUsers();
};

export const getZoneMaintenance = () =>
  safeParse(localStorage.getItem(ZONE_MAINTENANCE_KEY), {});

export const toggleZoneMaintenance = (zone) => {
  const state = getZoneMaintenance();
  state[zone] = !state[zone];
  localStorage.setItem(ZONE_MAINTENANCE_KEY, JSON.stringify(state));
  return state;
};

export const getAwarenessContent = async () => fetchAwareness();

export const saveAwarenessContent = async (content) => saveAwareness(content);

export const getAdminSettings = async () => {
  const settings = await fetchSettings();
  return {
    ...settings,
    password: "",
  };
};

export const saveAdminSettings = async (settings) =>
  saveSettings({
    categories: settings.categories,
    zones: settings.zones,
    adminName: settings.adminName,
    adminEmail: settings.adminEmail,
    passwordHint: settings.passwordHint || "",
  });

export const getAdminNotifications = async () => fetchNotifications();

export const pushAdminNotification = async (type, message) =>
  createNotification({
    type,
    message,
  });

export const getDashboardStats = (reports) => {
  const total = reports.length;
  const pending = reports.filter((item) => item.status === "Pending" || item.status === "Reopened").length;
  const inProgress = reports.filter((item) => item.status === "In Progress").length;
  const resolved = reports.filter((item) => item.status === "Resolved").length;
  const complianceRate = total ? Math.round((resolved / total) * 100) : 0;
  return { total, pending, inProgress, resolved, complianceRate };
};

export const getCategoryBreakdown = (reports) => {
  const byCategory = reports.reduce((acc, item) => {
    const key = item.category || item.type || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const total = reports.length || 1;
  return Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 1000) / 10,
    }));
};

export const getDepartmentBreakdown = (reports) => {
  const byDepartment = reports.reduce((acc, item) => {
    const key = item.department || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const total = reports.length || 1;
  return Object.entries(byDepartment)
    .sort((a, b) => b[1] - a[1])
    .map(([department, count]) => ({
      category: department,
      count,
      percent: Math.round((count / total) * 1000) / 10,
    }));
};

export const getMonthlyTrend = (reports) => {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      key,
      label: date.toLocaleString("en-US", { month: "short" }),
      Pending: 0,
      "In Progress": 0,
      Resolved: 0,
    };
  });

  const monthMap = new Map(months.map((item) => [item.key, item]));
  reports.forEach((item) => {
    const date = new Date(item.date || Date.now());
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = monthMap.get(key);
    if (!month) return;
    if (item.status === "Resolved") month.Resolved += 1;
    else if (item.status === "In Progress") month["In Progress"] += 1;
    else month.Pending += 1;
  });
  return months;
};

export const getAverageResolutionDays = (reports) => {
  const resolved = reports.filter((item) => item.status === "Resolved");
  if (!resolved.length) return 0;
  const totalDays = resolved.reduce((sum, item) => {
    const start = new Date(item.date || Date.now()).getTime();
    const timeline = Array.isArray(item.timeline) ? item.timeline : [];
    const resolvedEvent = [...timeline].reverse().find((row) =>
      String(row.text).toLowerCase().includes("resolved")
    );
    const end = resolvedEvent ? new Date(resolvedEvent.date).getTime() : Date.now();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return sum + days;
  }, 0);
  return Math.round((totalDays / resolved.length) * 10) / 10;
};

export const getBlockWiseCounts = (reports) => {
  const byBlock = CAMPUS_BLOCKS.reduce((acc, block) => {
    acc[block] = 0;
    return acc;
  }, {});

  reports.forEach((item) => {
    const raw = item.block || item.location?.split("-")[0]?.trim() || "";
    const normalized = normalizeCampusBlock(raw);
    byBlock[normalized] += 1;
  });

  return CAMPUS_BLOCKS.map((block) => ({ block, count: byBlock[block] }));
};

export const exportCsv = (reports) => {
  const header = ["Report ID", "Date", "Issue", "Category", "Location", "Status", "Department", "Eco Member", "Contact"];
  const rows = reports.map((item) =>
    [
      item.reportNumber,
      item.date,
      item.type,
      item.category || item.type,
      item.location,
      item.status,
      item.department || item.assignedWorker || "",
      item.ecoMember || "",
      item.assigneeContact || item.contactInfo || "",
    ]
      .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
};
