import { useState, useMemo, createContext, useRef, useEffect } from "react";

const T = {
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`,
  colors: {
    bg: "#f5f5f7",
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    border: "#e5e5ea",
    borderLight: "#f2f2f7",
    text: "#1d1d1f",
    textSecondary: "#6e6e73",
    textTertiary: "#aeaeb2",
    accent: "#0071e3",
    accentHover: "#0077ed",
    accentSoft: "#e8f0fe",
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
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 18, full: 999 },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.08)",
    md: "0 4px 16px rgba(0,0,0,0.08)",
    lg: "0 8px 32px rgba(0,0,0,0.10)",
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
};

const AuthCtx = createContext(null);
const USERS = [
  { id: 1, name: "Jasur Toshmatov", email: "ceo@agency.uz", password: "ceo123", role: "CEO", dept: "Boshqaruv", avatar: "JT" },
  { id: 2, name: "Aziz Nazarov", email: "aziz@agency.uz", password: "manager123", role: "MANAGER", dept: "Project Management", avatar: "AN" },
  { id: 3, name: "Dildora Yusupova", email: "dildora@agency.uz", password: "emp123", role: "EMPLOYEE", dept: "SMM bo'limi", avatar: "DY" },
  { id: 4, name: "Bobur Toshev", email: "bobur@agency.uz", password: "emp123", role: "EMPLOYEE", dept: "Target bo'limi", avatar: "BT" },
  { id: 5, name: "Kamola Mirzaeva", email: "kamola@agency.uz", password: "emp123", role: "EMPLOYEE", dept: "Media bo'limi", avatar: "KM" },
  { id: 6, name: "Sardor Holmatov", email: "sardor@agency.uz", password: "emp123", role: "EMPLOYEE", dept: "Sales bo'limi", avatar: "SH" },
];

const INIT_EMPLOYEES = [
  { id: 2, name: "Aziz Nazarov", role: "Project Manager", dept: "Project Management", salary: 5500000, projects: [1, 2], kpiBase: 92, load: 78 },
  { id: 3, name: "Dildora Yusupova", role: "SMM Specialist", dept: "SMM bo'limi", salary: 3800000, projects: [1, 3], kpiBase: 87, load: 65 },
  { id: 4, name: "Bobur Toshev", role: "Targeting Specialist", dept: "Target bo'limi", salary: 4200000, projects: [2], kpiBase: 94, load: 82 },
  { id: 5, name: "Kamola Mirzaeva", role: "Videographer", dept: "Media bo'limi", salary: 4000000, projects: [1, 2, 3], kpiBase: 89, load: 70 },
  { id: 6, name: "Sardor Holmatov", role: "Sales Manager", dept: "Sales bo'limi", salary: 4500000, projects: [3], kpiBase: 76, load: 55 },
];

const INIT_PROJECTS = [
  {
    id: 1, name: "NovaTech Branding", client: "NovaTech LLC", type: "Branding + SMM",
    start: "2026-02-01", end: "2026-04-30", manager: 2, team: [2, 3, 5],
    status: "In Progress", priority: "High",
    tasks: [
      { id: 1, name: "Brief tayyorlash", owner: 2, start: "2026-02-01", deadline: "2026-02-05", status: "Done", note: "Mijozdan tasdiqlandi" },
      { id: 2, name: "Strategiya hujjati", owner: 2, start: "2026-02-06", deadline: "2026-02-15", status: "Done", note: "" },
      { id: 3, name: "Mediapan yozish", owner: 3, start: "2026-02-16", deadline: "2026-02-28", status: "Done", note: "" },
      { id: 4, name: "Instagram kontent", owner: 3, start: "2026-03-01", deadline: "2026-03-31", status: "In Progress", note: "Haftalik 5 post" },
      { id: 5, name: "Reels seriyasi", owner: 5, start: "2026-03-01", deadline: "2026-03-20", status: "In Progress", note: "" },
      { id: 6, name: "Syomka", owner: 5, start: "2026-03-30", deadline: "2026-03-30", status: "Planned", note: "Lokatsiya: ofis" },
      { id: 7, name: "FB reklama", owner: 4, start: "2026-04-01", deadline: "2026-04-05", status: "Planned", note: "" },
      { id: 8, name: "Oylik hisobot", owner: 2, start: "2026-04-28", deadline: "2026-04-30", status: "Planned", note: "" },
    ],
    contentPlan: [
      { id: 1, date: "2026-03-10", platform: "Instagram", format: "Carousel", topic: "Brend taqdimoti", caption: "NovaTech — bu yangi texnologiya!", owner: 3, status: "Published", note: "", approvedBy: 2 },
      { id: 2, date: "2026-03-13", platform: "Instagram", format: "Reels", topic: "Behind the scenes", caption: "Bizning jamoa siz uchun ishlayapti", owner: 5, status: "Published", note: "", approvedBy: 2 },
      { id: 3, date: "2026-03-17", platform: "Instagram", format: "Story", topic: "Savol-javob", caption: "Savol qoldiring!", owner: 3, status: "Approved", note: "", approvedBy: 2 },
      { id: 4, date: "2026-03-20", platform: "Facebook", format: "Post", topic: "Mahsulot tanishtirish", caption: "NovaTech eng yangi yechimlar", owner: 3, status: "Review", note: "Caption o'zgartirish kerak" },
      { id: 5, date: "2026-03-24", platform: "TikTok", format: "Video", topic: "How-to tutorial", caption: "3 qadamda o'rganing!", owner: 5, status: "In Progress", note: "Montaj jarayonida" },
      { id: 6, date: "2026-03-27", platform: "Instagram", format: "Post", topic: "Mijoz sharhi", caption: "Mijozlarimiz nimalar deydi?", owner: 3, status: "Planned", note: "" },
    ],
    mediaplan: [
      { id: 1, date: "2026-03-10", type: "Post", platform: "Instagram", format: "Carousel", owner: 3, budget: 500000, status: "Done", note: "" },
      { id: 2, date: "2026-03-13", type: "Reels", platform: "Instagram", format: "Reels", owner: 5, budget: 300000, status: "Done", note: "" },
      { id: 3, date: "2026-03-17", type: "Story", platform: "Instagram", format: "Story", owner: 3, budget: 150000, status: "In Progress", note: "" },
      { id: 4, date: "2026-03-20", type: "Post", platform: "Facebook", format: "Post", owner: 3, budget: 400000, status: "Planned", note: "" },
    ],
    plans: {
      daily: [
        { id: 1, date: "2026-03-09", title: "Instagram storiga content upload", status: "Done", taskId: 4, note: "" },
        { id: 2, date: "2026-03-10", title: "Carousel post publish", status: "Done", taskId: 4, note: "" },
        { id: 3, date: "2026-03-11", title: "Engagement monitoring", status: "Done", taskId: 4, note: "" },
        { id: 4, date: "2026-03-12", title: "DM javob berish", status: "In Progress", taskId: 4, note: "" },
      ],
      weekly: [
        { id: 1, week: "Mar 9–15", title: "Haftalik 5 ta post tayyorlash", status: "In Progress", taskId: 4, note: "" },
        { id: 2, week: "Mar 16–22", title: "Reels seriyasi montaj", status: "Planned", taskId: 5, note: "" },
        { id: 3, week: "Mar 23–29", title: "Syomkaga tayyorgarlik", status: "Planned", taskId: 6, note: "" },
      ],
      monthly: [
        { id: 1, month: "Mart 2026", title: "NovaTech Instagram strategiyasi", status: "In Progress", taskId: 4, note: "" },
        { id: 2, month: "Aprel 2026", title: "FB + Instagram reklama launch", status: "Planned", taskId: 7, note: "" },
      ],
    },
    calls: [
      { id: 1, date: "2026-02-03", type: "Call", who: 2, result: "Brief olindi", next: "Strategiya" },
      { id: 2, date: "2026-02-20", type: "Meeting", who: 2, result: "Mediapan tasdiqlandi", next: "Kontent boshlash" },
      { id: 3, date: "2026-03-05", type: "Call", who: 6, result: "Progress muhokama", next: "Syomka sana" },
    ],
    report: { budget: 5000000, leads: 142, cpl: 35211, sales: 12, roi: 2.4 },
  },
  {
    id: 2, name: "GreenFood SMM", client: "GreenFood Market", type: "SMM + Target",
    start: "2026-01-15", end: "2026-03-31", manager: 2, team: [2, 4, 5],
    status: "In Progress", priority: "Medium",
    tasks: [
      { id: 9, name: "Brief", owner: 2, start: "2026-01-15", deadline: "2026-01-18", status: "Done", note: "" },
      { id: 10, name: "Kontent strategiya", owner: 2, start: "2026-01-19", deadline: "2026-01-28", status: "Done", note: "" },
      { id: 11, name: "Target sozlash", owner: 4, start: "2026-02-01", deadline: "2026-02-10", status: "Done", note: "" },
      { id: 12, name: "SMM kontent mart", owner: 3, start: "2026-03-01", deadline: "2026-03-31", status: "In Progress", note: "" },
      { id: 13, name: "Reklama optimallashtirish", owner: 4, start: "2026-03-10", deadline: "2026-03-25", status: "In Progress", note: "" },
      { id: 14, name: "Yakuniy hisobot", owner: 2, start: "2026-03-28", deadline: "2026-03-31", status: "Planned", note: "" },
    ],
    contentPlan: [
      { id: 7, date: "2026-03-11", platform: "Instagram", format: "Post", topic: "Yangi mahsulot", caption: "GreenFood — sog'lom ovqatlanish!", owner: 3, status: "Published", note: "", approvedBy: 2 },
      { id: 8, date: "2026-03-14", platform: "Instagram", format: "Reels", topic: "Resept video", caption: "5 daqiqada sog'lom tushlik!", owner: 5, status: "In Progress", note: "Montaj" },
      { id: 9, date: "2026-03-18", platform: "Facebook", format: "Story", topic: "Aksiya", caption: "30% chegirma faqat bugun!", owner: 3, status: "Planned", note: "" },
    ],
    mediaplan: [
      { id: 5, date: "2026-03-11", type: "Post", platform: "Instagram", format: "Post", owner: 3, budget: 300000, status: "Done", note: "" },
      { id: 6, date: "2026-03-14", type: "Reels", platform: "Instagram", format: "Reels", owner: 5, budget: 250000, status: "In Progress", note: "" },
    ],
    plans: {
      daily: [
        { id: 5, date: "2026-03-11", title: "Instagram post publish", status: "Done", taskId: 12, note: "" },
        { id: 6, date: "2026-03-12", title: "Comment reply", status: "Done", taskId: 12, note: "" },
      ],
      weekly: [
        { id: 4, week: "Mar 9–15", title: "GreenFood haftalik kontent", status: "In Progress", taskId: 12, note: "" },
      ],
      monthly: [
        { id: 3, month: "Mart 2026", title: "GreenFood SMM oylik reja", status: "In Progress", taskId: 12, note: "" },
      ],
    },
    calls: [
      { id: 4, date: "2026-02-10", type: "Call", who: 6, result: "Progress yaxshi", next: "Target kengaytirish" },
    ],
    report: { budget: 3500000, leads: 98, cpl: 35714, sales: 8, roi: 1.8 },
  },
  {
    id: 3, name: "AutoMax Launch", client: "AutoMax UZ", type: "Launch + Media",
    start: "2026-03-01", end: "2026-05-31", manager: 2, team: [3, 5, 6],
    status: "Planned", priority: "High",
    tasks: [
      { id: 15, name: "Brief va NDA", owner: 6, start: "2026-03-01", deadline: "2026-03-05", status: "Done", note: "" },
      { id: 16, name: "Launch strategiya", owner: 2, start: "2026-03-06", deadline: "2026-03-15", status: "In Progress", note: "" },
      { id: 17, name: "Mediapan", owner: 3, start: "2026-03-16", deadline: "2026-03-25", status: "Planned", note: "" },
      { id: 18, name: "Syomka (launch)", owner: 5, start: "2026-04-01", deadline: "2026-04-01", status: "Planned", note: "Avtosalon" },
      { id: 19, name: "PR materiallar", owner: 3, start: "2026-04-05", deadline: "2026-04-20", status: "Planned", note: "" },
      { id: 20, name: "Reklama launch", owner: 4, start: "2026-04-21", deadline: "2026-04-25", status: "Planned", note: "" },
    ],
    contentPlan: [
      { id: 10, date: "2026-04-05", platform: "Instagram", format: "Reels", topic: "Launch teaser", caption: "Katta yangilik kutib turibdi...", owner: 3, status: "Planned", note: "" },
      { id: 11, date: "2026-04-10", platform: "YouTube", format: "Video", topic: "Launch video", caption: "AutoMax UZ — rasmiy taqdimot!", owner: 5, status: "Planned", note: "" },
    ],
    mediaplan: [],
    plans: {
      daily: [],
      weekly: [
        { id: 5, week: "Mar 16–22", title: "Mediapan draft tayyorlash", status: "Planned", taskId: 17, note: "" },
      ],
      monthly: [
        { id: 4, month: "Aprel 2026", title: "AutoMax launch oy rejasi", status: "Planned", taskId: 18, note: "" },
      ],
    },
    calls: [
      { id: 5, date: "2026-03-03", type: "Meeting", who: 6, result: "Shartnoma imzolandi", next: "Strategiya taqdimoti" },
    ],
    report: { budget: 8000000, leads: 0, cpl: 0, sales: 0, roi: 0 },
  },
];

const INIT_CHAT = [
  { id: 1, userId: 1, text: "Assalomu alaykum, hammaga xush kelibsiz!", time: "09:00" },
  { id: 2, userId: 2, text: "Alaykum assalom! NovaTech loyihasi bo'yicha bugun meeting o'tkazamizmi?", time: "09:05" },
  { id: 3, userId: 3, text: "Menga ham xabar bering, kontent reja tayyor turibdi", time: "09:12" },
  { id: 4, userId: 1, text: "Ha, soat 15:00 da Zoom orqali bo'lamiz. Hamma qatnashsin.", time: "09:15" },
];

function computeKPI(empId, projects) {
  const allTasks = projects.flatMap((p) => p.tasks.filter((t) => t.owner === empId));
  if (!allTasks.length) return 0;
  const done = allTasks.filter((t) => t.status === "Done").length;
  const inProg = allTasks.filter((t) => t.status === "In Progress").length;
  const total = allTasks.length;
  const score = ((done * 1.0 + inProg * 0.5) / total) * 100;
  return Math.round(Math.min(score + 20, 99));
}

function computeLoad(empId, projects) {
  const allTasks = projects.flatMap((p) => p.tasks.filter((t) => t.owner === empId && t.status !== "Done"));
  return Math.min(allTasks.length * 12, 95);
}

function progressCalc(p) {
  if (!p.tasks.length) return 0;
  const done = p.tasks.filter((t) => t.status === "Done").length;
  return Math.round((done / p.tasks.length) * 100);
}

function fmt(n) {
  return Number(n || 0).toLocaleString("uz-UZ");
}

function empById(id, employees) {
  return employees.find((e) => e.id === id) || { name: "—", role: "—", dept: "—" };
}

function newId(arr) {
  return arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
}

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Telegram", "Twitter"];
const FORMATS = ["Post", "Reels", "Story", "Video", "Carousel", "Live"];
const CONTENT_STATUSES = ["Planned", "In Progress", "Review", "Approved", "Published", "Rejected"];
const TASK_STATUSES = ["Planned", "In Progress", "Review", "Done"];
const PLAN_STATUSES = ["Planned", "In Progress", "Done"];

const PLATFORM_COLORS = {
  Instagram: "#e1306c",
  TikTok: "#111827",
  Facebook: "#1877f2",
  YouTube: "#ff0000",
  Telegram: "#2AABEE",
  Twitter: "#1da1f2",
};

const STATUS_META = {
  Done: { bg: T.colors.greenSoft, text: "#1a7f37", dot: T.colors.green },
  "In Progress": { bg: T.colors.accentSoft, text: "#1a5cc8", dot: T.colors.accent },
  Planned: { bg: T.colors.borderLight, text: T.colors.textSecondary, dot: T.colors.textTertiary },
  Review: { bg: T.colors.orangeSoft, text: "#b45309", dot: T.colors.orange },
  Approved: { bg: T.colors.purpleSoft, text: "#7c3aed", dot: T.colors.purple },
  Published: { bg: T.colors.greenSoft, text: "#1a7f37", dot: T.colors.green },
  Rejected: { bg: T.colors.redSoft, text: "#b91c1c", dot: T.colors.red },
};

const PRIORITY_META = {
  High: { bg: T.colors.redSoft, text: T.colors.red },
  Medium: { bg: T.colors.orangeSoft, text: T.colors.orange },
  Low: { bg: T.colors.greenSoft, text: T.colors.green },
};

const DEPT_COLORS = {
  "SMM bo'limi": T.colors.indigo,
  "Media bo'limi": T.colors.accent,
  "Target bo'limi": T.colors.orange,
  "Sales bo'limi": T.colors.green,
  "Project Management": T.colors.purple,
  "Boshqaruv": "#1d1d1f",
};

function Avatar({ name = "?", size = 32 }) {
  const cols = [T.colors.accent, T.colors.purple, T.colors.orange, T.colors.green, T.colors.indigo, "#e11d48"];
  const bg = cols[(name.charCodeAt(0) || 0) % cols.length];
  const initials = name.split(" ").map((n) => n[0] || "").join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "-0.5px",
      }}
    >
      {initials}
    </div>
  );
}

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.Planned;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: m.bg,
        color: m.text,
        padding: "3px 9px",
        borderRadius: T.radius.full,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot }} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.Medium;
  return (
    <span
      style={{
        background: m.bg,
        color: m.text,
        padding: "2px 8px",
        borderRadius: T.radius.full,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {priority}
    </span>
  );
}

function Btn({ children, variant = "primary", onClick, style: s = {}, disabled }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: T.radius.md,
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    fontFamily: T.font,
    transition: "opacity .15s",
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: T.colors.accent, color: "#fff" },
    secondary: { background: T.colors.borderLight, color: T.colors.text },
    ghost: { background: "transparent", color: T.colors.textSecondary },
    danger: { background: T.colors.redSoft, color: T.colors.red },
    success: { background: T.colors.greenSoft, color: "#1a7f37" },
    warning: { background: T.colors.orangeSoft, color: "#b45309" },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...s }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Card({ children, style: s = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.colors.surface,
        border: `1px solid ${T.colors.border}`,
        borderRadius: T.radius.xl,
        padding: T.space.xl,
        boxShadow: T.shadow.sm,
        cursor: onClick ? "pointer" : "default",
        transition: onClick ? "box-shadow .15s, transform .15s" : undefined,
        ...s,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = T.shadow.md;
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = T.shadow.sm;
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: T.space.xl }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.colors.text, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: T.colors.textSecondary, fontSize: 14, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, options, required }) {
  const id = `input-${label}`;
  const style = {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>
          {label}
          {required && " *"}
        </label>
      )}
      {options ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={style}>
          {options.map((o) =>
            typeof o === "object" ? (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ) : (
              <option key={o} value={o}>
                {o}
              </option>
            )
          )}
        </select>
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose, width = 560 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: T.space.xl,
      }}
    >
      <div
        style={{
          background: T.colors.surface,
          borderRadius: T.radius.xl,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: T.shadow.lg,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: `${T.space.xl}px`,
            borderBottom: `1px solid ${T.colors.border}`,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button
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

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: T.colors.textSecondary }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.colors.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{desc}</div>
    </div>
  );
}

function CircleProgress({ pct, size = 64, stroke = 6, color = T.colors.accent }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (circ * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.colors.borderLight} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

function TableShell({ columns, children, empty }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: T.radius.lg, border: `1px solid ${T.colors.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr style={{ background: T.colors.bg }}>
            {columns.map((c) => (
              <th
                key={c}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

function TR({ children, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.colors.bg : T.colors.surface, cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </tr>
  );
}

function TD({ children, style: s = {} }) {
  return <td style={{ padding: "11px 14px", borderTop: `1px solid ${T.colors.borderLight}`, fontSize: 13.5, ...s }}>{children}</td>;
}

function useForm(init) {
  const [form, setForm] = useState(init);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => setForm(init);
  return { form, set, reset, setForm };
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    const user = USERS.find((u) => u.email === email && u.password === password);
    if (user) onLogin(user);
    else setError("Email yoki parol noto'g'ri");
  }

  function handleRegister() {
    if (!name || !email) {
      setError("Ism va email kiritish majburiy");
      return;
    }
    setError("");
    window.alert("Ro'yxatdan o'tish muvaffaqiyatli! Demo rejimda login ishlating.");
    setMode("login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f5f7 0%, #e8f0fe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.font,
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: T.colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              margin: "0 auto 16px",
              boxShadow: `0 8px 24px ${T.colors.accent}44`,
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.colors.text, margin: "0 0 6px" }}>AgencyCRM</h1>
          <p style={{ color: T.colors.textSecondary, fontSize: 14, margin: 0 }}>Professional boshqaruv platformasi</p>
        </div>

        <Card>
          <div style={{ display: "flex", background: T.colors.bg, borderRadius: T.radius.md, padding: 3, marginBottom: 24 }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: T.radius.sm,
                  border: "none",
                  background: mode === m ? T.colors.surface : "transparent",
                  color: mode === m ? T.colors.text : T.colors.textSecondary,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: mode === m ? T.shadow.sm : "none",
                  fontFamily: T.font,
                  transition: "all .15s",
                }}
              >
                {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <Input label="Ism Familiya" value={name} onChange={setName} placeholder="Jasur Toshmatov" required />}
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="example@agency.uz" required />
            <Input label="Parol" type="password" value={password} onChange={setPassword} placeholder="••••••" required />
            {error && <div style={{ color: T.colors.red, fontSize: 13, background: T.colors.redSoft, padding: "8px 12px", borderRadius: T.radius.md }}>{error}</div>}
            <Btn onClick={mode === "login" ? handleLogin : handleRegister} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
              {mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
            </Btn>
          </div>

          {mode === "login" && (
            <div style={{ marginTop: 20, padding: "14px", background: T.colors.bg, borderRadius: T.radius.md, fontSize: 12, color: T.colors.textSecondary }}>
              <strong>Demo akkauntlar:</strong>
              <br />
              CEO: ceo@agency.uz / ceo123
              <br />
              Manager: aziz@agency.uz / manager123
              <br />
              Xodim: dildora@agency.uz / emp123
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, user, onLogout, chatUnread }) {
  const allNav = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "projects", icon: "◫", label: "Loyihalar" },
    { id: "team", icon: "◉", label: "Xodimlar" },
    { id: "shooting", icon: "◎", label: "Syomka" },
    { id: "meetings", icon: "◷", label: "Uchrashuvlar" },
    { id: "reports", icon: "◈", label: "Hisobotlar", roles: ["CEO"] },
    { id: "workflow", icon: "◌", label: "Workflow" },
    { id: "chat", icon: "◯", label: "Chat", badge: chatUnread },
  ];

  const nav = allNav.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div
      style={{
        width: 220,
        background: T.colors.surface,
        borderRight: `1px solid ${T.colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "16px 10px",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 28 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: T.colors.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          ⚡
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.colors.text }}>AgencyCRM</div>
          <div style={{ fontSize: 11, color: T.colors.textTertiary }}>{user.role}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: T.radius.md,
              border: "none",
              width: "100%",
              textAlign: "left",
              background: page === n.id ? T.colors.accent : "transparent",
              color: page === n.id ? "#fff" : T.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
              fontFamily: T.font,
              transition: "all .15s",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            {n.label}
            {n.badge > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: T.colors.red,
                  color: "#fff",
                  borderRadius: T.radius.full,
                  padding: "1px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {n.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${T.colors.border}`, paddingTop: 14, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", marginBottom: 10 }}>
          <Avatar name={user.name} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name.split(" ")[0]}</div>
            <div style={{ fontSize: 11, color: T.colors.textTertiary }}>{user.dept}</div>
          </div>
        </div>
        <button
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
    </div>
  );
}

function Dashboard({ projects, employees, user, setPage, onSelectProject }) {
  const totalTasks = projects.flatMap((p) => p.tasks).length;
  const doneTasks = projects.flatMap((p) => p.tasks).filter((t) => t.status === "Done").length;
  const inProgress = projects.filter((p) => p.status === "In Progress").length;
  const pendingContent = projects.flatMap((p) => p.contentPlan).filter((c) => c.status === "Review").length;

  const stats = [
    { label: "Loyihalar", value: projects.length, sub: `${inProgress} faol`, color: T.colors.accent },
    { label: "Tasklar", value: `${doneTasks}/${totalTasks}`, sub: "bajarildi", color: T.colors.green },
    { label: "Xodimlar", value: employees.length, sub: "5 bo'lim", color: T.colors.purple },
    ...(user.role !== "EMPLOYEE" ? [{ label: "Tasdiq kutmoqda", value: pendingContent, sub: "kontent", color: T.colors.orange }] : []),
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Xush kelibsiz, ${user.name.split(" ")[0]}!`} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: T.space.xxl }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.colors.text, marginTop: 6 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.color, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Loyihalar progressi</h3>
          {projects.map((p) => {
            const pct = progressCalc(p);
            const col = pct >= 75 ? T.colors.green : pct >= 40 ? T.colors.accent : T.colors.orange;
            const pm = empById(p.manager, employees);
            const pending = p.contentPlan.filter((c) => c.status === "Review").length;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p.id);
                  setPage("projects");
                }}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px", borderRadius: T.radius.md, cursor: "pointer", marginBottom: 4 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.colors.bg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <CircleProgress pct={pct} size={54} stroke={5} color={col} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: col }}>{pct}%</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.colors.textSecondary, marginTop: 1 }}>{p.client} · {p.type}</div>
                  {pending > 0 && <div style={{ fontSize: 11, color: T.colors.orange, fontWeight: 600, marginTop: 2 }}>{pending} kontent tasdiq kutmoqda</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <PriorityBadge priority={p.priority} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, justifyContent: "flex-end" }}>
                    <Avatar name={pm.name} size={20} />
                    <span style={{ fontSize: 11, color: T.colors.textSecondary }}>{pm.name.split(" ")[0]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Xodim yuklamasi</h3>
            {employees.map((e) => {
              const load = computeLoad(e.id, projects);
              return (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.colors.text }}>{e.name.split(" ")[0]}</span>
                    <span style={{ fontSize: 12, color: T.colors.textSecondary }}>{load}%</span>
                  </div>
                  <div style={{ background: T.colors.borderLight, borderRadius: T.radius.full, height: 5 }}>
                    <div style={{ width: `${load}%`, height: "100%", background: load > 75 ? T.colors.orange : T.colors.accent, borderRadius: T.radius.full, transition: "width .5s" }} />
                  </div>
                </div>
              );
            })}
          </Card>

          {user.role !== "EMPLOYEE" && (
            <Card>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Tasdiq kutayotgan</h3>
              {projects
                .flatMap((p) => p.contentPlan.filter((c) => c.status === "Review").map((c) => ({ ...c, projName: p.name })))
                .slice(0, 3)
                .map((c) => (
                  <div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.colors.borderLight}` }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.topic}</div>
                    <div style={{ fontSize: 11, color: T.colors.textSecondary, marginTop: 1 }}>{c.projName} · {c.platform} · {c.date}</div>
                  </div>
                ))}
              {projects.flatMap((p) => p.contentPlan.filter((c) => c.status === "Review")).length === 0 && <div style={{ fontSize: 13, color: T.colors.textSecondary }}>Hamma kontent tasdiqlangan</div>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectsList({ projects, employees, onSelect, user }) {
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ name: "", client: "", type: "", start: "", end: "", priority: "Medium", status: "Planned" });

  return (
    <div>
      <PageHeader title="Loyihalar" subtitle={`${projects.length} ta loyiha`} action={user.role !== "EMPLOYEE" && <Btn onClick={() => setShowAdd(true)}>+ Yangi loyiha</Btn>} />

      {showAdd && (
        <Modal title="Yangi loyiha qo'shish" onClose={() => { setShowAdd(false); reset(); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Loyiha nomi" value={form.name} onChange={(v) => set("name", v)} required />
            <Input label="Mijoz" value={form.client} onChange={(v) => set("client", v)} required />
            <Input label="Xizmat turi" value={form.type} onChange={(v) => set("type", v)} />
            <Input label="Priority" value={form.priority} onChange={(v) => set("priority", v)} options={["High", "Medium", "Low"]} />
            <Input label="Boshlanish" type="date" value={form.start} onChange={(v) => set("start", v)} />
            <Input label="Tugash" type="date" value={form.end} onChange={(v) => set("end", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Btn onClick={() => { window.alert("Yangi loyiha qo'shildi (demo)"); setShowAdd(false); reset(); }}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {projects.map((p) => {
          const pct = progressCalc(p);
          const col = pct >= 75 ? T.colors.green : pct >= 40 ? T.colors.accent : T.colors.orange;
          const done = p.tasks.filter((t) => t.status === "Done").length;
          const pm = empById(p.manager, employees);
          return (
            <Card key={p.id} onClick={() => onSelect(p.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.colors.textSecondary, marginTop: 2 }}>{p.client}</div>
                </div>
                <PriorityBadge priority={p.priority} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <CircleProgress pct={pct} size={72} stroke={7} color={col} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: col }}>{pct}%</span>
                    <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{done}/{p.tasks.length}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <Badge status={p.status} />
                  <div style={{ fontSize: 12, color: T.colors.textSecondary, marginTop: 8 }}>{p.type}</div>
                  <div style={{ fontSize: 12, color: T.colors.textSecondary }}>Muddat: {p.end}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 12, borderTop: `1px solid ${T.colors.borderLight}` }}>
                <Avatar name={pm.name} size={24} />
                <span style={{ fontSize: 12, color: T.colors.textSecondary }}>{pm.name}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: -4 }}>
                  {p.team.slice(0, 3).map((tid) => {
                    const e = employees.find((x) => x.id === tid);
                    return e ? <div key={tid} style={{ marginLeft: -6 }}><Avatar name={e.name} size={22} /></div> : null;
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ProjectDetail({ project: p, employees, onBack, onUpdate, user }) {
  const [tab, setTab] = useState("tasks");
  const pct = progressCalc(p);
  const col = pct >= 75 ? T.colors.green : pct >= 40 ? T.colors.accent : T.colors.orange;
  const pm = empById(p.manager, employees);

  const tabs = [
    { id: "tasks", label: "Topshiriqlar" },
    { id: "content", label: "Kontent reja" },
    { id: "mediaplan", label: "Media plan" },
    { id: "plans", label: "Rejalar" },
    { id: "calls", label: "Aloqalar" },
    ...(user.role !== "EMPLOYEE" ? [{ id: "report", label: "Hisobot" }] : []),
  ];

  function updateContentStatus(cId, newStatus, approvedById) {
    const updated = {
      ...p,
      contentPlan: p.contentPlan.map((c) => (c.id === cId ? { ...c, status: newStatus, approvedBy: approvedById ?? c.approvedBy } : c)),
    };
    onUpdate(updated);
  }

  function updateTask(task) {
    onUpdate({ ...p, tasks: p.tasks.map((t) => (t.id === task.id ? task : t)) });
  }

  function addTask(task) {
    onUpdate({ ...p, tasks: [...p.tasks, { ...task, id: newId(p.tasks) }] });
  }

  function deleteTask(tid) {
    onUpdate({ ...p, tasks: p.tasks.filter((t) => t.id !== tid) });
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.colors.accent, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: 600, marginBottom: 20, padding: 0 }}>← Orqaga</button>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <CircleProgress pct={pct} size={90} stroke={8} color={col} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: col }}>{pct}%</span>
              <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{p.tasks.filter((t) => t.status === "Done").length}/{p.tasks.length}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{p.name}</h2>
            <p style={{ margin: "0 0 10px", color: T.colors.textSecondary, fontSize: 14 }}>{p.client} · {p.type}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge status={p.status} />
              <PriorityBadge priority={p.priority} />
              <span style={{ fontSize: 12, color: T.colors.textSecondary }}>📅 {p.start} → {p.end}</span>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: T.colors.textTertiary, marginBottom: 6 }}>Manager</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={pm.name} size={36} />
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>{pm.name}</div><div style={{ fontSize: 12, color: T.colors.textSecondary }}>{pm.role}</div></div>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.colors.bg, borderRadius: T.radius.md, padding: 4, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 16px",
              borderRadius: T.radius.sm,
              border: "none",
              background: tab === t.id ? T.colors.surface : "transparent",
              color: tab === t.id ? T.colors.accent : T.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.font,
              boxShadow: tab === t.id ? T.shadow.sm : "none",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tasks" && <TasksTab tasks={p.tasks} employees={employees} user={user} onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask} />}
      {tab === "content" && <ContentPlanTab contentPlan={p.contentPlan} employees={employees} user={user} onUpdateStatus={updateContentStatus} onUpdate={(contentPlan) => onUpdate({ ...p, contentPlan })} />}
      {tab === "mediaplan" && <MediaPlanTab mediaplan={p.mediaplan} employees={employees} user={user} onUpdate={(mediaplan) => onUpdate({ ...p, mediaplan })} />}
      {tab === "plans" && <PlansTab plans={p.plans} tasks={p.tasks} user={user} onUpdate={(plans) => onUpdate({ ...p, plans })} />}
      {tab === "calls" && <CallsTab calls={p.calls} employees={employees} user={user} onUpdate={(calls) => onUpdate({ ...p, calls })} />}
      {tab === "report" && user.role !== "EMPLOYEE" && <ReportTab report={p.report} progress={pct} />}
    </div>
  );
}

function TasksTab({ tasks, employees, user, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const { form, set, reset, setForm } = useForm({ name: "", owner: employees[0]?.id || "", start: "", deadline: "", status: "Planned", note: "" });

  function openEdit(t) {
    setForm({ name: t.name, owner: t.owner, start: t.start, deadline: t.deadline, status: t.status, note: t.note });
    setEditId(t.id);
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Topshiriqlar ({tasks.length})</h3>
        {user.role !== "EMPLOYEE" && <Btn onClick={() => { reset(); setShowAdd(true); }}>+ Task</Btn>}
      </div>

      {(showAdd || editId) && (
        <div style={{ background: T.colors.bg, borderRadius: T.radius.lg, padding: 16, marginBottom: 16, border: `1.5px solid ${T.colors.accent}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Input label="Task nomi" value={form.name} onChange={(v) => set("name", v)} required />
            <Input label="Mas'ul" value={form.owner} onChange={(v) => set("owner", Number(v))} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            <Input label="Boshlanish" type="date" value={form.start} onChange={(v) => set("start", v)} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={(v) => set("deadline", v)} />
            <Input label="Status" value={form.status} onChange={(v) => set("status", v)} options={TASK_STATUSES} />
            <Input label="Izoh" value={form.note} onChange={(v) => set("note", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={() => {
              if (editId) {
                onUpdate({ id: editId, ...form });
                setEditId(null);
              } else {
                onAdd(form);
                setShowAdd(false);
              }
              reset();
            }}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditId(null); reset(); }}>Bekor</Btn>
          </div>
        </div>
      )}

      <TableShell columns={["Task", "Mas'ul", "Boshlanish", "Deadline", "Status", "Izoh", ""]}>
        {tasks.map((t) => {
          const o = employees.find((e) => e.id === t.owner);
          return (
            <TR key={t.id}>
              <TD><span style={{ fontWeight: 600 }}>{t.name}</span></TD>
              <TD><div style={{ display: "flex", gap: 7, alignItems: "center" }}>{o && <Avatar name={o.name} size={24} />}<span style={{ fontSize: 13 }}>{o?.name?.split(" ")[0]}</span></div></TD>
              <TD style={{ color: T.colors.textSecondary, fontSize: 13 }}>{t.start}</TD>
              <TD style={{ fontWeight: 600, fontSize: 13 }}>{t.deadline}</TD>
              <TD><Badge status={t.status} /></TD>
              <TD style={{ color: T.colors.textSecondary, fontSize: 12, maxWidth: 160 }}>{t.note || "—"}</TD>
              <TD>
                {user.role !== "EMPLOYEE" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => openEdit(t)}>✎</Btn>
                    <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => { if (window.confirm("O'chirilsinmi?")) onDelete(t.id); }}>✕</Btn>
                  </div>
                )}
              </TD>
            </TR>
          );
        })}
      </TableShell>
      {tasks.length === 0 && <EmptyState icon="✅" title="Task yo'q" desc="Yangi task qo'shing" />}
    </Card>
  );
}

function ContentPlanTab({ contentPlan, employees, user, onUpdateStatus, onUpdate }) {
  const [filterStatus, setFilterStatus] = useState("Barchasi");
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", owner: employees[0]?.id || "", status: "Planned", note: "" });

  const filtered = filterStatus === "Barchasi" ? contentPlan : contentPlan.filter((c) => c.status === filterStatus);

  function addContent() {
    onUpdate([...contentPlan, { ...form, id: newId(contentPlan), owner: Number(form.owner), approvedBy: null }]);
    setShowAdd(false);
    reset();
  }

  function deleteContent(cid) {
    onUpdate(contentPlan.filter((c) => c.id !== cid));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {["Barchasi", ...CONTENT_STATUSES].map((s) => {
          const count = s === "Barchasi" ? contentPlan.length : contentPlan.filter((c) => c.status === s).length;
          const m = s === "Barchasi" ? null : STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "5px 12px",
                borderRadius: T.radius.full,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                fontFamily: T.font,
                transition: "all .15s",
                background: filterStatus === s ? (m ? m.text : T.colors.text) : (m ? m.bg : T.colors.bg),
                color: filterStatus === s ? "#fff" : (m ? m.text : T.colors.textSecondary),
              }}
            >
              {s} ({count})
            </button>
          );
        })}
        {user.role !== "EMPLOYEE" && <Btn style={{ marginLeft: "auto" }} onClick={() => setShowAdd(true)}>+ Kontent</Btn>}
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 16, borderLeft: `3px solid ${T.colors.accent}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Input label="Sana" type="date" value={form.date} onChange={(v) => set("date", v)} required />
            <Input label="Platforma" value={form.platform} onChange={(v) => set("platform", v)} options={PLATFORMS} />
            <Input label="Format" value={form.format} onChange={(v) => set("format", v)} options={FORMATS} />
            <Input label="Mavzu" value={form.topic} onChange={(v) => set("topic", v)} required />
            <Input label="Caption" value={form.caption} onChange={(v) => set("caption", v)} />
            <Input label="Mas'ul" value={form.owner} onChange={(v) => set("owner", v)} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            <Input label="Izoh" value={form.note} onChange={(v) => set("note", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={addContent}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </Card>
      )}

      <TableShell columns={["Sana", "Platforma", "Format", "Mavzu", "Mas'ul", "Status", "Izoh", "Amallar"]}>
        {filtered.map((c) => {
          const o = employees.find((e) => e.id === c.owner);
          const pc = PLATFORM_COLORS[c.platform] || T.colors.accent;
          return (
            <TR key={c.id}>
              <TD style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{c.date}</TD>
              <TD><span style={{ background: `${pc}18`, color: pc, padding: "3px 8px", borderRadius: T.radius.sm, fontSize: 12, fontWeight: 700 }}>{c.platform}</span></TD>
              <TD style={{ color: T.colors.textSecondary, fontSize: 13 }}>{c.format}</TD>
              <TD style={{ fontWeight: 600, maxWidth: 140 }}>{c.topic}</TD>
              <TD><div style={{ display: "flex", gap: 6, alignItems: "center" }}>{o && <Avatar name={o.name} size={22} />}<span style={{ fontSize: 12 }}>{o?.name?.split(" ")[0]}</span></div></TD>
              <TD><Badge status={c.status} /></TD>
              <TD style={{ fontSize: 12, color: T.colors.textSecondary, maxWidth: 120 }}>{c.note || "—"}</TD>
              <TD>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {user.role !== "EMPLOYEE" && (
                    <>
                      {c.status === "Planned" && <Btn variant="secondary" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onUpdateStatus(c.id, "In Progress")}>▶</Btn>}
                      {c.status === "In Progress" && <Btn variant="warning" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onUpdateStatus(c.id, "Review")}>👁</Btn>}
                      {c.status === "Review" && (
                        <>
                          <Btn variant="success" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onUpdateStatus(c.id, "Approved", 1)}>✓</Btn>
                          <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onUpdateStatus(c.id, "Rejected")}>✕</Btn>
                        </>
                      )}
                      {c.status === "Approved" && <Btn variant="success" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onUpdateStatus(c.id, "Published")}>🚀</Btn>}
                      {c.status === "Rejected" && <Btn variant="secondary" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onUpdateStatus(c.id, "In Progress")}>↺</Btn>}
                      <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { if (window.confirm("O'chirilsinmi?")) deleteContent(c.id); }}>✕</Btn>
                    </>
                  )}
                </div>
              </TD>
            </TR>
          );
        })}
      </TableShell>
      {filtered.length === 0 && <EmptyState icon="📝" title="Kontent yo'q" desc="Bu statusda kontent topilmadi" />}
    </div>
  );
}

function MediaPlanTab({ mediaplan, employees, user, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ date: "", type: "Post", platform: "Instagram", format: "Post", owner: employees[0]?.id || "", budget: "", status: "Planned", note: "" });

  function add() {
    onUpdate([...mediaplan, { ...form, id: newId(mediaplan), owner: Number(form.owner), budget: Number(form.budget) }]);
    setShowAdd(false);
    reset();
  }

  function del(id) {
    onUpdate(mediaplan.filter((m) => m.id !== id));
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Media Plan</h3>
        {user.role !== "EMPLOYEE" && <Btn onClick={() => setShowAdd(true)}>+ Qo'shish</Btn>}
      </div>

      {showAdd && (
        <div style={{ background: T.colors.bg, borderRadius: T.radius.lg, padding: 16, marginBottom: 16, border: `1.5px solid ${T.colors.accent}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <Input label="Sana" type="date" value={form.date} onChange={(v) => set("date", v)} />
            <Input label="Tur" value={form.type} onChange={(v) => set("type", v)} options={FORMATS} />
            <Input label="Platforma" value={form.platform} onChange={(v) => set("platform", v)} options={PLATFORMS} />
            <Input label="Format" value={form.format} onChange={(v) => set("format", v)} options={FORMATS} />
            <Input label="Mas'ul" value={form.owner} onChange={(v) => set("owner", v)} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            {user.role !== "EMPLOYEE" && <Input label="Byudjet (so'm)" value={form.budget} onChange={(v) => set("budget", v)} />}
            <Input label="Status" value={form.status} onChange={(v) => set("status", v)} options={PLAN_STATUSES} />
            <Input label="Izoh" value={form.note} onChange={(v) => set("note", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={add}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </div>
      )}

      {mediaplan.length === 0 ? <EmptyState icon="📊" title="Media plan yo'q" desc="Yangi media plan qo'shing" /> : (
        <TableShell columns={["Sana", "Tur", "Platforma", "Format", "Mas'ul", ...(user.role !== "EMPLOYEE" ? ["Byudjet"] : []), "Status", "Izoh", ""]}>
          {mediaplan.map((m) => {
            const o = employees.find((e) => e.id === m.owner);
            const pc = PLATFORM_COLORS[m.platform] || T.colors.accent;
            return (
              <TR key={m.id}>
                <TD style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m.date}</TD>
                <TD style={{ fontSize: 13 }}>{m.type}</TD>
                <TD><span style={{ background: `${pc}18`, color: pc, padding: "3px 8px", borderRadius: T.radius.sm, fontSize: 12, fontWeight: 700 }}>{m.platform}</span></TD>
                <TD style={{ color: T.colors.textSecondary, fontSize: 13 }}>{m.format}</TD>
                <TD><div style={{ display: "flex", gap: 6, alignItems: "center" }}>{o && <Avatar name={o.name} size={22} />}<span style={{ fontSize: 12 }}>{o?.name?.split(" ")[0]}</span></div></TD>
                {user.role !== "EMPLOYEE" && <TD style={{ fontWeight: 600, fontSize: 13 }}>{m.budget ? `${fmt(m.budget)} so'm` : "—"}</TD>}
                <TD><Badge status={m.status} /></TD>
                <TD style={{ fontSize: 12, color: T.colors.textSecondary }}>{m.note || "—"}</TD>
                <TD>{user.role !== "EMPLOYEE" && <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { if (window.confirm("O'chirilsinmi?")) del(m.id); }}>✕</Btn>}</TD>
              </TR>
            );
          })}
        </TableShell>
      )}
    </Card>
  );
}

function PlansTab({ plans, tasks, user, onUpdate }) {
  const [activeTab, setActiveTab] = useState("daily");
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ title: "", status: "Planned", taskId: "", note: "", date: "", week: "", month: "" });

  const planTabs = [
    { id: "daily", label: "Kunlik" },
    { id: "weekly", label: "Haftalik" },
    { id: "monthly", label: "Oylik" },
  ];

  function add() {
    const list = plans[activeTab] || [];
    const item = { ...form, id: newId(list), taskId: Number(form.taskId) || null };
    onUpdate({ ...plans, [activeTab]: [...list, item] });
    setShowAdd(false);
    reset();
  }

  function del(id) {
    onUpdate({ ...plans, [activeTab]: plans[activeTab].filter((x) => x.id !== id) });
  }

  const current = plans[activeTab] || [];

  return (
    <Card>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: T.colors.bg, borderRadius: T.radius.md, padding: 4, width: "fit-content" }}>
        {planTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "6px 16px",
              borderRadius: T.radius.sm,
              border: "none",
              background: activeTab === t.id ? T.colors.surface : "transparent",
              color: activeTab === t.id ? T.colors.accent : T.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        {user.role !== "EMPLOYEE" && <Btn onClick={() => { reset(); setShowAdd(true); }}>+ Reja</Btn>}
      </div>

      {showAdd && (
        <div style={{ background: T.colors.bg, borderRadius: T.radius.lg, padding: 16, marginBottom: 16, border: `1.5px solid ${T.colors.accent}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {activeTab === "daily" && <Input label="Sana" type="date" value={form.date} onChange={(v) => set("date", v)} />}
            {activeTab === "weekly" && <Input label="Hafta" value={form.week} onChange={(v) => set("week", v)} placeholder="Mar 9–15" />}
            {activeTab === "monthly" && <Input label="Oy" value={form.month} onChange={(v) => set("month", v)} placeholder="Mart 2026" />}
            <Input label="Sarlavha" value={form.title} onChange={(v) => set("title", v)} required />
            <Input label="Status" value={form.status} onChange={(v) => set("status", v)} options={PLAN_STATUSES} />
            <Input label="Task (ID)" value={form.taskId} onChange={(v) => set("taskId", v)} options={[{ value: "", label: "—" }, ...tasks.map((t) => ({ value: t.id, label: t.name }))]} />
            <Input label="Izoh" value={form.note} onChange={(v) => set("note", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={add}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </div>
      )}

      {current.length === 0 ? <EmptyState icon="📅" title="Reja yo'q" desc="Yangi reja qo'shing" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {current.map((item) => {
            const relTask = tasks.find((t) => t.id === item.taskId);
            return (
              <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: T.colors.bg, borderRadius: T.radius.md }}>
                <Badge status={item.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: T.colors.textSecondary, marginTop: 2 }}>
                    {item.date || item.week || item.month}
                    {relTask && ` · Task: ${relTask.name}`}
                    {item.note && ` · ${item.note}`}
                  </div>
                </div>
                {user.role !== "EMPLOYEE" && <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { if (window.confirm("O'chirilsinmi?")) del(item.id); }}>✕</Btn>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CallsTab({ calls, employees, user, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ date: "", type: "Call", who: employees[0]?.id || "", result: "", next: "" });

  function add() {
    onUpdate([...calls, { ...form, id: newId(calls), who: Number(form.who) }]);
    setShowAdd(false);
    reset();
  }

  function del(id) {
    onUpdate(calls.filter((c) => c.id !== id));
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Mijoz bilan aloqalar</h3>
        {user.role !== "EMPLOYEE" && <Btn onClick={() => { reset(); setShowAdd(true); }}>+ Yozuv</Btn>}
      </div>

      {showAdd && (
        <div style={{ background: T.colors.bg, borderRadius: T.radius.lg, padding: 16, marginBottom: 16, border: `1.5px solid ${T.colors.accent}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Input label="Sana" type="date" value={form.date} onChange={(v) => set("date", v)} />
            <Input label="Tur" value={form.type} onChange={(v) => set("type", v)} options={["Call", "Meeting"]} />
            <Input label="Kim gaplashdi" value={form.who} onChange={(v) => set("who", v)} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            <Input label="Natija" value={form.result} onChange={(v) => set("result", v)} />
            <Input label="Keyingi qadam" value={form.next} onChange={(v) => set("next", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={add}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </div>
      )}

      {calls.length === 0 ? <EmptyState icon="📞" title="Aloqa yo'q" desc="Yangi aloqa yozuvi qo'shing" /> : (
        <div>
          {calls.map((c, i) => {
            const o = employees.find((e) => e.id === c.who);
            return (
              <div key={c.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < calls.length - 1 ? `1px solid ${T.colors.borderLight}` : "none" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: T.radius.md,
                    background: c.type === "Call" ? T.colors.accentSoft : T.colors.greenSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {c.type === "Call" ? "📞" : "🤝"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.type}</span>
                    <span style={{ color: T.colors.textSecondary, fontSize: 13 }}>{c.date}</span>
                    {o && <><Avatar name={o.name} size={20} /><span style={{ fontSize: 13, color: T.colors.textSecondary }}>{o.name}</span></>}
                  </div>
                  {c.result && <div style={{ fontSize: 13, color: T.colors.text, marginTop: 4 }}>Natija: {c.result}</div>}
                  {c.next && <div style={{ fontSize: 13, color: T.colors.accent, marginTop: 3 }}>→ {c.next}</div>}
                </div>
                {user.role !== "EMPLOYEE" && <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11, alignSelf: "flex-start" }} onClick={() => { if (window.confirm("O'chirilsinmi?")) del(c.id); }}>✕</Btn>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ReportTab({ report: r, progress }) {
  const items = [
    { label: "Reklama byudjeti", value: `${fmt(r.budget)} so'm`, color: T.colors.accent },
    { label: "Lidlar soni", value: r.leads || "—", color: T.colors.green },
    { label: "CPL", value: r.cpl > 0 ? `${fmt(r.cpl)} so'm` : "—", color: T.colors.orange },
    { label: "Sotuvlar", value: r.sales || "—", color: "#0ea5e9" },
    { label: "ROI", value: r.roi > 0 ? `×${r.roi}` : "—", color: T.colors.purple },
    { label: "Progress", value: `${progress}%`, color: T.colors.green },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
      {items.map((k) => (
        <Card key={k.label} style={{ padding: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          <div style={{ fontSize: 13, color: T.colors.textSecondary, marginTop: 6 }}>{k.label}</div>
        </Card>
      ))}
    </div>
  );
}

function TeamList({ employees, projects, user, onSelect, onUpdateEmployees }) {
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ name: "", role: "", dept: "SMM bo'limi", salary: "", kpiBase: 80, load: 50 });
  const depts = [...new Set(employees.map((e) => e.dept))];

  function addEmp() {
    if (!form.name || !form.role) return;
    const ne = { ...form, id: newId(employees), salary: Number(form.salary), kpiBase: Number(form.kpiBase), load: Number(form.load), projects: [] };
    onUpdateEmployees([...employees, ne]);
    setShowAdd(false);
    reset();
  }

  function delEmp(eid) {
    onUpdateEmployees(employees.filter((e) => e.id !== eid));
  }

  return (
    <div>
      <PageHeader title="Xodimlar" subtitle={`${employees.length} ta xodim`} action={(user.role === "CEO" || user.role === "MANAGER") && <Btn onClick={() => setShowAdd(true)}>+ Xodim</Btn>} />

      {showAdd && (
        <Modal title="Yangi xodim qo'shish" onClose={() => { setShowAdd(false); reset(); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Ism Familiya" value={form.name} onChange={(v) => set("name", v)} required />
            <Input label="Lavozim" value={form.role} onChange={(v) => set("role", v)} required />
            <Input label="Bo'lim" value={form.dept} onChange={(v) => set("dept", v)} options={["SMM bo'limi", "Target bo'limi", "Media bo'limi", "Sales bo'limi", "Project Management"]} />
            {(user.role === "CEO" || user.role === "MANAGER") && <Input label="Oylik (so'm)" value={form.salary} onChange={(v) => set("salary", v)} />}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Btn onClick={addEmp}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </Modal>
      )}

      {depts.map((dept) => (
        <div key={dept} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: DEPT_COLORS[dept] || T.colors.accent }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.colors.text }}>{dept}</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {employees.filter((e) => e.dept === dept).map((e) => {
              const kpi = computeKPI(e.id, projects);
              const load = computeLoad(e.id, projects);
              const projs = projects.filter((p) => p.team.includes(e.id));
              return (
                <Card key={e.id}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                    <Avatar name={e.name} size={46} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: T.colors.textSecondary }}>{e.role}</div>
                      {(user.role === "CEO" || user.role === "MANAGER") && <div style={{ fontSize: 12, color: T.colors.accent, fontWeight: 600, marginTop: 2 }}>{fmt(e.salary)} so'm/oy</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="ghost" style={{ padding: "6px 10px" }} onClick={() => onSelect(e.id)}>→</Btn>
                      {user.role !== "EMPLOYEE" && <Btn variant="danger" style={{ padding: "6px 10px" }} onClick={() => { if (window.confirm("O'chirilsinmi?")) delEmp(e.id); }}>✕</Btn>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[{ v: `${kpi}%`, l: "KPI", c: T.colors.accent }, { v: `${load}%`, l: "Yuklanish", c: load > 75 ? T.colors.orange : T.colors.green }, { v: projs.length, l: "Loyiha", c: T.colors.purple }].map((x) => (
                      <div key={x.l} style={{ background: T.colors.bg, borderRadius: T.radius.md, padding: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: x.c }}>{x.v}</div>
                        <div style={{ fontSize: 10, color: T.colors.textSecondary }}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: T.colors.borderLight, borderRadius: T.radius.full, height: 5 }}>
                    <div style={{ width: `${kpi}%`, height: "100%", background: T.colors.accent, borderRadius: T.radius.full, transition: "width .5s" }} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmployeeDetail({ empId, employees, projects, user, onBack, onUpdateEmployees }) {
  const e = employees.find((x) => x.id === empId);
  const [editing, setEditing] = useState(false);
  const { form, set, setForm } = useForm(e || {});

  if (!e) return null;

  const kpi = computeKPI(e.id, projects);
  const load = computeLoad(e.id, projects);
  const projs = projects.filter((p) => p.team.includes(e.id));
  const tasks = projects.flatMap((p) => p.tasks.filter((t) => t.owner === e.id).map((t) => ({ ...t, proj: p.name })));

  function save() {
    onUpdateEmployees(employees.map((x) => (x.id === e.id ? { ...x, ...form } : x)));
    setEditing(false);
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.colors.accent, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: 600, marginBottom: 20, padding: 0 }}>← Orqaga</button>

      <Card style={{ marginBottom: 20 }}>
        {editing ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
              <Input label="Ism" value={form.name} onChange={(v) => set("name", v)} />
              <Input label="Lavozim" value={form.role} onChange={(v) => set("role", v)} />
              {(user.role === "CEO" || user.role === "MANAGER") && <Input label="Oylik" value={form.salary} onChange={(v) => set("salary", Number(v))} />}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={save}>Saqlash</Btn>
              <Btn variant="secondary" onClick={() => setEditing(false)}>Bekor</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <Avatar name={e.name} size={64} />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{e.name}</h2>
              <div style={{ color: T.colors.textSecondary, fontSize: 14 }}>{e.role}</div>
              <div style={{ display: "inline-block", marginTop: 6, padding: "3px 10px", borderRadius: T.radius.sm, background: `${DEPT_COLORS[e.dept] || T.colors.accent}18`, color: DEPT_COLORS[e.dept] || T.colors.accent, fontWeight: 700, fontSize: 12 }}>{e.dept}</div>
              {(user.role === "CEO" || user.role === "MANAGER") && <div style={{ fontSize: 13, color: T.colors.accent, fontWeight: 600, marginTop: 6 }}>Oylik: {fmt(e.salary)} so'm</div>}
            </div>
            <div style={{ display: "flex", gap: 20, textAlign: "center" }}>
              {[{ v: `${kpi}%`, l: "KPI", c: T.colors.accent }, { v: `${load}%`, l: "Yuklanish", c: load > 75 ? T.colors.orange : T.colors.green }, { v: projs.length, l: "Loyiha", c: T.colors.purple }].map((x) => (
                <div key={x.l}><div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{x.v}</div><div style={{ fontSize: 12, color: T.colors.textSecondary }}>{x.l}</div></div>
              ))}
            </div>
            {user.role !== "EMPLOYEE" && <Btn variant="secondary" onClick={() => { setForm(e); setEditing(true); }}>Tahrirlash</Btn>}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Loyihalari</h3>
          {projs.length === 0 ? <EmptyState icon="📁" title="Loyiha yo'q" desc="" /> : projs.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.colors.accent }} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{p.name}</span>
              <Badge status={p.status} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Tasklari</h3>
          {tasks.length === 0 ? <EmptyState icon="✅" title="Task yo'q" desc="" /> : tasks.map((t) => (
            <div key={t.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                <Badge status={t.status} />
              </div>
              <div style={{ fontSize: 11, color: T.colors.textSecondary, marginTop: 2 }}>{t.proj} · {t.deadline}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ShootingPage({ projects, employees, user }) {
  const [items, setItems] = useState([
    { id: 1, date: "2026-03-20", project: 1, type: "Product photo", location: "Studio A", operator: 5, goal: "Instagram kontent", status: "Done" },
    { id: 2, date: "2026-03-30", project: 1, type: "Behind scenes", location: "NovaTech ofisi", operator: 5, goal: "Reels seriyasi", status: "Planned" },
    { id: 3, date: "2026-04-01", project: 3, type: "Launch video", location: "AutoMax showroom", operator: 5, goal: "Launch content", status: "Planned" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ date: "", project: projects[0]?.id || "", type: "", location: "", operator: employees[0]?.id || "", goal: "", status: "Planned" });

  function add() {
    setItems((prev) => [...prev, { ...form, id: newId(prev), project: Number(form.project), operator: Number(form.operator) }]);
    setShowAdd(false);
    reset();
  }

  return (
    <div>
      <PageHeader title="Syomka kalendari" subtitle={`${items.length} ta syomka`} action={user.role !== "EMPLOYEE" && <Btn onClick={() => setShowAdd(true)}>+ Syomka</Btn>} />

      {showAdd && (
        <Modal title="Yangi syomka" onClose={() => { setShowAdd(false); reset(); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Sana" type="date" value={form.date} onChange={(v) => set("date", v)} />
            <Input label="Tur" value={form.type} onChange={(v) => set("type", v)} placeholder="Product photo" />
            <Input label="Loyiha" value={form.project} onChange={(v) => set("project", v)} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
            <Input label="Operator" value={form.operator} onChange={(v) => set("operator", v)} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            <Input label="Lokatsiya" value={form.location} onChange={(v) => set("location", v)} />
            <Input label="Maqsad" value={form.goal} onChange={(v) => set("goal", v)} />
            <Input label="Status" value={form.status} onChange={(v) => set("status", v)} options={PLAN_STATUSES} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Btn onClick={add}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {items.map((s) => {
          const pr = projects.find((p) => p.id === s.project);
          const op = employees.find((e) => e.id === s.operator);
          return (
            <Card key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.type}</div>
                <Badge status={s.status} />
              </div>
              <div style={{ fontSize: 13, color: T.colors.textSecondary, marginBottom: 14 }}>{pr?.name}</div>
              {[["Sana", s.date], ["Lokatsiya", s.location], ["Maqsad", s.goal]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, color: T.colors.textTertiary, width: 78, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {op && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.colors.borderLight}` }}>
                  <Avatar name={op.name} size={24} />
                  <span style={{ fontSize: 12, color: T.colors.textSecondary }}>{op.name}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MeetingsPage({ employees, user }) {
  const [items, setItems] = useState([
    { id: 1, client: "NovaTech LLC", date: "2026-03-05", type: "Call", who: 2, result: "Progress yaxshi", next: "Syomka sana" },
    { id: 2, client: "GreenFood", date: "2026-03-08", type: "Meeting", who: 6, result: "ROI muhokama", next: "Hisobot" },
    { id: 3, client: "AutoMax UZ", date: "2026-03-12", type: "Call", who: 6, result: "Strategiya", next: "Mediapan" },
    { id: 4, client: "NovaTech LLC", date: "2026-03-18", type: "Meeting", who: 2, result: "", next: "" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const { form, set, reset } = useForm({ client: "", date: "", type: "Call", who: employees[0]?.id || "", result: "", next: "" });

  function add() {
    setItems((prev) => [...prev, { ...form, id: newId(prev), who: Number(form.who) }]);
    setShowAdd(false);
    reset();
  }

  function del(id) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div>
      <PageHeader title="Uchrashuvlar & Qo'ng'iroqlar" subtitle={`${items.length} ta yozuv`} action={user.role !== "EMPLOYEE" && <Btn onClick={() => { reset(); setShowAdd(true); }}>+ Yozuv</Btn>} />

      {showAdd && (
        <Modal title="Yangi aloqa" onClose={() => { setShowAdd(false); reset(); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Mijoz" value={form.client} onChange={(v) => set("client", v)} required />
            <Input label="Sana" type="date" value={form.date} onChange={(v) => set("date", v)} />
            <Input label="Tur" value={form.type} onChange={(v) => set("type", v)} options={["Call", "Meeting"]} />
            <Input label="Kim gaplashdi" value={form.who} onChange={(v) => set("who", v)} options={employees.map((e) => ({ value: e.id, label: e.name }))} />
            <Input label="Natija" value={form.result} onChange={(v) => set("result", v)} />
            <Input label="Keyingi qadam" value={form.next} onChange={(v) => set("next", v)} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Btn onClick={add}>Saqlash</Btn>
            <Btn variant="secondary" onClick={() => { setShowAdd(false); reset(); }}>Bekor</Btn>
          </div>
        </Modal>
      )}

      <Card>
        <TableShell columns={["Mijoz", "Sana", "Tur", "Kim", "Natija", "Keyingi qadam", ""]}>
          {items.map((m) => {
            const o = employees.find((e) => e.id === m.who);
            return (
              <TR key={m.id}>
                <TD style={{ fontWeight: 700 }}>{m.client}</TD>
                <TD style={{ whiteSpace: "nowrap" }}>{m.date}</TD>
                <TD><span style={{ background: m.type === "Call" ? T.colors.accentSoft : T.colors.greenSoft, color: m.type === "Call" ? T.colors.accent : "#1a7f37", padding: "3px 8px", borderRadius: T.radius.sm, fontSize: 12, fontWeight: 600 }}>{m.type}</span></TD>
                <TD><div style={{ display: "flex", gap: 7, alignItems: "center" }}>{o && <Avatar name={o.name} size={22} />}<span style={{ fontSize: 13 }}>{o?.name}</span></div></TD>
                <TD style={{ color: m.result ? T.colors.text : T.colors.textTertiary, fontSize: 13 }}>{m.result || "—"}</TD>
                <TD style={{ color: m.next ? T.colors.accent : T.colors.textTertiary, fontWeight: m.next ? 600 : 400, fontSize: 13 }}>{m.next || "—"}</TD>
                <TD>{user.role !== "EMPLOYEE" && <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { if (window.confirm("O'chirilsinmi?")) del(m.id); }}>✕</Btn>}</TD>
              </TR>
            );
          })}
        </TableShell>
      </Card>
    </div>
  );
}

function ReportsPage({ projects }) {
  const totalBudget = projects.reduce((s, p) => s + p.report.budget, 0);
  const totalLeads = projects.reduce((s, p) => s + p.report.leads, 0);
  const totalSales = projects.reduce((s, p) => s + p.report.sales, 0);
  const roiProjs = projects.filter((p) => p.report.roi > 0);
  const avgRoi = roiProjs.length ? (roiProjs.reduce((s, p) => s + p.report.roi, 0) / roiProjs.length).toFixed(1) : "0";

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="Moliyaviy ko'rsatkichlar" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { l: "Jami byudjet", v: `${fmt(totalBudget)} so'm`, c: T.colors.accent },
          { l: "Jami lidlar", v: totalLeads, c: T.colors.green },
          { l: "Jami sotuvlar", v: totalSales, c: "#0ea5e9" },
          { l: "O'rtacha ROI", v: `×${avgRoi}`, c: T.colors.purple },
        ].map((k) => (
          <Card key={k.l}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 13, color: T.colors.textSecondary, marginTop: 6 }}>{k.l}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Loyihalar bo'yicha hisobot</h3>
        <TableShell columns={["Loyiha", "Byudjet", "Lidlar", "CPL", "Sotuvlar", "ROI", "Progress"]}>
          {projects.map((p) => (
            <TR key={p.id}>
              <TD><div style={{ fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: T.colors.textSecondary }}>{p.client}</div></TD>
              <TD style={{ whiteSpace: "nowrap" }}>{fmt(p.report.budget)} so'm</TD>
              <TD style={{ fontWeight: 700, color: T.colors.green }}>{p.report.leads || "—"}</TD>
              <TD style={{ whiteSpace: "nowrap" }}>{p.report.cpl > 0 ? `${fmt(p.report.cpl)} so'm` : "—"}</TD>
              <TD style={{ fontWeight: 700, color: "#0ea5e9" }}>{p.report.sales || "—"}</TD>
              <TD style={{ fontWeight: 700, color: T.colors.purple }}>{p.report.roi > 0 ? `×${p.report.roi}` : "—"}</TD>
              <TD>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ background: T.colors.borderLight, borderRadius: T.radius.full, height: 6, width: 80, overflow: "hidden" }}>
                    <div style={{ width: `${progressCalc(p)}%`, height: "100%", background: T.colors.accent, borderRadius: T.radius.full }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{progressCalc(p)}%</span>
                </div>
              </TD>
            </TR>
          ))}
        </TableShell>
      </Card>
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
      <PageHeader title="Workflow" subtitle="Loyiha jarayoni — 10 bosqich" />
      <Card>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: "flex", gap: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 44 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.colors.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{s.n}</div>
              {i < steps.length - 1 && <div style={{ width: 1.5, flex: 1, background: T.colors.border, minHeight: 20, margin: "4px 0" }} />}
            </div>
            <div style={{ padding: "0 0 24px 16px", flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</span>
                <span style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "2px 8px", borderRadius: T.radius.sm, fontSize: 11, fontWeight: 600 }}>{s.dept}</span>
              </div>
              <div style={{ color: T.colors.textSecondary, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ChatPage({ user, allUsers }) {
  const [messages, setMessages] = useState(INIT_CHAT);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const txt = input.trim();
    if (!txt) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setMessages((prev) => [...prev, { id: newId(prev), userId: user.id, text: txt, time }]);
    setInput("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const getUserById = (id) => allUsers.find((u) => u.id === id) || { name: "Unknown", avatar: "?" };

  return (
    <div>
      <PageHeader title="Umumiy chat" subtitle="Barcha xodimlar bilan muloqot" />
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 400 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: T.space.xl, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m) => {
            const sender = getUserById(m.userId);
            const isMe = m.userId === user.id;
            return (
              <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexDirection: isMe ? "row-reverse" : "row" }}>
                {!isMe && <Avatar name={sender.name} size={30} />}
                <div style={{ maxWidth: "65%" }}>
                  {!isMe && <div style={{ fontSize: 11, color: T.colors.textSecondary, marginBottom: 3, fontWeight: 600 }}>{sender.name}</div>}
                  <div style={{ background: isMe ? T.colors.accent : T.colors.bg, color: isMe ? "#fff" : T.colors.text, padding: "10px 14px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: T.colors.textTertiary, marginTop: 3, textAlign: isMe ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div style={{ borderTop: `1px solid ${T.colors.border}`, padding: T.space.lg, display: "flex", gap: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Xabar yozing... (Enter — yuborish)"
            style={{ flex: 1, background: T.colors.bg, border: `1.5px solid ${T.colors.border}`, borderRadius: T.radius.lg, padding: "10px 14px", fontSize: 14, color: T.colors.text, fontFamily: T.font, resize: "none", outline: "none", minHeight: 44, maxHeight: 120 }}
            rows={1}
          />
          <Btn onClick={send} style={{ alignSelf: "flex-end", padding: "10px 18px" }}>Yuborish</Btn>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [projects, setProjects] = useState(INIT_PROJECTS);
  const [employees, setEmployees] = useState(INIT_EMPLOYEES);
  const [selProjectId, setSelProjectId] = useState(null);
  const [selEmployeeId, setSelEmployeeId] = useState(null);
  const [chatUnread, setChatUnread] = useState(2);

  const currentProject = useMemo(() => projects.find((p) => p.id === selProjectId) || null, [projects, selProjectId]);
  const currentEmployee = useMemo(() => employees.find((e) => e.id === selEmployeeId) || null, [employees, selEmployeeId]);

  function updateProject(updated) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelProjectId(updated.id);
  }

  function navigate(pg) {
    setPage(pg);
    setSelProjectId(null);
    setSelEmployeeId(null);
    if (pg === "chat") setChatUnread(0);
  }

  if (!user) {
    return (
      <div style={{ fontFamily: T.font }}>
        <AuthScreen onLogin={(u) => setUser(u)} />
      </div>
    );
  }

  return (
    <AuthCtx.Provider value={{ user }}>
      <div style={{ display: "flex", minHeight: "100vh", background: T.colors.bg, fontFamily: T.font, color: T.colors.text }}>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:5px;height:5px}
          ::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:#c7c7cc;border-radius:999px}
          ::-webkit-scrollbar-thumb:hover{background:#aeaeb2}
        `}</style>

        <Sidebar page={page} setPage={navigate} user={user} onLogout={() => setUser(null)} chatUnread={chatUnread} />

        <main style={{ flex: 1, overflow: "auto", padding: "32px 36px", maxWidth: "calc(100% - 220px)" }}>
          {page === "dashboard" && <Dashboard projects={projects} employees={employees} user={user} setPage={navigate} onSelectProject={(id) => { setSelProjectId(id); navigate("projects"); }} />}
          {page === "projects" && !currentProject && <ProjectsList projects={projects} employees={employees} user={user} onSelect={(id) => setSelProjectId(id)} />}
          {page === "projects" && currentProject && <ProjectDetail project={currentProject} employees={employees} user={user} onBack={() => setSelProjectId(null)} onUpdate={updateProject} />}
          {page === "team" && !currentEmployee && <TeamList employees={employees} projects={projects} user={user} onSelect={(id) => setSelEmployeeId(id)} onUpdateEmployees={setEmployees} />}
          {page === "team" && currentEmployee && <EmployeeDetail empId={selEmployeeId} employees={employees} projects={projects} user={user} onBack={() => setSelEmployeeId(null)} onUpdateEmployees={setEmployees} />}
          {page === "shooting" && <ShootingPage projects={projects} employees={employees} user={user} />}
          {page === "meetings" && <MeetingsPage employees={employees} user={user} />}
          {page === "reports" && user.role === "CEO" && <ReportsPage projects={projects} />}
          {page === "workflow" && <WorkflowPage />}
          {page === "chat" && <ChatPage user={user} allUsers={USERS} />}
        </main>
      </div>
    </AuthCtx.Provider>
  );
}
