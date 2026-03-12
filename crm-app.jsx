import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
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
const PRIORITIES = ["Yuqori", "O'rta", "Past"];
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Telegram"];
const FORMATS = ["Post", "Reels", "Story", "Video", "Carousel", "Live"];
const DEPARTMENTS = ["SMM bo'limi", "Target bo'limi", "Media bo'limi", "Sales bo'limi", "Project Management", "Boshqaruv"];

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

const ROOT_DOC_ID = "agency-crm";
const EDITOR_ROLES = new Set(["CEO", "MANAGER", "SUPERVISOR"]);
const REPORT_ROLES = new Set(["CEO", "INVESTOR"]);
const PEOPLE_ROLES = new Set(["CEO", "MANAGER", "SUPERVISOR"]);

const STATUS_META = {
  "Rejalashtirildi": { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "Jarayonda": { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  "Ko'rib chiqilmoqda": { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  "Tasdiqlandi": { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  "Bajarildi": { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "E'lon qilindi": { bg: "#ccfbf1", text: "#0f766e", border: "#5eead4" },
  "Rad etildi": { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
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
  const allTasks = projects.flatMap((project) => project.tasks);
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

function visibleProjects(profile, projects) {
  if (!profile) return [];
  if (profile.role === "EMPLOYEE") {
    return projects.filter((project) => project.teamIds.includes(profile.uid) || project.managerId === profile.uid);
  }
  return projects;
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
    chat: "Chat",
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
  };
  return map[code] || `Firebase xatosi: ${code || error?.message || "noma'lum xato"}`;
}

function Avatar({ name, url, size = 34 }) {
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
}

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

function StatusBadge({ value }) {
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
}

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

function PriorityBadge({ value }) {
  const meta = PRIORITY_META[value] || PRIORITY_META["O'rta"];
  return (
    <span style={{ background: meta.bg, color: meta.text, borderRadius: T.radius.full, padding: "5px 10px", fontSize: 12, fontWeight: 800 }}>
      {value}
    </span>
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

function CircleProgress({ pct, size = 66, stroke = 6, color = T.colors.accent }) {
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (circumference * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.colors.borderLight} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
    </svg>
  );
}

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
    { id: "chat", label: "Chat", icon: "◯" },
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

function DashboardPage({ profile, projects, employees, onOpenProject }) {
  const totalTasks = projects.flatMap((project) => project.tasks).length;
  const completedTasks = projects.flatMap((project) => project.tasks).filter((task) => task.status === "Bajarildi").length;
  const activeProjects = projects.filter((project) => project.status === "Jarayonda").length;
  const pendingReviews = projects.flatMap((project) => project.contentPlan).filter((item) => item.status === "Ko'rib chiqilmoqda").length;
  const score = healthScore(projects);

  const ranking = employees
    .map((employee) => ({
      employee,
      metrics: employeeMetrics(employee.id, projects),
    }))
    .sort((a, b) => {
      if (b.metrics.kpi !== a.metrics.kpi) return b.metrics.kpi - a.metrics.kpi;
      return b.metrics.completed - a.metrics.completed;
    });

  const topEmployee = ranking[0];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Xush kelibsiz, ${profile.name}. Bugungi holat real CRM ma'lumotlari bilan hisoblanmoqda.`} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Loyihalar" value={projects.length} hint={`${activeProjects} tasi faol`} color={T.colors.accent} />
        <StatCard label="Tasklar" value={`${completedTasks}/${totalTasks}`} hint="Bajarilgan ishlar" color={T.colors.green} />
        <StatCard label="Xodimlar" value={employees.length} hint="Real foydalanuvchilar" color={T.colors.purple} />
        <StatCard label="Tasdiq kutmoqda" value={pendingReviews} hint="Kontent ko'rib chiqilmoqda" color={T.colors.orange} />
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
                const manager = employees.find((employee) => employee.id === project.managerId);
                const progress = calcProjectProgress(project);
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
                  const metrics = employeeMetrics(employee.id, projects);
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
    </div>
  );
}

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
    onSubmit({ ...form, teamIds: Array.from(new Set(form.teamIds)) });
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

function TasksTab({ profile, project, employees, editable, onUpdateProject }) {
  const [editingTask, setEditingTask] = useState(null);
  const [draft, setDraft] = useState({ name: "", ownerId: employees[0]?.id || "", start: "", deadline: "", status: "Rejalashtirildi", note: "" });

  function openForEdit(task) {
    setEditingTask(task.id);
    setDraft({ ...task });
  }

  function resetForm() {
    setEditingTask(null);
    setDraft({ name: "", ownerId: employees[0]?.id || "", start: "", deadline: "", status: "Rejalashtirildi", note: "" });
  }

  function saveTask() {
    if (!draft.name.trim()) return;
    const tasks = editingTask
      ? project.tasks.map((task) => (task.id === editingTask ? { ...task, ...draft } : task))
      : [...project.tasks, { ...draft, id: makeId("task") }];
    onUpdateProject({ ...project, tasks }, { notifyText: `Task yangilandi: ${draft.name}`, auditText: `Task saqlandi: ${draft.name}`, page: "projects" });
    resetForm();
  }

  function updateTaskStatus(taskId, status) {
    onUpdateProject(
      { ...project, tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)) },
      { notifyText: "Task holati yangilandi", auditText: `Task statusi o'zgardi: ${status}`, page: "projects" }
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
        {editable ? <Button onClick={resetForm}>Yangi task</Button> : null}
      </div>

      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Task nomi" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
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
        <DataTable columns={["Task", "Mas'ul", "Boshlanish", "Deadline", "Holat", "Izoh", "Amal"]}>
          {project.tasks.map((task) => {
            const owner = employees.find((employee) => employee.id === task.ownerId);
            const canChangeStatus = editable || task.ownerId === profile.uid;
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
                  {editable ? (
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
}

function ContentPlanTab({ profile, project, employees, editable, onUpdateProject }) {
  const [draft, setDraft] = useState({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", ownerId: employees[0]?.id || "", status: "Rejalashtirildi", note: "" });
  const [editingId, setEditingId] = useState("");

  function reset() {
    setDraft({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", ownerId: employees[0]?.id || "", status: "Rejalashtirildi", note: "" });
    setEditingId("");
  }

  function save() {
    if (!draft.topic.trim()) return;
    const contentPlan = editingId
      ? project.contentPlan.map((item) => (item.id === editingId ? { ...item, ...draft } : item))
      : [...project.contentPlan, { ...draft, id: makeId("content") }];
    onUpdateProject({ ...project, contentPlan }, { notifyText: "Kontent reja yangilandi", auditText: `Kontent saqlandi: ${draft.topic}`, page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, contentPlan: project.contentPlan.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Kontent holati o'zgardi", auditText: `Kontent statusi o'zgardi: ${status}`, page: "projects" }
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
        {editable ? <Button onClick={reset}>Yangi kontent</Button> : null}
      </div>

      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Platforma" value={draft.platform} onChange={(value) => setDraft((prev) => ({ ...prev, platform: value }))} options={PLATFORMS} />
            <Field label="Format" value={draft.format} onChange={(value) => setDraft((prev) => ({ ...prev, format: value }))} options={FORMATS} />
            <Field label="Mavzu" value={draft.topic} onChange={(value) => setDraft((prev) => ({ ...prev, topic: value }))} />
            <Field label="Caption" value={draft.caption} onChange={(value) => setDraft((prev) => ({ ...prev, caption: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
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
        <DataTable columns={["Sana", "Platforma", "Format", "Mavzu", "Mas'ul", "Holat", "Izoh", "Amal"]}>
          {project.contentPlan.map((item) => {
            const owner = employees.find((employee) => employee.id === item.ownerId);
            const canChangeStatus = editable || item.ownerId === profile.uid;
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
                  {editable ? (
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
}

function MediaPlanTab({ profile, project, employees, editable, onUpdateProject }) {
  const [draft, setDraft] = useState({ date: "", type: "Post", platform: "Instagram", format: "Post", ownerId: employees[0]?.id || "", budget: "", status: "Rejalashtirildi", note: "" });
  const [editingId, setEditingId] = useState("");

  function reset() {
    setDraft({ date: "", type: "Post", platform: "Instagram", format: "Post", ownerId: employees[0]?.id || "", budget: "", status: "Rejalashtirildi", note: "" });
    setEditingId("");
  }

  function save() {
    const mediaPlan = editingId
      ? project.mediaPlan.map((item) => (item.id === editingId ? { ...item, ...draft, budget: Number(draft.budget || 0) } : item))
      : [...project.mediaPlan, { ...draft, id: makeId("media"), budget: Number(draft.budget || 0) }];
    onUpdateProject({ ...project, mediaPlan }, { notifyText: "Media plan yangilandi", auditText: "Media plan saqlandi", page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, mediaPlan: project.mediaPlan.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Media plan holati o'zgardi", auditText: `Media plan statusi o'zgardi: ${status}`, page: "projects" }
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
        {editable ? <Button onClick={reset}>Yangi yozuv</Button> : null}
      </div>

      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={FORMATS} />
            <Field label="Platforma" value={draft.platform} onChange={(value) => setDraft((prev) => ({ ...prev, platform: value }))} options={PLATFORMS} />
            <Field label="Format" value={draft.format} onChange={(value) => setDraft((prev) => ({ ...prev, format: value }))} options={FORMATS} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
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
        <DataTable columns={["Sana", "Tur", "Platforma", "Mas'ul", "Byudjet", "Holat", "Izoh", "Amal"]}>
          {project.mediaPlan.map((item) => {
            const owner = employees.find((employee) => employee.id === item.ownerId);
            const canChangeStatus = editable || item.ownerId === profile.uid;
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
                  {editable ? (
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
}

function PlansTab({ project, editable, onUpdateProject }) {
  const [planType, setPlanType] = useState("daily");
  const [draft, setDraft] = useState({ title: "", status: "Rejalashtirildi", taskId: "", note: "", date: "", week: "", month: "" });
  const [editingId, setEditingId] = useState("");
  const currentItems = project.plans?.[planType] || [];

  function reset() {
    setDraft({ title: "", status: "Rejalashtirildi", taskId: "", note: "", date: "", week: "", month: "" });
    setEditingId("");
  }

  function save() {
    if (!draft.title.trim()) return;
    const list = editingId
      ? currentItems.map((item) => (item.id === editingId ? { ...item, ...draft } : item))
      : [...currentItems, { ...draft, id: makeId("plan") }];
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
        {editable ? <Button onClick={reset}>Yangi reja</Button> : null}
      </div>

      {editable ? (
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
                    <StatusSelect value={item.status} options={PLAN_STATUSES} onChange={editable ? (status) => updateStatus(item.id, status) : null} disabled={!editable} />
                    {editable ? <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button> : null}
                    {editable ? <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : null}
                  </div>
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
}

function CallsTab({ project, employees, editable, onUpdateProject }) {
  const [draft, setDraft] = useState({ date: "", type: "Call", whoId: employees[0]?.id || "", result: "", next: "" });

  function save() {
    if (!draft.date && !draft.result && !draft.next) return;
    const calls = [...project.calls, { ...draft, id: makeId("call") }];
    onUpdateProject({ ...project, calls }, { notifyText: "Mijoz bilan aloqa saqlandi", auditText: "Mijoz bilan aloqa saqlandi", page: "projects" });
    setDraft({ date: "", type: "Call", whoId: employees[0]?.id || "", result: "", next: "" });
  }

  function remove(id) {
    if (!window.confirm("Aloqa yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, calls: project.calls.filter((item) => item.id !== id) }, { notifyText: "Aloqa yozuvi o'chirildi", auditText: "Aloqa yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>Mijoz bilan aloqalar</div>
      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={["Call", "Meeting"]} />
            <Field label="Kim gaplashdi" value={draft.whoId} onChange={(value) => setDraft((prev) => ({ ...prev, whoId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Natija" value={draft.result} onChange={(value) => setDraft((prev) => ({ ...prev, result: value }))} />
            <Field label="Keyingi qadam" value={draft.next} onChange={(value) => setDraft((prev) => ({ ...prev, next: value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Button onClick={save}>Qo'shish</Button>
          </div>
        </Card>
      ) : null}

      {project.calls.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {project.calls.map((item) => {
            const person = employees.find((employee) => employee.id === item.whoId);
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
                  {editable ? <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : null}
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
}

function ProjectDetailPage({ profile, project, employees, onBack, onSaveProject, onDeleteProject }) {
  const [tab, setTab] = useState("tasks");
  const [editingProject, setEditingProject] = useState(false);
  const editable = canEdit(profile.role);
  const progress = calcProjectProgress(project);
  const manager = employees.find((employee) => employee.id === project.managerId);
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
            </div>
            {project.teamIds.length ? (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {project.teamIds.slice(0, 5).map((teamId, index) => {
                  const teamMember = employees.find((employee) => employee.id === teamId);
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

      {tab === "tasks" ? <TasksTab profile={profile} project={project} employees={employees} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "content" ? <ContentPlanTab profile={profile} project={project} employees={employees} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "media" ? <MediaPlanTab profile={profile} project={project} employees={employees} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "plans" ? <PlansTab project={project} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "calls" ? <CallsTab project={project} employees={employees} editable={editable} onUpdateProject={onSaveProject} /> : null}
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
}

function ProjectsPage({ profile, projects, employees, selectedProjectId, onSelectProject, onBackToList, onCreateProject, onSaveProject, onDeleteProject }) {
  const [showCreate, setShowCreate] = useState(false);
  const editable = canEdit(profile.role);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

  if (selectedProject) {
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

      {projects.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {projects.map((project) => {
            const manager = employees.find((employee) => employee.id === project.managerId);
            const progress = calcProjectProgress(project);
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
                      const teamMember = employees.find((employee) => employee.id === teamId);
                      return teamMember ? <div key={teamId} style={{ marginLeft: index ? -6 : 0 }}><Avatar name={teamMember.name} url={teamMember.avatarUrl} size={22} /></div> : null;
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Loyihalar hali yo'q" desc="Yangi loyiha yaratilgach bu yerda ko'rinadi." />
      )}

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
}

function TeamPage({ profile, employees, projects, onSaveEmployee, onCreateEmployee, onDeleteEmployee }) {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const editable = canManagePeople(profile.role);
  const grouped = DEPARTMENTS.map((dept) => ({
    dept,
    employees: employees.filter((employee) => employee.dept === dept),
  })).filter((group) => group.employees.length);

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        subtitle={`${employees.length} ta xodim. Google orqali kirganlar va qo'lda kiritilgan jamoa kartochkalari shu yerda.`}
        action={editable ? <Button onClick={() => setShowAdd(true)}>+ Xodim</Button> : null}
      />
      {grouped.length ? (
        <div style={{ display: "grid", gap: 20 }}>
          {grouped.map((group) => (
            <div key={group.dept}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: { "SMM bo'limi": T.colors.indigo, "Target bo'limi": T.colors.orange, "Media bo'limi": T.colors.accent, "Sales bo'limi": T.colors.green, "Project Management": T.colors.purple, Boshqaruv: T.colors.text }[group.dept] || T.colors.accent }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>{group.dept}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {group.employees.map((employee) => {
                  const metrics = employeeMetrics(employee.id, projects);
                  const projectAssignments = projects.filter((project) => project.teamIds.includes(employee.id) || project.managerId === employee.id).slice(0, 3);
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
                        <div>{employee.salary ? `${toMoney(employee.salary)} so'm / oy` : "Oylik kiritilmagan"}</div>
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
      ) : (
        <EmptyState title="Xodimlar hali yo'q" desc="Xodim Google orqali kirgach avtomatik ro'yxatga qo'shiladi." />
      )}

      {showAdd ? (
        <Modal title="Yangi xodim qo'shish" onClose={() => setShowAdd(false)} width={620}>
          <EmployeeEditForm
            employee={{ name: "", role: "", dept: "SMM bo'limi", email: "", salary: 0, kpiBase: 80, load: 50 }}
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
}

function EmployeeEditForm({ employee, onCancel, onSave, submitLabel = "Saqlash" }) {
  const [form, setForm] = useState({ ...employee, salary: String(employee.salary || ""), kpiBase: String(employee.kpiBase || 80), load: String(employee.load || 0), email: employee.email || "" });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <Field label="Ism" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <Field label="Lavozim" value={form.role} onChange={(value) => setForm((prev) => ({ ...prev, role: value }))} />
        <Field label="Bo'lim" value={form.dept} onChange={(value) => setForm((prev) => ({ ...prev, dept: value }))} options={DEPARTMENTS} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} type="email" />
        <Field label="Oylik" type="number" value={form.salary} onChange={(value) => setForm((prev) => ({ ...prev, salary: value }))} />
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
              salary: Number(form.salary || 0),
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
  const editable = canEdit(profile.role);
  const [draft, setDraft] = useState({ date: "", projectId: projects[0]?.id || "", type: "", location: "", operatorId: employees[0]?.id || "", goal: "", status: "Rejalashtirildi" });

  function reset() {
    setDraft({ date: "", projectId: projects[0]?.id || "", type: "", location: "", operatorId: employees[0]?.id || "", goal: "", status: "Rejalashtirildi" });
  }

  return (
    <div>
      <PageHeader title="Syomka kalendari" subtitle="Syomka vazifalari va statuslari saqlanadigan bo'lim." />

      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Loyiha" value={draft.projectId} onChange={(value) => setDraft((prev) => ({ ...prev, projectId: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} />
            <Field label="Lokatsiya" value={draft.location} onChange={(value) => setDraft((prev) => ({ ...prev, location: value }))} />
            <Field label="Operator" value={draft.operatorId} onChange={(value) => setDraft((prev) => ({ ...prev, operatorId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Maqsad" value={draft.goal} onChange={(value) => setDraft((prev) => ({ ...prev, goal: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={PLAN_STATUSES} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Button onClick={() => { onSaveShoot(draft); reset(); }}>Syomka qo'shish</Button>
          </div>
        </Card>
      ) : null}

      {shoots.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {shoots.map((shoot) => {
            const project = projects.find((item) => item.id === shoot.projectId);
            const operator = employees.find((item) => item.id === shoot.operatorId);
            const canChangeStatus = editable || shoot.operatorId === profile.uid;
            return (
              <Card key={shoot.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{shoot.type || "Syomka turi"}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>{project?.name || "Loyiha tanlanmagan"}</div>
                  </div>
                  {canChangeStatus ? (
                    <StatusSelect value={shoot.status} options={PLAN_STATUSES} onChange={(status) => onSaveShoot({ ...shoot, status })} />
                  ) : (
                    <StatusBadge value={shoot.status} />
                  )}
                </div>
                <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.8 }}>
                  Sana: {shoot.date || "-"}<br />
                  Lokatsiya: {shoot.location || "-"}<br />
                  Maqsad: {shoot.goal || "-"}
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.colors.textMuted }}>
                    {operator ? <Avatar name={operator.name} url={operator.avatarUrl} size={24} /> : null}
                    <span style={{ fontSize: 12 }}>{operator?.name || "Operator yo'q"}</span>
                  </div>
                  {editable ? <Button variant="danger" onClick={() => onDeleteShoot(shoot.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Syomka yozuvlari yo'q" desc="Syomka kalendari shu yerda yuritiladi." />
      )}
    </div>
  );
}

function MeetingsPage({ profile, meetings, employees, onAddMeeting, onDeleteMeeting }) {
  const editable = canEdit(profile.role);
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
              const person = employees.find((employee) => employee.id === meeting.whoId);
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

function ChatPage({ profile, employees, messages, onSendMessage }) {
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const sortedMessages = sortByRecent(messages, "createdAt").reverse();
  const quickReactions = ["👍", "🔥", "✅", "👏", "🎯", "🚀"];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput("");
  }

  return (
    <div>
      <PageHeader title="Umumiy chat" subtitle="Realtime jamoa chat. Xabarlar Firestore orqali barcha foydalanuvchilarga darhol sinxronlanadi." />
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 420, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderBottom: `1px solid ${T.colors.border}` }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Jamoa xabarlari</div>
            <div style={{ marginTop: 2, color: T.colors.textSecondary, fontSize: 12 }}>{employees.length} foydalanuvchi · {sortedMessages.length} ta xabar</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: T.colors.borderLight, borderRadius: T.radius.full, padding: "6px 10px", fontSize: 12, color: T.colors.textSecondary }}>🙂 Memojis</span>
            <span style={{ background: T.colors.borderLight, borderRadius: T.radius.full, padding: "6px 10px", fontSize: 12, color: T.colors.textSecondary }}>🫧 Sticker</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: T.space.xl, display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(180deg, #ffffff 0%, #fafafe 100%)" }}>
          {sortedMessages.length ? (
            sortedMessages.map((message) => {
              const author = employees.find((employee) => employee.id === message.userId) || { name: message.authorName || "Noma'lum" };
              const mine = message.userId === profile.uid;
              return (
                <div key={message.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start", flexDirection: mine ? "row-reverse" : "row" }}>
                  {!mine ? <Avatar name={author.name} url={author.avatarUrl} size={30} /> : null}
                  <div style={{ maxWidth: "70%" }}>
                    {!mine ? <div style={{ fontSize: 11, color: T.colors.textSecondary, marginBottom: 4, fontWeight: 700 }}>{author.name}</div> : null}
                    <div
                      style={{
                        background: mine ? T.colors.accent : T.colors.bg,
                        color: mine ? "#fff" : T.colors.text,
                        padding: "12px 14px",
                        borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        lineHeight: 1.6,
                        boxShadow: mine ? "0 10px 24px rgba(0,113,227,0.16)" : "none",
                      }}
                    >
                      {message.text}
                    </div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: mine ? "flex-end" : "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 10, color: T.colors.textTertiary, textAlign: mine ? "right" : "left" }}>
                        {String(message.createdAt || "").slice(0, 16).replace("T", " ")}
                      </div>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        {quickReactions.slice(0, 2).map((emoji) => (
                          <button
                            key={`${message.id}_${emoji}`}
                            type="button"
                            onClick={() => setInput((prev) => `${prev}${prev ? " " : ""}${emoji}`)}
                            style={{ border: "none", background: T.colors.borderLight, borderRadius: T.radius.full, width: 22, height: 22, cursor: "pointer", fontSize: 11 }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: T.colors.textMuted }}>Chat hali bo'sh.</div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ borderTop: `1px solid ${T.colors.border}`, padding: 16, display: "flex", gap: 10, flexWrap: "wrap", background: T.colors.surface }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setInput((prev) => `${prev}${prev ? " " : ""}${emoji}`)}
                style={{
                  border: "none",
                  borderRadius: T.radius.full,
                  background: T.colors.borderLight,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Xabar yozing... (Enter yuboradi)"
            style={{ flex: 1, minHeight: 44, maxHeight: 140, resize: "vertical", border: `1.5px solid ${T.colors.border}`, borderRadius: T.radius.lg, padding: "10px 14px", fontFamily: T.font, fontSize: 14, background: T.colors.bg }}
          />
          <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
            <Button variant="secondary" onClick={() => setInput((prev) => `${prev}${prev ? " " : ""}🙂`)} style={{ padding: "10px 12px" }}>
              🙂
            </Button>
            <Button onClick={send} style={{ alignSelf: "flex-end", padding: "10px 18px" }}>Yuborish</Button>
          </div>
        </div>
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
      <Card style={{ textAlign: "center", maxWidth: 360, padding: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", border: `4px solid ${T.colors.accentSoft}`, borderTopColor: T.colors.accent, margin: "0 auto", animation: "spin 1s linear infinite" }} />
        <div style={{ marginTop: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>{label}</div>
        <div style={{ marginTop: 6, color: T.colors.textSecondary, fontSize: 13 }}>Realtime CRM ma'lumotlari tayyorlanmoqda.</div>
      </Card>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [crm, setCrm] = useState(EMPTY_CRM);
  const [page, setPage] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [booting, setBooting] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const pendingRegistrationRef = useRef(null);
  const crmRef = useRef(EMPTY_CRM);
  const latestLocalMutationRef = useRef("");
  const rootRef = hasFirebaseConfig && db ? doc(db, "crm", ROOT_DOC_ID) : null;

  useEffect(() => {
    crmRef.current = crm;
  }, [crm]);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setBooting(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setBooting(true);
      try {
        if (!firebaseUser) {
          setProfile(null);
          setCrm(EMPTY_CRM);
          setBooting(false);
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const snapshot = await getDoc(userRef);
        const fixedRole = FIXED_ROLE_BY_EMAIL[(firebaseUser.email || "").toLowerCase()];
        const registration = pendingRegistrationRef.current;
        const baseName = registration?.name || firebaseUser.displayName || fixedRole?.name || firebaseUser.email?.split("@")[0] || "Xodim";
        const nextProfile = snapshot.exists()
          ? {
              ...snapshot.data(),
              email: firebaseUser.email || snapshot.data().email || "",
              name: snapshot.data().name || baseName,
              avatarUrl: firebaseUser.photoURL || snapshot.data().avatarUrl || "",
            }
          : {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: baseName,
              avatarUrl: firebaseUser.photoURL || "",
              role: fixedRole?.role || "EMPLOYEE",
              dept: registration?.dept || fixedRole?.dept || "SMM bo'limi",
              title: registration?.title || fixedRole?.title || "Xodim",
              salary: 0,
              kpiBase: 80,
              load: 0,
              createdAt: isoNow(),
            };

        await setDoc(userRef, nextProfile, { merge: true });
        pendingRegistrationRef.current = null;
        setProfile(nextProfile);
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
    if (!profile || !rootRef) return undefined;
    const unsubscribe = onSnapshot(rootRef, async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(rootRef, { payload: EMPTY_CRM }, { merge: true });
        return;
      }
      const nextCrm = normalizeCrmPayload(snapshot.data().payload);
      const incomingStamp = String(nextCrm.meta?.updatedAt || "");
      const localStamp = String(latestLocalMutationRef.current || "");
      if (localStamp && (!incomingStamp || incomingStamp < localStamp)) {
        return;
      }
      if (localStamp && incomingStamp && incomingStamp >= localStamp) {
        latestLocalMutationRef.current = "";
      }
      crmRef.current = nextCrm;
      setCrm(nextCrm);
    });
    return () => unsubscribe();
  }, [profile, rootRef]);

  async function commitMutation(recipe, meta = {}) {
    if (!rootRef || !profile) return;
    const previous = crmRef.current;
    const optimistic = finalizeMutationPayload(recipe(previous), previous, meta, profile);
    latestLocalMutationRef.current = optimistic.meta?.updatedAt || "";
    crmRef.current = optimistic;
    setCrm(optimistic);
    if (!meta.silent) {
      setSyncing(true);
    }
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(rootRef);
        const current = normalizeCrmPayload(snapshot.exists() ? snapshot.data().payload : EMPTY_CRM);
        const next = finalizeMutationPayload(recipe(current), current, meta, profile);
        transaction.set(rootRef, { payload: next }, { merge: false });
      });
    } catch (error) {
      latestLocalMutationRef.current = String(previous.meta?.updatedAt || "");
      crmRef.current = previous;
      setCrm(previous);
      setAuthError(humanizeAuthError(error));
    } finally {
      if (!meta.silent) {
        setSyncing(false);
      }
    }
  }

  useEffect(() => {
    if (!profile) return;
    commitMutation(
      (current) => {
        const nextEmployees = upsertEmployee(current.employees, profile);
        const unchanged = JSON.stringify(nextEmployees) === JSON.stringify(current.employees);
        if (unchanged) return current;
        return { ...current, employees: nextEmployees };
      },
      { skipAudit: true, silent: true }
    );
  }, [profile?.uid]);

  const projects = useMemo(() => visibleProjects(profile, crm.projects), [profile, crm.projects]);
  const employees = useMemo(() => crm.employees.filter((employee) => employee.roleCode !== "INVESTOR"), [crm.employees]);
  const unreadCount = profile ? unreadNotifications(crm.notifications, profile.uid) : 0;

  function navigate(nextPage) {
    setPage(nextPage);
    if (nextPage !== "projects") {
      setSelectedProjectId("");
    }
    if (nextPage === "notifications") {
      markAllNotificationsRead();
    }
  }

  async function markAllNotificationsRead() {
    if (!profile) return;
    await commitMutation(
      (current) => ({
        ...current,
        notifications: current.notifications.map((item) => ({
          ...item,
          readBy: { ...(item.readBy || {}), [profile.uid]: true },
        })),
      }),
      { skipAudit: true, silent: true }
    );
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
    await signOut(auth);
    setPage("dashboard");
    setSelectedProjectId("");
  }

  async function createProject(project) {
    await commitMutation(
      (current) => ({
        ...current,
        projects: [
          ...current.projects,
          normalizeProject({
            ...project,
            id: makeId("project"),
            tasks: [],
            contentPlan: [],
            mediaPlan: [],
            plans: { daily: [], weekly: [], monthly: [] },
            calls: [],
            report: { budget: 0, leads: 0, cpl: 0, sales: 0, roi: 0 },
          }),
        ],
      }),
      { notifyText: `Yangi loyiha qo'shildi: ${project.name}`, auditText: `Loyiha yaratildi: ${project.name}`, page: "projects" }
    );
  }

  async function saveProject(project, meta = {}) {
    await commitMutation(
      (current) => ({
        ...current,
        projects: current.projects.map((item) => (item.id === project.id ? normalizeProject(project) : item)),
      }),
      meta
    );
  }

  async function deleteProject(projectId) {
    const project = crm.projects.find((item) => item.id === projectId);
    if (!window.confirm("Loyiha butunlay o'chirilsinmi?")) return;
    await commitMutation(
      (current) => ({
        ...current,
        projects: current.projects.filter((item) => item.id !== projectId),
      }),
      { notifyText: `Loyiha o'chirildi: ${project?.name || "Noma'lum"}`, auditText: `Loyiha o'chirildi: ${project?.name || "Noma'lum"}`, page: "projects" }
    );
    setSelectedProjectId("");
  }

  async function saveEmployee(nextEmployee) {
    await commitMutation(
      (current) => ({
        ...current,
        employees: current.employees.some((employee) => employee.id === nextEmployee.id)
          ? current.employees.map((employee) => (employee.id === nextEmployee.id ? nextEmployee : employee))
          : [...current.employees, nextEmployee],
      }),
      { notifyText: `Xodim ma'lumoti yangilandi: ${nextEmployee.name}`, auditText: `Xodim saqlandi: ${nextEmployee.name}`, page: "team" }
    );
    if (db) {
      await setDoc(doc(db, "users", nextEmployee.id), employeeToProfilePatch(nextEmployee), { merge: true });
    }
  }

  async function createEmployee(nextEmployee) {
    const employee = {
      id: makeId("employee"),
      roleCode: "EMPLOYEE",
      avatarUrl: "",
      email: nextEmployee.email || "",
      name: nextEmployee.name || "Yangi xodim",
      role: nextEmployee.role || "Xodim",
      dept: nextEmployee.dept || "SMM bo'limi",
      salary: Number(nextEmployee.salary || 0),
      kpiBase: Number(nextEmployee.kpiBase || 80),
      load: Number(nextEmployee.load || 0),
    };
    await commitMutation(
      (current) => ({
        ...current,
        employees: [...current.employees, employee],
      }),
      { notifyText: `Yangi xodim qo'shildi: ${employee.name}`, auditText: `Xodim yaratildi: ${employee.name}`, page: "team" }
    );
    if (db) {
      await setDoc(doc(db, "users", employee.id), employeeToProfilePatch(employee), { merge: true });
    }
  }

  async function deleteEmployee(employeeId) {
    const employee = crm.employees.find((item) => item.id === employeeId);
    if (!window.confirm("Xodim kartochkasi o'chirilsinmi?")) return;
    await commitMutation(
      (current) => ({
        ...current,
        employees: current.employees.filter((item) => item.id !== employeeId),
        shoots: current.shoots.map((shoot) => (shoot.operatorId === employeeId ? { ...shoot, operatorId: "" } : shoot)),
        meetings: current.meetings.map((meeting) => (meeting.whoId === employeeId ? { ...meeting, whoId: "" } : meeting)),
        projects: current.projects.map((project) => ({
          ...project,
          managerId: project.managerId === employeeId ? "" : project.managerId,
          teamIds: project.teamIds.filter((teamId) => teamId !== employeeId),
          tasks: project.tasks.map((task) => (task.ownerId === employeeId ? { ...task, ownerId: "" } : task)),
          contentPlan: project.contentPlan.map((item) => (item.ownerId === employeeId ? { ...item, ownerId: "" } : item)),
          mediaPlan: project.mediaPlan.map((item) => (item.ownerId === employeeId ? { ...item, ownerId: "" } : item)),
          calls: project.calls.map((item) => (item.whoId === employeeId ? { ...item, whoId: "" } : item)),
        })),
      }),
      { notifyText: `Xodim o'chirildi: ${employee?.name || "Noma'lum"}`, auditText: `Xodim o'chirildi: ${employee?.name || "Noma'lum"}`, page: "team" }
    );
  }

  async function saveShoot(item) {
    if (!item.projectId || !item.type) return;
    const nextItem = item.id ? item : { ...item, id: makeId("shoot") };
    await commitMutation(
      (current) => ({
        ...current,
        shoots: item.id ? current.shoots.map((shoot) => (shoot.id === item.id ? nextItem : shoot)) : [...current.shoots, nextItem],
      }),
      { notifyText: "Syomka yozuvi yangilandi", auditText: `Syomka saqlandi: ${nextItem.type}`, page: "shooting" }
    );
  }

  async function deleteShoot(id) {
    if (!window.confirm("Syomka yozuvi o'chirilsinmi?")) return;
    await commitMutation(
      (current) => ({ ...current, shoots: current.shoots.filter((shoot) => shoot.id !== id) }),
      { notifyText: "Syomka yozuvi o'chirildi", auditText: "Syomka yozuvi o'chirildi", page: "shooting" }
    );
  }

  async function addMeeting(item) {
    if (!item.client.trim()) return;
    await commitMutation(
      (current) => ({ ...current, meetings: [...current.meetings, { ...item, id: makeId("meeting") }] }),
      { notifyText: "Meeting yozuvi qo'shildi", auditText: `Meeting saqlandi: ${item.client}`, page: "meetings" }
    );
  }

  async function deleteMeeting(id) {
    if (!window.confirm("Meeting yozuvi o'chirilsinmi?")) return;
    await commitMutation(
      (current) => ({ ...current, meetings: current.meetings.filter((meeting) => meeting.id !== id) }),
      { notifyText: "Meeting yozuvi o'chirildi", auditText: "Meeting yozuvi o'chirildi", page: "meetings" }
    );
  }

  async function sendChatMessage(text) {
    await commitMutation(
      (current) => ({
        ...current,
        chatMessages: [...current.chatMessages, { id: makeId("chat"), userId: profile.uid, authorName: profile.name, text, createdAt: isoNow() }],
      }),
      { notifyText: "Yangi chat xabari keldi", auditText: "Chat xabari yuborildi", page: "chat" }
    );
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
          {syncing ? (
            <div style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 8, background: T.colors.accentSoft, color: T.colors.accent, padding: "6px 10px", borderRadius: T.radius.full, fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.colors.accent, animation: "syncPulse 1s ease-in-out infinite" }} />
              Saqlanmoqda
            </div>
          ) : null}

          {page === "dashboard" ? <DashboardPage profile={profile} projects={projects} employees={employees} onOpenProject={(id) => { setSelectedProjectId(id); setPage("projects"); }} /> : null}
          {page === "projects" ? (
            <ProjectsPage
              profile={profile}
              projects={projects}
              employees={employees}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onBackToList={() => setSelectedProjectId("")}
              onCreateProject={createProject}
              onSaveProject={saveProject}
              onDeleteProject={deleteProject}
            />
          ) : null}
          {page === "team" ? <TeamPage profile={profile} employees={employees} projects={crm.projects} onSaveEmployee={saveEmployee} onCreateEmployee={createEmployee} onDeleteEmployee={deleteEmployee} /> : null}
          {page === "shooting" ? <ShootingPage profile={profile} shoots={crm.shoots} projects={crm.projects} employees={employees} onSaveShoot={saveShoot} onDeleteShoot={deleteShoot} /> : null}
          {page === "meetings" ? <MeetingsPage profile={profile} meetings={crm.meetings} employees={employees} onAddMeeting={addMeeting} onDeleteMeeting={deleteMeeting} /> : null}
          {page === "chat" ? <ChatPage profile={profile} employees={employees} messages={crm.chatMessages} onSendMessage={sendChatMessage} /> : null}
          {page === "notifications" ? <NotificationsPage notifications={crm.notifications} profile={profile} onMarkAllRead={markAllNotificationsRead} /> : null}
          {page === "reports" && canViewReports(profile.role) ? <ReportsPage projects={crm.projects} /> : null}
          {page === "workflow" ? <WorkflowPage /> : null}
        </main>
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
      @media (max-width: 1080px) {
        main { max-width: 100% !important; padding: 24px !important; }
      }
      @media (max-width: 920px) {
        aside { width: 100% !important; min-height: auto !important; position: static !important; }
        body > div, #root > div { min-width: 0; }
        #root > div > main { max-width: 100% !important; }
      }
    `}</style>
  );
}
