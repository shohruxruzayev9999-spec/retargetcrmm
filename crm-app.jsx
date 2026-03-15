import React, { memo, startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { Timestamp, collection, doc, getDoc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { auth, db, googleProvider, hasFirebaseConfig } from "./firebase";

const T = {
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`,
  colors: {
    bg: "#f5f5f7",
    surface: "#ffffff",
    surfaceMuted: "#ffffff",
    surfaceElevated: "#ffffff",
    border: "#e5e5ea",
    borderLight: "#f2f2f7",
    text: "#1d1d1f",
    textMuted: "#6e6e73",
    textSecondary: "#6e6e73",
    textTertiary: "#aeaeb2",
    accent: "#0071e3",
    accentHover: "#0077ed",
    accentSoft: "#e8f0fe",
    blue: "#0071e3",
    blueSoft: "#e8f0fe",
    green: "#34c759",
    greenSoft: "#e8fbed",
    orange: "#ff9f0a",
    orangeSoft: "#fff4e5",
    red: "#ff3b30",
    redSoft: "#fff0ef",
    purple: "#af52de",
    purpleSoft: "#f5eeff",
    indigo: "#5856d6",
    indigoSoft: "#eeeefe",
    teal: "#5ac8fa",
    tealSoft: "#edf8ff",
    yellow: "#ffcc00",
    yellowSoft: "#fff9db",
    slate: "#1d1d1f",
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 18, full: 999 },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.08)",
    md: "0 4px 16px rgba(0,0,0,0.08)",
    lg: "0 8px 32px rgba(0,0,0,0.10)",
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
};

const ROLE_META = {
  CEO: { label: "CEO", dept: "Boshqaruv", title: "CEO" },
  MANAGER: { label: "Menejer", dept: "Project Management", title: "Loyiha menejeri" },
  SUPERVISOR: { label: "Boshqaruvchi", dept: "Boshqaruv", title: "Boshqaruvchi" },
  INVESTOR: { label: "Investor", dept: "Investor", title: "Investor" },
  EMPLOYEE: { label: "Xodim", dept: "SMM bo'limi", title: "Xodim" },
};

const FIXED_ROLE_BLUEPRINTS = [
  { email: "ceo@agency.uz", password: "ceo12345", role: "CEO", name: "Agency CEO", dept: "Boshqaruv", title: "CEO" },
  { email: "manager@agency.uz", password: "manager12345", role: "MANAGER", name: "Agency Menejer", dept: "Project Management", title: "Loyiha menejeri" },
  { email: "boshqaruvchi@agency.uz", password: "bosh12345", role: "SUPERVISOR", name: "Agency Boshqaruvchi", dept: "Boshqaruv", title: "Boshqaruvchi" },
  { email: "investor@agency.uz", password: "investor12345", role: "INVESTOR", name: "Agency Investor", dept: "Investor", title: "Investor" },
];

const FIXED_ROLE_BY_EMAIL = Object.fromEntries(FIXED_ROLE_BLUEPRINTS.map((item) => [item.email.toLowerCase(), item]));

const PROJECT_STATUSES = ["Rejalashtirildi", "Jarayonda", "Tasdiqlandi", "Yakunlandi", "To'xtatildi"];
const TASK_STATUSES = ["Rejalashtirildi", "Jarayonda", "Ko'rib chiqilmoqda", "Tasdiqlandi", "Bajarildi", "Rad etildi"];
const CONTENT_STATUSES = ["Rejalashtirildi", "Jarayonda", "Ko'rib chiqilmoqda", "Tasdiqlandi", "E'lon qilindi", "Rad etildi"];
const PLAN_STATUSES = ["Rejalashtirildi", "Jarayonda", "Tasdiqlandi", "Bajarildi"];
const COMMON_WORK_STATUSES = ["Yangi", "Jarayonda", "Kutilmoqda", "Tasdiqlangan", "Tugallangan", "Bekor qilingan"];
const SHOOT_STATUSES = ["Yangi", "Rejalashtirildi", "Jarayonda", "Kutilmoqda", "Tasdiqlangan", "Tasdiqlandi", "Tugallangan", "Bajarildi", "Bekor qilingan"];
const CALL_STATUSES = COMMON_WORK_STATUSES;
const PRIORITIES = ["Yuqori", "O'rta", "Past"];
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Telegram"];
const REALTIME_DELAY_MESSAGE = "Realtime ma'lumotlar serverdan kechikib kelmoqda. Agar bu holat saqlansa, CEO/Admin bir marta kirib CRM sinxronizatsiyasini tekshirsin.";
const FORMATS = ["Post", "Reels", "Story", "Video", "Carousel", "Live"];
const DEPARTMENTS = ["SMM bo'limi", "Target bo'limi", "Media bo'limi", "Sales bo'limi", "Project Management", "Boshqaruv"];
const EMOJI_GROUPS = [
  { id: "smileys", label: "😊", name: "Smileys", items: ["😀", "😄", "😁", "🙂", "😉", "😍", "🥰", "🤩", "😎", "🥹", "🤝", "🙏"] },
  { id: "gestures", label: "🙌", name: "Qo'llar", items: ["👍", "👏", "🙌", "👌", "✍️", "🤞", "🫶", "💪", "🫡", "🤜", "🤛", "👀"] },
  { id: "work", label: "💼", name: "Ish", items: ["✅", "🗂️", "📌", "📎", "💼", "📈", "📊", "📅", "🎯", "🚀", "🔥", "💡"] },
  { id: "moods", label: "🌈", name: "Kayfiyat", items: ["🎉", "🥳", "❤️", "💙", "💚", "💜", "🌟", "⚡", "☕", "🍀", "🌈", "✨"] },
];

const EMPTY_CRM = {
  projects: [],
  employees: [],
  shoots: [],
  meetings: [],
  chatMessages: [],
  notifications: [],
  auditLog: [],
  meta: { version: 2, updatedAt: null, updatedBy: null },
};

const EMPTY_PROJECT_WORKSPACE = {
  tasks: [],
  contentPlan: [],
  mediaPlan: [],
  plans: { daily: [], weekly: [], monthly: [] },
  calls: [],
};

const EMPTY_LEGACY_FALLBACK = {
  projects: [],
  publicUsers: [],
  workspaceByProjectId: {},
};

const ROOT_DOC_ID = "agency-crm";
const CRM_CACHE_KEY = `agency-crm-cache:${ROOT_DOC_ID}`;
const SCHEMA_VERSION = 3;
const ENABLE_CLIENT_CACHE = false;
const ENABLE_RUNTIME_MIGRATION = import.meta.env.VITE_ENABLE_RUNTIME_MIGRATION === "1";
const EDITOR_ROLES = new Set(["CEO", "MANAGER", "SUPERVISOR"]);
const REPORT_ROLES = new Set(["CEO", "INVESTOR"]);
const PEOPLE_ROLES = new Set(["CEO", "MANAGER", "SUPERVISOR"]);

const STATUS_META = {
  Yangi: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Rejalashtirildi": { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "Jarayonda": { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  Kutilmoqda: { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  "Ko'rib chiqilmoqda": { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  "Tasdiqlangan": { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  "Tasdiqlandi": { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  "Tugallangan": { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "Bajarildi": { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "E'lon qilindi": { bg: "#ccfbf1", text: "#0f766e", border: "#5eead4" },
  "Rad etildi": { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  "Bekor qilingan": { bg: "#f3f4f6", text: "#6b7280", border: "#d1d5db" },
  "Yakunlandi": { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "To'xtatildi": { bg: T.colors.borderLight, text: T.colors.textSecondary, border: T.colors.border },
};

const PRIORITY_META = {
  "Yuqori": { bg: "#fee2e2", text: "#b91c1c" },
  "O'rta": { bg: "#ffedd5", text: "#c2410c" },
  "Past": { bg: "#dcfce7", text: "#166534" },
};

function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toMoney(value) {
  return Number(value || 0).toLocaleString("uz-UZ");
}

function isoNow() {
  return new Date().toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readCache(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  if (!ENABLE_CLIENT_CACHE) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort cache only.
  }
}

function clearCache(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore cache cleanup failures.
  }
}

function userScopedCacheKey(baseKey, userId) {
  return `${baseKey}:v${SCHEMA_VERSION}:${userId || "anon"}`;
}

function projectWorkspaceCacheKey(userId, projectId) {
  return `${userScopedCacheKey(CRM_CACHE_KEY, userId)}:project:${projectId}`;
}

function clearUserCaches(userId, projectIds = []) {
  if (!userId) return;
  clearCache(userScopedCacheKey(CRM_CACHE_KEY, userId));
  projectIds.forEach((projectId) => clearCache(projectWorkspaceCacheKey(userId, projectId)));
}

function normalizeDateValue(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  return fallback;
}

function indexById(items) {
  return Object.fromEntries((items || []).filter(Boolean).map((item) => [item.id, item]));
}

function initials(name = "?") {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeProject(project) {
  return {
    id: project.id || makeId("project"),
    name: project.name || "",
    client: project.client || "",
    type: project.type || "",
    start: project.start || "",
    end: project.end || "",
    managerId: project.managerId || "",
    teamIds: Array.isArray(project.teamIds) ? project.teamIds : [],
    status: project.status || "Rejalashtirildi",
    priority: project.priority || "O'rta",
    visibility: project.visibility || "team",
    archived: Boolean(project.archived),
    tasks: Array.isArray(project.tasks) ? project.tasks : [],
    contentPlan: Array.isArray(project.contentPlan) ? project.contentPlan : [],
    mediaPlan: Array.isArray(project.mediaPlan) ? project.mediaPlan : [],
    plans: {
      daily: Array.isArray(project.plans?.daily) ? project.plans.daily : [],
      weekly: Array.isArray(project.plans?.weekly) ? project.plans.weekly : [],
      monthly: Array.isArray(project.plans?.monthly) ? project.plans.monthly : [],
    },
    calls: Array.isArray(project.calls) ? project.calls : [],
    report: {
      budget: Number(project.report?.budget || 0),
      leads: Number(project.report?.leads || 0),
      cpl: Number(project.report?.cpl || 0),
      sales: Number(project.report?.sales || 0),
      roi: Number(project.report?.roi || 0),
    },
    metrics: {
      totalTasks: Number(project.metrics?.totalTasks || 0),
      completedTasks: Number(project.metrics?.completedTasks || 0),
      approvedTasks: Number(project.metrics?.approvedTasks || 0),
      activeTasks: Number(project.metrics?.activeTasks || 0),
      overdueTasks: Number(project.metrics?.overdueTasks || 0),
      pendingReviews: Number(project.metrics?.pendingReviews || 0),
      progress: Number(project.metrics?.progress || 0),
    },
    memberStats: project.memberStats && typeof project.memberStats === "object" ? project.memberStats : {},
    createdAt: normalizeDateValue(project.createdAt, null),
    createdBy: project.createdBy || "",
    updatedAt: normalizeDateValue(project.updatedAt, null),
    updatedBy: project.updatedBy || "",
  };
}

function normalizeCrmPayload(payload) {
  const base = payload && typeof payload === "object" ? payload : EMPTY_CRM;
  return {
    projects: Array.isArray(base.projects) ? base.projects.map(normalizeProject) : [],
    employees: Array.isArray(base.employees) ? base.employees : [],
    shoots: Array.isArray(base.shoots) ? base.shoots : [],
    meetings: Array.isArray(base.meetings) ? base.meetings : [],
    chatMessages: Array.isArray(base.chatMessages) ? base.chatMessages : [],
    notifications: Array.isArray(base.notifications) ? base.notifications : [],
    auditLog: Array.isArray(base.auditLog) ? base.auditLog : [],
    meta: {
      version: base.meta?.version || 2,
      updatedAt: base.meta?.updatedAt || null,
      updatedBy: base.meta?.updatedBy || null,
    },
  };
}

function upsertEmployee(employees, profile) {
  if (!profile || profile.role === "INVESTOR") return employees;
  const nextEmployee = {
    id: profile.uid,
    name: profile.name,
    email: profile.email,
    role: profile.title || ROLE_META[profile.role]?.title || "Xodim",
    roleCode: profile.role,
    dept: profile.dept || ROLE_META[profile.role]?.dept || "SMM bo'limi",
    salary: Number(profile.salary || 0),
    kpiBase: Number(profile.kpiBase || 80),
    load: Number(profile.load || 0),
    avatarUrl: profile.avatarUrl || "",
  };
  const exists = employees.some((item) => item.id === profile.uid);
  if (!exists) {
    return [...employees, nextEmployee];
  }
  return employees.map((item) => (item.id === profile.uid ? { ...item, ...nextEmployee } : item));
}

function employeeToProfilePatch(employee) {
  return {
    uid: employee.id,
    email: employee.email || "",
    name: employee.name || "",
    avatarUrl: employee.avatarUrl || "",
    role: employee.roleCode || "EMPLOYEE",
    dept: employee.dept || ROLE_META[employee.roleCode]?.dept || "SMM bo'limi",
    title: employee.role || ROLE_META[employee.roleCode]?.title || "Xodim",
    salary: Number(employee.salary || 0),
    kpiBase: Number(employee.kpiBase || 80),
    load: Number(employee.load || 0),
  };
}

function employeeToPublicDoc(employee) {
  const roleCode = employee.roleCode || "EMPLOYEE";
  return {
    uid: employee.id,
    email: employee.email || "",
    name: employee.name || "",
    avatarUrl: employee.avatarUrl || "",
    roleCode,
    role: employee.role || ROLE_META[roleCode]?.title || "Xodim",
    dept: employee.dept || ROLE_META[roleCode]?.dept || "SMM bo'limi",
    title: employee.role || ROLE_META[roleCode]?.title || "Xodim",
    status: employee.status || "active",
    assignedProjectIds: Array.isArray(employee.assignedProjectIds) ? employee.assignedProjectIds : [],
    createdAt: employee.createdAt || isoNow(),
    updatedAt: employee.updatedAt || isoNow(),
  };
}

function employeeToPrivateDoc(employee) {
  return {
    salary: Number(employee.salary || 0),
    kpiBase: Number(employee.kpiBase || 80),
    load: Number(employee.load || 0),
    updatedAt: isoNow(),
  };
}

function profileToPublicUser(profile) {
  if (!profile) return null;
  return normalizeStoredUser(
    profile.uid,
    employeeToPublicDoc({
      id: profile.uid,
      email: profile.email || "",
      name: profile.name || "",
      avatarUrl: profile.avatarUrl || "",
      roleCode: profile.role || "EMPLOYEE",
      role: profile.title || ROLE_META[profile.role]?.title || "Xodim",
      dept: profile.dept || ROLE_META[profile.role]?.dept || "SMM bo'limi",
      assignedProjectIds: Array.isArray(profile.assignedProjectIds) ? profile.assignedProjectIds : [],
      createdAt: profile.createdAt || isoNow(),
      updatedAt: isoNow(),
      status: "active",
    })
  );
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function profileIdentityIds(profile) {
  const ids = new Set([profile?.uid].filter(Boolean));
  (Array.isArray(profile?.identityIds) ? profile.identityIds : []).forEach((id) => {
    if (id) ids.add(id);
  });
  return ids;
}

function isSyntheticEmployeeId(id) {
  return String(id || "").startsWith("employee_") || String(id || "").startsWith("legacy_employee_");
}

function canonicalizeUsersAndProjects(users, projects, profile) {
  const groupedUsers = new Map();
  users.forEach((user) => {
    const key = normalizeEmail(user.email) || `id:${user.id}`;
    if (!groupedUsers.has(key)) groupedUsers.set(key, []);
    groupedUsers.get(key).push(user);
  });

  const aliasMap = {};
  const canonicalUsers = [];

  groupedUsers.forEach((group) => {
    const preferred =
      group.find((user) => user.id === profile?.uid) ||
      group.find((user) => !isSyntheticEmployeeId(user.id)) ||
      group.find((user) => user.status !== "merged") ||
      group[0];
    const mergedAssignedProjectIds = Array.from(
      new Set(
        group.flatMap((user) => (Array.isArray(user.assignedProjectIds) ? user.assignedProjectIds : []))
      )
    );
    const canonicalUser = normalizeStoredUser(preferred.id, {
      ...preferred,
      assignedProjectIds: mergedAssignedProjectIds,
    });
    canonicalUsers.push(canonicalUser);
    group.forEach((user) => {
      aliasMap[user.id] = preferred.id;
    });
  });

  const canonicalProjects = projects.map((project) => {
    const managerId = aliasMap[project.managerId] || project.managerId;
    const teamIds = Array.from(new Set((project.teamIds || []).map((teamId) => aliasMap[teamId] || teamId).filter(Boolean)));
    if (managerId === project.managerId && recordsEqual(teamIds, project.teamIds || [])) return project;
    return normalizeStoredProjectMeta(project.id, {
      ...project,
      managerId,
      teamIds,
    });
  });

  return {
    users: canonicalUsers.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    projects: canonicalProjects,
  };
}

function buildLegacyFallback(payload, actor) {
  const legacy = normalizeCrmPayload(payload);
  const assignedProjectIdsMap = buildAssignedProjectIdsMap(legacy.projects);
  const projects = sortByRecent(
    legacy.projects.map((project) => normalizeStoredProjectMeta(project.id, projectMetaDocFromProject(project, actor, project))),
    "updatedAt"
  ).filter((project) => !project.archived);
  const workspaceByProjectId = Object.fromEntries(
    legacy.projects.map((project) => [
      project.id,
      {
        tasks: Array.isArray(project.tasks) ? project.tasks : [],
        contentPlan: Array.isArray(project.contentPlan) ? project.contentPlan : [],
        mediaPlan: Array.isArray(project.mediaPlan) ? project.mediaPlan : [],
        plans: {
          daily: Array.isArray(project.plans?.daily) ? project.plans.daily : [],
          weekly: Array.isArray(project.plans?.weekly) ? project.plans.weekly : [],
          monthly: Array.isArray(project.plans?.monthly) ? project.plans.monthly : [],
        },
        calls: Array.isArray(project.calls) ? project.calls : [],
      },
    ])
  );
  const publicUsers = legacy.employees
    .map((employee, index) => {
      const id = employee.id || employee.uid || employee.email || `legacy_employee_${index}`;
      return normalizeStoredUser(
        id,
        employeeToPublicDoc({
          ...employee,
          id,
          roleCode: employee.roleCode || "EMPLOYEE",
          assignedProjectIds: assignedProjectIdsMap[id] || employee.assignedProjectIds || [],
          createdAt: employee.createdAt || isoNow(),
          updatedAt: employee.updatedAt || isoNow(),
        })
      );
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  return { projects, publicUsers, workspaceByProjectId };
}

function mergeEmployeeDocs(publicUsers, privateUsers, viewerRole, projects = []) {
  const assignedProjectIdsByUser = {};
  projects.forEach((project) => {
    [project.managerId, ...(project.teamIds || [])].filter(Boolean).forEach((userId) => {
      if (!assignedProjectIdsByUser[userId]) assignedProjectIdsByUser[userId] = new Set();
      assignedProjectIdsByUser[userId].add(project.id);
    });
  });
  return publicUsers
    .filter((user) => user?.status !== "merged" && user?.roleCode !== "INVESTOR")
    .map((user) => {
      const privateDoc = privateUsers[user.id] || {};
      const merged = {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || "",
        roleCode: user.roleCode || "EMPLOYEE",
        role: user.role || user.title || ROLE_META[user.roleCode]?.title || "Xodim",
        dept: user.dept || ROLE_META[user.roleCode]?.dept || "SMM bo'limi",
        title: user.title || user.role || ROLE_META[user.roleCode]?.title || "Xodim",
        status: user.status || "active",
        assignedProjectIds: Array.from(assignedProjectIdsByUser[user.id] || user.assignedProjectIds || []),
        createdAt: user.createdAt || isoNow(),
        updatedAt: user.updatedAt || isoNow(),
        salary: canManagePeople(viewerRole) ? Number(privateDoc.salary || 0) : undefined,
        kpiBase: canManagePeople(viewerRole) ? Number(privateDoc.kpiBase || 80) : 80,
        load: canManagePeople(viewerRole) ? Number(privateDoc.load || 0) : 0,
      };
      return merged;
    });
}

function createNotification(meta, actor) {
  if (!meta?.notifyText) return null;
  return {
    id: makeId("notification"),
    text: meta.notifyText,
    page: meta.page || "dashboard",
    actorId: actor?.uid || "",
    actorName: actor?.name || actor?.email || "Tizim",
    createdAt: isoNow(),
    readBy: actor?.uid ? { [actor.uid]: true } : {},
  };
}

function createAuditEntry(meta, actor) {
  if (meta?.skipAudit) return null;
  return {
    id: makeId("audit"),
    text: meta?.auditText || meta?.notifyText || "CRM ma'lumoti yangilandi",
    actorId: actor?.uid || "",
    actorName: actor?.name || actor?.email || "Tizim",
    createdAt: isoNow(),
  };
}

function finalizeMutationPayload(next, current, meta, actor) {
  const normalized = normalizeCrmPayload(next);
  normalized.employees = upsertEmployee(normalized.employees, actor);

  const notification = createNotification(meta, actor);
  const auditEntry = createAuditEntry(meta, actor);

  normalized.notifications = notification ? [notification, ...current.notifications].slice(0, 250) : normalized.notifications;
  normalized.auditLog = auditEntry ? [auditEntry, ...current.auditLog].slice(0, 400) : normalized.auditLog;
  normalized.meta = { version: 2, updatedAt: isoNow(), updatedBy: actor?.uid || "" };
  return normalized;
}

function calcProjectProgress(project) {
  if (Number.isFinite(project?.metrics?.progress) && !(Array.isArray(project?.tasks) && project.tasks.length)) {
    return Number(project.metrics.progress);
  }
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  if (!tasks.length) return 0;
  const completed = tasks.filter((task) => task.status === "Bajarildi").length;
  return Math.round((completed / tasks.length) * 100);
}

function employeeMetrics(employeeId, projects) {
  const tasks = projects.flatMap((project) =>
    project.tasks.filter((task) => task.ownerId === employeeId).map((task) => ({ ...task, projectId: project.id }))
  );
  const completed = tasks.filter((task) => task.status === "Bajarildi").length;
  const approved = tasks.filter((task) => task.status === "Tasdiqlandi").length;
  const active = tasks.filter((task) => task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda").length;
  const overdue = tasks.filter((task) => task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi").length;
  const total = tasks.length;
  const score = total ? Math.round(clamp(((completed * 1 + approved * 0.85 + active * 0.55) / total) * 100, 10, 100)) : 0;
  return {
    total,
    completed,
    approved,
    active,
    overdue,
    kpi: score,
    projects: projects.filter((project) => project.teamIds.includes(employeeId)).length,
  };
}

function healthScore(projects) {
  const allTasks = projects.flatMap((project) => (Array.isArray(project.tasks) && project.tasks.length ? project.tasks : []));
  if (!allTasks.length && projects.some((project) => project.metrics)) {
    const aggregate = projects.reduce(
      (acc, project) => {
        const metrics = project.metrics || {};
        acc.total += Number(metrics.totalTasks || 0);
        acc.completed += Number(metrics.completedTasks || 0);
        acc.approved += Number(metrics.approvedTasks || 0);
        acc.active += Number(metrics.activeTasks || 0);
        acc.overdue += Number(metrics.overdueTasks || 0);
        return acc;
      },
      { total: 0, completed: 0, approved: 0, active: 0, overdue: 0 }
    );
    if (!aggregate.total) return 55;
    return Math.round(clamp((aggregate.completed / aggregate.total) * 62 + (aggregate.approved / aggregate.total) * 18 + (aggregate.active / aggregate.total) * 10 - aggregate.overdue * 4 + 20, 0, 100));
  }
  if (!allTasks.length) return 55;
  const completed = allTasks.filter((task) => task.status === "Bajarildi").length;
  const active = allTasks.filter((task) => task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda").length;
  const approved = allTasks.filter((task) => task.status === "Tasdiqlandi").length;
  const overdue = allTasks.filter((task) => task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi").length;
  const score = Math.round(clamp((completed / allTasks.length) * 62 + (approved / allTasks.length) * 18 + (active / allTasks.length) * 10 - overdue * 4 + 20, 0, 100));
  return score;
}

function sortByRecent(items, field = "createdAt") {
  return [...items].sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")));
}

function canEdit(role) {
  return EDITOR_ROLES.has(role);
}

function canViewReports(role) {
  return REPORT_ROLES.has(role) || role === "CEO";
}

function canManagePeople(role) {
  return PEOPLE_ROLES.has(role);
}

function canRunRuntimeMigration(role) {
  return ENABLE_RUNTIME_MIGRATION && canManagePeople(role);
}

function isProjectMember(profile, project) {
  if (!profile || !project) return false;
  const assignedProjectIds = Array.isArray(profile.assignedProjectIds) ? profile.assignedProjectIds : [];
  const identityIds = profileIdentityIds(profile);
  return (
    identityIds.has(project.managerId) ||
    (project.teamIds || []).some((teamId) => identityIds.has(teamId)) ||
    assignedProjectIds.includes(project.id)
  );
}

function canWorkInProject(profile, project) {
  if (!profile || !project || profile.role === "INVESTOR") return false;
  return canEdit(profile.role) || isProjectMember(profile, project);
}

function canManageProjectMeta(profile) {
  return canEdit(profile?.role);
}

function projectMembers(project, employees) {
  const ids = new Set([project?.managerId, ...(project?.teamIds || [])].filter(Boolean));
  const list = employees.filter((employee) => ids.has(employee.id));
  return list.length ? list : employees;
}

function visibleProjects(profile, projects) {
  if (!profile) return [];
  if (profile.role === "EMPLOYEE") {
    const assignedProjectIds = new Set(Array.isArray(profile.assignedProjectIds) ? profile.assignedProjectIds : []);
    const identityIds = profileIdentityIds(profile);
    return projects.filter(
      (project) =>
        !project.archived &&
        (
          project.visibility === "company" ||
          identityIds.has(project.managerId) ||
          (project.teamIds || []).some((teamId) => identityIds.has(teamId)) ||
          assignedProjectIds.has(project.id)
        )
    );
  }
  return projects.filter((project) => !project.archived);
}

function visibleShoots(profile, shoots, projects) {
  const allowedProjects = new Set(visibleProjects(profile, projects).map((project) => project.id));
  return shoots.filter((shoot) => allowedProjects.has(shoot.projectId));
}

function visibleEmployees(profile, employees, projects) {
  if (!profile) return [];
  return employees.filter((employee) => employee.roleCode !== "INVESTOR" && employee.status !== "merged");
}

function buildProjectCaches(projects) {
  const progressByProjectId = {};
  const employeeStats = new Map();
  const assignmentsByEmployeeId = new Map();
  let totalTasks = 0;
  let completedTasks = 0;
  let activeProjects = 0;
  let pendingReviews = 0;

  const ensureEmployee = (employeeId) => {
    if (!employeeId) return null;
    if (!employeeStats.has(employeeId)) {
      employeeStats.set(employeeId, { total: 0, completed: 0, approved: 0, active: 0, overdue: 0, projects: 0 });
    }
    return employeeStats.get(employeeId);
  };

  projects.forEach((project) => {
    const progress = calcProjectProgress(project);
    progressByProjectId[project.id] = progress;
    if (project.status === "Jarayonda") activeProjects += 1;
    const pendingReviewCount = Array.isArray(project.contentPlan) && project.contentPlan.length
      ? project.contentPlan.filter((item) => item.status === "Ko'rib chiqilmoqda").length
      : Number(project.metrics?.pendingReviews || 0);
    pendingReviews += pendingReviewCount;

    const memberIds = new Set([project.managerId, ...project.teamIds].filter(Boolean));
    const projectChip = { id: project.id, name: project.name, status: project.status, progress };
    memberIds.forEach((employeeId) => {
      const stats = ensureEmployee(employeeId);
      if (!stats) return;
      stats.projects += 1;
      if (!assignmentsByEmployeeId.has(employeeId)) assignmentsByEmployeeId.set(employeeId, []);
      assignmentsByEmployeeId.get(employeeId).push(projectChip);
    });

    if (Array.isArray(project.tasks) && project.tasks.length) {
      project.tasks.forEach((task) => {
        totalTasks += 1;
        if (task.status === "Bajarildi") completedTasks += 1;
        const stats = ensureEmployee(task.ownerId);
        if (!stats) return;
        stats.total += 1;
        if (task.status === "Bajarildi") stats.completed += 1;
        if (task.status === "Tasdiqlandi") stats.approved += 1;
        if (task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") stats.active += 1;
        if (task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi") stats.overdue += 1;
      });
    } else {
      totalTasks += Number(project.metrics?.totalTasks || 0);
      completedTasks += Number(project.metrics?.completedTasks || 0);
      Object.entries(project.memberStats || {}).forEach(([employeeId, memberStats]) => {
        const stats = ensureEmployee(employeeId);
        if (!stats) return;
        stats.total += Number(memberStats.total || 0);
        stats.completed += Number(memberStats.completed || 0);
        stats.approved += Number(memberStats.approved || 0);
        stats.active += Number(memberStats.active || 0);
        stats.overdue += Number(memberStats.overdue || 0);
      });
    }
  });

  const employeeMetricsById = {};
  employeeStats.forEach((stats, employeeId) => {
    const score = stats.total ? Math.round(clamp(((stats.completed * 1 + stats.approved * 0.85 + stats.active * 0.55) / stats.total) * 100, 10, 100)) : 0;
    employeeMetricsById[employeeId] = { ...stats, kpi: score };
  });

  return {
    progressByProjectId,
    assignmentsByEmployeeId: Object.fromEntries(assignmentsByEmployeeId),
    employeeMetricsById,
    dashboardSummary: { totalTasks, completedTasks, activeProjects, pendingReviews },
  };
}

function flattenPlans(plans = {}) {
  return [
    ...(Array.isArray(plans.daily) ? plans.daily.map((item) => ({ ...item, planType: "daily" })) : []),
    ...(Array.isArray(plans.weekly) ? plans.weekly.map((item) => ({ ...item, planType: "weekly" })) : []),
    ...(Array.isArray(plans.monthly) ? plans.monthly.map((item) => ({ ...item, planType: "monthly" })) : []),
  ];
}

function splitPlans(planItems = []) {
  return planItems.reduce(
    (acc, item) => {
      const planType = item.planType || "daily";
      if (!acc[planType]) acc[planType] = [];
      acc[planType].push(item);
      return acc;
    },
    { daily: [], weekly: [], monthly: [] }
  );
}

function computeProjectMetrics(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const contentPlan = Array.isArray(project.contentPlan) ? project.contentPlan : [];
  const completedTasks = tasks.filter((task) => task.status === "Bajarildi").length;
  const approvedTasks = tasks.filter((task) => task.status === "Tasdiqlandi").length;
  const activeTasks = tasks.filter((task) => task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda").length;
  const overdueTasks = tasks.filter((task) => task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi").length;
  const pendingReviews = contentPlan.filter((item) => item.status === "Ko'rib chiqilmoqda").length;
  const totalTasks = tasks.length;
  return {
    totalTasks,
    completedTasks,
    approvedTasks,
    activeTasks,
    overdueTasks,
    pendingReviews,
    progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

function computeProjectMemberStats(project) {
  const statsByEmployeeId = {};
  (project.tasks || []).forEach((task) => {
    if (!task.ownerId) return;
    if (!statsByEmployeeId[task.ownerId]) {
      statsByEmployeeId[task.ownerId] = { total: 0, completed: 0, approved: 0, active: 0, overdue: 0 };
    }
    const stats = statsByEmployeeId[task.ownerId];
    stats.total += 1;
    if (task.status === "Bajarildi") stats.completed += 1;
    if (task.status === "Tasdiqlandi") stats.approved += 1;
    if (task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") stats.active += 1;
    if (task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi") stats.overdue += 1;
  });
  return statsByEmployeeId;
}

function projectMetaDocFromProject(project, actor, fallback = null) {
  const normalizedProject = normalizeProject(project);
  return {
    name: normalizedProject.name,
    client: normalizedProject.client,
    type: normalizedProject.type,
    start: normalizedProject.start,
    end: normalizedProject.end,
    managerId: normalizedProject.managerId,
    teamIds: normalizedProject.teamIds,
    status: normalizedProject.status,
    priority: normalizedProject.priority,
    visibility: normalizedProject.visibility || "team",
    archived: Boolean(normalizedProject.archived),
    report: normalizedProject.report,
    metrics: computeProjectMetrics(normalizedProject),
    memberStats: computeProjectMemberStats(normalizedProject),
    createdAt: fallback?.createdAt || normalizedProject.createdAt || isoNow(),
    createdBy: fallback?.createdBy || normalizedProject.createdBy || actor?.uid || "",
    updatedAt: isoNow(),
    updatedBy: actor?.uid || "",
  };
}

function hydrateProject(metaProject, workspace = {}) {
  return normalizeProject({
    ...metaProject,
    tasks: workspace.tasks ?? metaProject.tasks ?? [],
    contentPlan: workspace.contentPlan ?? metaProject.contentPlan ?? [],
    mediaPlan: workspace.mediaPlan ?? metaProject.mediaPlan ?? [],
    plans: workspace.plans ?? metaProject.plans ?? { daily: [], weekly: [], monthly: [] },
    calls: workspace.calls ?? metaProject.calls ?? [],
  });
}

function normalizeStoredProjectMeta(id, data) {
  return normalizeProject({
    id,
    ...data,
    tasks: [],
    contentPlan: [],
    mediaPlan: [],
    plans: { daily: [], weekly: [], monthly: [] },
    calls: [],
  });
}

function normalizeStoredUser(id, data) {
  return {
    id,
    uid: data.uid || id,
    email: data.email || "",
    name: data.name || "",
    avatarUrl: data.avatarUrl || "",
    roleCode: data.roleCode || data.role || "EMPLOYEE",
    role: data.role || data.title || ROLE_META[data.roleCode || data.role]?.title || "Xodim",
    title: data.title || data.role || ROLE_META[data.roleCode || data.role]?.title || "Xodim",
    dept: data.dept || ROLE_META[data.roleCode || data.role]?.dept || "SMM bo'limi",
    status: data.status || "active",
    assignedProjectIds: Array.isArray(data.assignedProjectIds) ? data.assignedProjectIds : [],
    createdAt: normalizeDateValue(data.createdAt, isoNow()),
    updatedAt: normalizeDateValue(data.updatedAt, isoNow()),
  };
}

function normalizeStoredPrivateUser(id, data) {
  return {
    id,
    salary: Number(data.salary || 0),
    kpiBase: Number(data.kpiBase || 80),
    load: Number(data.load || 0),
    updatedAt: normalizeDateValue(data.updatedAt, isoNow()),
  };
}

function normalizeStoredRecord(id, data) {
  return {
    id,
    ...data,
    createdAt: normalizeDateValue(data.createdAt, normalizeDateValue(data.clientCreatedAt, isoNow())),
    updatedAt: normalizeDateValue(data.updatedAt, normalizeDateValue(data.createdAt, isoNow())),
    editedAt: normalizeDateValue(data.editedAt, null),
    comments: normalizeComments(data.comments),
  };
}

function buildAssignedProjectIdsMap(projects) {
  const map = {};
  projects.forEach((project) => {
    [project.managerId, ...(project.teamIds || [])].filter(Boolean).forEach((employeeId) => {
      if (!map[employeeId]) map[employeeId] = [];
      if (!map[employeeId].includes(project.id)) map[employeeId].push(project.id);
    });
  });
  return map;
}

function createMetaDocs(meta, actor) {
  const docs = [];
  if (meta?.notifyText) {
    docs.push({
      collection: "notifications",
      id: makeId("notification"),
      data: {
        text: meta.notifyText,
        page: meta.page || "dashboard",
        actorId: actor?.uid || "",
        actorName: actor?.name || actor?.email || "Tizim",
        createdAt: isoNow(),
        readBy: actor?.uid ? { [actor.uid]: true } : {},
      },
    });
  }
  if (!meta?.skipAudit) {
    docs.push({
      collection: "auditLogs",
      id: makeId("audit"),
      data: {
        text: meta?.auditText || meta?.notifyText || "CRM ma'lumoti yangilandi",
        actorId: actor?.uid || "",
        actorName: actor?.name || actor?.email || "Tizim",
        createdAt: isoNow(),
      },
    });
  }
  return docs;
}

async function commitBatchOperations(dbInstance, operations) {
  if (!operations.length) return;
  let batch = writeBatch(dbInstance);
  let count = 0;
  for (const operation of operations) {
    if (operation.type === "set") {
      batch.set(operation.ref, operation.data, operation.options || {});
    } else if (operation.type === "delete") {
      batch.delete(operation.ref);
    }
    count += 1;
    if (count === 400) {
      await batch.commit();
      batch = writeBatch(dbInstance);
      count = 0;
    }
  }
  if (count) {
    await batch.commit();
  }
}

function stableSnapshotValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableSnapshotValue);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSnapshotValue(value[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function recordsEqual(left, right) {
  return JSON.stringify(stableSnapshotValue(left)) === JSON.stringify(stableSnapshotValue(right));
}

function syncCollectionOperations(baseCollection, previousItems, nextItems) {
  const operations = [];
  const prevMap = indexById(previousItems || []);
  const nextMap = indexById(nextItems || []);
  Object.values(nextMap).forEach((item) => {
    const previous = prevMap[item.id];
    if (!previous || !recordsEqual(previous, item)) {
      operations.push({ type: "set", ref: doc(baseCollection, item.id), data: { ...item }, options: { merge: false } });
    }
  });
  Object.keys(prevMap).forEach((id) => {
    if (!nextMap[id]) operations.push({ type: "delete", ref: doc(baseCollection, id) });
  });
  return operations;
}

function legacyRootHasContent(legacyData) {
  const payload = normalizeCrmPayload(legacyData);
  return Boolean(
    payload.projects.length ||
      payload.employees.length ||
      payload.shoots.length ||
      payload.meetings.length ||
      payload.chatMessages.length ||
      payload.notifications.length ||
      payload.auditLog.length
  );
}

async function migrateLegacyRootSchema({ dbInstance, legacyRootRef, actor }) {
  const metaRef = doc(dbInstance, "crmMeta", ROOT_DOC_ID);
  const metaSnapshot = await getDoc(metaRef);
  if (metaSnapshot.exists() && Number(metaSnapshot.data()?.schemaVersion || 0) >= SCHEMA_VERSION) {
    return { migrated: false, reason: "already-migrated" };
  }

  const legacySnapshot = await getDoc(legacyRootRef);
  if (!legacySnapshot.exists() || !legacyRootHasContent(legacySnapshot.data()?.payload)) {
    await setDoc(metaRef, { schemaVersion: SCHEMA_VERSION, migratedAt: isoNow(), migratedBy: actor?.uid || "" }, { merge: true });
    return { migrated: false, reason: "no-legacy-data" };
  }

  const legacy = normalizeCrmPayload(legacySnapshot.data().payload);
  const operations = [];

  legacy.employees.forEach((employee) => {
    const normalized = {
      ...employee,
      id: employee.id || employee.uid || makeId("employee"),
      roleCode: employee.roleCode || "EMPLOYEE",
      createdAt: employee.createdAt || isoNow(),
      updatedAt: employee.updatedAt || isoNow(),
    };
    operations.push({
      type: "set",
      ref: doc(dbInstance, "users", normalized.id),
      data: employeeToPublicDoc(normalized),
      options: { merge: true },
    });
    operations.push({
      type: "set",
      ref: doc(dbInstance, "userPrivate", normalized.id),
      data: employeeToPrivateDoc(normalized),
      options: { merge: true },
    });
  });

  legacy.projects.forEach((project) => {
    const normalizedProject = normalizeProject(project);
    const projectRef = doc(dbInstance, "projects", normalizedProject.id);
    operations.push({
      type: "set",
      ref: projectRef,
      data: projectMetaDocFromProject(normalizedProject, { uid: normalizedProject.updatedBy || actor?.uid || "" }, normalizedProject),
      options: { merge: true },
    });
    syncCollectionOperations(collection(projectRef, "tasks"), [], normalizedProject.tasks).forEach((operation) => operations.push(operation));
    syncCollectionOperations(collection(projectRef, "content"), [], normalizedProject.contentPlan).forEach((operation) => operations.push(operation));
    syncCollectionOperations(collection(projectRef, "mediaPlans"), [], normalizedProject.mediaPlan).forEach((operation) => operations.push(operation));
    syncCollectionOperations(collection(projectRef, "plans"), [], flattenPlans(normalizedProject.plans)).forEach((operation) => operations.push(operation));
    syncCollectionOperations(collection(projectRef, "calls"), [], normalizedProject.calls).forEach((operation) => operations.push(operation));
  });

  legacy.shoots.forEach((shoot) => {
    operations.push({
      type: "set",
      ref: doc(dbInstance, "shoots", shoot.id || makeId("shoot")),
      data: normalizeStoredRecord(shoot.id || makeId("shoot"), shoot),
      options: { merge: true },
    });
  });

  legacy.meetings.forEach((meeting) => {
    operations.push({
      type: "set",
      ref: doc(dbInstance, "meetings", meeting.id || makeId("meeting")),
      data: normalizeStoredRecord(meeting.id || makeId("meeting"), meeting),
      options: { merge: true },
    });
  });

  legacy.chatMessages.forEach((message) => {
    operations.push({
      type: "set",
      ref: doc(dbInstance, "chatMessages", message.id || makeId("chat")),
      data: {
        userId: message.userId || "",
        authorName: message.authorName || "Noma'lum",
        text: message.text || "",
        createdAt: message.createdAt || isoNow(),
        editedAt: message.editedAt || null,
        readBy: message.readBy || (message.userId ? { [message.userId]: true } : {}),
        status: message.status || "sent",
      },
      options: { merge: true },
    });
  });

  legacy.notifications.forEach((item) => {
    operations.push({
      type: "set",
      ref: doc(dbInstance, "notifications", item.id || makeId("notification")),
      data: normalizeStoredRecord(item.id || makeId("notification"), item),
      options: { merge: true },
    });
  });

  legacy.auditLog.forEach((item) => {
    operations.push({
      type: "set",
      ref: doc(dbInstance, "auditLogs", item.id || makeId("audit")),
      data: normalizeStoredRecord(item.id || makeId("audit"), item),
      options: { merge: true },
    });
  });

  const assignedProjectIdsMap = buildAssignedProjectIdsMap(legacy.projects);
  Object.entries(assignedProjectIdsMap).forEach(([employeeId, assignedProjectIds]) => {
    operations.push({
      type: "set",
      ref: doc(dbInstance, "users", employeeId),
      data: { assignedProjectIds, updatedAt: isoNow() },
      options: { merge: true },
    });
  });

  operations.push({
    type: "set",
    ref: metaRef,
    data: { schemaVersion: SCHEMA_VERSION, migratedAt: isoNow(), migratedBy: actor?.uid || "", legacyRoot: legacyRootRef.path },
    options: { merge: true },
  });

  await commitBatchOperations(dbInstance, operations);
  return { migrated: true };
}

function normalizeComments(comments) {
  return Array.isArray(comments) ? comments : [];
}

function createComment(text, actor) {
  return {
    id: makeId("comment"),
    text,
    userId: actor?.uid || "",
    authorName: actor?.name || actor?.email || "Xodim",
    createdAt: isoNow(),
  };
}

function withRecordMeta(record, actor) {
  const now = isoNow();
  return {
    ...record,
    comments: normalizeComments(record.comments),
    createdAt: record.createdAt || now,
    createdBy: record.createdBy || actor?.uid || "",
    updatedAt: now,
    updatedBy: actor?.uid || "",
  };
}

function unreadNotifications(notifications, uid) {
  return notifications.filter((item) => !item.readBy?.[uid]).length;
}

function fieldValue(eventOrValue) {
  if (eventOrValue && eventOrValue.target) {
    if (eventOrValue.target.type === "checkbox") {
      return eventOrValue.target.checked;
    }
    return eventOrValue.target.value;
  }
  return eventOrValue;
}

function pageLabel(page) {
  return {
    dashboard: "Dashboard",
    projects: "Loyihalar",
    team: "Xodimlar",
    shooting: "Syomka",
    meetings: "Uchrashuvlar",
    reports: "Hisobotlar",
    workflow: "Workflow",
    notifications: "Bildirishnomalar",
  }[page] || "CRM";
}

function humanizeAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "Email yoki parol noto'g'ri.",
    "auth/invalid-email": "Email formati noto'g'ri.",
    "auth/user-not-found": "Bunday foydalanuvchi Firebase Authentication ichida topilmadi.",
    "auth/wrong-password": "Parol noto'g'ri.",
    "auth/network-request-failed": "Internet yoki Firebase bilan aloqa xatosi.",
    "auth/too-many-requests": "Juda ko'p urinish bo'ldi. Biroz kutib qayta urinib ko'ring.",
    "auth/popup-closed-by-user": "Google oynasi yopib yuborildi.",
    "auth/popup-blocked": "Brauzer Google oynasini blokladi.",
    "auth/account-exists-with-different-credential": "Bu email boshqa usul bilan ro'yxatdan o'tgan.",
    "permission-denied": "Firestore ruxsatlari yetarli emas. Firebase Console ichida Firestore Rules ni tekshiring.",
    unavailable: "Firestore yoki internet bilan aloqa uzildi. Brauzer tarmoqni bloklamayotganini tekshiring.",
    "resource-exhausted": "Firestore limitiga urildi yoki juda ko'p yozish so'rovi yuborildi.",
  };
  return map[code] || `Firebase xatosi: ${code || error?.message || "noma'lum xato"}`;
}

const Avatar = memo(function Avatar({ name, url, size = 34 }) {
  const palette = [T.colors.accent, T.colors.purple, T.colors.orange, T.colors.green, T.colors.indigo, "#e11d48"];
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: bg,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.max(12, size * 0.35),
        flexShrink: 0,
        letterSpacing: "-0.4px",
      }}
    >
      {url ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
    </div>
  );
});

function Button({ children, variant = "primary", style = {}, ...props }) {
  const variants = {
    primary: { background: T.colors.accent, color: "#ffffff" },
    secondary: { background: T.colors.borderLight, color: T.colors.text },
    ghost: { background: "transparent", color: T.colors.textSecondary },
    danger: { background: T.colors.redSoft, color: T.colors.red },
    success: { background: T.colors.greenSoft, color: "#1a7f37" },
    warning: { background: T.colors.orangeSoft, color: "#b45309" },
  };
  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "none",
        borderRadius: T.radius.md,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontFamily: T.font,
        opacity: props.disabled ? 0.55 : 1,
        transition: "opacity .15s",
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.colors.surface,
        border: `1px solid ${T.colors.border}`,
        borderRadius: T.radius.xl,
        boxShadow: T.shadow.sm,
        padding: T.space.xl,
        cursor: onClick ? "pointer" : "default",
        transition: onClick ? "box-shadow .15s, transform .15s" : undefined,
        ...style,
      }}
      onMouseEnter={(event) => {
        if (onClick) {
          event.currentTarget.style.boxShadow = T.shadow.md;
          event.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(event) => {
        if (onClick) {
          event.currentTarget.style.boxShadow = T.shadow.sm;
          event.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: T.space.xl }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.1, fontWeight: 700 }}>{title}</h1>
        {subtitle ? <p style={{ margin: "4px 0 0", color: T.colors.textSecondary, fontSize: 14 }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", options, placeholder, rows = 4 }) {
  const commonStyle = {
    width: "100%",
    background: T.colors.bg,
    border: `1.5px solid ${T.colors.border}`,
    borderRadius: T.radius.md,
    padding: "9px 12px",
    fontSize: 14,
    color: T.colors.text,
    fontFamily: T.font,
    outline: "none",
    boxSizing: "border-box",
  };
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? <span style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>{label}</span> : null}
      {options ? (
        <select value={value} onChange={(event) => onChange(fieldValue(event))} style={commonStyle}>
          {options.map((option) => {
            if (typeof option === "object") {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            }
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          })}
        </select>
      ) : type === "textarea" ? (
        <textarea rows={rows} value={value} onChange={(event) => onChange(fieldValue(event))} placeholder={placeholder} style={commonStyle} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(fieldValue(event))} placeholder={placeholder} style={commonStyle} />
      )}
    </label>
  );
}

function Modal({ title, children, onClose, width = 860 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: T.space.xl,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          background: T.colors.surfaceElevated,
          borderRadius: T.radius.xl,
          boxShadow: T.shadow.lg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: T.space.xl, borderBottom: `1px solid ${T.colors.border}` }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.colors.borderLight,
              border: "none",
              borderRadius: T.radius.full,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.colors.textSecondary,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: T.space.xl }}>{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ title, desc, icon = "◌" }) {
  return (
    <div style={{ textAlign: "center", color: T.colors.textSecondary, padding: "48px 24px" }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: T.colors.textTertiary }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.colors.text }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>{desc}</div>
    </div>
  );
}

function SkeletonBlock({ height = 16, width = "100%", radius = T.radius.md, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg, rgba(229,229,234,0.6) 0%, rgba(245,245,247,1) 50%, rgba(229,229,234,0.6) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.4s linear infinite",
        ...style,
      }}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} style={{ padding: 18 }}>
            <SkeletonBlock width="42%" height={28} />
            <SkeletonBlock width="68%" height={14} style={{ marginTop: 12 }} />
            <SkeletonBlock width="52%" height={12} style={{ marginTop: 8 }} />
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.85fr)", gap: 18, marginTop: 20 }}>
        <Card><SkeletonBlock height={280} /></Card>
        <Card><SkeletonBlock height={280} /></Card>
      </div>
    </div>
  );
}

function GridSkeleton({ cards = 6, minWidth = 280 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 14 }}>
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={index}>
          <SkeletonBlock width="55%" height={18} />
          <SkeletonBlock width="32%" height={12} style={{ marginTop: 8 }} />
          <SkeletonBlock height={90} style={{ marginTop: 16 }} />
        </Card>
      ))}
    </div>
  );
}

const StatusBadge = memo(function StatusBadge({ value }) {
  const meta = STATUS_META[value] || STATUS_META["Rejalashtirildi"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: meta.bg,
        color: meta.text,
        borderRadius: T.radius.full,
        border: `1px solid ${meta.border}`,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.text }} />
      {value}
    </span>
  );
});

function StatusSelect({ value, options, onChange, disabled }) {
  const meta = STATUS_META[value] || STATUS_META["Rejalashtirildi"];
  if (disabled || !onChange) {
    return <StatusBadge value={value} />;
  }
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        appearance: "none",
        background: meta.bg,
        color: meta.text,
        border: `1px solid ${meta.border}`,
        borderRadius: T.radius.full,
        padding: "6px 28px 6px 12px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: T.font,
        cursor: "pointer",
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const PriorityBadge = memo(function PriorityBadge({ value }) {
  const meta = PRIORITY_META[value] || PRIORITY_META["O'rta"];
  return (
    <span style={{ background: meta.bg, color: meta.text, borderRadius: T.radius.full, padding: "5px 10px", fontSize: 12, fontWeight: 800 }}>
      {value}
    </span>
  );
});

function CommentThread({ comments = [], onAddComment, placeholder = "Izoh qoldiring...", accent = T.colors.accent }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const list = sortByRecent(normalizeComments(comments), "createdAt").slice(0, open ? comments.length : 2);

  function submit() {
    const text = value.trim();
    if (!text || !onAddComment) return;
    onAddComment(text);
    setValue("");
    setOpen(true);
  }

  return (
    <div style={{ minWidth: 180 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ border: "none", background: T.colors.borderLight, color: accent, borderRadius: T.radius.full, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
      >
        {comments.length ? `${comments.length} ta izoh` : "Izoh qo'shish"}
      </button>
      {(open || comments.length) ? (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {list.length ? (
            list.map((comment) => (
              <div key={comment.id} style={{ background: "#fff", border: `1px solid ${T.colors.borderLight}`, borderRadius: T.radius.md, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>{comment.authorName || "Xodim"}</span>
                  <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{String(comment.createdAt || "").slice(5, 16).replace("T", " ")}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: T.colors.textSecondary }}>{comment.text}</div>
              </div>
            ))
          ) : null}
          {onAddComment ? (
            <div style={{ display: "grid", gap: 6 }}>
              <textarea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                rows={2}
                style={{ width: "100%", border: `1px solid ${T.colors.border}`, borderRadius: T.radius.md, padding: "9px 10px", resize: "vertical", background: "#fff", fontFamily: T.font, fontSize: 12 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={submit} style={{ padding: "6px 10px" }}>Yuborish</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(EMOJI_GROUPS[0].id);
  const group = EMOJI_GROUPS.find((item) => item.id === activeGroup) || EMOJI_GROUPS[0];

  return (
    <Card style={{ position: "absolute", bottom: "calc(100% + 12px)", left: 0, width: 320, padding: 12, boxShadow: T.shadow.lg, zIndex: 25 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Emoji picker</div>
        <button type="button" onClick={onClose} style={{ border: "none", background: T.colors.borderLight, color: T.colors.textSecondary, width: 26, height: 26, borderRadius: T.radius.full, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {EMOJI_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveGroup(item.id)}
            style={{
              border: "none",
              borderRadius: T.radius.full,
              background: item.id === activeGroup ? T.colors.accentSoft : T.colors.borderLight,
              color: item.id === activeGroup ? T.colors.accent : T.colors.textSecondary,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.colors.textSecondary, marginBottom: 8 }}>{group.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
        {group.items.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            style={{ border: "none", background: T.colors.bg, borderRadius: T.radius.md, padding: "9px 0", cursor: "pointer", fontSize: 18 }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </Card>
  );
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", right: 22, bottom: 22, zIndex: 1400, display: "grid", gap: 10, width: 320 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: "12px 14px",
            borderRadius: T.radius.lg,
            background: toast.tone === "error" ? T.colors.redSoft : "#ffffff",
            color: toast.tone === "error" ? T.colors.red : T.colors.text,
            border: `1px solid ${toast.tone === "error" ? "#fecaca" : T.colors.border}`,
            boxShadow: T.shadow.md,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 2 }}>{toast.tone === "error" ? "Xatolik" : "Muvaffaqiyatli"}</div>
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>{toast.text}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint, color }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>{hint}</div>
    </Card>
  );
}

function DataTable({ columns, children }) {
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.colors.border}`, borderRadius: T.radius.lg }}>
      <table style={{ width: "100%", minWidth: 840, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.colors.bg }}>
            {columns.map((column) => (
              <th
                key={column}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.colors.textSecondary,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ children }) {
  return <tr>{children}</tr>;
}

function Cell({ children, style = {} }) {
  return <td style={{ padding: "11px 14px", borderTop: `1px solid ${T.colors.borderLight}`, fontSize: 13.5, verticalAlign: "top", ...style }}>{children}</td>;
}

const CircleProgress = memo(function CircleProgress({ pct, size = 66, stroke = 6, color = T.colors.accent }) {
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (circumference * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.colors.borderLight} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
    </svg>
  );
});

function TeamSelector({ employees, value, onChange }) {
  const nextValue = Array.isArray(value) ? value : [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {employees.map((employee) => {
        const active = nextValue.includes(employee.id);
        return (
          <button
            key={employee.id}
            type="button"
            onClick={() => onChange(active ? nextValue.filter((item) => item !== employee.id) : [...nextValue, employee.id])}
            style={{
              border: `1px solid ${active ? T.colors.accent : T.colors.border}`,
              background: active ? T.colors.accentSoft : T.colors.bg,
              color: active ? T.colors.accent : T.colors.textMuted,
              borderRadius: T.radius.full,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {employee.name}
          </button>
        );
      })}
    </div>
  );
}

function SetupScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f5f7 0%, #e8f0fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ maxWidth: 780 }}>
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Firebase sozlamasi kerak</h1>
        <p style={{ color: T.colors.textMuted, lineHeight: 1.7 }}>
          Bu yangi CRM versiyasi Google login va barcha ma'lumotlarni doimiy saqlash uchun Firebase ishlatadi.
          Davom etishdan oldin <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Firebase Console</a> da loyiha ochib, <code>.env</code> fayliga qiymatlarni yozing.
        </p>
        <Card style={{ background: T.colors.bg, borderStyle: "dashed", marginTop: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>.env namuna</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: T.colors.textMuted, fontSize: 13 }}>
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
          </pre>
        </Card>
        <p style={{ marginTop: 18, color: T.colors.textMuted, lineHeight: 1.7 }}>
          Firebase Authentication ichida quyidagi email/parol rollarni alohida yarating: <code>ceo@agency.uz</code>, <code>manager@agency.uz</code>, <code>boshqaruvchi@agency.uz</code>, <code>investor@agency.uz</code>.
          Xodimlar esa Google orqali ro'yxatdan o'tadi.
        </p>
      </Card>
    </div>
  );
}

function AuthScreen({ busy, error, onEmailLogin, onGoogleRegister, onGoogleLogin }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", dept: "SMM bo'limi", title: "Xodim" });

  function updateLogin(key, value) {
    setLoginForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateRegister(key, value) {
    setRegisterForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f5f7 0%, #e8f0fe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <Card style={{ padding: 28 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: T.colors.accent, color: "#fff", fontSize: 26, fontWeight: 900, boxShadow: `0 8px 24px ${T.colors.accent}33` }}>
              CRM
            </div>
            <h1 style={{ margin: "16px 0 8px" }}>Agency CRM</h1>
            <p style={{ margin: 0, color: T.colors.textMuted, lineHeight: 1.6 }}>
              Demo emas. Real Google ro'yxatdan o'tish va doimiy saqlanadigan ish muhiti.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, background: T.colors.bg, borderRadius: T.radius.md, padding: 3, marginBottom: 24 }}>
            {[
              { id: "login", label: "Kirish" },
              { id: "register", label: "Ro'yxatdan o'tish" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                style={{
                flex: 1,
                border: "none",
                borderRadius: T.radius.sm,
                padding: "9px 12px",
                fontWeight: 600,
                fontFamily: T.font,
                background: mode === tab.id ? "#ffffff" : "transparent",
                color: mode === tab.id ? T.colors.text : T.colors.textSecondary,
                boxShadow: mode === tab.id ? T.shadow.sm : "none",
                cursor: "pointer",
              }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Email" type="email" value={loginForm.email} onChange={(value) => updateLogin("email", value)} placeholder="ceo@agency.uz" />
              <Field label="Parol" type="password" value={loginForm.password} onChange={(value) => updateLogin("password", value)} placeholder="Parol" />
              {error ? <div style={{ padding: "10px 12px", background: T.colors.redSoft, color: T.colors.red, borderRadius: T.radius.md, fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
              <Button onClick={() => onEmailLogin(loginForm.email, loginForm.password)} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>
                {busy ? "Kutilmoqda..." : "Email va parol bilan kirish"}
              </Button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: T.colors.textMuted, fontSize: 12 }}>
                <span style={{ flex: 1, height: 1, background: T.colors.border }} />
                yoki
                <span style={{ flex: 1, height: 1, background: T.colors.border }} />
              </div>
              <Button variant="secondary" onClick={onGoogleLogin} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>
                Google bilan kirish
              </Button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Ism familiya" value={registerForm.name} onChange={(value) => updateRegister("name", value)} placeholder="Ali Valiyev" />
              <Field label="Bo'lim" options={DEPARTMENTS.filter((dept) => dept !== "Boshqaruv")} value={registerForm.dept} onChange={(value) => updateRegister("dept", value)} />
              <Field label="Lavozim" value={registerForm.title} onChange={(value) => updateRegister("title", value)} placeholder="SMM mutaxassisi" />
              {error ? <div style={{ padding: "10px 12px", background: T.colors.redSoft, color: T.colors.red, borderRadius: T.radius.md, fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
              <Button onClick={() => onGoogleRegister(registerForm)} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>
                {busy ? "Kutilmoqda..." : "Google orqali xodim sifatida ro'yxatdan o'tish"}
              </Button>
              <p style={{ margin: 0, color: T.colors.textMuted, fontSize: 12, lineHeight: 1.6 }}>
                CEO, investor, boshqaruvchi va menejer akkauntlari email/parol orqali kiradi. Xodimlar Google orqali ro'yxatdan o'tadi.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Sidebar({ profile, page, onNavigate, onLogout, unreadCount }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "projects", label: "Loyihalar", icon: "◫" },
    { id: "team", label: "Xodimlar", icon: "◉" },
    { id: "shooting", label: "Syomka", icon: "◎" },
    { id: "meetings", label: "Uchrashuvlar", icon: "◷" },
    { id: "notifications", label: "Bildirishnomalar", badge: unreadCount, icon: "◌" },
    ...(canViewReports(profile.role) ? [{ id: "reports", label: "Hisobotlar", icon: "◈" }] : []),
    { id: "workflow", label: "Workflow", icon: "⋯" },
  ];

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: T.colors.surface,
        borderRight: `1px solid ${T.colors.border}`,
        padding: "16px 10px",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 28 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.colors.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
          CRM
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>AgencyCRM</div>
          <div style={{ fontSize: 11, color: T.colors.textTertiary }}>{ROLE_META[profile.role]?.label || profile.role}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 2, flex: 1 }}>
        {items.map((item) => {
          const active = item.id === page;
          const blink = item.id === "notifications" && Number(item.badge || 0) > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                border: "none",
                borderRadius: T.radius.md,
                padding: "9px 12px",
                cursor: "pointer",
                background: active ? T.colors.accent : "transparent",
                color: active ? "#fff" : T.colors.textSecondary,
                fontWeight: 600,
                fontSize: 13.5,
                fontFamily: T.font,
                position: "relative",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon || "•"}</span>
              <span>{item.label}</span>
              {item.badge ? (
                <span
                  style={{
                    marginLeft: "auto",
                    minWidth: 22,
                    height: 22,
                    borderRadius: T.radius.full,
                    background: active ? "#ffffff" : T.colors.red,
                    color: active ? T.colors.red : "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 900,
                    boxShadow: blink ? "0 0 0 0 rgba(220, 38, 38, 0.7)" : "none",
                    animation: blink ? "sidebarPulse 1.2s infinite" : "none",
                  }}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: `1px solid ${T.colors.border}`, paddingTop: 14, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", marginBottom: 10 }}>
          <Avatar name={profile.name} url={profile.avatarUrl} size={32} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name.split(" ")[0]}</div>
            <div style={{ fontSize: 11, color: T.colors.textTertiary }}>{profile.dept}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            width: "100%",
            background: T.colors.borderLight,
            border: "none",
            borderRadius: T.radius.md,
            padding: "8px",
            fontSize: 13,
            color: T.colors.textSecondary,
            cursor: "pointer",
            fontFamily: T.font,
            fontWeight: 600,
          }}
        >
          Chiqish
        </button>
      </div>
    </aside>
  );
}

function MotivationGauge({ score }) {
  const safeScore = clamp(score, 0, 100);
  const left = `${safeScore}%`;
  const label = safeScore >= 75 ? "Ishlar juda yaxshi" : safeScore >= 50 ? "Jarayon nazoratda" : safeScore >= 30 ? "Tezkor e'tibor kerak" : "Kritik signal";
  return (
    <Card style={{ marginTop: 22, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Motivatsion ko'rsatkich</div>
          <div style={{ marginTop: 8, color: T.colors.textMuted, lineHeight: 1.7 }}>
            Agentlik va jamoa holati umumiy task bajarilishi, ortda qolgan deadline va tasdiq holatlariga qarab hisoblanadi.
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: safeScore >= 70 ? T.colors.green : safeScore >= 40 ? T.colors.orange : T.colors.red }}>{safeScore}%</div>
      </div>
      <div style={{ marginTop: 22, position: "relative", paddingTop: 18 }}>
        <div
          style={{
            height: 22,
            borderRadius: T.radius.full,
            background: "linear-gradient(90deg, #dc2626 0%, #f59e0b 45%, #16a34a 100%)",
            overflow: "hidden",
            border: `1px solid ${T.colors.border}`,
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", marginTop: 8, color: T.colors.textMuted, fontSize: 11, fontWeight: 700 }}>
          {["Past", "Xavf", "Nazorat", "Yaxshi", "A'lo"].map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            left,
            transform: "translateX(-50%)",
            width: 18,
            height: 50,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 6, height: 50, borderRadius: T.radius.full, background: "#0f172a" }} />
        </div>
      </div>
      <div style={{ marginTop: 14, fontWeight: 800, color: T.colors.text }}>{label}</div>
    </Card>
  );
}

const DashboardPage = memo(function DashboardPage({ profile, projects, employees, employeeMetricsById, progressByProjectId, dashboardSummary, loading, onOpenProject }) {
  const score = healthScore(projects);
  const employeeMap = useMemo(() => indexById(employees), [employees]);

  const ranking = employees
    .map((employee) => ({
      employee,
      metrics: employeeMetricsById[employee.id] || { total: 0, completed: 0, approved: 0, active: 0, overdue: 0, kpi: 0, projects: 0 },
    }))
    .sort((a, b) => {
      if (b.metrics.kpi !== a.metrics.kpi) return b.metrics.kpi - a.metrics.kpi;
      return b.metrics.completed - a.metrics.completed;
    });

  const topEmployee = ranking[0];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Xush kelibsiz, ${profile.name}. Bugungi holat real CRM ma'lumotlari bilan hisoblanmoqda.`} />

      {loading ? <DashboardSkeleton /> : null}
      {!loading ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <StatCard label="Loyihalar" value={projects.length} hint={`${dashboardSummary.activeProjects} tasi faol`} color={T.colors.accent} />
            <StatCard label="Tasklar" value={`${dashboardSummary.completedTasks}/${dashboardSummary.totalTasks}`} hint="Bajarilgan ishlar" color={T.colors.green} />
            <StatCard label="Xodimlar" value={employees.length} hint="Real foydalanuvchilar" color={T.colors.purple} />
            <StatCard label="Tasdiq kutmoqda" value={dashboardSummary.pendingReviews} hint="Kontent ko'rib chiqilmoqda" color={T.colors.orange} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.85fr)", gap: 18, marginTop: 20 }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>Loyihalar holati</div>
                  <div style={{ color: T.colors.textMuted, fontSize: 13, marginTop: 4 }}>Status va progress bo'yicha tez ko'rinish</div>
                </div>
              </div>
              {projects.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {projects.map((project) => {
                    const manager = employeeMap[project.managerId];
                    const progress = progressByProjectId[project.id] ?? calcProjectProgress(project);
                    const progressColor = progress >= 75 ? T.colors.green : progress >= 40 ? T.colors.accent : T.colors.orange;
                    return (
                      <div key={project.id} onClick={() => onOpenProject(project.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px", borderRadius: T.radius.md, cursor: "pointer" }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <CircleProgress pct={progress} size={54} stroke={5} color={progressColor} />
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: progressColor }}>{progress}%</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{project.name}</div>
                          <div style={{ marginTop: 2, color: T.colors.textSecondary, fontSize: 12 }}>{project.client} · {project.type || "Xizmat turi kiritilmagan"}</div>
                          <div style={{ marginTop: 4 }}>
                            <StatusBadge value={project.status} />
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <PriorityBadge value={project.priority} />
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, justifyContent: "flex-end" }}>
                            {manager ? <Avatar name={manager.name} url={manager.avatarUrl} size={20} /> : null}
                            <span style={{ fontSize: 11, color: T.colors.textSecondary }}>{manager?.name?.split(" ")[0] || "Manager"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Hali loyiha yo'q" desc="CEO, menejer yoki boshqaruvchi birinchi loyihani yaratgach dashboard to'ladi." />
              )}
            </Card>

            <div style={{ display: "grid", gap: 18 }}>
              <Card>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Oyning eng kuchli xodimi</div>
                {topEmployee ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar name={topEmployee.employee.name} url={topEmployee.employee.avatarUrl} size={58} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>{topEmployee.employee.name}</div>
                        <div style={{ color: T.colors.textMuted, fontSize: 13 }}>{topEmployee.employee.role} · {topEmployee.employee.dept}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
                      <StatCard label="KPI" value={`${topEmployee.metrics.kpi}%`} hint="Umumiy natija" color={T.colors.accent} />
                      <StatCard label="Bajarildi" value={topEmployee.metrics.completed} hint="Task soni" color={T.colors.green} />
                      <StatCard label="Loyihalar" value={topEmployee.metrics.projects} hint="Biriktirilgan" color={T.colors.purple} />
                    </div>
                  </>
                ) : (
                  <div style={{ color: T.colors.textMuted }}>Xodimlar va tasklar paydo bo'lgach ranking hisoblanadi.</div>
                )}
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Jamoa yuklamasi</div>
                {employees.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {employees.map((employee) => {
                      const metrics = employeeMetricsById[employee.id] || { active: 0, projects: 0 };
                      const load = clamp(metrics.active * 18 + metrics.projects * 10, 0, 100);
                      return (
                        <div key={employee.id}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{employee.name}</div>
                            <div style={{ fontSize: 12, color: T.colors.textMuted }}>{load}%</div>
                          </div>
                          <div style={{ height: 8, borderRadius: T.radius.full, background: T.colors.borderLight, overflow: "hidden" }}>
                            <div style={{ width: `${load}%`, height: "100%", background: load > 75 ? T.colors.orange : T.colors.blue }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: T.colors.textMuted }}>Jamoa ma'lumoti hali yo'q.</div>
                )}
              </Card>
            </div>
          </div>

          <MotivationGauge score={score} />
        </>
      ) : null}
    </div>
  );
});

function ProjectFormModal({ employees, initialValue, onClose, onSubmit }) {
  const [form, setForm] = useState(
    initialValue || {
      name: "",
      client: "",
      type: "",
      start: "",
      end: "",
      managerId: employees[0]?.id || "",
      teamIds: [],
      status: "Rejalashtirildi",
      priority: "O'rta",
    }
  );

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.client.trim()) return;
    onSubmit({ ...form, teamIds: Array.from(new Set([...form.teamIds, form.managerId].filter(Boolean))) });
  }

  return (
    <Modal title={initialValue ? "Loyihani tahrirlash" : "Yangi loyiha"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <Field label="Loyiha nomi" value={form.name} onChange={(value) => update("name", value)} />
        <Field label="Mijoz" value={form.client} onChange={(value) => update("client", value)} />
        <Field label="Xizmat turi" value={form.type} onChange={(value) => update("type", value)} />
        <Field label="Manager" value={form.managerId} onChange={(value) => update("managerId", value)} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
        <Field label="Boshlanish" type="date" value={form.start} onChange={(value) => update("start", value)} />
        <Field label="Deadline" type="date" value={form.end} onChange={(value) => update("end", value)} />
        <Field label="Loyiha statusi" value={form.status} onChange={(value) => update("status", value)} options={PROJECT_STATUSES} />
        <Field label="Muhimlik" value={form.priority} onChange={(value) => update("priority", value)} options={PRIORITIES} />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.colors.textMuted, marginBottom: 8 }}>Jamoa</div>
        <TeamSelector employees={employees} value={form.teamIds} onChange={(value) => update("teamIds", value)} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Bekor</Button>
        <Button onClick={handleSubmit}>Saqlash</Button>
      </div>
    </Modal>
  );
}

function ReportEditor({ project, editable, onChange }) {
  const report = project.report;
  return (
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[
          { key: "budget", label: "Byudjet", suffix: " so'm" },
          { key: "leads", label: "Lidlar" },
          { key: "cpl", label: "CPL", suffix: " so'm" },
          { key: "sales", label: "Sotuvlar" },
          { key: "roi", label: "ROI" },
        ].map((item) => (
          <Card key={item.key} style={{ padding: 16, background: T.colors.bg }}>
            <div style={{ color: T.colors.textMuted, fontSize: 12, fontWeight: 800 }}>{item.label}</div>
            {editable ? (
              <input
                type="number"
                value={report[item.key]}
                onChange={(event) => onChange({ ...report, [item.key]: Number(event.target.value || 0) })}
                style={{ width: "100%", marginTop: 10, border: `1px solid ${T.colors.border}`, borderRadius: T.radius.md, padding: "10px 12px", fontFamily: T.font, fontSize: 14 }}
              />
            ) : (
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>
                {item.key === "roi" ? report[item.key] : `${toMoney(report[item.key])}${item.suffix || ""}`}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Card>
  );
}

const TasksTab = memo(function TasksTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [editingTask, setEditingTask] = useState(null);
  const [draft, setDraft] = useState({ name: "", ownerId: assignableEmployees[0]?.id || "", start: "", deadline: "", status: "Rejalashtirildi", note: "", comments: [] });

  function openForEdit(task) {
    setEditingTask(task.id);
    setDraft({ ...task });
  }

  function resetForm() {
    setEditingTask(null);
    setDraft({ name: "", ownerId: assignableEmployees[0]?.id || "", start: "", deadline: "", status: "Rejalashtirildi", note: "", comments: [] });
  }

  function saveTask() {
    if (!draft.name.trim()) return;
    const tasks = editingTask
      ? project.tasks.map((task) => (task.id === editingTask ? withRecordMeta({ ...task, ...draft }, profile) : task))
      : [...project.tasks, withRecordMeta({ ...draft, id: makeId("task") }, profile)];
    onUpdateProject({ ...project, tasks }, { notifyText: `Task yangilandi: ${draft.name}`, auditText: `Task saqlandi: ${draft.name}`, page: "projects" });
    resetForm();
  }

  function updateTaskStatus(taskId, status) {
    onUpdateProject(
      { ...project, tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)) },
      { notifyText: "Task holati yangilandi", auditText: `Task statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(taskId, text) {
    onUpdateProject(
      {
        ...project,
        tasks: project.tasks.map((task) =>
          task.id === taskId ? { ...task, comments: [...normalizeComments(task.comments), createComment(text, profile)] } : task
        ),
      },
      { notifyText: "Task izohi qo'shildi", auditText: "Taskga izoh qo'shildi", page: "projects" }
    );
  }

  function deleteTask(taskId) {
    if (!window.confirm("Task o'chirilsinmi?")) return;
    onUpdateProject({ ...project, tasks: project.tasks.filter((task) => task.id !== taskId) }, { notifyText: "Task o'chirildi", auditText: "Task o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Topshiriqlar</div>
        {sectionEditable ? <Button onClick={resetForm}>Yangi task</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Task nomi" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Boshlanish" type="date" value={draft.start} onChange={(value) => setDraft((prev) => ({ ...prev, start: value }))} />
            <Field label="Deadline" type="date" value={draft.deadline} onChange={(value) => setDraft((prev) => ({ ...prev, deadline: value }))} />
            <Field label="Status" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={TASK_STATUSES} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingTask ? <Button variant="secondary" onClick={resetForm}>Bekor</Button> : null}
            <Button onClick={saveTask}>{editingTask ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.tasks.length ? (
        <DataTable columns={["Task", "Mas'ul", "Boshlanish", "Deadline", "Holat", "Izoh", "Komment", "Amal"]}>
          {project.tasks.map((task) => {
            const owner = employeeMap[task.ownerId];
            const canChangeStatus = sectionEditable;
            return (
              <Row key={task.id}>
                <Cell style={{ fontWeight: 800 }}>{task.name}</Cell>
                <Cell>{owner?.name || "Biriktirilmagan"}</Cell>
                <Cell>{task.start || "-"}</Cell>
                <Cell style={{ fontWeight: 800 }}>{task.deadline || "-"}</Cell>
                <Cell>
                  <StatusSelect value={task.status} options={TASK_STATUSES} onChange={canChangeStatus ? (status) => updateTaskStatus(task.id, status) : null} disabled={!canChangeStatus} />
                </Cell>
                <Cell style={{ color: T.colors.textMuted }}>{task.note || "-"}</Cell>
                <Cell>
                  <CommentThread comments={task.comments} onAddComment={sectionEditable ? (text) => addComment(task.id, text) : null} placeholder="Task bo'yicha izoh yozing..." />
                </Cell>
                <Cell>
                  {sectionEditable ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" onClick={() => openForEdit(task)} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                      <Button variant="danger" onClick={() => deleteTask(task.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                    </div>
                  ) : (
                    "-"
                  )}
                </Cell>
              </Row>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState title="Tasklar yo'q" desc="Yangi task qo'shilgach shu yerda ko'rinadi." />
      )}
    </Card>
  );
});

const ContentPlanTab = memo(function ContentPlanTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", ownerId: assignableEmployees[0]?.id || "", status: "Rejalashtirildi", note: "", comments: [] });
  const [editingId, setEditingId] = useState("");

  function reset() {
    setDraft({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", ownerId: assignableEmployees[0]?.id || "", status: "Rejalashtirildi", note: "", comments: [] });
    setEditingId("");
  }

  function save() {
    if (!draft.topic.trim()) return;
    const contentPlan = editingId
      ? project.contentPlan.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft }, profile) : item))
      : [...project.contentPlan, withRecordMeta({ ...draft, id: makeId("content") }, profile)];
    onUpdateProject({ ...project, contentPlan }, { notifyText: "Kontent reja yangilandi", auditText: `Kontent saqlandi: ${draft.topic}`, page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, contentPlan: project.contentPlan.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Kontent holati o'zgardi", auditText: `Kontent statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        contentPlan: project.contentPlan.map((item) =>
          item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
        ),
      },
      { notifyText: "Kontentga izoh qo'shildi", auditText: "Kontentga izoh qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Kontent yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, contentPlan: project.contentPlan.filter((item) => item.id !== id) }, { notifyText: "Kontent yozuvi o'chirildi", auditText: "Kontent yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Kontent reja</div>
        {sectionEditable ? <Button onClick={reset}>Yangi kontent</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Platforma" value={draft.platform} onChange={(value) => setDraft((prev) => ({ ...prev, platform: value }))} options={PLATFORMS} />
            <Field label="Format" value={draft.format} onChange={(value) => setDraft((prev) => ({ ...prev, format: value }))} options={FORMATS} />
            <Field label="Mavzu" value={draft.topic} onChange={(value) => setDraft((prev) => ({ ...prev, topic: value }))} />
            <Field label="Caption" value={draft.caption} onChange={(value) => setDraft((prev) => ({ ...prev, caption: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={CONTENT_STATUSES} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.contentPlan.length ? (
        <DataTable columns={["Sana", "Platforma", "Format", "Mavzu", "Mas'ul", "Holat", "Izoh", "Komment", "Amal"]}>
          {project.contentPlan.map((item) => {
            const owner = employeeMap[item.ownerId];
            const canChangeStatus = sectionEditable;
            return (
              <Row key={item.id}>
                <Cell>{item.date || "-"}</Cell>
                <Cell>{item.platform}</Cell>
                <Cell>{item.format}</Cell>
                <Cell style={{ fontWeight: 800 }}>{item.topic}</Cell>
                <Cell>{owner?.name || "Biriktirilmagan"}</Cell>
                <Cell>
                  <StatusSelect value={item.status} options={CONTENT_STATUSES} onChange={canChangeStatus ? (status) => updateStatus(item.id, status) : null} disabled={!canChangeStatus} />
                </Cell>
                <Cell style={{ color: T.colors.textMuted }}>{item.note || "-"}</Cell>
                <Cell>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Kontent izohi..." />
                </Cell>
                <Cell>
                  {sectionEditable ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                      <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                    </div>
                  ) : (
                    "-"
                  )}
                </Cell>
              </Row>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState title="Kontent reja yo'q" desc="Kontent yozuvlari shu yerda boshqariladi." />
      )}
    </Card>
  );
});

const MediaPlanTab = memo(function MediaPlanTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({ date: "", type: "Post", platform: "Instagram", format: "Post", ownerId: assignableEmployees[0]?.id || "", budget: "", status: "Rejalashtirildi", note: "", comments: [] });
  const [editingId, setEditingId] = useState("");

  function reset() {
    setDraft({ date: "", type: "Post", platform: "Instagram", format: "Post", ownerId: assignableEmployees[0]?.id || "", budget: "", status: "Rejalashtirildi", note: "", comments: [] });
    setEditingId("");
  }

  function save() {
    const mediaPlan = editingId
      ? project.mediaPlan.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft, budget: Number(draft.budget || 0) }, profile) : item))
      : [...project.mediaPlan, withRecordMeta({ ...draft, id: makeId("media"), budget: Number(draft.budget || 0) }, profile)];
    onUpdateProject({ ...project, mediaPlan }, { notifyText: "Media plan yangilandi", auditText: "Media plan saqlandi", page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, mediaPlan: project.mediaPlan.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Media plan holati o'zgardi", auditText: `Media plan statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        mediaPlan: project.mediaPlan.map((item) =>
          item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
        ),
      },
      { notifyText: "Mediaplan izohi qo'shildi", auditText: "Mediaplan izohi qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Media plan yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, mediaPlan: project.mediaPlan.filter((item) => item.id !== id) }, { notifyText: "Media plan yozuvi o'chirildi", auditText: "Media plan yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Media plan</div>
        {sectionEditable ? <Button onClick={reset}>Yangi yozuv</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={FORMATS} />
            <Field label="Platforma" value={draft.platform} onChange={(value) => setDraft((prev) => ({ ...prev, platform: value }))} options={PLATFORMS} />
            <Field label="Format" value={draft.format} onChange={(value) => setDraft((prev) => ({ ...prev, format: value }))} options={FORMATS} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Byudjet" type="number" value={draft.budget} onChange={(value) => setDraft((prev) => ({ ...prev, budget: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={PLAN_STATUSES} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.mediaPlan.length ? (
        <DataTable columns={["Sana", "Tur", "Platforma", "Mas'ul", "Byudjet", "Holat", "Izoh", "Komment", "Amal"]}>
          {project.mediaPlan.map((item) => {
            const owner = employeeMap[item.ownerId];
            const canChangeStatus = sectionEditable;
            return (
              <Row key={item.id}>
                <Cell>{item.date || "-"}</Cell>
                <Cell>{item.type}</Cell>
                <Cell>{item.platform}</Cell>
                <Cell>{owner?.name || "Biriktirilmagan"}</Cell>
                <Cell>{toMoney(item.budget)} so'm</Cell>
                <Cell>
                  <StatusSelect value={item.status} options={PLAN_STATUSES} onChange={canChangeStatus ? (status) => updateStatus(item.id, status) : null} disabled={!canChangeStatus} />
                </Cell>
                <Cell style={{ color: T.colors.textMuted }}>{item.note || "-"}</Cell>
                <Cell>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Mediaplan izohi..." />
                </Cell>
                <Cell>
                  {sectionEditable ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item, budget: String(item.budget || "") }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                      <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                    </div>
                  ) : (
                    "-"
                  )}
                </Cell>
              </Row>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState title="Media plan yo'q" desc="Byudjet va media yozuvlarini shu yerda qo'shing." />
      )}
    </Card>
  );
});

const PlansTab = memo(function PlansTab({ profile, project, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const [planType, setPlanType] = useState("daily");
  const [draft, setDraft] = useState({ title: "", status: "Rejalashtirildi", taskId: "", note: "", date: "", week: "", month: "", comments: [] });
  const [editingId, setEditingId] = useState("");
  const currentItems = project.plans?.[planType] || [];

  function reset() {
    setDraft({ title: "", status: "Rejalashtirildi", taskId: "", note: "", date: "", week: "", month: "", comments: [] });
    setEditingId("");
  }

  function save() {
    if (!draft.title.trim()) return;
    const list = editingId
      ? currentItems.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft }, profile) : item))
      : [...currentItems, withRecordMeta({ ...draft, id: makeId("plan") }, profile)];
    onUpdateProject(
      { ...project, plans: { ...project.plans, [planType]: list } },
      { notifyText: "Reja yangilandi", auditText: `Reja saqlandi: ${draft.title}`, page: "projects" }
    );
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, plans: { ...project.plans, [planType]: currentItems.map((item) => (item.id === id ? { ...item, status } : item)) } },
      { notifyText: "Reja holati o'zgardi", auditText: `Reja statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        plans: {
          ...project.plans,
          [planType]: currentItems.map((item) =>
            item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
          ),
        },
      },
      { notifyText: "Rejaga izoh qo'shildi", auditText: "Rejaga izoh qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Reja o'chirilsinmi?")) return;
    onUpdateProject(
      { ...project, plans: { ...project.plans, [planType]: currentItems.filter((item) => item.id !== id) } },
      { notifyText: "Reja o'chirildi", auditText: "Reja o'chirildi", page: "projects" }
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "daily", label: "Kunlik" },
            { id: "weekly", label: "Haftalik" },
            { id: "monthly", label: "Oylik" },
          ].map((tab) => (
            <Button key={tab.id} variant={planType === tab.id ? "primary" : "secondary"} onClick={() => setPlanType(tab.id)} style={{ padding: "8px 12px" }}>
              {tab.label}
            </Button>
          ))}
        </div>
        {sectionEditable ? <Button onClick={reset}>Yangi reja</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {planType === "daily" ? <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} /> : null}
            {planType === "weekly" ? <Field label="Hafta" value={draft.week} onChange={(value) => setDraft((prev) => ({ ...prev, week: value }))} placeholder="Mar 11 - Mar 17" /> : null}
            {planType === "monthly" ? <Field label="Oy" value={draft.month} onChange={(value) => setDraft((prev) => ({ ...prev, month: value }))} placeholder="Mart 2026" /> : null}
            <Field label="Sarlavha" value={draft.title} onChange={(value) => setDraft((prev) => ({ ...prev, title: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={PLAN_STATUSES} />
            <Field label="Bog'liq task" value={draft.taskId} onChange={(value) => setDraft((prev) => ({ ...prev, taskId: value }))} options={[{ value: "", label: "Tanlanmagan" }, ...project.tasks.map((task) => ({ value: task.id, label: task.name }))]} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {currentItems.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {currentItems.map((item) => {
            const relatedTask = project.tasks.find((task) => task.id === item.taskId);
            return (
              <Card key={item.id} style={{ padding: 16, background: T.colors.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{item.title}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>
                      {item.date || item.week || item.month || "Davr kiritilmagan"}
                      {relatedTask ? ` · Task: ${relatedTask.name}` : ""}
                      {item.note ? ` · ${item.note}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <StatusSelect value={item.status} options={PLAN_STATUSES} onChange={sectionEditable ? (status) => updateStatus(item.id, status) : null} disabled={!sectionEditable} />
                    {sectionEditable ? <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button> : null}
                    {sectionEditable ? <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : null}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Reja bo'yicha izoh..." />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Rejalar yo'q" desc="Kunlik, haftalik va oylik rejalaringiz shu yerda bo'ladi." />
      )}
    </Card>
  );
});

const CallsTab = memo(function CallsTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ date: "", type: "Call", whoId: assignableEmployees[0]?.id || "", result: "", next: "", status: "Yangi", comments: [] });

  function reset() {
    setEditingId("");
    setDraft({ date: "", type: "Call", whoId: assignableEmployees[0]?.id || "", result: "", next: "", status: "Yangi", comments: [] });
  }

  function save() {
    if (!draft.date && !draft.result && !draft.next) return;
    const calls = editingId
      ? project.calls.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft }, profile) : item))
      : [...project.calls, withRecordMeta({ ...draft, id: makeId("call") }, profile)];
    onUpdateProject({ ...project, calls }, { notifyText: "Mijoz bilan aloqa saqlandi", auditText: "Mijoz bilan aloqa saqlandi", page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, calls: project.calls.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Aloqa holati yangilandi", auditText: `Aloqa statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        calls: project.calls.map((item) =>
          item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
        ),
      },
      { notifyText: "Aloqaga izoh qo'shildi", auditText: "Aloqaga izoh qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Aloqa yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, calls: project.calls.filter((item) => item.id !== id) }, { notifyText: "Aloqa yozuvi o'chirildi", auditText: "Aloqa yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Mijoz bilan aloqalar</div>
        {sectionEditable ? <Button onClick={reset}>Yangi aloqa</Button> : null}
      </div>
      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={["Call", "Meeting"]} />
            <Field label="Kim gaplashdi" value={draft.whoId} onChange={(value) => setDraft((prev) => ({ ...prev, whoId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Natija" value={draft.result} onChange={(value) => setDraft((prev) => ({ ...prev, result: value }))} />
            <Field label="Keyingi qadam" value={draft.next} onChange={(value) => setDraft((prev) => ({ ...prev, next: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={CALL_STATUSES} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.calls.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {project.calls.map((item) => {
            const person = employeeMap[item.whoId];
            return (
              <Card key={item.id} style={{ background: T.colors.bg }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{item.type}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>{item.date || "-"}</div>
                    <div style={{ marginTop: 8 }}>{person?.name || "Mas'ul ko'rsatilmagan"}</div>
                    {item.result ? <div style={{ marginTop: 8, color: T.colors.textMuted }}>Natija: {item.result}</div> : null}
                    {item.next ? <div style={{ marginTop: 4, color: T.colors.accent, fontWeight: 700 }}>Keyingi qadam: {item.next}</div> : null}
                  </div>
                  <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <StatusSelect value={item.status || "Yangi"} options={CALL_STATUSES} onChange={sectionEditable ? (status) => updateStatus(item.id, status) : null} disabled={!sectionEditable} />
                    {sectionEditable ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                        <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Aloqa bo'yicha izoh..." />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Aloqa yozuvlari yo'q" desc="Mijoz bilan call va meetinglar tarixi shu yerda saqlanadi." />
      )}
    </Card>
  );
});

const ProjectDetailPage = memo(function ProjectDetailPage({ profile, project, employees, onBack, onSaveProject, onDeleteProject }) {
  const [tab, setTab] = useState("tasks");
  const [editingProject, setEditingProject] = useState(false);
  const editable = canManageProjectMeta(profile);
  const sectionEditable = canWorkInProject(profile, project);
  const progress = calcProjectProgress(project);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const manager = employeeMap[project.managerId];
  const progressColor = progress >= 75 ? T.colors.green : progress >= 40 ? T.colors.accent : T.colors.orange;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.colors.accent, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: 600, marginBottom: 20, padding: 0 }}>← Orqaga</button>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <CircleProgress pct={progress} size={90} stroke={8} color={progressColor} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: progressColor }}>{progress}%</span>
              <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{project.tasks.filter((task) => task.status === "Bajarildi").length}/{project.tasks.length}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{project.name}</h2>
              {editable ? (
                <StatusSelect value={project.status} options={PROJECT_STATUSES} onChange={(status) => onSaveProject({ ...project, status }, { notifyText: "Loyiha holati o'zgardi", auditText: `Loyiha statusi o'zgardi: ${status}`, page: "projects" })} />
              ) : (
                <StatusBadge value={project.status} />
              )}
              <PriorityBadge value={project.priority} />
            </div>
            <p style={{ margin: "0 0 10px", color: T.colors.textSecondary, fontSize: 14 }}>{project.client} · {project.type || "Xizmat turi yo'q"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: T.colors.textSecondary, fontSize: 12 }}>
              <span>📅 {project.start || "-"} → {project.end || "-"}</span>
              <span>👥 {project.teamIds.length} kishi</span>
              {profile.role === "EMPLOYEE" ? <span>• Siz bu loyiha workspace ichida ishlay olasiz</span> : null}
            </div>
            {project.teamIds.length ? (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {project.teamIds.slice(0, 5).map((teamId, index) => {
                  const teamMember = employeeMap[teamId];
                  return teamMember ? <div key={teamId} style={{ marginLeft: index ? -6 : 0 }}><Avatar name={teamMember.name} url={teamMember.avatarUrl} size={24} /></div> : null;
                })}
              </div>
            ) : null}
          </div>
          <div style={{ flexShrink: 0, minWidth: 190 }}>
            <div style={{ fontSize: 11, color: T.colors.textTertiary, marginBottom: 6 }}>Manager</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {manager ? <Avatar name={manager.name} url={manager.avatarUrl} size={36} /> : <Avatar name="?" size={36} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{manager?.name || "Manager biriktirilmagan"}</div>
                <div style={{ fontSize: 12, color: T.colors.textSecondary }}>{manager?.role || "—"}</div>
              </div>
            </div>
            {editable ? (
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Button variant="secondary" onClick={() => setEditingProject(true)}>Tahrirlash</Button>
                <Button variant="danger" onClick={() => onDeleteProject(project.id)}>O'chirish</Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.colors.bg, borderRadius: T.radius.md, padding: 4, overflowX: "auto" }}>
        {[
          { id: "tasks", label: "Topshiriqlar" },
          { id: "content", label: "Kontent reja" },
          { id: "media", label: "Media plan" },
          { id: "plans", label: "Rejalar" },
          { id: "calls", label: "Aloqalar" },
          ...(canViewReports(profile.role) ? [{ id: "report", label: "Hisobot" }] : []),
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              padding: "7px 16px",
              borderRadius: T.radius.sm,
              border: "none",
              background: tab === item.id ? T.colors.surface : "transparent",
              color: tab === item.id ? T.colors.accent : T.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.font,
              boxShadow: tab === item.id ? T.shadow.sm : "none",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "tasks" ? <TasksTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "content" ? <ContentPlanTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "media" ? <MediaPlanTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "plans" ? <PlansTab profile={profile} project={project} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "calls" ? <CallsTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "report" && canViewReports(profile.role) ? (
        <ReportEditor
          project={project}
          editable={editable}
          onChange={(report) => onSaveProject({ ...project, report }, { notifyText: "Hisobot yangilandi", auditText: "Loyiha hisobot ma'lumoti yangilandi", page: "reports" })}
        />
      ) : null}

      {editingProject ? (
        <ProjectFormModal
          employees={employees}
          initialValue={project}
          onClose={() => setEditingProject(false)}
          onSubmit={(next) => {
            onSaveProject({ ...project, ...next }, { notifyText: "Loyiha tahrirlandi", auditText: `Loyiha saqlandi: ${next.name}`, page: "projects" });
            setEditingProject(false);
          }}
        />
      ) : null}
    </div>
  );
});

const ProjectsPage = memo(function ProjectsPage({ profile, projects, employees, selectedProjectId, selectedProject, projectReady, onSelectProject, onBackToList, onCreateProject, onSaveProject, onDeleteProject, loading, progressByProjectId }) {
  const [showCreate, setShowCreate] = useState(false);
  const editable = canEdit(profile.role);
  const employeeMap = useMemo(() => indexById(employees), [employees]);

  if (selectedProject) {
    if (!projectReady) {
      return (
        <div>
          <PageHeader title="Loyiha yuklanmoqda" subtitle="Topshiriqlar, kontent, media plan va boshqa bo'limlar sinxronlanmoqda." action={<Button variant="secondary" onClick={onBackToList}>Orqaga</Button>} />
          <Card>
            <div style={{ display: "grid", gap: 14 }}>
              <SkeletonBlock width="34%" height={24} />
              <SkeletonBlock width="56%" height={18} />
              <GridSkeleton cards={5} minWidth={240} />
            </div>
          </Card>
        </div>
      );
    }
    return (
      <ProjectDetailPage
        profile={profile}
        project={selectedProject}
        employees={employees}
        onBack={onBackToList}
        onSaveProject={onSaveProject}
        onDeleteProject={onDeleteProject}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Loyihalar"
        subtitle={`${projects.length} ta loyiha.`}
        action={editable ? <Button onClick={() => setShowCreate(true)}>Yangi loyiha</Button> : null}
      />

      {loading ? <GridSkeleton cards={6} minWidth={320} /> : null}

      {!loading && projects.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {projects.map((project) => {
            const manager = employeeMap[project.managerId];
            const progress = progressByProjectId[project.id] ?? calcProjectProgress(project);
            const progressColor = progress >= 75 ? T.colors.green : progress >= 40 ? T.colors.accent : T.colors.orange;
            return (
              <Card key={project.id} onClick={() => onSelectProject(project.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: T.colors.textSecondary }}>{project.client}</div>
                  </div>
                  <PriorityBadge value={project.priority} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, marginBottom: 14 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <CircleProgress pct={progress} size={72} stroke={7} color={progressColor} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: progressColor }}>{progress}%</span>
                      <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{project.tasks.filter((task) => task.status === "Bajarildi").length}/{project.tasks.length}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {editable ? (
                      <div onClick={(event) => event.stopPropagation()}>
                        <StatusSelect value={project.status} options={PROJECT_STATUSES} onChange={(status) => onSaveProject({ ...project, status }, { notifyText: "Loyiha holati o'zgardi", auditText: `Loyiha statusi o'zgardi: ${status}`, page: "projects" })} />
                      </div>
                    ) : (
                      <StatusBadge value={project.status} />
                    )}
                    <div style={{ fontSize: 12, color: T.colors.textSecondary, marginTop: 8 }}>{project.type || "Xizmat turi kiritilmagan"}</div>
                    <div style={{ fontSize: 12, color: T.colors.textSecondary }}>Muddat: {project.end || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 12, borderTop: `1px solid ${T.colors.borderLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {manager ? <Avatar name={manager.name} url={manager.avatarUrl} size={26} /> : null}
                    <span style={{ fontSize: 12, color: T.colors.textSecondary }}>{manager?.name || "Manager biriktirilmagan"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 0 }}>
                    {project.teamIds.slice(0, 3).map((teamId, index) => {
                      const teamMember = employeeMap[teamId];
                      return teamMember ? <div key={teamId} style={{ marginLeft: index ? -6 : 0 }}><Avatar name={teamMember.name} url={teamMember.avatarUrl} size={22} /></div> : null;
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : !loading ? (
        <EmptyState title="Loyihalar hali yo'q" desc="Yangi loyiha yaratilgach bu yerda ko'rinadi." />
      ) : null}

      {showCreate ? (
        <ProjectFormModal
          employees={employees}
          onClose={() => setShowCreate(false)}
          onSubmit={(project) => {
            onCreateProject(project);
            setShowCreate(false);
          }}
        />
      ) : null}
    </div>
  );
});

const TeamPage = memo(function TeamPage({ profile, employees, projects, employeeMetricsById, assignmentsByEmployeeId, onSaveEmployee, onCreateEmployee, onDeleteEmployee, loading }) {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const editable = canManagePeople(profile.role);
  const canViewCompensation = canManagePeople(profile.role);
  const grouped = useMemo(
    () =>
      DEPARTMENTS.map((dept) => ({
        dept,
        employees: employees.filter((employee) => employee.dept === dept),
      })).filter((group) => group.employees.length),
    [employees]
  );

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        subtitle={`${employees.length} ta xodim. Google orqali kirganlar va qo'lda kiritilgan jamoa kartochkalari shu yerda.`}
        action={editable ? <Button onClick={() => setShowAdd(true)}>+ Xodim</Button> : null}
      />
      {loading ? <GridSkeleton cards={8} minWidth={280} /> : null}
      {!loading && grouped.length ? (
        <div style={{ display: "grid", gap: 20 }}>
          {grouped.map((group) => (
            <div key={group.dept}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: { "SMM bo'limi": T.colors.indigo, "Target bo'limi": T.colors.orange, "Media bo'limi": T.colors.accent, "Sales bo'limi": T.colors.green, "Project Management": T.colors.purple, Boshqaruv: T.colors.text }[group.dept] || T.colors.accent }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>{group.dept}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {group.employees.map((employee) => {
                  const metrics = employeeMetricsById[employee.id] || { kpi: 0, active: 0, projects: 0 };
                  const projectAssignments = (assignmentsByEmployeeId[employee.id] || []).slice(0, 3);
                  const loadTone = metrics.active > 4 ? T.colors.orange : T.colors.green;
                  return (
                    <Card key={employee.id} style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <Avatar name={employee.name} url={employee.avatarUrl} size={46} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{employee.name}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: T.colors.textSecondary }}>{employee.role}</div>
                          <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: T.radius.sm, background: T.colors.bg, color: T.colors.textSecondary, fontSize: 11, fontWeight: 700 }}>
                            {employee.roleCode === "EMPLOYEE" ? "Xodim" : "Admin"}
                          </div>
                        </div>
                        {editable ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <Button variant="secondary" onClick={() => setEditingEmployee(employee)} style={{ padding: "6px 10px" }}>Tahrirlash</Button>
                            <Button variant="danger" onClick={() => onDeleteEmployee(employee.id)} style={{ padding: "6px 10px" }}>✕</Button>
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                        {[
                          { value: `${metrics.kpi}%`, label: "KPI", color: T.colors.accent },
                          { value: `${clamp(metrics.active * 18 + metrics.projects * 10, 0, 100)}%`, label: "Yuklanish", color: loadTone },
                          { value: metrics.projects, label: "Loyiha", color: T.colors.purple },
                        ].map((item) => (
                          <div key={item.label} style={{ background: T.colors.bg, borderRadius: T.radius.md, padding: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</div>
                            <div style={{ fontSize: 10, color: T.colors.textSecondary }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: T.colors.borderLight, borderRadius: T.radius.full, height: 5 }}>
                        <div style={{ width: `${metrics.kpi}%`, height: "100%", background: T.colors.accent, borderRadius: T.radius.full, transition: "width .35s ease" }} />
                      </div>
                      <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 12, color: T.colors.textSecondary }}>
                        <div>{employee.email || "Email ko'rsatilmagan"}</div>
                        {canViewCompensation ? <div>{employee.salary ? `${toMoney(employee.salary)} so'm / oy` : "Oylik kiritilmagan"}</div> : null}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {projectAssignments.length ? projectAssignments.map((project) => (
                            <span key={project.id} style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "3px 8px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 600 }}>
                              {project.name}
                            </span>
                          )) : <span style={{ color: T.colors.textTertiary }}>Loyiha biriktirilmagan</span>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <EmptyState title="Xodimlar hali yo'q" desc="Xodim Google orqali kirgach avtomatik ro'yxatga qo'shiladi." />
      ) : null}

      {showAdd ? (
        <Modal title="Yangi xodim qo'shish" onClose={() => setShowAdd(false)} width={620}>
          <EmployeeEditForm
            employee={{ name: "", role: "", dept: "SMM bo'limi", email: "", salary: 0, kpiBase: 80, load: 50 }}
            showCompensation={canViewCompensation}
            submitLabel="Xodimni saqlash"
            onCancel={() => setShowAdd(false)}
            onSave={(next) => {
              onCreateEmployee(next);
              setShowAdd(false);
            }}
          />
        </Modal>
      ) : null}

      {editingEmployee ? (
        <Modal title="Xodim ma'lumotini yangilash" onClose={() => setEditingEmployee(null)} width={640}>
          <EmployeeEditForm
            employee={editingEmployee}
            showCompensation={canViewCompensation}
            onCancel={() => setEditingEmployee(null)}
            onSave={(next) => {
              onSaveEmployee(next);
              setEditingEmployee(null);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
});

function EmployeeEditForm({ employee, onCancel, onSave, submitLabel = "Saqlash", showCompensation = true }) {
  const [form, setForm] = useState({ ...employee, salary: String(employee.salary || ""), kpiBase: String(employee.kpiBase || 80), load: String(employee.load || 0), email: employee.email || "" });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <Field label="Ism" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <Field label="Lavozim" value={form.role} onChange={(value) => setForm((prev) => ({ ...prev, role: value }))} />
        <Field label="Bo'lim" value={form.dept} onChange={(value) => setForm((prev) => ({ ...prev, dept: value }))} options={DEPARTMENTS} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} type="email" />
        {showCompensation ? <Field label="Oylik" type="number" value={form.salary} onChange={(value) => setForm((prev) => ({ ...prev, salary: value }))} /> : null}
        <Field label="Bazaviy KPI" type="number" value={form.kpiBase} onChange={(value) => setForm((prev) => ({ ...prev, kpiBase: value }))} />
        <Field label="Bandlik" type="number" value={form.load} onChange={(value) => setForm((prev) => ({ ...prev, load: value }))} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onCancel}>Bekor</Button>
        <Button
          onClick={() =>
            onSave({
              ...employee,
              ...form,
              salary: showCompensation ? Number(form.salary || 0) : Number(employee.salary || 0),
              kpiBase: Number(form.kpiBase || 80),
              load: Number(form.load || 0),
            })
          }
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function ShootingPage({ profile, shoots, projects, employees, onSaveShoot, onDeleteShoot }) {
  const sectionEditable = profile.role !== "INVESTOR" && projects.length > 0;
  const projectMap = useMemo(() => indexById(projects), [projects]);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({
    date: "",
    time: "",
    projectId: projects[0]?.id || "",
    type: "",
    location: "",
    operatorId: employees[0]?.id || "",
    goal: "",
    note: "",
    status: "Yangi",
    comments: [],
  });

  const sortedShoots = useMemo(
    () => [...shoots].sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`)),
    [shoots]
  );
  const groupedShoots = useMemo(
    () =>
      sortedShoots.reduce((acc, shoot) => {
        const key = shoot.date || "Sana ko'rsatilmagan";
        if (!acc[key]) acc[key] = [];
        acc[key].push(shoot);
        return acc;
      }, {}),
    [sortedShoots]
  );

  function reset() {
    setEditingId("");
    setDraft({
      date: "",
      time: "",
      projectId: projects[0]?.id || "",
      type: "",
      location: "",
      operatorId: employees[0]?.id || "",
      goal: "",
      note: "",
      status: "Yangi",
      comments: [],
    });
  }

  function save() {
    if (!draft.projectId || !draft.type.trim()) return;
    onSaveShoot(editingId ? { ...draft, id: editingId } : draft);
    reset();
  }

  function addComment(shoot, text) {
    onSaveShoot({ ...shoot, comments: [...normalizeComments(shoot.comments), createComment(text, profile)] });
  }

  return (
    <div>
      <PageHeader title="Syomka kalendari" subtitle="Biriktirilgan loyihalar bo'yicha syomka eventlari realtime ishlaydi." />

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Vaqt" type="time" value={draft.time} onChange={(value) => setDraft((prev) => ({ ...prev, time: value }))} />
            <Field label="Loyiha" value={draft.projectId} onChange={(value) => setDraft((prev) => ({ ...prev, projectId: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} placeholder="Reels, product, backstage..." />
            <Field label="Lokatsiya" value={draft.location} onChange={(value) => setDraft((prev) => ({ ...prev, location: value }))} />
            <Field label="Mas'ul xodim" value={draft.operatorId} onChange={(value) => setDraft((prev) => ({ ...prev, operatorId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Maqsad" value={draft.goal} onChange={(value) => setDraft((prev) => ({ ...prev, goal: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={SHOOT_STATUSES} />
            <Field label="Qisqa izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Syomkani yangilash" : "Syomka qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {sortedShoots.length ? (
        <div style={{ display: "grid", gap: 18 }}>
          {Object.entries(groupedShoots).map(([date, items]) => (
            <Card key={date} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{date}</div>
                  <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>{items.length} ta syomka eventi</div>
                </div>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.colors.accent }} />
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {items.map((shoot) => {
                  const project = projectMap[shoot.projectId];
                  const operator = employeeMap[shoot.operatorId];
                  const canMutate = canEdit(profile.role) || Boolean(project);
                  return (
                    <Card key={shoot.id} style={{ background: "#fff", padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 900 }}>{shoot.type || "Syomka turi"}</div>
                            <StatusSelect value={shoot.status || "Yangi"} options={SHOOT_STATUSES} onChange={canMutate ? (status) => onSaveShoot({ ...shoot, status }) : null} disabled={!canMutate} />
                          </div>
                          <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>
                            {project?.name || "Loyiha tanlanmagan"} · {shoot.time || "--:--"} · {shoot.location || "Lokatsiya yo'q"}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
                            Maqsad: {shoot.goal || "-"}<br />
                            Izoh: {shoot.note || "-"}
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.colors.textMuted }}>
                            {operator ? <Avatar name={operator.name} url={operator.avatarUrl} size={24} /> : null}
                            <span style={{ fontSize: 12 }}>{operator?.name || "Mas'ul yo'q"}</span>
                          </div>
                          {canMutate ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button variant="secondary" onClick={() => { setEditingId(shoot.id); setDraft({ ...shoot, comments: normalizeComments(shoot.comments) }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                              <Button variant="danger" onClick={() => onDeleteShoot(shoot.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <CommentThread comments={shoot.comments} onAddComment={canMutate ? (text) => addComment(shoot, text) : null} placeholder="Syomka bo'yicha izoh..." />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Syomka yozuvlari yo'q" desc="Syomka kalendari shu yerda yuritiladi." />
      )}
    </div>
  );
}

function MeetingsPage({ profile, meetings, employees, onAddMeeting, onDeleteMeeting }) {
  const editable = canEdit(profile.role);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({ client: "", date: "", type: "Call", whoId: employees[0]?.id || "", result: "", next: "" });

  return (
    <div>
      <PageHeader title="Uchrashuvlar va qo'ng'iroqlar" subtitle="Barcha uchrashuv va call yozuvlari saqlanadi." />

      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Mijoz" value={draft.client} onChange={(value) => setDraft((prev) => ({ ...prev, client: value }))} />
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={["Call", "Meeting"]} />
            <Field label="Kim gaplashdi" value={draft.whoId} onChange={(value) => setDraft((prev) => ({ ...prev, whoId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Natija" value={draft.result} onChange={(value) => setDraft((prev) => ({ ...prev, result: value }))} />
            <Field label="Keyingi qadam" value={draft.next} onChange={(value) => setDraft((prev) => ({ ...prev, next: value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Button
              onClick={() => {
                onAddMeeting(draft);
                setDraft({ client: "", date: "", type: "Call", whoId: employees[0]?.id || "", result: "", next: "" });
              }}
            >
              Yozuv qo'shish
            </Button>
          </div>
        </Card>
      ) : null}

      {meetings.length ? (
        <Card>
          <DataTable columns={["Mijoz", "Sana", "Tur", "Kim", "Natija", "Keyingi qadam", "Amal"]}>
            {meetings.map((meeting) => {
              const person = employeeMap[meeting.whoId];
              return (
                <Row key={meeting.id}>
                  <Cell style={{ fontWeight: 900 }}>{meeting.client}</Cell>
                  <Cell>{meeting.date || "-"}</Cell>
                  <Cell>{meeting.type}</Cell>
                  <Cell>{person?.name || "Belgilanmagan"}</Cell>
                  <Cell style={{ color: T.colors.textMuted }}>{meeting.result || "-"}</Cell>
                  <Cell style={{ color: T.colors.accent, fontWeight: 800 }}>{meeting.next || "-"}</Cell>
                  <Cell>{editable ? <Button variant="danger" onClick={() => onDeleteMeeting(meeting.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : "-"}</Cell>
                </Row>
              );
            })}
          </DataTable>
        </Card>
      ) : (
        <EmptyState title="Uchrashuvlar yo'q" desc="Yangi meeting yozuvi qo'shgach shu yerda ko'rinadi." />
      )}
    </div>
  );
}

function ReportsPage({ projects }) {
  const totalBudget = projects.reduce((sum, project) => sum + Number(project.report.budget || 0), 0);
  const totalLeads = projects.reduce((sum, project) => sum + Number(project.report.leads || 0), 0);
  const totalSales = projects.reduce((sum, project) => sum + Number(project.report.sales || 0), 0);
  const roiProjects = projects.filter((project) => Number(project.report.roi || 0) > 0);
  const avgRoi = roiProjects.length ? (roiProjects.reduce((sum, project) => sum + Number(project.report.roi || 0), 0) / roiProjects.length).toFixed(1) : "0";

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="CEO va investor uchun jamlangan ko'rsatkichlar." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="Jami byudjet" value={`${toMoney(totalBudget)} so'm`} hint="Barcha loyihalar" color={T.colors.accent} />
        <StatCard label="Jami lidlar" value={totalLeads} hint="Yig'ilgan leadlar" color={T.colors.green} />
        <StatCard label="Jami sotuvlar" value={totalSales} hint="Yakuniy natija" color={T.colors.blue} />
        <StatCard label="O'rtacha ROI" value={avgRoi} hint="Faol hisobotlar" color={T.colors.purple} />
      </div>

      {projects.length ? (
        <Card>
          <DataTable columns={["Loyiha", "Byudjet", "Lead", "CPL", "Sotuv", "ROI", "Progress"]}>
            {projects.map((project) => (
              <Row key={project.id}>
                <Cell>
                  <div style={{ fontWeight: 900 }}>{project.name}</div>
                  <div style={{ marginTop: 4, color: T.colors.textMuted, fontSize: 12 }}>{project.client}</div>
                </Cell>
                <Cell>{toMoney(project.report.budget)} so'm</Cell>
                <Cell>{project.report.leads}</Cell>
                <Cell>{toMoney(project.report.cpl)} so'm</Cell>
                <Cell>{project.report.sales}</Cell>
                <Cell>{project.report.roi}</Cell>
                <Cell>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: T.radius.full, background: T.colors.borderLight, overflow: "hidden" }}>
                      <div style={{ width: `${calcProjectProgress(project)}%`, height: "100%", background: T.colors.accent }} />
                    </div>
                    <span style={{ fontWeight: 900 }}>{calcProjectProgress(project)}%</span>
                  </div>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </Card>
      ) : (
        <EmptyState title="Hisobotlar hali bo'sh" desc="Loyihalar va hisobotlar qo'shilgach ko'rinadi." />
      )}
    </div>
  );
}

function WorkflowPage() {
  const steps = [
    { n: 1, title: "Mijoz keladi", desc: "Sales manager bilan birinchi uchrashuv va ehtiyojlar aniqlash", dept: "Sales" },
    { n: 2, title: "Brief olinadi", desc: "Maqsad, target auditoriya, byudjet va KPI aniqlanadi", dept: "Project Management" },
    { n: 3, title: "Strategiya yoziladi", desc: "Kontent strategiyasi, kanal tanlash va maqsadlar belgilanadi", dept: "Project Management" },
    { n: 4, title: "Media plan yaratiladi", desc: "Oylik kontent jadvali, byudjet taqsimoti tuziladi", dept: "SMM" },
    { n: 5, title: "Kontent reja tuziladi", desc: "Har bir post, reels, story alohida rejalashtiriladi", dept: "SMM" },
    { n: 6, title: "Materiallar tayyorlanadi", desc: "Kontent ishlab chiqiladi va tekshiruvga yuboriladi", dept: "SMM + Media" },
    { n: 7, title: "Tasdiqlanadi", desc: "Manager yoki CEO kontent rejasini tasdiqlaydi yoki rad etadi", dept: "Project Management" },
    { n: 8, title: "Syomka o'tkaziladi", desc: "Video va foto materiallar professional tarzda suratga olinadi", dept: "Media" },
    { n: 9, title: "Reklama ishga tushadi", desc: "Targeting reklamalari sozlanadi va faollashtiriladi", dept: "Target" },
    { n: 10, title: "Hisobot qilinadi", desc: "KPI, ROI va natijalar CEO ga taqdimot qilinadi", dept: "Project Management" },
  ];

  return (
    <div>
      <PageHeader title="Workflow" subtitle="Loyiha jarayoni yuborgan namuna ko'rinishiga mos yagona timeline formatida." />
      <Card>
        {steps.map((step, index) => (
          <div key={step.n} style={{ display: "flex", gap: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 92, flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.colors.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, boxShadow: "0 8px 18px rgba(0,113,227,0.18)" }}>
                {step.n}
              </div>
              {index < steps.length - 1 ? <div style={{ width: 4, flex: 1, minHeight: 48, background: T.colors.border, margin: "10px 0" }} /> : null}
            </div>
            <div style={{ padding: "4px 0 28px 18px", flex: 1 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>{step.title}</span>
                <span style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "5px 16px", borderRadius: T.radius.full, fontSize: 12, fontWeight: 700 }}>
                  {step.dept}
                </span>
              </div>
              <div style={{ marginTop: 8, color: T.colors.textSecondary, lineHeight: 1.5, fontSize: 15 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function NotificationsPage({ notifications, profile, onMarkAllRead }) {
  const unread = notifications.filter((item) => !item.readBy?.[profile.uid]);
  const sorted = sortByRecent(notifications, "createdAt");
  return (
    <div>
      <PageHeader
        title="Bildirishnomalar"
        subtitle={`${notifications.length} ta yozuv. O'qilmagan: ${unread.length}.`}
        action={notifications.length ? <Button variant="secondary" onClick={onMarkAllRead}>Hammasini o'qilgan deb belgilash</Button> : null}
      />
      {sorted.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {sorted.map((item) => {
            const unreadItem = !item.readBy?.[profile.uid];
            return (
              <Card key={item.id} style={{ borderColor: unreadItem ? "#fecaca" : T.colors.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{item.text}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>
                      {item.actorName || "Tizim"} · {String(item.createdAt || "").slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                  {unreadItem ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: T.colors.red, animation: "sidebarPulse 1.2s infinite" }} /> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Bildirishnomalar yo'q" desc="Yangi xabar yoki o'zgarish bo'lsa shu yerga tushadi." />
      )}
    </div>
  );
}

function LoadingScreen({ label = "Yuklanmoqda..." }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f5f5f7 0%, #e8f0fe 100%)", fontFamily: T.font, color: T.colors.text }}>
      <Card style={{ textAlign: "center", maxWidth: 380, padding: 30, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 120deg, rgba(0,113,227,0.08), rgba(0,113,227,0.92), rgba(90,200,250,0.16), rgba(0,113,227,0.08))", animation: "appleSpin 1.15s cubic-bezier(.55,.08,.48,.95) infinite" }} />
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(229,229,234,0.9)" }} />
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.16), transparent 68%)", animation: "loaderPulse 1.8s ease-in-out infinite" }} />
        </div>
        <div style={{ marginTop: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>{label}</div>
        <div style={{ marginTop: 6, color: T.colors.textSecondary, fontSize: 13 }}>Realtime CRM ma'lumotlari tayyorlanmoqda.</div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 6 }}>
          {[0, 1, 2].map((index) => (
            <span key={index} style={{ width: 6, height: 6, borderRadius: "50%", background: T.colors.accent, opacity: 0.2 + index * 0.2, animation: `loaderBounce 1.2s ease-in-out ${index * 0.12}s infinite` }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("AgencyCRM runtime error", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.colors.bg, padding: 24 }}>
          <Card style={{ maxWidth: 720, width: "100%" }}>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>CRM yuklanishda xato bo'ldi</div>
            <div style={{ color: T.colors.textSecondary, marginBottom: 18, lineHeight: 1.6 }}>
              Endi oq ekran o'rniga aniq xato ko'rsatiladi. Shu matnni yuborsangiz keyingi fixni aniq qilaman.
            </div>
            <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: T.radius.lg, padding: 16, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "pre-wrap", fontSize: 13 }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </div>
            <div style={{ marginTop: 16 }}>
              <Button onClick={() => window.location.reload()}>Sahifani qayta yuklash</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}

function AppShell() {
  const initialProjects = [];
  const initialPublicUsers = [];
  const initialPrivateUsers = {};
  const initialShoots = [];
  const initialMeetings = [];
  const initialNotifications = [];
  const initialAuditDocs = [];
  const [profile, setProfile] = useState(null);
  const [projectDocs, setProjectDocs] = useState(initialProjects);
  const [publicUsers, setPublicUsers] = useState(initialPublicUsers);
  const [privateUsers, setPrivateUsers] = useState(initialPrivateUsers);
  const [shootDocs, setShootDocs] = useState(initialShoots);
  const [meetingDocs, setMeetingDocs] = useState(initialMeetings);
  const [notificationDocs, setNotificationDocs] = useState(initialNotifications);
  const [auditDocs, setAuditDocs] = useState(initialAuditDocs);
  const [selectedProjectWorkspace, setSelectedProjectWorkspace] = useState(EMPTY_PROJECT_WORKSPACE);
  const [page, setPage] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [booting, setBooting] = useState(true);
  const [projectsReady, setProjectsReady] = useState(initialProjects.length > 0);
  const [publicUsersReady, setPublicUsersReady] = useState(initialPublicUsers.length > 0);
  const [privateUsersReady, setPrivateUsersReady] = useState(Object.keys(initialPrivateUsers).length > 0);
  const [projectWorkspaceReady, setProjectWorkspaceReady] = useState(true);
  const [bootSettled, setBootSettled] = useState(initialProjects.length > 0 || initialPublicUsers.length > 0);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [migrationReady, setMigrationReady] = useState(!ENABLE_RUNTIME_MIGRATION);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const pendingRegistrationRef = useRef(null);
  const migrationRef = useRef(false);
  const projectDocsRef = useRef([]);
  const publicUsersRef = useRef([]);
  const selectedProjectRef = useRef(null);

  const legacyRootRef = hasFirebaseConfig && db ? doc(db, "crm", ROOT_DOC_ID) : null;
  const migrationMetaRef = hasFirebaseConfig && db ? doc(db, "crmMeta", ROOT_DOC_ID) : null;
  const projectsCollectionRef = hasFirebaseConfig && db ? collection(db, "projects") : null;
  const usersCollectionRef = hasFirebaseConfig && db ? collection(db, "users") : null;
  const userPrivateCollectionRef = hasFirebaseConfig && db ? collection(db, "userPrivate") : null;
  const shootsCollectionRef = hasFirebaseConfig && db ? collection(db, "shoots") : null;
  const meetingsCollectionRef = hasFirebaseConfig && db ? collection(db, "meetings") : null;
  const notificationsCollectionRef = hasFirebaseConfig && db ? collection(db, "notifications") : null;
  const auditLogsCollectionRef = hasFirebaseConfig && db ? collection(db, "auditLogs") : null;

  function pushToast(text, tone = "success") {
    if (!text) return;
    setToasts((current) => [...current.slice(-2), { id: makeId("toast"), text, tone }]);
  }

  function applyOptimisticMetaDocs(metaDocs) {
    // Batch both state updates to avoid 2 separate renders
    const notifs = metaDocs.filter(i => i.collection === "notifications");
    const audits = metaDocs.filter(i => i.collection === "auditLogs");
    startTransition(() => {
      if (notifs.length) {
        setNotificationDocs((current) =>
          [...notifs.map(i => normalizeStoredRecord(i.id, i.data)), ...current].slice(0, 120)
        );
      }
      if (audits.length) {
        setAuditDocs((current) =>
          [...audits.map(i => normalizeStoredRecord(i.id, i.data)), ...current].slice(0, 180)
        );
      }
    });
  }

  useEffect(() => {
    projectDocsRef.current = projectDocs;
  }, [projectDocs]);

  useEffect(() => {
    publicUsersRef.current = publicUsers;
  }, [publicUsers]);

  useEffect(() => {
    if (!toasts.length) return undefined;
    const timeout = setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2800);
    return () => clearTimeout(timeout);
  }, [toasts]);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db) {
      setBooting(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setBooting(true);
      try {
        if (!firebaseUser) {
          setProfile(null);
          setProjectDocs([]);
          setPublicUsers([]);
          setPrivateUsers({});
          setShootDocs([]);
          setMeetingDocs([]);
          setNotificationDocs([]);
          setAuditDocs([]);
          setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
          setProjectsReady(false);
          setPublicUsersReady(false);
          setPrivateUsersReady(false);
          setProjectWorkspaceReady(false);
          migrationRef.current = false;
          setMigrationReady(!ENABLE_RUNTIME_MIGRATION);
          setBootSettled(false);
          setBooting(false);
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const privateRef = doc(db, "userPrivate", firebaseUser.uid);
        const snapshot = await getDoc(userRef);
        const fixedRole = FIXED_ROLE_BY_EMAIL[(firebaseUser.email || "").toLowerCase()];
        const registration = pendingRegistrationRef.current;
        const roleCode = snapshot.data()?.roleCode || fixedRole?.role || "EMPLOYEE";
        const baseName = registration?.name || firebaseUser.displayName || fixedRole?.name || firebaseUser.email?.split("@")[0] || "Xodim";
        const currentUser = snapshot.exists()
          ? normalizeStoredUser(firebaseUser.uid, snapshot.data())
          : employeeToPublicDoc({
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: baseName,
              avatarUrl: firebaseUser.photoURL || "",
              roleCode,
              role: registration?.title || fixedRole?.title || ROLE_META[roleCode]?.title || "Xodim",
              dept: registration?.dept || fixedRole?.dept || "SMM bo'limi",
              status: "active",
              assignedProjectIds: [],
              createdAt: isoNow(),
              updatedAt: isoNow(),
            });

        const nextUserDoc = {
          ...currentUser,
          uid: firebaseUser.uid,
          email: firebaseUser.email || currentUser.email || "",
          name: currentUser.name || baseName,
          avatarUrl: firebaseUser.photoURL || currentUser.avatarUrl || "",
          roleCode,
          role: currentUser.role || registration?.title || fixedRole?.title || ROLE_META[roleCode]?.title || "Xodim",
          title: currentUser.title || registration?.title || fixedRole?.title || ROLE_META[roleCode]?.title || "Xodim",
          dept: currentUser.dept || registration?.dept || fixedRole?.dept || "SMM bo'limi",
          status: currentUser.status || "active",
          createdAt: currentUser.createdAt || isoNow(),
          updatedAt: isoNow(),
        };

        await setDoc(userRef, nextUserDoc, { merge: true });
        const privateSnapshot = canManagePeople(roleCode) ? await getDoc(privateRef) : null;
        pendingRegistrationRef.current = null;
        setProfile({
          uid: firebaseUser.uid,
          email: nextUserDoc.email,
          name: nextUserDoc.name,
          avatarUrl: nextUserDoc.avatarUrl || "",
          role: roleCode,
          dept: nextUserDoc.dept,
          title: nextUserDoc.title,
          assignedProjectIds: Array.isArray(nextUserDoc.assignedProjectIds) ? nextUserDoc.assignedProjectIds : [],
          identityIds: [firebaseUser.uid],
          salary: Number(privateSnapshot?.data()?.salary || 0),
          kpiBase: Number(privateSnapshot?.data()?.kpiBase || 80),
          load: Number(privateSnapshot?.data()?.load || 0),
          createdAt: nextUserDoc.createdAt,
        });
        setAuthError("");
      } catch (error) {
        setAuthError(humanizeAuthError(error));
      } finally {
        setBooting(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile || !legacyRootRef || !migrationMetaRef) {
      setMigrationReady(true);
      return undefined;
    }
    if (!canRunRuntimeMigration(profile.role)) {
      setMigrationReady(true);
      return undefined;
    }
    if (migrationRef.current) return undefined;
    let cancelled = false;
    migrationRef.current = true;
    (async () => {
      try {
        setMigrationReady(false);
        const metaSnapshot = await getDoc(migrationMetaRef);
        const schemaVersion = Number(metaSnapshot.data()?.schemaVersion || 0);
        if (schemaVersion >= SCHEMA_VERSION) {
          if (!cancelled) setMigrationReady(true);
          return;
        }
        const result = await migrateLegacyRootSchema({ dbInstance: db, legacyRootRef, actor: profile });
        if (!cancelled && result.migrated) {
          pushToast("Firestore schema yangi collection modeliga ko'chirildi.");
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(humanizeAuthError(error));
          pushToast(humanizeAuthError(error), "error");
        }
      } finally {
        if (!cancelled) {
          setMigrationReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.uid, legacyRootRef, migrationMetaRef]);

  useEffect(() => {
    if (!profile || !projectsCollectionRef || !migrationReady) return undefined;
    if (!projectDocs.length) setProjectsReady(false);
    const unsubscribe = onSnapshot(
      projectsCollectionRef,
      (snapshot) => {
        const nextProjects = sortByRecent(snapshot.docs.map((entry) => normalizeStoredProjectMeta(entry.id, entry.data())), "updatedAt").filter((project) => !project.archived);
        startTransition(() => {
          setProjectDocs(nextProjects);
          setProjectsReady(true);
        });
      },
      (error) => {
        console.error('[CRM] projects onSnapshot error:', error?.code, error?.message);
        setProjectsReady(true);
        setAuthError(humanizeAuthError(error));
      }
    );
    return () => unsubscribe();
  }, [profile?.uid, projectsCollectionRef, migrationReady]);

  useEffect(() => {
    if (!profile || !usersCollectionRef || !migrationReady) return undefined;
    if (!publicUsers.length) setPublicUsersReady(false);
    const unsubscribe = onSnapshot(
      usersCollectionRef,
      (snapshot) => {
        const nextUsers = snapshot.docs.map((entry) => normalizeStoredUser(entry.id, entry.data()));
        const canonicalUsers = canonicalizeUsersAndProjects(
          nextUsers,
          projectDocsRef.current,
          profile ? { uid: profile.uid, email: profile.email } : null
        ).users;
        startTransition(() => {
          setPublicUsers(canonicalUsers);
          const currentUserDoc =
            canonicalUsers.find((item) => item.id === profile.uid) ||
            canonicalUsers.find((item) => normalizeEmail(item.email) === normalizeEmail(profile.email));
          if (currentUserDoc) {
            setProfile((currentProfile) =>
              currentProfile
                ? {
                    ...currentProfile,
                    email: currentUserDoc.email || currentProfile.email,
                    name: currentUserDoc.name || currentProfile.name,
                    avatarUrl: currentUserDoc.avatarUrl || currentProfile.avatarUrl,
                    dept: currentUserDoc.dept || currentProfile.dept,
                    title: currentUserDoc.title || currentProfile.title,
                    assignedProjectIds: Array.isArray(currentUserDoc.assignedProjectIds) ? currentUserDoc.assignedProjectIds : [],
                    identityIds: Array.from(new Set([...(Array.isArray(currentProfile.identityIds) ? currentProfile.identityIds : []), currentProfile.uid])),
                  }
                : currentProfile
            );
          }
          setPublicUsersReady(true);
        });
      },
      (error) => {
        console.error('[CRM] users onSnapshot error:', error?.code, error?.message);
        setPublicUsersReady(true);
        setAuthError(humanizeAuthError(error));
      }
    );
    return () => unsubscribe();
  }, [profile?.uid, usersCollectionRef, migrationReady]);

  useEffect(() => {
    if (!profile || profile.role !== "EMPLOYEE" || !legacyRootRef || !migrationReady) return undefined;
    if (projectsReady || projectDocs.length > 0) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const legacySnapshot = await getDoc(legacyRootRef);
        if (!legacySnapshot.exists()) return;
        const legacy = normalizeCrmPayload(legacySnapshot.data()?.payload);
        const profileEmail = normalizeEmail(profile.email);
        if (!profileEmail) return;

        const legacyIdentityIds = legacy.employees
          .map((employee, index) => ({
            id: employee.id || employee.uid || employee.email || `legacy_employee_${index}`,
            email: normalizeEmail(employee.email),
          }))
          .filter((employee) => employee.email === profileEmail)
          .map((employee) => employee.id)
          .filter(Boolean);

        if (!legacyIdentityIds.length) return;

        const identityIds = new Set([profile.uid, ...legacyIdentityIds]);
        const fallbackProjects = sortByRecent(
          legacy.projects
            .filter((project) =>
              [project.managerId, ...(Array.isArray(project.teamIds) ? project.teamIds : [])]
                .filter(Boolean)
                .some((memberId) => identityIds.has(memberId))
            )
            .map((project) => normalizeStoredProjectMeta(project.id, projectMetaDocFromProject(project, profile, project))),
          "updatedAt"
        ).filter((project) => !project.archived);

        if (cancelled || !fallbackProjects.length) return;

        startTransition(() => {
          setProjectDocs((current) =>
            current.length ? current : sortByRecent(Object.values(indexById([...current, ...fallbackProjects])), "updatedAt")
          );
          setProjectsReady(true);
          setProfile((currentProfile) =>
            currentProfile
              ? {
                  ...currentProfile,
                  identityIds: Array.from(new Set([...(Array.isArray(currentProfile.identityIds) ? currentProfile.identityIds : []), currentProfile.uid, ...legacyIdentityIds])),
                  assignedProjectIds: Array.from(
                    new Set([...(Array.isArray(currentProfile.assignedProjectIds) ? currentProfile.assignedProjectIds : []), ...fallbackProjects.map((project) => project.id)])
                  ),
                }
              : currentProfile
          );
        });
      } catch (error) {
        console.error("[CRM] employee legacy project fallback error:", error?.code, error?.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.uid, profile?.email, profile?.role, legacyRootRef, migrationReady, projectsReady, projectDocs.length]);

  useEffect(() => {
    if (!profile || !userPrivateCollectionRef || !migrationReady) return undefined;
    if (!canManagePeople(profile.role)) {
      setPrivateUsers({});
      setPrivateUsersReady(true);
      return undefined;
    }
    if (!Object.keys(privateUsers).length) setPrivateUsersReady(false);
    const unsubscribe = onSnapshot(
      userPrivateCollectionRef,
      (snapshot) => {
        const nextPrivateUsers = {};
        snapshot.docs.forEach((entry) => {
          nextPrivateUsers[entry.id] = normalizeStoredPrivateUser(entry.id, entry.data());
        });
        startTransition(() => {
          setPrivateUsers(nextPrivateUsers);
          setPrivateUsersReady(true);
        });
      },
      (error) => {
        console.error('[CRM] privateUsers onSnapshot error:', error?.code, error?.message);
        setPrivateUsersReady(true);
        setAuthError(humanizeAuthError(error));
      }
    );
    return () => unsubscribe();
  }, [profile?.uid, userPrivateCollectionRef, profile?.role, migrationReady]);

  useEffect(() => {
    if (!profile || !shootsCollectionRef || !migrationReady) return undefined;
    if (page !== "shooting") return undefined;
    const unsubscribe = onSnapshot(
      shootsCollectionRef,
      (snapshot) => {
        const nextShoots = snapshot.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
        startTransition(() => setShootDocs(nextShoots));
      },
      (error) => { console.error("[CRM] shoots:", error?.code); }
    );
    return () => unsubscribe();
  }, [profile?.uid, shootsCollectionRef, page, migrationReady]);

  useEffect(() => {
    if (!profile || !meetingsCollectionRef || !migrationReady) return undefined;
    if (page !== "meetings") return undefined;
    const unsubscribe = onSnapshot(
      meetingsCollectionRef,
      (snapshot) => {
        const nextMeetings = sortByRecent(snapshot.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data())), "date");
        startTransition(() => setMeetingDocs(nextMeetings));
      },
      (error) => { console.error("[CRM] meetings:", error?.code); }
    );
    return () => unsubscribe();
  }, [profile?.uid, meetingsCollectionRef, page, migrationReady]);

  useEffect(() => {
    if (!profile || !notificationsCollectionRef || !migrationReady) return undefined;
    const unsubscribe = onSnapshot(
      notificationsCollectionRef,
      (snapshot) => {
        const nextNotifications = sortByRecent(snapshot.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data())), "createdAt").slice(0, 120);
        startTransition(() => setNotificationDocs(nextNotifications));
      },
      (error) => {
        console.error("[CRM] notifications onSnapshot error:", error?.code, error?.message);
        setAuthError(humanizeAuthError(error));
      }
    );
    return () => unsubscribe();
  }, [profile?.uid, notificationsCollectionRef, migrationReady]);

  useEffect(() => {
    if (!profile || !auditLogsCollectionRef || !migrationReady) return undefined;
    if (page !== "notifications") return undefined;
    const unsubscribe = onSnapshot(
      auditLogsCollectionRef,
      (snapshot) => {
        const nextAuditDocs = sortByRecent(snapshot.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data())), "createdAt").slice(0, 180);
        startTransition(() => setAuditDocs(nextAuditDocs));
      },
      (error) => {
        console.error("[CRM] auditLogs onSnapshot error:", error?.code, error?.message);
        setAuthError(humanizeAuthError(error));
      }
    );
    return () => unsubscribe();
  }, [profile?.uid, auditLogsCollectionRef, page, migrationReady]);

  useEffect(() => {
    if (!profile || !selectedProjectId || !db || !migrationReady) {
      setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
      setProjectWorkspaceReady(true);
      return undefined;
    }

    setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
    setProjectWorkspaceReady(false);

    const projectRef = doc(db, "projects", selectedProjectId);

    // FLICKER FIX: Accumulate all 5 subcollection patches in a ref,
    // then flush to state in a single batch using setTimeout(0).
    // Without this, 5 separate setSelectedProjectWorkspace calls = 5 re-renders.
    const pendingPatch = { tasks: null, contentPlan: null, mediaPlan: null, plans: null, calls: null };
    const loadedKeys = new Set();
    let flushTimer = null;

    function scheduleFlush(projectIdSnapshot) {
      if (flushTimer) return; // already scheduled
      flushTimer = setTimeout(() => {
        flushTimer = null;
        const patch = {};
        if (pendingPatch.tasks !== null)       patch.tasks       = pendingPatch.tasks;
        if (pendingPatch.contentPlan !== null) patch.contentPlan = pendingPatch.contentPlan;
        if (pendingPatch.mediaPlan !== null)   patch.mediaPlan   = pendingPatch.mediaPlan;
        if (pendingPatch.plans !== null)       patch.plans       = pendingPatch.plans;
        if (pendingPatch.calls !== null)       patch.calls       = pendingPatch.calls;
        startTransition(() => {
          setSelectedProjectWorkspace((current) => {
            return { ...current, ...patch };
          });
          const allLoaded = ["tasks","contentPlan","mediaPlan","plans","calls"].every(k => loadedKeys.has(k));
          if (allLoaded) setProjectWorkspaceReady(true);
        });
      }, 0);
    }

    function commitWorkspacePatch(key, patch, projectIdSnapshot) {
      Object.assign(pendingPatch, patch);
      loadedKeys.add(key);
      scheduleFlush(projectIdSnapshot);
    }

    function handleWorkspaceError(error) {
      console.error("[CRM] workspace onSnapshot error:", error?.code, error?.message);
      setProjectWorkspaceReady(true);
    }

    const pid = selectedProjectId;
    const unsubscribes = [
      onSnapshot(collection(projectRef, "tasks"), (snapshot) => {
        const tasks = sortByRecent(snapshot.docs.map((e) => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse();
        commitWorkspacePatch("tasks", { tasks }, pid);
      }, handleWorkspaceError),
      onSnapshot(collection(projectRef, "content"), (snapshot) => {
        const contentPlan = sortByRecent(snapshot.docs.map((e) => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse();
        commitWorkspacePatch("contentPlan", { contentPlan }, pid);
      }, handleWorkspaceError),
      onSnapshot(collection(projectRef, "mediaPlans"), (snapshot) => {
        const mediaPlan = sortByRecent(snapshot.docs.map((e) => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse();
        commitWorkspacePatch("mediaPlan", { mediaPlan }, pid);
      }, handleWorkspaceError),
      onSnapshot(collection(projectRef, "plans"), (snapshot) => {
        const planItems = sortByRecent(snapshot.docs.map((e) => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse();
        commitWorkspacePatch("plans", { plans: splitPlans(planItems) }, pid);
      }, handleWorkspaceError),
      onSnapshot(collection(projectRef, "calls"), (snapshot) => {
        const calls = sortByRecent(snapshot.docs.map((e) => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse();
        commitWorkspacePatch("calls", { calls }, pid);
      }, handleWorkspaceError),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [profile?.uid, selectedProjectId, migrationReady]);

  useEffect(() => {
    if (migrationReady && (projectsReady || publicUsersReady)) {
      setBootSettled(true);
    }
  }, [projectsReady, publicUsersReady, migrationReady]);

  useEffect(() => {
    if (!profile || bootSettled || !migrationReady || !canManagePeople(profile.role)) return undefined;
    const timer = setTimeout(() => {
      setBootSettled(true);
      if (!projectsReady && !publicUsersReady && !authError) {
        setAuthError(REALTIME_DELAY_MESSAGE);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [profile?.uid, bootSettled, migrationReady, projectsReady, publicUsersReady, authError]);

  // Cache write debounced — prevent extra re-renders from rapid state updates
  useEffect(() => {
    if (!profile) return undefined;
    const timer = setTimeout(() => {
      writeCache(userScopedCacheKey(CRM_CACHE_KEY, profile.uid), {
        projects: projectDocs,
        users: publicUsers,
        userPrivate: privateUsers,
        shoots: shootDocs,
        meetings: meetingDocs,
        notifications: notificationDocs,
        auditLog: auditDocs,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [profile?.uid, projectDocs, publicUsers, privateUsers, shootDocs, meetingDocs, notificationDocs, auditDocs]);

  const effectiveData = useMemo(() => {
    const selfUser = profileToPublicUser(profile);
    const mergedUsers = selfUser ? Object.values(indexById([...publicUsers, selfUser])) : publicUsers;
    return canonicalizeUsersAndProjects(mergedUsers, projectDocs, profile);
  }, [projectDocs, publicUsers, profile]);
  const effectiveProjectDocs = effectiveData.projects;
  const effectivePublicUsers = effectiveData.users;
  const usersReady = publicUsersReady || effectivePublicUsers.length > 0;
  const teamReady = usersReady && (!canManagePeople(profile?.role) || privateUsersReady);
  const crmReady = migrationReady && (projectsReady || effectiveProjectDocs.length > 0) && usersReady;
  const primaryLoading = !bootSettled && !crmReady && migrationReady && effectiveProjectDocs.length === 0 && effectivePublicUsers.length === 0;
  const teamLoading = !bootSettled && !teamReady && effectivePublicUsers.length === 0;

  useEffect(() => {
    if (authError === REALTIME_DELAY_MESSAGE && (crmReady || !canManagePeople(profile?.role))) {
      setAuthError("");
    }
  }, [authError, crmReady, profile?.role]);

  const employees = useMemo(
    () => visibleEmployees(profile, mergeEmployeeDocs(effectivePublicUsers, privateUsers, profile?.role, effectiveProjectDocs), effectiveProjectDocs),
    [profile, effectivePublicUsers, privateUsers, effectiveProjectDocs]
  );
  const projects = useMemo(() => visibleProjects(profile, effectiveProjectDocs), [profile, effectiveProjectDocs]);
  // FIX: Only recalculate selectedProject when THIS project's meta changes,
  // not when any other project in projectDocs changes.
  const selectedProjectMeta = useMemo(() => {
    if (!selectedProjectId) return null;
    return effectiveProjectDocs.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, effectiveProjectDocs]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !selectedProjectMeta) return null;
    return hydrateProject(selectedProjectMeta, selectedProjectWorkspace);
  }, [selectedProjectId, selectedProjectMeta, selectedProjectWorkspace]);
  const shoots = useMemo(() => visibleShoots(profile, shootDocs, effectiveProjectDocs), [profile, shootDocs, effectiveProjectDocs]);
  const projectCaches = useMemo(() => buildProjectCaches(projects), [projects]);
  const unreadCount = useMemo(() => (profile ? unreadNotifications(notificationDocs, profile.uid) : 0), [notificationDocs, profile]);

  useEffect(() => {
    publicUsersRef.current = effectivePublicUsers;
  }, [effectivePublicUsers]);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  function navigate(nextPage) {
    setPage(nextPage);
    if (nextPage !== "projects") {
      setSelectedProjectId("");
    }
    if (nextPage === "notifications") {
      markAllNotificationsRead();
    }
  }

  function nextProjectListAfterSave(projectMetaDoc, projectId, mode = "upsert") {
    const nextProjects = mode === "delete"
      ? projectDocsRef.current.filter((item) => item.id !== projectId)
      : sortByRecent([...projectDocsRef.current.filter((item) => item.id !== projectId), normalizeStoredProjectMeta(projectId, projectMetaDoc)], "updatedAt");
    return nextProjects.filter((project) => !project.archived);
  }

  async function syncAssignedProjectIds(ops, nextProjects, affectedUserIds) {
    const assignmentMap = buildAssignedProjectIdsMap(nextProjects);
    affectedUserIds.forEach((userId) => {
      const targetUser = publicUsersRef.current.find((item) => item.id === userId);
      if (!targetUser) return;
      const currentAssigned = Array.isArray(targetUser.assignedProjectIds)
        ? targetUser.assignedProjectIds
        : [];
      const nextAssigned = assignmentMap[userId] || [];
      if (recordsEqual(currentAssigned, nextAssigned)) return;
      ops.push({
        type: "set",
        ref: doc(db, "users", userId),
        data: { assignedProjectIds: nextAssigned, updatedAt: isoNow() },
        options: { merge: true },
      });
    });
  }

  async function markAllNotificationsRead() {
    if (!profile || !notificationsCollectionRef) return;
    const unread = notificationDocs.filter((item) => !item.readBy?.[profile.uid]).slice(0, 50);
    if (!unread.length) return;
    startTransition(() => {
      setNotificationDocs((current) =>
        current.map((item) => (unread.some((entry) => entry.id === item.id) ? { ...item, readBy: { ...(item.readBy || {}), [profile.uid]: true } } : item))
      );
    });
    try {
      const operations = unread.map((item) => ({
        type: "set",
        ref: doc(db, "notifications", item.id),
        data: { readBy: { ...(item.readBy || {}), [profile.uid]: true } },
        options: { merge: true },
      }));
      await commitBatchOperations(db, operations);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
    }
  }

  async function handleEmailLogin(email, password) {
    setAuthBusy(true);
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleRegister(registration) {
    if (!registration.name.trim()) {
      setAuthError("Xodim ro'yxatdan o'tishida ism kiritilishi kerak.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    pendingRegistrationRef.current = registration;
    try {
      const provider = googleProvider || new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      pendingRegistrationRef.current = null;
      setAuthError(humanizeAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setAuthBusy(true);
    setAuthError("");
    try {
      const provider = googleProvider || new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    if (profile?.uid) {
      clearUserCaches(profile.uid, projectDocsRef.current.map((project) => project.id));
    }
    await signOut(auth);
    setPage("dashboard");
    setSelectedProjectId("");
  }

  async function createProject(project) {
    if (!canEdit(profile?.role)) return;
    const nextProject = normalizeProject({
      ...project,
      id: makeId("project"),
      tasks: [],
      contentPlan: [],
      mediaPlan: [],
      plans: { daily: [], weekly: [], monthly: [] },
      calls: [],
      report: { budget: 0, leads: 0, cpl: 0, sales: 0, roi: 0 },
      createdAt: isoNow(),
      createdBy: profile.uid,
      updatedAt: isoNow(),
      updatedBy: profile.uid,
    });
    const projectRef = doc(db, "projects", nextProject.id);
    const projectMetaDoc = projectMetaDocFromProject(nextProject, profile, nextProject);
    const metaDocs = createMetaDocs({ notifyText: `Yangi loyiha qo'shildi: ${nextProject.name}`, auditText: `Loyiha yaratildi: ${nextProject.name}`, page: "projects" }, profile);
    const nextProjects = nextProjectListAfterSave(projectMetaDoc, nextProject.id);
    const operations = [
      { type: "set", ref: projectRef, data: projectMetaDoc, options: { merge: true } },
      ...metaDocs.map((item) => ({ type: "set", ref: doc(db, item.collection, item.id), data: item.data, options: { merge: false } })),
    ];
    await syncAssignedProjectIds(operations, nextProjects, new Set([nextProject.managerId, ...nextProject.teamIds].filter(Boolean)));

    startTransition(() => {
      setProjectDocs(nextProjects);
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, operations);
      pushToast(`Yangi loyiha qo'shildi: ${nextProject.name}`);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function saveProject(project, meta = {}) {
    if (!profile || !db) return;
    const currentMeta = projectDocsRef.current.find((item) => item.id === project.id);
    const currentProject = selectedProjectRef.current?.id === project.id ? selectedProjectRef.current : hydrateProject(currentMeta || project);
    if (!canWorkInProject(profile, currentProject) && !canManageProjectMeta(profile)) return;

    const hasWorkspacePayload =
      selectedProjectRef.current?.id === project.id ||
      Array.isArray(project.tasks) ||
      Array.isArray(project.contentPlan) ||
      Array.isArray(project.mediaPlan) ||
      Array.isArray(project.calls) ||
      Boolean(project.plans);

    const nextProject = normalizeProject({
      ...currentProject,
      ...project,
      tasks: hasWorkspacePayload ? (Array.isArray(project.tasks) ? project.tasks : currentProject.tasks) : currentProject.tasks,
      contentPlan: hasWorkspacePayload ? (Array.isArray(project.contentPlan) ? project.contentPlan : currentProject.contentPlan) : currentProject.contentPlan,
      mediaPlan: hasWorkspacePayload ? (Array.isArray(project.mediaPlan) ? project.mediaPlan : currentProject.mediaPlan) : currentProject.mediaPlan,
      plans: hasWorkspacePayload ? (project.plans || currentProject.plans) : currentProject.plans,
      calls: hasWorkspacePayload ? (Array.isArray(project.calls) ? project.calls : currentProject.calls) : currentProject.calls,
    });

    const projectRef = doc(db, "projects", nextProject.id);
    const projectMetaDoc = projectMetaDocFromProject(nextProject, profile, currentMeta);
    const nextProjects = nextProjectListAfterSave(projectMetaDoc, nextProject.id);
    const affectedUsers = new Set([currentMeta?.managerId, ...(currentMeta?.teamIds || []), nextProject.managerId, ...nextProject.teamIds].filter(Boolean));
    const metaDocs = createMetaDocs(meta, profile);
    const operations = [
      { type: "set", ref: projectRef, data: projectMetaDoc, options: { merge: true } },
      ...metaDocs.map((item) => ({ type: "set", ref: doc(db, item.collection, item.id), data: item.data, options: { merge: false } })),
    ];

    if (hasWorkspacePayload) {
      syncCollectionOperations(collection(projectRef, "tasks"), currentProject.tasks, nextProject.tasks).forEach((operation) => operations.push(operation));
      syncCollectionOperations(collection(projectRef, "content"), currentProject.contentPlan, nextProject.contentPlan).forEach((operation) => operations.push(operation));
      syncCollectionOperations(collection(projectRef, "mediaPlans"), currentProject.mediaPlan, nextProject.mediaPlan).forEach((operation) => operations.push(operation));
      syncCollectionOperations(collection(projectRef, "plans"), flattenPlans(currentProject.plans), flattenPlans(nextProject.plans)).forEach((operation) => operations.push(operation));
      syncCollectionOperations(collection(projectRef, "calls"), currentProject.calls, nextProject.calls).forEach((operation) => operations.push(operation));
    }

    await syncAssignedProjectIds(operations, nextProjects, affectedUsers);

    startTransition(() => {
      setProjectDocs(nextProjects);
      if (selectedProjectId === nextProject.id) {
        setSelectedProjectWorkspace({
          tasks: nextProject.tasks,
          contentPlan: nextProject.contentPlan,
          mediaPlan: nextProject.mediaPlan,
          plans: nextProject.plans,
          calls: nextProject.calls,
        });
      }
      applyOptimisticMetaDocs(metaDocs);
    });

    if (!meta.silent) setSyncing(true);
    try {
      await commitBatchOperations(db, operations);
      if (meta.toastText || meta.notifyText) pushToast(meta.toastText || meta.notifyText);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      if (!meta.silent) setSyncing(false);
    }
  }

  async function deleteProject(projectId) {
    if (!canEdit(profile?.role)) return;
    const project = projectDocsRef.current.find((item) => item.id === projectId);
    if (!project || !window.confirm("Loyiha butunlay o'chirilsinmi?")) return;
    const archivedDoc = { ...project, archived: true, updatedAt: isoNow(), updatedBy: profile.uid };
    const metaDocs = createMetaDocs({ notifyText: `Loyiha o'chirildi: ${project.name}`, auditText: `Loyiha o'chirildi: ${project.name}`, page: "projects" }, profile);
    const nextProjects = nextProjectListAfterSave(archivedDoc, projectId, "delete");
    const operations = [
      { type: "set", ref: doc(db, "projects", projectId), data: archivedDoc, options: { merge: true } },
      ...metaDocs.map((item) => ({ type: "set", ref: doc(db, item.collection, item.id), data: item.data, options: { merge: false } })),
    ];
    await syncAssignedProjectIds(operations, nextProjects, new Set([project.managerId, ...project.teamIds].filter(Boolean)));

    startTransition(() => {
      setProjectDocs(nextProjects);
      if (selectedProjectId === projectId) {
        setSelectedProjectId("");
        setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
      }
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, operations);
      pushToast(`Loyiha o'chirildi: ${project.name}`);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function saveEmployee(nextEmployee) {
    if (!canManagePeople(profile?.role)) return;
    const employeeId = nextEmployee.id || makeId("employee");
    const assignedProjectIds = buildAssignedProjectIdsMap(projectDocsRef.current)[employeeId] || [];
    const nextPublicDoc = employeeToPublicDoc({ ...nextEmployee, id: employeeId, assignedProjectIds, updatedAt: isoNow(), createdAt: nextEmployee.createdAt || isoNow() });
    const nextPrivateDoc = employeeToPrivateDoc(nextEmployee);
    const metaDocs = createMetaDocs({ notifyText: `Xodim ma'lumoti yangilandi: ${nextPublicDoc.name}`, auditText: `Xodim saqlandi: ${nextPublicDoc.name}`, page: "team" }, profile);

    startTransition(() => {
      setPublicUsers((current) => {
        const map = indexById(current);
        map[employeeId] = normalizeStoredUser(employeeId, nextPublicDoc);
        return Object.values(map).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      });
      setPrivateUsers((current) => ({ ...current, [employeeId]: normalizeStoredPrivateUser(employeeId, nextPrivateDoc) }));
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, [
        { type: "set", ref: doc(db, "users", employeeId), data: nextPublicDoc, options: { merge: true } },
        { type: "set", ref: doc(db, "userPrivate", employeeId), data: nextPrivateDoc, options: { merge: true } },
        ...metaDocs.map((item) => ({ type: "set", ref: doc(db, item.collection, item.id), data: item.data, options: { merge: false } })),
      ]);
      pushToast(`Xodim ma'lumoti yangilandi: ${nextPublicDoc.name}`);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function createEmployee(nextEmployee) {
    await saveEmployee({
      ...nextEmployee,
      id: makeId("employee"),
      roleCode: nextEmployee.roleCode || "EMPLOYEE",
      avatarUrl: nextEmployee.avatarUrl || "",
      status: "active",
    });
  }

  async function deleteEmployee(employeeId) {
    if (!canManagePeople(profile?.role)) return;
    const employee = publicUsersRef.current.find((item) => item.id === employeeId);
    if (!employee || !window.confirm("Xodim kartochkasi o'chirilsinmi?")) return;
    const affectedProjects = projectDocsRef.current.filter((project) => project.managerId === employeeId || project.teamIds.includes(employeeId));
    const nextProjects = affectedProjects.reduce(
      (currentProjects, project) =>
        currentProjects.map((item) =>
          item.id === project.id
            ? normalizeStoredProjectMeta(project.id, {
                ...project,
                managerId: project.managerId === employeeId ? "" : project.managerId,
                teamIds: project.teamIds.filter((teamId) => teamId !== employeeId),
                updatedAt: isoNow(),
                updatedBy: profile.uid,
              })
            : item
        ),
      [...projectDocsRef.current]
    );
    const metaDocs = createMetaDocs({ notifyText: `Xodim o'chirildi: ${employee.name}`, auditText: `Xodim o'chirildi: ${employee.name}`, page: "team" }, profile);
    const operations = [
      { type: "delete", ref: doc(db, "users", employeeId) },
      { type: "delete", ref: doc(db, "userPrivate", employeeId) },
      ...metaDocs.map((item) => ({ type: "set", ref: doc(db, item.collection, item.id), data: item.data, options: { merge: false } })),
    ];
    affectedProjects.forEach((project) => {
      const updatedProject = nextProjects.find((item) => item.id === project.id);
      operations.push({ type: "set", ref: doc(db, "projects", project.id), data: updatedProject, options: { merge: true } });
    });

    startTransition(() => {
      setPublicUsers((current) => current.filter((item) => item.id !== employeeId));
      setPrivateUsers((current) => {
        const next = { ...current };
        delete next[employeeId];
        return next;
      });
      setProjectDocs(nextProjects);
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, operations);
      pushToast(`Xodim o'chirildi: ${employee.name}`);
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function saveShoot(item) {
    if (!item.projectId || !item.type || !shootsCollectionRef) return;
    const relatedProject = projectDocsRef.current.find((project) => project.id === item.projectId);
    if (!canWorkInProject(profile, relatedProject)) return;
    const nextItem = withRecordMeta(item.id ? item : { ...item, id: makeId("shoot") }, profile);
    const metaDocs = createMetaDocs({ notifyText: "Syomka yozuvi yangilandi", auditText: `Syomka saqlandi: ${nextItem.type}`, page: "shooting" }, profile);

    startTransition(() => {
      setShootDocs((current) => {
        const map = indexById(current);
        map[nextItem.id] = nextItem;
        return Object.values(map);
      });
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, [
        { type: "set", ref: doc(db, "shoots", nextItem.id), data: nextItem, options: { merge: true } },
        ...metaDocs.map((entry) => ({ type: "set", ref: doc(db, entry.collection, entry.id), data: entry.data, options: { merge: false } })),
      ]);
      pushToast("Syomka yozuvi yangilandi");
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteShoot(id) {
    const relatedShoot = shootDocs.find((shoot) => shoot.id === id);
    const relatedProject = projectDocsRef.current.find((project) => project.id === relatedShoot?.projectId);
    if (!canWorkInProject(profile, relatedProject)) return;
    if (!window.confirm("Syomka yozuvi o'chirilsinmi?")) return;
    const metaDocs = createMetaDocs({ notifyText: "Syomka yozuvi o'chirildi", auditText: "Syomka yozuvi o'chirildi", page: "shooting" }, profile);
    startTransition(() => {
      setShootDocs((current) => current.filter((item) => item.id !== id));
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, [
        { type: "delete", ref: doc(db, "shoots", id) },
        ...metaDocs.map((entry) => ({ type: "set", ref: doc(db, entry.collection, entry.id), data: entry.data, options: { merge: false } })),
      ]);
      pushToast("Syomka yozuvi o'chirildi");
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function addMeeting(item) {
    if (!canEdit(profile?.role) || !item.client.trim()) return;
    const meeting = { ...item, id: makeId("meeting"), createdAt: isoNow(), updatedAt: isoNow(), createdBy: profile.uid, updatedBy: profile.uid };
    const metaDocs = createMetaDocs({ notifyText: "Meeting yozuvi qo'shildi", auditText: `Meeting saqlandi: ${item.client}`, page: "meetings" }, profile);
    startTransition(() => {
      setMeetingDocs((current) => [meeting, ...current]);
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, [
        { type: "set", ref: doc(db, "meetings", meeting.id), data: meeting, options: { merge: false } },
        ...metaDocs.map((entry) => ({ type: "set", ref: doc(db, entry.collection, entry.id), data: entry.data, options: { merge: false } })),
      ]);
      pushToast("Meeting yozuvi qo'shildi");
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteMeeting(id) {
    if (!canEdit(profile?.role) || !window.confirm("Meeting yozuvi o'chirilsinmi?")) return;
    const metaDocs = createMetaDocs({ notifyText: "Meeting yozuvi o'chirildi", auditText: "Meeting yozuvi o'chirildi", page: "meetings" }, profile);
    startTransition(() => {
      setMeetingDocs((current) => current.filter((meeting) => meeting.id !== id));
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations(db, [
        { type: "delete", ref: doc(db, "meetings", id) },
        ...metaDocs.map((entry) => ({ type: "set", ref: doc(db, entry.collection, entry.id), data: entry.data, options: { merge: false } })),
      ]);
      pushToast("Meeting yozuvi o'chirildi");
    } catch (error) {
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }

  if (!hasFirebaseConfig) {
    return <SetupScreen />;
  }

  if (booting) {
    return <LoadingScreen label="CRM yuklanmoqda..." />;
  }

  if (!profile) {
    return (
      <>
        <GlobalStyles />
        <AuthScreen
          busy={authBusy}
          error={authError}
          onEmailLogin={handleEmailLogin}
          onGoogleRegister={handleGoogleRegister}
          onGoogleLogin={handleGoogleLogin}
        />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", minHeight: "100vh", background: T.colors.bg, color: T.colors.text, fontFamily: T.font }}>
        <Sidebar profile={profile} page={page} onNavigate={navigate} onLogout={handleLogout} unreadCount={unreadCount} />

        <main style={{ flex: 1, overflow: "auto", padding: "32px 36px", maxWidth: "calc(100% - 220px)" }}>
          {authError ? (
            <div style={{ marginBottom: 14, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: T.radius.lg, fontSize: 13, fontWeight: 600 }}>
              {authError}
            </div>
          ) : null}
          {syncing ? (
            <div style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 8, background: T.colors.accentSoft, color: T.colors.accent, padding: "6px 10px", borderRadius: T.radius.full, fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.colors.accent, animation: "syncPulse 1s ease-in-out infinite" }} />
              Saqlanmoqda
            </div>
          ) : null}

          {page === "dashboard" ? (
            <DashboardPage
              profile={profile}
              projects={projects}
              employees={employees}
              employeeMetricsById={projectCaches.employeeMetricsById}
              progressByProjectId={projectCaches.progressByProjectId}
              dashboardSummary={projectCaches.dashboardSummary}
              loading={primaryLoading}
              onOpenProject={(id) => {
                setSelectedProjectId(id);
                setPage("projects");
              }}
            />
          ) : null}

          {page === "projects" ? (
            <ProjectsPage
              profile={profile}
              projects={projects}
              employees={employees}
              selectedProjectId={selectedProjectId}
              selectedProject={selectedProject}
              projectReady={projectWorkspaceReady}
              onSelectProject={setSelectedProjectId}
              onBackToList={() => setSelectedProjectId("")}
              onCreateProject={createProject}
              onSaveProject={saveProject}
              onDeleteProject={deleteProject}
              loading={primaryLoading}
              progressByProjectId={projectCaches.progressByProjectId}
            />
          ) : null}

          {page === "team" ? (
            <TeamPage
              profile={profile}
              employees={employees}
              projects={projects}
              employeeMetricsById={projectCaches.employeeMetricsById}
              assignmentsByEmployeeId={projectCaches.assignmentsByEmployeeId}
              onSaveEmployee={saveEmployee}
              onCreateEmployee={createEmployee}
              onDeleteEmployee={deleteEmployee}
              loading={teamLoading}
            />
          ) : null}

          {page === "shooting" ? <ShootingPage profile={profile} shoots={shoots} projects={projects} employees={employees} onSaveShoot={saveShoot} onDeleteShoot={deleteShoot} /> : null}
          {page === "meetings" ? <MeetingsPage profile={profile} meetings={meetingDocs} employees={employees} onAddMeeting={addMeeting} onDeleteMeeting={deleteMeeting} /> : null}
          {page === "notifications" ? <NotificationsPage notifications={notificationDocs} profile={profile} onMarkAllRead={markAllNotificationsRead} /> : null}
          {page === "reports" && canViewReports(profile.role) ? <ReportsPage projects={projects} /> : null}
          {page === "workflow" ? <WorkflowPage /> : null}
        </main>
        <ToastStack toasts={toasts} />
      </div>
    </>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; }
      body { font-family: ${T.font}; background: ${T.colors.bg}; color: ${T.colors.text}; }
      a { color: ${T.colors.accent}; }
      button, input, select, textarea { font: inherit; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: #c7c7cc; border-radius: 999px; }
      @keyframes sidebarPulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.55); }
        70% { box-shadow: 0 0 0 10px rgba(255, 59, 48, 0); }
        100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
      }
      @keyframes syncPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(0.7); opacity: 0.45; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes appleSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes loaderPulse {
        0%, 100% { transform: scale(0.9); opacity: 0.45; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      @keyframes loaderBounce {
        0%, 100% { transform: translateY(0); opacity: 0.25; }
        50% { transform: translateY(-4px); opacity: 1; }
      }
      @keyframes skeletonShimmer {
        from { background-position: 200% 0; }
        to { background-position: -200% 0; }
      }
      @media (max-width: 1080px) {
        main { max-width: 100% !important; padding: 24px !important; }
      }
      @media (max-width: 1200px) {
        div[style*="gridTemplateColumns: repeat(4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 920px) {
        aside { width: 100% !important; min-height: auto !important; position: static !important; }
        body > div, #root > div { min-width: 0; }
        #root > div > main { max-width: 100% !important; }
      }
    `}</style>
  );
}
