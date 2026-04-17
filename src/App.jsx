import React, {
  memo, startTransition, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  GoogleAuthProvider, onAuthStateChanged,
  signInWithEmailAndPassword, signInWithPopup, signOut,
} from "firebase/auth";
import {
  collection, doc, getDoc, onSnapshot, setDoc,
} from "firebase/firestore";

import { auth, db, googleProvider, hasFirebaseConfig } from "./core/firebase.js";
import {
  T, ROLE_META, FIXED_ROLE_BY_EMAIL, PROJECT_STATUSES, TASK_STATUSES,
  CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES,
  PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, ROOT_DOC_ID,
  EMPTY_PROJECT_WORKSPACE, CRM_CACHE_KEY, LIMITS, getCurrentMonthId,
} from "./core/constants.js";
import {
  makeId, isoNow, toMoney, clamp, sortByRecent, indexById,
  readCache, writeCache, projectWorkspaceCacheKey,
  flattenPlans, splitPlans, calcProjectProgress, buildProjectCaches, todayIso, summarizePortfolioMetrics,
  healthScore, humanizeAuthError,
} from "./core/utils.js";
import {
  canEdit, canManagePeople, canWorkInProject,
  canManageProjectMeta, visibleProjects, visibleShoots, visibleEmployees,
  projectMembers, isProjectMember, canViewFinancialDashboard,
  canCreateDesignTask, canApproveDesignTask, canEditDesignTask,
} from "./core/permissions.js";
import {
  normalizeProject, normalizeStoredProjectMeta, normalizeStoredRecord,
  normalizeStoredUser, normalizeStoredPrivateUser, normalizeComments,
  createComment, withRecordMeta, projectMetaDocFromProject, hydrateProject,
  buildAssignedProjectIdsMap, employeeToPublicDoc, employeeToPrivateDoc,
  mergeEmployeeDocs, computeProjectMetrics, computeProjectMemberStats,
} from "./core/normalizers.js";
import {
  commitBatchOperations, syncCollectionOperations, createMetaDocs,
  buildAssignedProjectIdOps, migrateLegacyRootSchema,
} from "./core/firestoreService.js";
import { buildFinancialDashboard, buildFinancialSnapshotDoc } from "./core/financeService.js";
import {
  Avatar, Button, Card, PageHeader, Field, Modal, ConfirmDialog,
  EmptyState, SkeletonBlock, DashboardSkeleton, GridSkeleton,
  StatusBadge, StatusSelect, PriorityBadge, CircleProgress,
  StatCard, DataTable, Row, Cell, TeamSelector, CommentThread,
  EmojiPicker, ToastStack, GlobalStyles,
} from "./components/ui/index.jsx";
import { useConfirm } from "./hooks/useConfirm.jsx";

import { DashboardPage }     from "./pages/DashboardPage.jsx";
import { ProjectsPage }      from "./pages/ProjectsPage.jsx";
import { TeamPage }          from "./pages/TeamPage.jsx";
import { ShootingPage }      from "./pages/ShootingPage.jsx";
import { FinancePage }       from "./pages/FinancePage.jsx";
import { MontajPage }        from "./pages/MontajPage.jsx";
import { DesignPage }        from "./pages/DesignPage.jsx";
import { TargetPage }        from "./pages/TargetPage.jsx";
import { WorkflowPage }      from "./pages/WorkflowPage.jsx";
// ─── Firestore collection refs (ARCH-02 FIX: module-level, not per-render) ────
// These are stable references — created once when module loads.
const COLS = db ? {
  projects:      collection(db, "projects"),
  users:         collection(db, "users"),
  userPrivate:   collection(db, "userPrivate"),
  shoots:        collection(db, "shoots"),
} : {};

function mergeRecordsById(baseItems = [], incomingItems = []) {
  const merged = [...(Array.isArray(baseItems) ? baseItems : []), ...(Array.isArray(incomingItems) ? incomingItems : [])];
  return Object.values(Object.fromEntries(merged.filter(Boolean).map((item) => [item.id, item])));
}

function mergePlanWorkspace(basePlans = { daily: [], weekly: [], monthly: [] }, incomingPlans = { daily: [], weekly: [], monthly: [] }) {
  return {
    daily: mergeRecordsById(basePlans.daily, incomingPlans.daily),
    weekly: mergeRecordsById(basePlans.weekly, incomingPlans.weekly),
    monthly: mergeRecordsById(basePlans.monthly, incomingPlans.monthly),
  };
}

function containsAllIds(expectedItems = [], actualItems = []) {
  const actualIds = new Set((actualItems || []).filter(Boolean).map((item) => item.id));
  return (expectedItems || []).every((item) => actualIds.has(item.id));
}

function summarizeDesignTaskMetrics(tasks = []) {
  const today = todayIso();
  return tasks.reduce((acc, task) => {
    acc.totalTasks += 1;
    if (task.status === "Yakunlandi" || task.status === "Tasdiqlandi") acc.completedTasks += 1;
    if (task.status === "Tasdiqlandi") acc.approvedTasks += 1;
    if (task.status === "Yangi TZ" || task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") acc.activeTasks += 1;
    if (task.status === "Ko'rib chiqilmoqda") acc.pendingReviews += 1;
    if (task.deadline && task.deadline < today && task.status !== "Yakunlandi" && task.status !== "Tasdiqlandi") {
      acc.overdueTasks += 1;
    }
    return acc;
  }, {
    totalTasks: 0,
    completedTasks: 0,
    approvedTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    pendingReviews: 0,
  });
}

function summarizeTargetTaskMetrics(tasks = []) {
  const today = todayIso();
  return tasks.reduce((acc, task) => {
    acc.totalTasks += 1;
    if (task.status === "Bajarildi" || task.status === "Tasdiqlandi") acc.completedTasks += 1;
    if (task.status === "Tasdiqlandi") acc.approvedTasks += 1;
    if (task.status === "Rejalashtirildi" || task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") acc.activeTasks += 1;
    if (task.status === "Ko'rib chiqilmoqda") acc.pendingReviews += 1;
    if (task.deadline && task.deadline < today && task.status !== "Bajarildi" && task.status !== "Tasdiqlandi") {
      acc.overdueTasks += 1;
    }
    return acc;
  }, {
    totalTasks: 0,
    completedTasks: 0,
    approvedTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    pendingReviews: 0,
  });
}

function applyMetricsDelta(baseMetrics = {}, previousContribution = {}, nextContribution = {}) {
  const fields = ["totalTasks", "completedTasks", "approvedTasks", "activeTasks", "overdueTasks", "pendingReviews"];
  const nextMetrics = {};
  fields.forEach((field) => {
    nextMetrics[field] = Math.max(
      0,
      Number(baseMetrics[field] || 0) - Number(previousContribution[field] || 0) + Number(nextContribution[field] || 0)
    );
  });
  nextMetrics.progress = nextMetrics.totalTasks
    ? Math.round((nextMetrics.completedTasks / nextMetrics.totalTasks) * 100)
    : 0;
  return nextMetrics;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ profile, page, onNavigate, onLogout }) {
  const items = [
    { id: "dashboard",     label: "Dashboard",        icon: "◈" },
    { id: "projects",      label: "Loyihalar",         icon: "◫" },
    { id: "team",          label: "Xodimlar",          icon: "◉" },
    { id: "shooting",      label: "Syomka",            icon: "◎" },
    { id: "montaj",        label: "Montaj bo'limi",    icon: "✂" },
    { id: "design",        label: "Grafik dizayn",     icon: "◈" },
    { id: "target",        label: "Target bo'limi",    icon: "◌" },
    ...(canViewFinancialDashboard(profile.role) ? [{ id: "finance", label: "Moliyaviy dashboard", icon: "◍" }] : []),
    { id: "workflow",      label: "Workflow",          icon: "⋯" },
  ];
  return (
    <aside style={{ width: 220, minHeight: "100vh", background: T.colors.surface, borderRight: `1px solid ${T.colors.border}`, padding: "16px 10px", position: "sticky", top: 0, alignSelf: "flex-start", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 28 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.colors.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>CRM</div>
        <div><div style={{ fontWeight: 800, fontSize: 14 }}>AgencyCRM</div><div style={{ fontSize: 11, color: T.colors.textTertiary }}>{ROLE_META[profile.role]?.label || profile.role}</div></div>
      </div>
      <div style={{ display: "grid", gap: 2, flex: 1 }}>
        {items.map(item => {
          const active = item.id === page;
          return (
            <button key={item.id} type="button" onClick={() => onNavigate(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", borderRadius: T.radius.md, padding: "9px 12px", cursor: "pointer", background: active ? T.colors.accent : "transparent", color: active ? "#fff" : T.colors.textSecondary, fontWeight: 600, fontSize: 13.5, fontFamily: T.font, position: "relative", textAlign: "left" }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
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
        <button type="button" onClick={onLogout} style={{ width: "100%", background: T.colors.borderLight, border: "none", borderRadius: T.radius.md, padding: "8px", fontSize: 13, color: T.colors.textSecondary, cursor: "pointer", fontFamily: T.font, fontWeight: 600 }}>Chiqish</button>
      </div>
    </aside>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ busy, error, onEmailLogin, onGoogleRegister, onGoogleLogin }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", dept: "SMM bo'limi", title: "Xodim" });
  const upL = (k, v) => setLoginForm(p => ({ ...p, [k]: v }));
  const upR = (k, v) => setRegisterForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f5f5f7 0%,#e8f0fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <Card style={{ padding: 28 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: T.colors.accent, color: "#fff", fontSize: 26, fontWeight: 900, boxShadow: `0 8px 24px ${T.colors.accent}33` }}>CRM</div>
            <h1 style={{ margin: "16px 0 8px" }}>Agency CRM</h1>
            <p style={{ margin: 0, color: T.colors.textMuted, lineHeight: 1.6 }}>Real Google ro'yxatdan o'tish va doimiy saqlanadigan ish muhiti.</p>
          </div>
          <div style={{ display: "flex", gap: 8, background: T.colors.bg, borderRadius: T.radius.md, padding: 3, marginBottom: 24 }}>
            {[{ id: "login", label: "Kirish" }, { id: "register", label: "Ro'yxatdan o'tish" }].map(tab => (
              <button key={tab.id} type="button" onClick={() => setMode(tab.id)} style={{ flex: 1, border: "none", borderRadius: T.radius.sm, padding: "9px 12px", fontWeight: 600, fontFamily: T.font, background: mode === tab.id ? "#ffffff" : "transparent", color: mode === tab.id ? T.colors.text : T.colors.textSecondary, boxShadow: mode === tab.id ? T.shadow.sm : "none", cursor: "pointer" }}>{tab.label}</button>
            ))}
          </div>
          {mode === "login" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Email" type="email" value={loginForm.email} onChange={v => upL("email", v)} placeholder="ceo@agency.uz" maxLength={200} />
              <Field label="Parol" type="password" value={loginForm.password} onChange={v => upL("password", v)} placeholder="Parol" maxLength={200} />
              {error ? <div style={{ padding: "10px 12px", background: T.colors.redSoft, color: T.colors.red, borderRadius: T.radius.md, fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
              <Button onClick={() => onEmailLogin(loginForm.email, loginForm.password)} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>{busy ? "Kutilmoqda..." : "Email va parol bilan kirish"}</Button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: T.colors.textMuted, fontSize: 12 }}><span style={{ flex: 1, height: 1, background: T.colors.border }} />yoki<span style={{ flex: 1, height: 1, background: T.colors.border }} /></div>
              <Button variant="secondary" onClick={onGoogleLogin} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>Google bilan kirish</Button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Ism familiya" value={registerForm.name} onChange={v => upR("name", v)} placeholder="Ali Valiyev" maxLength={LIMITS.projectName} required />
              <Field label="Bo'lim" options={DEPARTMENTS.filter(d => d !== "Boshqaruv")} value={registerForm.dept} onChange={v => upR("dept", v)} />
              <Field label="Lavozim" value={registerForm.title} onChange={v => upR("title", v)} placeholder="SMM mutaxassisi" maxLength={100} />
              {error ? <div style={{ padding: "10px 12px", background: T.colors.redSoft, color: T.colors.red, borderRadius: T.radius.md, fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
              <Button onClick={() => onGoogleRegister(registerForm)} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>{busy ? "Kutilmoqda..." : "Google orqali xodim sifatida ro'yxatdan o'tish"}</Button>
              <p style={{ margin: 0, color: T.colors.textMuted, fontSize: 12, lineHeight: 1.6 }}>CEO, investor, boshqaruvchi va menejer akkauntlari email/parol orqali kiradi.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f5f5f7 0%,#e8f0fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ maxWidth: 780 }}>
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Firebase sozlamasi kerak</h1>
        <p style={{ color: T.colors.textMuted, lineHeight: 1.7 }}>Bu CRM versiyasi Google login va barcha ma'lumotlarni doimiy saqlash uchun Firebase ishlatadi. <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Firebase Console</a> da loyiha ochib, <code>.env</code> fayliga qiymatlarni yozing.</p>
        <Card style={{ background: T.colors.bg, borderStyle: "dashed", marginTop: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>.env namuna</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: T.colors.textMuted, fontSize: 13 }}>{`VITE_FIREBASE_API_KEY=...\nVITE_FIREBASE_AUTH_DOMAIN=...\nVITE_FIREBASE_PROJECT_ID=...\nVITE_FIREBASE_STORAGE_BUCKET=...\nVITE_FIREBASE_MESSAGING_SENDER_ID=...\nVITE_FIREBASE_APP_ID=...`}</pre>
        </Card>
      </Card>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ label = "Yuklanmoqda..." }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame;

    function tick() {
      setProgress((current) => {
        if (current >= 100) return 100;
        return current + 1;
      });
      frame = window.setTimeout(tick, 8);
    }

    tick();
    return () => {
      window.clearTimeout(frame);
    };
  }, []);

  const size = 76;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f5f5f7 0%,#e8f0fe 100%)", fontFamily: T.font, color: T.colors.text, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "-15%", background: "radial-gradient(circle at 30% 25%, rgba(0,113,227,.08), transparent 28%), radial-gradient(circle at 72% 68%, rgba(90,200,250,.12), transparent 24%), radial-gradient(circle at 50% 50%, rgba(255,255,255,.55), transparent 46%)", animation: "loaderDrift 10s ease-in-out infinite alternate" }} />
      <Card style={{ textAlign: "center", maxWidth: 380, padding: 30, position: "relative", zIndex: 1, animation: "loaderFloat 3.2s ease-in-out infinite" }}>
        <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: -10, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,.18), rgba(0,113,227,0) 70%)", animation: "loaderPulse 1.9s ease-in-out infinite" }} />
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", transform: "rotate(-90deg)" }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(0,113,227,.12)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#loaderBlue)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.18s ease" }}
            />
            <defs>
              <linearGradient id="loaderBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="55%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 10, borderRadius: "50%", background: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: T.colors.accent }}>
            {progress}%
          </div>
        </div>
        <div style={{ marginTop: 18, fontWeight: 800 }}>{label}</div>
        <div style={{ marginTop: 6, color: T.colors.textSecondary, fontSize: 13 }}>Realtime CRM ma'lumotlari tayyorlanmoqda.</div>
        <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: T.colors.textMuted }}>
          {progress < 35 ? "Ma'lumotlar yuklanmoqda" : progress < 70 ? "Realtime ulanish tayyorlanmoqda" : "CRM ishga tushirilmoqda"}
        </div>
      </Card>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error("AgencyCRM runtime error", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <><GlobalStyles />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.colors.bg, padding: 24 }}>
          <Card style={{ maxWidth: 720, width: "100%" }}>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>CRM yuklanishda xato bo'ldi</div>
            <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: T.radius.lg, padding: 16, fontFamily: "ui-monospace,monospace", whiteSpace: "pre-wrap", fontSize: 13 }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </div>
            <div style={{ marginTop: 16 }}><Button onClick={() => window.location.reload()}>Sahifani qayta yuklash</Button></div>
          </Card>
        </div>
      </>
    );
  }
}

// ─── Pages ─────────────────────────────────────────────────────────────────

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  // ── Initial cache hydration ──────────────────────────────────────────────
  const cachedCrm  = readCache(CRM_CACHE_KEY, {});
  const initProjects   = Array.isArray(cachedCrm.projects)      ? cachedCrm.projects.map(i => normalizeStoredProjectMeta(i.id, i)).filter(p => !p.archived)  : [];
  const initPublicUsers= Array.isArray(cachedCrm.users)         ? cachedCrm.users.map(i => normalizeStoredUser(i.id, i))                                      : [];
  const initPrivate    = cachedCrm.userPrivate && typeof cachedCrm.userPrivate === "object"
    ? Object.fromEntries(Object.entries(cachedCrm.userPrivate).map(([id, i]) => [id, normalizeStoredPrivateUser(id, i)])) : {};
  const initShoots     = Array.isArray(cachedCrm.shoots)        ? cachedCrm.shoots.map(i => normalizeStoredRecord(i.id, i))        : [];

  // ── State ────────────────────────────────────────────────────────────────
  const [profile,             setProfile]             = useState(null);
  const [projectDocs,         setProjectDocs]         = useState(initProjects);
  const [publicUsers,         setPublicUsers]         = useState(initPublicUsers);
  const [privateUsers,        setPrivateUsers]        = useState(initPrivate);
  const [shootDocs,           setShootDocs]           = useState(initShoots);
  const [designTaskDocs,      setDesignTaskDocs]      = useState([]);
  const [targetTaskDocs,      setTargetTaskDocs]      = useState([]);
  const [liveWorkspaceMetricsByProjectId, setLiveWorkspaceMetricsByProjectId] = useState({});
  const [selectedProjectWorkspace, setSelectedProjectWorkspace] = useState(EMPTY_PROJECT_WORKSPACE);
  const [page,               setPage]               = useState("dashboard");
  const [selectedProjectId,  setSelectedProjectId]  = useState("");
  const [designProjectId,    setDesignProjectId]    = useState("");
  const [booting,            setBooting]            = useState(true);
  const [projectsReady,      setProjectsReady]      = useState(initProjects.length > 0);
  const [publicUsersReady,   setPublicUsersReady]   = useState(initPublicUsers.length > 0);
  const [privateUsersReady,  setPrivateUsersReady]  = useState(Object.keys(initPrivate).length > 0);
  const [projectWorkspaceReady, setProjectWorkspaceReady] = useState(true);
  const [bootSettled,        setBootSettled]        = useState(initProjects.length > 0 || initPublicUsers.length > 0);
  const [authBusy,           setAuthBusy]           = useState(false);
  const [authError,          setAuthError]          = useState("");
  const [syncing,            setSyncing]            = useState(false);
  const [toasts,             setToasts]             = useState([]);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const pendingRegistrationRef = useRef(null);
  const migrationRef           = useRef(false);
  const projectDocsRef         = useRef([]);
  const publicUsersRef         = useRef([]);
  const assignmentSyncRef      = useRef("");
  const selectedProjectRef     = useRef(null);
  const designTaskDocsRef      = useRef([]);
  const targetTaskDocsRef      = useRef([]);
  const pendingWorkspaceRef    = useRef({});
  const liveMetricsSyncRef     = useRef({});
  const initialCacheRef        = useRef(cachedCrm);

  // ── Confirm dialog (UX-02 FIX: no more window.confirm) ───────────────────
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ── Derived state ─────────────────────────────────────────────────────────
  const employees = useMemo(() =>
    visibleEmployees(profile, mergeEmployeeDocs(publicUsers, privateUsers, profile?.role, projectDocs)),
    [profile, publicUsers, privateUsers, projectDocs]);

  const projects = useMemo(() =>
    visibleProjects(profile, projectDocs),
    [profile, projectDocs]);

  const selectedProjectMeta = useMemo(() =>
    selectedProjectId ? (projectDocs.find(p => p.id === selectedProjectId) || null) : null,
    [selectedProjectId, projectDocs]);

  const selectedProject = useMemo(() =>
    selectedProjectId && selectedProjectMeta
      ? hydrateProject(selectedProjectMeta, selectedProjectWorkspace)
      : null,
    [selectedProjectId, selectedProjectMeta, selectedProjectWorkspace]);

  const shoots       = useMemo(() => visibleShoots(profile, shootDocs, projectDocs), [profile, shootDocs, projectDocs]);
  const projectCaches= useMemo(() => buildProjectCaches(projects, designTaskDocs), [projects, designTaskDocs]);
  const projectProgressByProjectId = useMemo(() => {
    const next = { ...projectCaches.progressByProjectId };
    Object.entries(liveWorkspaceMetricsByProjectId).forEach(([projectId, metrics]) => {
      next[projectId] = Number(metrics?.progress || 0);
    });
    return next;
  }, [projectCaches.progressByProjectId, liveWorkspaceMetricsByProjectId]);
  const dashboardSummary = useMemo(() => {
    const liveMetricKeys = Object.keys(liveWorkspaceMetricsByProjectId);
    if (!liveMetricKeys.length) return projectCaches.dashboardSummary;
    return summarizePortfolioMetrics(
      projects.map((project) => ({
        ...project,
        metrics: liveWorkspaceMetricsByProjectId[project.id] || project.metrics || {},
      }))
    );
  }, [projects, projectCaches.dashboardSummary, liveWorkspaceMetricsByProjectId]);
  const financialDashboard = useMemo(() => buildFinancialDashboard({
    projects,
    employees,
    employeeMetricsById: projectCaches.employeeMetricsById,
  }), [projects, employees, projectCaches.employeeMetricsById]);

  // ── Ref sync ──────────────────────────────────────────────────────────────
  useEffect(() => { projectDocsRef.current  = projectDocs; },  [projectDocs]);
  useEffect(() => { publicUsersRef.current  = publicUsers; },  [publicUsers]);
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);
  useEffect(() => { designTaskDocsRef.current = designTaskDocs; }, [designTaskDocs]);
  useEffect(() => { targetTaskDocsRef.current = targetTaskDocs; }, [targetTaskDocs]);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  function pushToast(text, tone = "success") {
    if (!text) return;
    const msg = String(text).toLowerCase();
    if (tone === "error" && (msg.includes("ruxsat") || msg.includes("permission") || msg.includes("unavailable"))) {
      console.error("[CRM] toast suppressed:", text); return;
    }
    setToasts(cur => [...cur.slice(-2), { id: makeId("toast"), text, tone }]);
  }

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(cur => cur.slice(1)), 2800);
    return () => clearTimeout(t);
  }, [toasts]);

  // ── Optimistic meta docs apply ────────────────────────────────────────────
  function applyOptimisticMetaDocs() {
    /* Bildirishnomalar olib tashlangan — faqat Firestore ga audit yozuvi ketadi */
  }

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db) { setBooting(false); return; }
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setBooting(true);
      try {
        if (!firebaseUser) {
          setProfile(null);
          setProjectDocs([]); setPublicUsers([]); setPrivateUsers({});
          setShootDocs([]);
          setDesignTaskDocs([]);
          setTargetTaskDocs([]);
          setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
          setDesignProjectId("");
          setProjectsReady(false); setPublicUsersReady(false);
          setPrivateUsersReady(false); setProjectWorkspaceReady(false);
          migrationRef.current = false;
          return;
        }
        const userRef     = doc(db, "users",       firebaseUser.uid);
        const privateRef  = doc(db, "userPrivate", firebaseUser.uid);
        const snap        = await getDoc(userRef);
        const fixedRole   = FIXED_ROLE_BY_EMAIL[(firebaseUser.email || "").toLowerCase()];
        const registration= pendingRegistrationRef.current;
        const roleCode    = snap.data()?.roleCode || fixedRole?.role || "EMPLOYEE";
        const baseName    = registration?.name || firebaseUser.displayName || fixedRole?.name || firebaseUser.email?.split("@")[0] || "Xodim";

        const currentUser = snap.exists()
          ? normalizeStoredUser(firebaseUser.uid, snap.data())
          : employeeToPublicDoc({ id: firebaseUser.uid, email: firebaseUser.email || "", name: baseName, avatarUrl: firebaseUser.photoURL || "", roleCode, role: registration?.title || fixedRole?.title || ROLE_META[roleCode]?.title || "Xodim", dept: registration?.dept || fixedRole?.dept || "SMM bo'limi", status: "active", assignedProjectIds: [], createdAt: isoNow(), updatedAt: isoNow() });

        const nextUserDoc = { ...currentUser, uid: firebaseUser.uid, email: firebaseUser.email || currentUser.email || "", name: currentUser.name || baseName, avatarUrl: firebaseUser.photoURL || currentUser.avatarUrl || "", roleCode, role: currentUser.role || registration?.title || fixedRole?.title || ROLE_META[roleCode]?.title || "Xodim", title: currentUser.title || registration?.title || fixedRole?.title || ROLE_META[roleCode]?.title || "Xodim", dept: currentUser.dept || registration?.dept || fixedRole?.dept || "SMM bo'limi", status: currentUser.status || "active", createdAt: currentUser.createdAt || isoNow(), updatedAt: isoNow() };
        
        // Set profile immediately (don't wait for private doc or setDoc sync)
        pendingRegistrationRef.current = null;
        setProfile({ uid: firebaseUser.uid, email: nextUserDoc.email, name: nextUserDoc.name, avatarUrl: nextUserDoc.avatarUrl || "", role: roleCode, dept: nextUserDoc.dept, title: nextUserDoc.title, salary: 0, kpiBase: 80, load: 0, createdAt: nextUserDoc.createdAt });
        
        // Sync user doc and fetch private doc in background
        setDoc(userRef, nextUserDoc, { merge: true }).catch(e => console.error("[CRM] setDoc user:", e?.code));
        if (canManagePeople(roleCode)) {
          getDoc(privateRef)
            .then(privateSnap => {
              if (privateSnap.exists()) {
                const data = privateSnap.data();
                setProfile(p => p ? { ...p, salary: Number(data?.salary || 0), kpiBase: Number(data?.kpiBase || 80), load: Number(data?.load || 0) } : p);
              }
            })
            .catch(e => console.error("[CRM] getDoc private:", e?.code));
        }
        setAuthError("");
      } catch (error) { setAuthError(humanizeAuthError(error)); }
      finally { setBooting(false); }
    });
  }, []);

  // ── Legacy migration ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !db || migrationRef.current) return;
    let cancelled = false;
    migrationRef.current = true;
    migrateLegacyRootSchema({ legacyRootRef: doc(db, "crm", "agency-crm"), actor: profile })
      .then(r => { if (!cancelled && r.migrated) pushToast("Firestore schema ko'chirildi."); })
      .catch(e => { if (!cancelled) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); } });
    return () => { cancelled = true; };
  }, [profile?.uid]);

  // ── Projects subscription (ARCH-02 FIX: stable COLS ref) ──────────────────
  useEffect(() => {
    if (!profile || !COLS.projects) return;
    if (!projectDocs.length) setProjectsReady(false);
    return onSnapshot(COLS.projects, snap => {
      const next = sortByRecent(snap.docs.map(e => normalizeStoredProjectMeta(e.id, e.data())), "updatedAt").filter(p => !p.archived);
      startTransition(() => { setProjectDocs(next); setProjectsReady(true); });
    }, error => {
      console.error("[CRM] projects:", error?.code, error?.message);
      setProjectsReady(true);
      if (!String(error?.code || "").includes("permission-denied")) setAuthError(humanizeAuthError(error));
    });
  }, [profile?.uid]);

  // ── Users subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !COLS.users) return;
    if (!publicUsers.length) setPublicUsersReady(false);
    return onSnapshot(COLS.users, snap => {
      const next = snap.docs.map(e => normalizeStoredUser(e.id, e.data())).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      startTransition(() => {
        setPublicUsers(next);
        setPublicUsersReady(true);
        const currentUserDoc = next.find((item) => item.id === profile.uid);
        const currentUserEmail = String(profile.email || "").trim().toLowerCase();
        const mergedAssignedProjectIds = Array.from(
          new Set(
            next
              .filter((item) => String(item.email || "").trim().toLowerCase() === currentUserEmail)
              .flatMap((item) => item.assignedProjectIds || [])
          )
        );
        if (currentUserDoc) {
          setProfile((current) => current ? {
            ...current,
            assignedProjectIds: mergedAssignedProjectIds.length ? mergedAssignedProjectIds : (currentUserDoc.assignedProjectIds || []),
            role: currentUserDoc.roleCode || current.role,
            dept: currentUserDoc.dept || current.dept,
            title: currentUserDoc.title || current.title,
          } : current);
        }
      });
    }, error => { console.error("[CRM] users:", error?.code); setPublicUsersReady(true); });
  }, [profile?.uid]);

  // ── Keep assignedProjectIds on the real auth user doc in sync ────────────
  useEffect(() => {
    if (!profile?.uid || !db || !publicUsers.length) return;
    const currentUserDoc = publicUsers.find((item) => item.id === profile.uid);
    if (!currentUserDoc) return;
    const currentAssigned = Array.isArray(currentUserDoc.assignedProjectIds) ? currentUserDoc.assignedProjectIds : [];
    const nextAssigned = Array.from(new Set(
      Array.isArray(profile.assignedProjectIds) && profile.assignedProjectIds.length
        ? profile.assignedProjectIds
        : currentAssigned
    ));
    if (!nextAssigned.length) return;
    const same = currentAssigned.length === nextAssigned.length && currentAssigned.every((id) => nextAssigned.includes(id));
    if (same) return;
    const syncKey = `${profile.uid}:${[...nextAssigned].sort().join(",")}`;
    if (assignmentSyncRef.current === syncKey) return;
    assignmentSyncRef.current = syncKey;
    setDoc(doc(db, "users", profile.uid), {
      assignedProjectIds: nextAssigned,
      updatedAt: isoNow(),
    }, { merge: true }).catch((error) => {
      assignmentSyncRef.current = "";
      console.error("[CRM] assignedProjectIds sync:", error?.code);
    });
  }, [profile?.uid, profile?.assignedProjectIds, publicUsers]);

  // ── Private users subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !COLS.userPrivate) return;
    if (!canManagePeople(profile.role)) { setPrivateUsers({}); setPrivateUsersReady(true); return; }
    if (!Object.keys(privateUsers).length) setPrivateUsersReady(false);
    return onSnapshot(COLS.userPrivate, snap => {
      const next = {};
      snap.docs.forEach(e => { next[e.id] = normalizeStoredPrivateUser(e.id, e.data()); });
      startTransition(() => { setPrivateUsers(next); setPrivateUsersReady(true); });
    }, () => setPrivateUsersReady(true));
  }, [profile?.uid, profile?.role]);

  // ── Shoots (page-gated) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !COLS.shoots || page !== "shooting") return;
    return onSnapshot(COLS.shoots, snap => {
      startTransition(() => setShootDocs(snap.docs.map(e => normalizeStoredRecord(e.id, e.data()))));
    }, e => console.error("[CRM] shoots:", e?.code));
  }, [profile?.uid, page]);

  // ── Live project workspace metrics for dashboard/projects ────────────────
  useEffect(() => {
    if (!profile || !db || !["dashboard", "projects"].includes(page)) return;
    if (!projects.length) {
      setLiveWorkspaceMetricsByProjectId({});
      return;
    }
    const unsubs = [];
    const metricsByProjectId = {};
    const workspaceByProjectId = {};
    projects.forEach((project) => {
      workspaceByProjectId[project.id] = {
        tasks: [],
        contentPlan: [],
        mediaPlan: [],
        designTasks: [],
        targetTasks: [],
        plans: { daily: [], weekly: [], monthly: [] },
        calls: [],
      };
      const projectRef = doc(db, "projects", project.id);
      const recompute = () => {
        const nextMetrics = computeProjectMetrics(workspaceByProjectId[project.id]);
        metricsByProjectId[project.id] = nextMetrics;
        startTransition(() => {
          setLiveWorkspaceMetricsByProjectId({ ...metricsByProjectId });
        });
        const currentProjectMeta = projectDocsRef.current.find((item) => item.id === project.id);
        const currentSignature = JSON.stringify(currentProjectMeta?.metrics || {});
        const nextSignature = JSON.stringify(nextMetrics);
        if (currentSignature !== nextSignature && liveMetricsSyncRef.current[project.id] !== nextSignature) {
          liveMetricsSyncRef.current[project.id] = nextSignature;
          setDoc(doc(db, "projects", project.id), {
            metrics: nextMetrics,
            memberStats: computeProjectMemberStats(workspaceByProjectId[project.id]),
          }, { merge: true }).catch((error) => {
            console.error("[CRM] metrics backfill:", error?.code);
          });
        }
      };
      unsubs.push(
        onSnapshot(collection(projectRef, "tasks"), (snap) => {
          workspaceByProjectId[project.id].tasks = snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
          recompute();
        }, (error) => console.error("[CRM] project tasks:", error?.code))
      );
      unsubs.push(
        onSnapshot(collection(projectRef, "content"), (snap) => {
          workspaceByProjectId[project.id].contentPlan = snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
          recompute();
        }, (error) => console.error("[CRM] project content:", error?.code))
      );
      unsubs.push(
        onSnapshot(collection(projectRef, "mediaPlans"), (snap) => {
          workspaceByProjectId[project.id].mediaPlan = snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
          recompute();
        }, (error) => console.error("[CRM] project media:", error?.code))
      );
      unsubs.push(
        onSnapshot(collection(projectRef, "designTasks"), (snap) => {
          workspaceByProjectId[project.id].designTasks = snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
          recompute();
        }, (error) => console.error("[CRM] project design:", error?.code))
      );
      unsubs.push(
        onSnapshot(collection(projectRef, "targetTasks"), (snap) => {
          workspaceByProjectId[project.id].targetTasks = snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
          recompute();
        }, (error) => console.error("[CRM] project target:", error?.code))
      );
      unsubs.push(
        onSnapshot(collection(projectRef, "plans"), (snap) => {
          workspaceByProjectId[project.id].plans = splitPlans(snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data())));
          recompute();
        }, (error) => console.error("[CRM] project plans:", error?.code))
      );
      unsubs.push(
        onSnapshot(collection(projectRef, "calls"), (snap) => {
          workspaceByProjectId[project.id].calls = snap.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
          recompute();
        }, (error) => console.error("[CRM] project calls:", error?.code))
      );
    });
    return () => unsubs.forEach((unsub) => unsub());
  }, [profile?.uid, page, projects.length]);

  // ── Design tasks (page-gated, all visible projects) ─────────────────────
  useEffect(() => {
    if (!profile || !db || page !== "design") return;
    if (!projects.length) {
      setDesignTaskDocs([]);
      return;
    }
    const unsubs = [];
    const allDocs = {};
    projects.forEach((proj) => {
      const colRef = collection(db, "projects", proj.id, "designTasks");
      const unsub = onSnapshot(colRef, (snap) => {
        allDocs[proj.id] = snap.docs.map((entry) => ({
          ...normalizeStoredRecord(entry.id, entry.data()),
          projectId: proj.id,
        }));
        startTransition(() => {
          setDesignTaskDocs(Object.values(allDocs).flat());
        });
      }, (error) => {
        console.error("[CRM] designTasks:", error?.code);
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((unsub) => unsub());
  }, [profile?.uid, page, projects.length]);

  // ── Target tasks (page-gated, all visible projects) ─────────────────────
  useEffect(() => {
    if (!profile || !db || page !== "target") return;
    if (!projects.length) {
      setTargetTaskDocs([]);
      return;
    }
    const unsubs = [];
    const allDocs = {};
    projects.forEach((proj) => {
      const colRef = collection(db, "projects", proj.id, "targetTasks");
      const unsub = onSnapshot(colRef, (snap) => {
        allDocs[proj.id] = snap.docs.map((entry) => ({
          ...normalizeStoredRecord(entry.id, entry.data()),
          projectId: proj.id,
        }));
        startTransition(() => {
          setTargetTaskDocs(Object.values(allDocs).flat());
        });
      }, (error) => {
        console.error("[CRM] targetTasks:", error?.code);
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((unsub) => unsub());
  }, [profile?.uid, page, projects.length]);

  // ── Project workspace subscription ────────────────────────────────────────
  useEffect(() => {
    if (!profile || !selectedProjectId || !db) {
      setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
      setProjectWorkspaceReady(true);
      return;
    }
    const cached = readCache(projectWorkspaceCacheKey(selectedProjectId), null);
    if (cached) {
      setSelectedProjectWorkspace({
        tasks: cached.tasks || [],
        contentPlan: cached.contentPlan || [],
        mediaPlan: cached.mediaPlan || [],
        designTasks: cached.designTasks || [],
        targetTasks: cached.targetTasks || [],
        plans: cached.plans || { daily: [], weekly: [], monthly: [] },
        calls: cached.calls || [],
      });
      setProjectWorkspaceReady(true);
    } else {
      setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
      setProjectWorkspaceReady(false);
    }

    const projectRef = doc(db, "projects", selectedProjectId);
    const pending = { tasks: null, contentPlan: null, mediaPlan: null, designTasks: null, targetTasks: null, plans: null, calls: null };
    const loaded  = new Set();
    let flushTimer = null;
    const pid = selectedProjectId;

    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        const patch = {};
        if (pending.tasks       !== null) patch.tasks       = pending.tasks;
        if (pending.contentPlan !== null) patch.contentPlan = pending.contentPlan;
        if (pending.mediaPlan   !== null) patch.mediaPlan   = pending.mediaPlan;
        if (pending.designTasks !== null) patch.designTasks = pending.designTasks;
        if (pending.targetTasks !== null) patch.targetTasks = pending.targetTasks;
        if (pending.plans       !== null) patch.plans       = pending.plans;
        if (pending.calls       !== null) patch.calls       = pending.calls;
        const optimistic = pendingWorkspaceRef.current[pid];
        let nextPatch = patch;
        if (optimistic && optimistic.expiresAt > Date.now()) {
          const optimisticWorkspace = optimistic.workspace || EMPTY_PROJECT_WORKSPACE;
          nextPatch = {
            ...patch,
            tasks: patch.tasks ? mergeRecordsById(optimisticWorkspace.tasks, patch.tasks) : optimisticWorkspace.tasks,
            contentPlan: patch.contentPlan ? mergeRecordsById(optimisticWorkspace.contentPlan, patch.contentPlan) : optimisticWorkspace.contentPlan,
            mediaPlan: patch.mediaPlan ? mergeRecordsById(optimisticWorkspace.mediaPlan, patch.mediaPlan) : optimisticWorkspace.mediaPlan,
            designTasks: patch.designTasks ? mergeRecordsById(optimisticWorkspace.designTasks, patch.designTasks) : optimisticWorkspace.designTasks,
            targetTasks: patch.targetTasks ? mergeRecordsById(optimisticWorkspace.targetTasks, patch.targetTasks) : optimisticWorkspace.targetTasks,
            plans: patch.plans ? mergePlanWorkspace(optimisticWorkspace.plans, patch.plans) : optimisticWorkspace.plans,
            calls: patch.calls ? mergeRecordsById(optimisticWorkspace.calls, patch.calls) : optimisticWorkspace.calls,
          };
          const optimisticSatisfied =
            (!patch.tasks || containsAllIds(optimisticWorkspace.tasks, patch.tasks)) &&
            (!patch.contentPlan || containsAllIds(optimisticWorkspace.contentPlan, patch.contentPlan)) &&
            (!patch.mediaPlan || containsAllIds(optimisticWorkspace.mediaPlan, patch.mediaPlan)) &&
            (!patch.designTasks || containsAllIds(optimisticWorkspace.designTasks, patch.designTasks)) &&
            (!patch.targetTasks || containsAllIds(optimisticWorkspace.targetTasks, patch.targetTasks)) &&
            (!patch.calls || containsAllIds(optimisticWorkspace.calls, patch.calls)) &&
            (!patch.plans || (
              containsAllIds(optimisticWorkspace.plans?.daily, patch.plans.daily) &&
              containsAllIds(optimisticWorkspace.plans?.weekly, patch.plans.weekly) &&
              containsAllIds(optimisticWorkspace.plans?.monthly, patch.plans.monthly)
            ));
          if (optimisticSatisfied) delete pendingWorkspaceRef.current[pid];
        }
        startTransition(() => {
          setSelectedProjectWorkspace(cur => { const next = { ...cur, ...nextPatch }; writeCache(projectWorkspaceCacheKey(pid), next); return next; });
          if (["tasks","contentPlan","mediaPlan","designTasks","targetTasks","plans","calls"].every(k => loaded.has(k))) setProjectWorkspaceReady(true);
        });
      }, 0);
    }

    function commit(key, patch) { Object.assign(pending, patch); loaded.add(key); scheduleFlush(); }
    function onErr(e) { console.error("[CRM] workspace:", e?.code); setProjectWorkspaceReady(true); }

    const unsubs = [
      onSnapshot(collection(projectRef, "tasks"),      s => { commit("tasks",       { tasks:       sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "content"),    s => { commit("contentPlan", { contentPlan: sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "mediaPlans"), s => { commit("mediaPlan",   { mediaPlan:   sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "designTasks"), s => { commit("designTasks", { designTasks: sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "targetTasks"), s => { commit("targetTasks", { targetTasks: sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "plans"),      s => { commit("plans",       { plans:       splitPlans(sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse()) }); }, onErr),
      onSnapshot(collection(projectRef, "calls"),      s => { commit("calls",       { calls:       sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
    ];
    return () => unsubs.forEach(u => u());
  }, [profile?.uid, selectedProjectId]);

  // ── Boot settled safety net (PERF-05 FIX: reduced from 3s to 1.2s) ─────────────
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => {
      setProjectsReady(true); setPublicUsersReady(true);
      setPrivateUsersReady(true);
      setProjectWorkspaceReady(true); setBootSettled(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [profile?.uid]);

  useEffect(() => {
    if (projectsReady || publicUsersReady) setBootSettled(true);
  }, [projectsReady, publicUsersReady]);

  // ── Cache write debounce ──────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => writeCache(CRM_CACHE_KEY, { projects: projectDocs, users: publicUsers, userPrivate: privateUsers, shoots: shootDocs }), 400);
    return () => clearTimeout(t);
  }, [profile?.uid, projectDocs, publicUsers, privateUsers, shootDocs]);

  useEffect(() => {
    if (!profile || !db || !canViewFinancialDashboard(profile.role)) return undefined;
    const payload = buildFinancialSnapshotDoc(financialDashboard, profile);
    const timer = setTimeout(() => {
      setDoc(doc(db, "financialSnapshots", ROOT_DOC_ID), payload, { merge: true }).catch((error) => {
        console.error("[CRM] financial snapshot:", error?.code, error?.message);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [profile?.uid, profile?.role, financialDashboard]);

  // ── Derived loading flags ─────────────────────────────────────────────────
  const primaryLoading   = !bootSettled && !projectsReady  && projectDocs.length === 0 && publicUsers.length === 0;
  const teamLoading      = !bootSettled && !publicUsersReady && publicUsers.length === 0;

  // ─── Action: navigate ──────────────────────────────────────────────────────
  const navigate = useCallback((nextPage) => {  // ARCH-03 FIX: useCallback
    setPage(nextPage);
    if (nextPage !== "projects") setSelectedProjectId("");
  }, []);

  // ─── Helpers shared across actions ────────────────────────────────────────
  function nextProjectListAfterSave(projectMetaDoc, projectId, mode = "upsert") {
    const next = mode === "delete"
      ? projectDocsRef.current.filter(i => i.id !== projectId)
      : sortByRecent([...projectDocsRef.current.filter(i => i.id !== projectId), normalizeStoredProjectMeta(projectId, projectMetaDoc)], "updatedAt");
    return next.filter(p => !p.archived);
  }

  // ─── Auth actions ─────────────────────────────────────────────────────────
  const handleEmailLogin = useCallback(async (email, password) => {
    setAuthBusy(true); setAuthError("");
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (e) { setAuthError(humanizeAuthError(e)); }
    finally { setAuthBusy(false); }
  }, []);

  const handleGoogleRegister = useCallback(async (registration) => {
    if (!registration.name.trim()) { setAuthError("Ism kiritilishi kerak."); return; }
    setAuthBusy(true); setAuthError("");
    pendingRegistrationRef.current = registration;
    try { await signInWithPopup(auth, googleProvider || new GoogleAuthProvider()); }
    catch (e) { pendingRegistrationRef.current = null; setAuthError(humanizeAuthError(e)); }
    finally { setAuthBusy(false); }
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setAuthBusy(true); setAuthError("");
    try { await signInWithPopup(auth, googleProvider || new GoogleAuthProvider()); }
    catch (e) { setAuthError(humanizeAuthError(e)); }
    finally { setAuthBusy(false); }
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth); setPage("dashboard"); setSelectedProjectId("");
  }, []);

  // ─── Project CRUD ──────────────────────────────────────────────────────────
  const createProject = useCallback(async (project) => {
    if (!canEdit(profile?.role) || !db) return;
    const next = normalizeProject({ ...project, id: makeId("project"), tasks: [], contentPlan: [], mediaPlan: [], plans: { daily: [], weekly: [], monthly: [] }, calls: [], report: { budget: 0, leads: 0, cpl: 0, sales: 0, roi: 0 }, createdAt: isoNow(), createdBy: profile.uid, updatedAt: isoNow(), updatedBy: profile.uid });
    const projectRef = doc(db, "projects", next.id);
    const metaDoc    = projectMetaDocFromProject(next, profile, next);
    const metaDocs   = createMetaDocs({ notifyText: `Yangi loyiha qo'shildi: ${next.name}`, auditText: `Loyiha yaratildi: ${next.name}`, page: "projects" }, profile);
    const nextProjects = nextProjectListAfterSave(metaDoc, next.id);
    const ops = [
      { type: "set", ref: projectRef, data: metaDoc, options: { merge: true } },
      ...metaDocs.map(i => ({ type: "set", ref: doc(db, i.collection, i.id), data: i.data, options: { merge: false } })),
      ...buildAssignedProjectIdOps(nextProjects, new Set([next.managerId, ...next.teamIds].filter(Boolean)), publicUsersRef.current),
    ];
    startTransition(() => { setProjectDocs(nextProjects); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations(ops); pushToast(`Yangi loyiha qo'shildi: ${next.name}`); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile, publicUsers]);

  const saveProject = useCallback(async (project, meta = {}) => {
    if (!profile || !db) return;
    const currentMeta = projectDocsRef.current.find(i => i.id === project.id);
    const currentProject = selectedProjectRef.current?.id === project.id ? selectedProjectRef.current : hydrateProject(currentMeta || project);
    const canWorkProject = canWorkInProject(profile, currentProject);
    const canWriteMeta = canManageProjectMeta(profile, currentProject);
    if (!canWorkProject && !canWriteMeta) return;

    const hasWs = selectedProjectRef.current?.id === project.id || Array.isArray(project.tasks) || Array.isArray(project.contentPlan) || Array.isArray(project.mediaPlan) || Array.isArray(project.calls) || Boolean(project.plans);
    const next = normalizeProject({ ...currentProject, ...project, ...(canEdit(profile.role) ? {} : { managerId: currentProject.managerId, teamIds: currentProject.teamIds }), tasks: hasWs ? (Array.isArray(project.tasks) ? project.tasks : currentProject.tasks) : currentProject.tasks, contentPlan: hasWs ? (Array.isArray(project.contentPlan) ? project.contentPlan : currentProject.contentPlan) : currentProject.contentPlan, mediaPlan: hasWs ? (Array.isArray(project.mediaPlan) ? project.mediaPlan : currentProject.mediaPlan) : currentProject.mediaPlan, plans: hasWs ? (project.plans || currentProject.plans) : currentProject.plans, calls: hasWs ? (Array.isArray(project.calls) ? project.calls : currentProject.calls) : currentProject.calls });

    const projectRef  = doc(db, "projects", next.id);
    const metaDoc     = projectMetaDocFromProject(next, profile, currentMeta);
    const workspaceMetaPatch = hasWs ? {
      metrics: computeProjectMetrics(next),
      memberStats: computeProjectMemberStats(next),
      updatedAt: metaDoc.updatedAt,
      updatedBy: metaDoc.updatedBy,
    } : null;
    const nextProjects= nextProjectListAfterSave(metaDoc, next.id);
    const affected    = new Set([currentMeta?.managerId, ...(currentMeta?.teamIds || []), next.managerId, ...next.teamIds].filter(Boolean));
    const workspaceOnly = Boolean(meta.workspaceOnly);
    const shouldWriteProjectMeta = canWriteMeta && (!workspaceOnly || profile.role === "CEO");
    const shouldWriteWorkspaceMeta = Boolean(workspaceOnly && canWorkProject && !shouldWriteProjectMeta && workspaceMetaPatch);
    const metaDocs    = canEdit(profile.role) && !workspaceOnly ? createMetaDocs(meta, profile) : [];
    const ops = [
      ...(shouldWriteProjectMeta ? [{ type: "set", ref: projectRef, data: metaDoc, options: { merge: true } }] : []),
      ...(shouldWriteWorkspaceMeta ? [{ type: "set", ref: projectRef, data: workspaceMetaPatch, options: { merge: true } }] : []),
      ...metaDocs.map(i => ({ type: "set", ref: doc(db, i.collection, i.id), data: i.data, options: { merge: false } })),
      ...((shouldWriteProjectMeta && !workspaceOnly) ? buildAssignedProjectIdOps(nextProjects, affected, publicUsersRef.current) : []),
    ];
    if (hasWs) {
      syncCollectionOperations(collection(projectRef, "tasks"),      currentProject.tasks,              next.tasks).forEach(o => ops.push(o));
      syncCollectionOperations(collection(projectRef, "content"),    currentProject.contentPlan,        next.contentPlan).forEach(o => ops.push(o));
      syncCollectionOperations(collection(projectRef, "mediaPlans"), currentProject.mediaPlan,          next.mediaPlan).forEach(o => ops.push(o));
      syncCollectionOperations(collection(projectRef, "plans"),      flattenPlans(currentProject.plans),flattenPlans(next.plans)).forEach(o => ops.push(o));
      syncCollectionOperations(collection(projectRef, "calls"),      currentProject.calls,              next.calls).forEach(o => ops.push(o));
    }

    startTransition(() => {
      setProjectDocs(nextProjects);
      if (selectedProjectId === next.id) {
        const optimisticWorkspace = {
          tasks: next.tasks,
          contentPlan: next.contentPlan,
          mediaPlan: next.mediaPlan,
          designTasks: currentProject.designTasks || [],
          targetTasks: currentProject.targetTasks || [],
          plans: next.plans,
          calls: next.calls,
        };
        pendingWorkspaceRef.current[next.id] = { workspace: optimisticWorkspace, expiresAt: Date.now() + 10000 };
        writeCache(projectWorkspaceCacheKey(next.id), optimisticWorkspace);
        setSelectedProjectWorkspace(optimisticWorkspace);
      }
      applyOptimisticMetaDocs(metaDocs);
    });

    if (!meta.silent) setSyncing(true);
    try {
      await commitBatchOperations(ops);
      if (meta.toastText || meta.notifyText) pushToast(meta.toastText || meta.notifyText);
    } catch (e) {
      delete pendingWorkspaceRef.current[next.id];
      if (String(e?.code || "").includes("permission-denied")) {
        const cachedWs = readCache(projectWorkspaceCacheKey(next.id), null);
        if (cachedWs && selectedProjectId === next.id) startTransition(() => setSelectedProjectWorkspace({
          tasks: cachedWs.tasks || [],
          contentPlan: cachedWs.contentPlan || [],
          mediaPlan: cachedWs.mediaPlan || [],
          designTasks: cachedWs.designTasks || [],
          targetTasks: cachedWs.targetTasks || [],
          plans: cachedWs.plans || { daily: [], weekly: [], monthly: [] },
          calls: cachedWs.calls || [],
        }));
      }
      setAuthError(humanizeAuthError(e));
      pushToast(humanizeAuthError(e), "error");
    } finally { if (!meta.silent) setSyncing(false); }
  }, [profile, selectedProjectId, publicUsers]);

  const deleteProject = useCallback(async (projectId) => {
    if (!canEdit(profile?.role)) return;
    const project = projectDocsRef.current.find(i => i.id === projectId);
    if (!project) return;
    // UX-02 FIX: custom confirm instead of window.confirm
    const ok = await confirm(`"${project.name}" loyihasi butunlay o'chirilsinmi?`);
    if (!ok) return;
    const archivedDoc  = { ...project, archived: true, updatedAt: isoNow(), updatedBy: profile.uid };
    const metaDocs     = createMetaDocs({ notifyText: `Loyiha o'chirildi: ${project.name}`, auditText: `Loyiha o'chirildi: ${project.name}`, page: "projects" }, profile);
    const nextProjects = nextProjectListAfterSave(archivedDoc, projectId, "delete");
    const ops = [
      { type: "set", ref: doc(db, "projects", projectId), data: archivedDoc, options: { merge: true } },
      ...metaDocs.map(i => ({ type: "set", ref: doc(db, i.collection, i.id), data: i.data, options: { merge: false } })),
      ...buildAssignedProjectIdOps(nextProjects, new Set([project.managerId, ...project.teamIds].filter(Boolean)), publicUsersRef.current),
    ];
    startTransition(() => {
      setProjectDocs(nextProjects);
      if (selectedProjectId === projectId) { setSelectedProjectId(""); setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE); }
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try { await commitBatchOperations(ops); pushToast(`Loyiha o'chirildi: ${project.name}`); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile, selectedProjectId, confirm]);

  // ─── Employee CRUD ─────────────────────────────────────────────────────────
  const saveEmployee = useCallback(async (emp) => {
    if (!canManagePeople(profile?.role) || !db) return;
    const eid = emp.id || makeId("employee");
    const assignedIds = buildAssignedProjectIdsMap(projectDocsRef.current)[eid] || [];
    const pubDoc  = employeeToPublicDoc({ ...emp, id: eid, assignedProjectIds: assignedIds, updatedAt: isoNow(), createdAt: emp.createdAt || isoNow() });
    const privDoc = employeeToPrivateDoc(emp);
    const metaDocs= createMetaDocs({ notifyText: `Xodim ma'lumoti yangilandi: ${pubDoc.name}`, auditText: `Xodim saqlandi: ${pubDoc.name}`, page: "team" }, profile);
    startTransition(() => {
      setPublicUsers(cur => { const m = indexById(cur); m[eid] = normalizeStoredUser(eid, pubDoc); return Object.values(m).sort((a,b) => String(a.name).localeCompare(String(b.name))); });
      setPrivateUsers(cur => ({ ...cur, [eid]: normalizeStoredPrivateUser(eid, privDoc) }));
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations([
        { type: "set", ref: doc(db, "users", eid),       data: pubDoc,  options: { merge: true } },
        { type: "set", ref: doc(db, "userPrivate", eid), data: privDoc, options: { merge: true } },
        ...metaDocs.map(i => ({ type: "set", ref: doc(db, i.collection, i.id), data: i.data, options: { merge: false } })),
      ]);
      pushToast(`Xodim ma'lumoti yangilandi: ${pubDoc.name}`);
    } catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile]);

  const createEmployee = useCallback(async (emp) => {
    await saveEmployee({ ...emp, id: makeId("employee"), roleCode: emp.roleCode || "EMPLOYEE", avatarUrl: emp.avatarUrl || "", status: "active" });
  }, [saveEmployee]);

  const deleteEmployee = useCallback(async (eid) => {
    if (!canManagePeople(profile?.role)) return;
    const emp = publicUsersRef.current.find(u => u.id === eid);
    if (!emp) return;
    const ok = await confirm(`"${emp.name}" xodim kartochkasi o'chirilsinmi?`);
    if (!ok) return;
    const affectedProjects = projectDocsRef.current.filter(p => p.managerId === eid || p.teamIds.includes(eid));
    const nextProjects = affectedProjects.reduce((cur, p) => cur.map(i => i.id === p.id ? normalizeStoredProjectMeta(p.id, { ...p, managerId: p.managerId === eid ? "" : p.managerId, teamIds: p.teamIds.filter(id => id !== eid), updatedAt: isoNow(), updatedBy: profile.uid }) : i), [...projectDocsRef.current]);
    const metaDocs = createMetaDocs({ notifyText: `Xodim o'chirildi: ${emp.name}`, auditText: `Xodim o'chirildi: ${emp.name}`, page: "team" }, profile);
    const ops = [
      { type: "delete", ref: doc(db, "users", eid) },
      { type: "delete", ref: doc(db, "userPrivate", eid) },
      ...metaDocs.map(i => ({ type: "set", ref: doc(db, i.collection, i.id), data: i.data, options: { merge: false } })),
      ...affectedProjects.map(p => ({ type: "set", ref: doc(db, "projects", p.id), data: nextProjects.find(i => i.id === p.id), options: { merge: true } })),
    ];
    startTransition(() => { setPublicUsers(cur => cur.filter(u => u.id !== eid)); setPrivateUsers(cur => { const n = { ...cur }; delete n[eid]; return n; }); setProjectDocs(nextProjects); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations(ops); pushToast(`Xodim o'chirildi: ${emp.name}`); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile, confirm]);

  // ─── Shoot CRUD ────────────────────────────────────────────────────────────
  const saveShoot = useCallback(async (item) => {
    if (!item.projectId || !item.type || !COLS.shoots) return;
    const relatedProject = projectDocsRef.current.find(p => p.id === item.projectId);
    if (!canWorkInProject(profile, relatedProject)) return;
    const next = withRecordMeta(item.id ? item : { ...item, id: makeId("shoot") }, profile);
    const metaDocs = canEdit(profile?.role)
      ? createMetaDocs({ notifyText: "Syomka yozuvi yangilandi", auditText: `Syomka saqlandi: ${next.type}`, page: "shooting" }, profile)
      : [];
    startTransition(() => { setShootDocs(cur => { const m = indexById(cur); m[next.id] = next; return Object.values(m); }); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations([{ type: "set", ref: doc(db, "shoots", next.id), data: next, options: { merge: true } }, ...metaDocs.map(e => ({ type: "set", ref: doc(db, e.collection, e.id), data: e.data, options: { merge: false } }))]); pushToast("Syomka yozuvi yangilandi"); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile]);

  const deleteShoot = useCallback(async (id) => {
    const shoot = shootDocs.find(s => s.id === id);
    const proj  = projectDocsRef.current.find(p => p.id === shoot?.projectId);
    if (!canWorkInProject(profile, proj)) return;
    const ok = await confirm("Syomka yozuvi o'chirilsinmi?");
    if (!ok) return;
    const metaDocs = canEdit(profile?.role)
      ? createMetaDocs({ notifyText: "Syomka yozuvi o'chirildi", auditText: "Syomka yozuvi o'chirildi", page: "shooting" }, profile)
      : [];
    startTransition(() => { setShootDocs(cur => cur.filter(s => s.id !== id)); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations([{ type: "delete", ref: doc(db, "shoots", id) }, ...metaDocs.map(e => ({ type: "set", ref: doc(db, e.collection, e.id), data: e.data, options: { merge: false } }))]); pushToast("Syomka yozuvi o'chirildi"); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile, shootDocs, confirm]);

  // ─── Design task CRUD ────────────────────────────────────────────────────
  const saveDesignTask = useCallback(async (projectId, task) => {
    if (!projectId || !db) return;
    const relatedProject = projectDocsRef.current.find((project) => project.id === projectId);
    if (!canWorkInProject(profile, relatedProject) && !canCreateDesignTask(profile?.role)) return;
    const previousTask = designTaskDocsRef.current.find((item) => item.id === task.id && item.projectId === projectId) || null;
    const previousProjectTasks = designTaskDocsRef.current.filter((item) => item.projectId === projectId);
    const next = withRecordMeta(
      task.id ? task : { ...task, id: makeId("design") },
      profile
    );
    if (!next.monthId) {
      next.monthId = task.deadline ? task.deadline.slice(0, 7) : getCurrentMonthId();
    }
    const metaDocs = canApproveDesignTask(profile?.role)
      ? createMetaDocs({
        notifyText: `Dizayn TZ: ${next.title}`,
        auditText: `Dizayn TZ saqlandi: ${next.title}`,
        page: "design",
      }, profile)
      : [];
    const nextProjectTasks = [
      ...previousProjectTasks.filter((item) => item.id !== next.id),
      { ...next, projectId },
    ];
    const previousContribution = summarizeDesignTaskMetrics(previousProjectTasks);
    const nextContribution = summarizeDesignTaskMetrics(nextProjectTasks);
    const metricsPatch = applyMetricsDelta(relatedProject?.metrics || {}, previousContribution, nextContribution);
    const previousProjectMetrics = relatedProject?.metrics || {};
    startTransition(() => {
      setDesignTaskDocs((current) => {
        const filtered = current.filter((item) => !(item.id === next.id && item.projectId === projectId));
        return [...filtered, { ...next, projectId }];
      });
      setProjectDocs((current) => current.map((project) => (
        project.id === projectId
          ? { ...project, metrics: metricsPatch, updatedAt: next.updatedAt, updatedBy: next.updatedBy }
          : project
      )));
      setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: metricsPatch }));
    });
    setSyncing(true);
    try {
      await commitBatchOperations([
        {
          type: "set",
          ref: doc(db, "projects", projectId, "designTasks", next.id),
          data: next,
          options: { merge: true },
        },
        {
          type: "set",
          ref: doc(db, "projects", projectId),
          data: {
            metrics: metricsPatch,
            updatedAt: next.updatedAt,
            updatedBy: next.updatedBy,
          },
          options: { merge: true },
        },
        ...metaDocs.map((item) => ({
          type: "set",
          ref: doc(db, item.collection, item.id),
          data: item.data,
          options: { merge: false },
        })),
      ]);
      pushToast(`TZ saqlandi: ${next.title}`);
    } catch (error) {
      startTransition(() => {
        setDesignTaskDocs((current) => {
          const filtered = current.filter((item) => !(item.id === next.id && item.projectId === projectId));
          return previousTask ? [...filtered, previousTask] : filtered;
        });
        setProjectDocs((current) => current.map((project) => (
          project.id === projectId
            ? { ...project, metrics: previousProjectMetrics }
            : project
        )));
        setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: previousProjectMetrics }));
      });
      const message = String(error?.code || "").includes("permission-denied")
        ? "Dizayn TZ saqlanmadi. Firebase Firestore Rules ichida designTasks qoidalarini publish qiling."
        : humanizeAuthError(error);
      setAuthError(message);
      pushToast(message, "error");
    } finally {
      setSyncing(false);
    }
  }, [profile]);

  const deleteDesignTask = useCallback(async (projectId, taskId) => {
    const task = designTaskDocs.find((item) => item.id === taskId);
    if (!task) return;
    const ok = await confirm(`"${task.title}" TZ o'chirilsinmi?`);
    if (!ok) return;
    const relatedProject = projectDocsRef.current.find((project) => project.id === projectId);
    const previousProjectTasks = designTaskDocsRef.current.filter((item) => item.projectId === projectId);
    const nextProjectTasks = previousProjectTasks.filter((item) => item.id !== taskId);
    const previousContribution = summarizeDesignTaskMetrics(previousProjectTasks);
    const nextContribution = summarizeDesignTaskMetrics(nextProjectTasks);
    const previousProjectMetrics = relatedProject?.metrics || {};
    const metricsPatch = applyMetricsDelta(previousProjectMetrics, previousContribution, nextContribution);
    startTransition(() => {
      setDesignTaskDocs((current) => current.filter((item) => item.id !== taskId));
      setProjectDocs((current) => current.map((project) => (
        project.id === projectId
          ? { ...project, metrics: metricsPatch, updatedAt: isoNow(), updatedBy: profile?.uid || "" }
          : project
      )));
      setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: metricsPatch }));
    });
    setSyncing(true);
    try {
      await commitBatchOperations([
        { type: "delete", ref: doc(db, "projects", projectId, "designTasks", taskId) },
        {
          type: "set",
          ref: doc(db, "projects", projectId),
          data: {
            metrics: metricsPatch,
            updatedAt: isoNow(),
            updatedBy: profile?.uid || "",
          },
          options: { merge: true },
        },
      ]);
      pushToast("TZ o'chirildi");
    } catch (error) {
      startTransition(() => {
        setDesignTaskDocs((current) => [...current, task]);
        setProjectDocs((current) => current.map((project) => (
          project.id === projectId
            ? { ...project, metrics: previousProjectMetrics }
            : project
        )));
        setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: previousProjectMetrics }));
      });
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }, [profile, designTaskDocs, confirm]);

  // ─── Target task CRUD ────────────────────────────────────────────────────
  const saveTargetTask = useCallback(async (projectId, task) => {
    if (!projectId || !db) return;
    const relatedProject = projectDocsRef.current.find((project) => project.id === projectId);
    if (!canWorkInProject(profile, relatedProject)) return;
    const previousTask = targetTaskDocsRef.current.find((item) => item.id === task.id && item.projectId === projectId) || null;
    const previousProjectTasks = targetTaskDocsRef.current.filter((item) => item.projectId === projectId);
    const next = withRecordMeta(
      task.id ? task : { ...task, id: makeId("target") },
      profile
    );
    const metaDocs = canEdit(profile?.role)
      ? createMetaDocs({
        notifyText: `Target task: ${next.title}`,
        auditText: `Target task saqlandi: ${next.title}`,
        page: "target",
      }, profile)
      : [];
    const nextProjectTasks = [
      ...previousProjectTasks.filter((item) => item.id !== next.id),
      { ...next, projectId },
    ];
    const previousContribution = summarizeTargetTaskMetrics(previousProjectTasks);
    const nextContribution = summarizeTargetTaskMetrics(nextProjectTasks);
    const previousProjectMetrics = relatedProject?.metrics || {};
    const metricsPatch = applyMetricsDelta(previousProjectMetrics, previousContribution, nextContribution);
    startTransition(() => {
      setTargetTaskDocs((current) => {
        const filtered = current.filter((item) => !(item.id === next.id && item.projectId === projectId));
        return [...filtered, { ...next, projectId }];
      });
      setProjectDocs((current) => current.map((project) => (
        project.id === projectId
          ? { ...project, metrics: metricsPatch, updatedAt: next.updatedAt, updatedBy: next.updatedBy }
          : project
      )));
      setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: metricsPatch }));
      applyOptimisticMetaDocs(metaDocs);
    });
    setSyncing(true);
    try {
      await commitBatchOperations([
        {
          type: "set",
          ref: doc(db, "projects", projectId, "targetTasks", next.id),
          data: next,
          options: { merge: true },
        },
        {
          type: "set",
          ref: doc(db, "projects", projectId),
          data: {
            metrics: metricsPatch,
            updatedAt: next.updatedAt,
            updatedBy: next.updatedBy,
          },
          options: { merge: true },
        },
        ...metaDocs.map((item) => ({
          type: "set",
          ref: doc(db, item.collection, item.id),
          data: item.data,
          options: { merge: false },
        })),
      ]);
      pushToast(`Target task saqlandi: ${next.title}`);
    } catch (error) {
      startTransition(() => {
        setTargetTaskDocs((current) => {
          const filtered = current.filter((item) => !(item.id === next.id && item.projectId === projectId));
          return previousTask ? [...filtered, previousTask] : filtered;
        });
        setProjectDocs((current) => current.map((project) => (
          project.id === projectId
            ? { ...project, metrics: previousProjectMetrics }
            : project
        )));
        setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: previousProjectMetrics }));
      });
      const message = String(error?.code || "").includes("permission-denied")
        ? "Target task saqlanmadi. Firebase Firestore Rules ichida targetTasks qoidalarini publish qiling."
        : humanizeAuthError(error);
      setAuthError(message);
      pushToast(message, "error");
    } finally {
      setSyncing(false);
    }
  }, [profile]);

  const deleteTargetTask = useCallback(async (projectId, taskId) => {
    const task = targetTaskDocs.find((item) => item.id === taskId);
    if (!task) return;
    const ok = await confirm(`"${task.title}" target task o'chirilsinmi?`);
    if (!ok) return;
    const relatedProject = projectDocsRef.current.find((project) => project.id === projectId);
    const previousProjectTasks = targetTaskDocsRef.current.filter((item) => item.projectId === projectId);
    const nextProjectTasks = previousProjectTasks.filter((item) => item.id !== taskId);
    const previousContribution = summarizeTargetTaskMetrics(previousProjectTasks);
    const nextContribution = summarizeTargetTaskMetrics(nextProjectTasks);
    const previousProjectMetrics = relatedProject?.metrics || {};
    const metricsPatch = applyMetricsDelta(previousProjectMetrics, previousContribution, nextContribution);
    startTransition(() => {
      setTargetTaskDocs((current) => current.filter((item) => item.id !== taskId));
      setProjectDocs((current) => current.map((project) => (
        project.id === projectId
          ? { ...project, metrics: metricsPatch, updatedAt: isoNow(), updatedBy: profile?.uid || "" }
          : project
      )));
      setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: metricsPatch }));
    });
    setSyncing(true);
    try {
      await commitBatchOperations([
        { type: "delete", ref: doc(db, "projects", projectId, "targetTasks", taskId) },
        {
          type: "set",
          ref: doc(db, "projects", projectId),
          data: {
            metrics: metricsPatch,
            updatedAt: isoNow(),
            updatedBy: profile?.uid || "",
          },
          options: { merge: true },
        },
      ]);
      pushToast("Target task o'chirildi");
    } catch (error) {
      startTransition(() => {
        setTargetTaskDocs((current) => [...current, task]);
        setProjectDocs((current) => current.map((project) => (
          project.id === projectId
            ? { ...project, metrics: previousProjectMetrics }
            : project
        )));
        setLiveWorkspaceMetricsByProjectId((current) => ({ ...current, [projectId]: previousProjectMetrics }));
      });
      setAuthError(humanizeAuthError(error));
      pushToast(humanizeAuthError(error), "error");
    } finally {
      setSyncing(false);
    }
  }, [targetTaskDocs, confirm, profile]);

  // ─── Render guard ──────────────────────────────────────────────────────────
  if (!hasFirebaseConfig) return <SetupScreen />;
  if (booting) return <LoadingScreen label="CRM yuklanmoqda..." />;
  if (!profile) return (<><GlobalStyles /><AuthScreen busy={authBusy} error={authError} onEmailLogin={handleEmailLogin} onGoogleRegister={handleGoogleRegister} onGoogleLogin={handleGoogleLogin} /></>);

  return (
    <>
      <GlobalStyles />
      {confirmDialog}
      <div style={{ display: "flex", minHeight: "100vh", background: T.colors.bg, color: T.colors.text, fontFamily: T.font }}>
        <Sidebar profile={profile} page={page} onNavigate={navigate} onLogout={handleLogout} />
        <main style={{ flex: 1, overflow: "auto", padding: "32px 36px", maxWidth: "calc(100% - 220px)" }}>
          {authError && !authError.includes("ruxsat") && !authError.includes("permission") ? (
            <div style={{ marginBottom: 14, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: T.radius.lg, fontSize: 13, fontWeight: 600 }}>{authError}</div>
          ) : null}
          {syncing ? (
            <div style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 8, background: T.colors.accentSoft, color: T.colors.accent, padding: "6px 10px", borderRadius: T.radius.full, fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.colors.accent, animation: "syncPulse 1s ease-in-out infinite" }} />Saqlanmoqda
            </div>
          ) : null}

          {page === "dashboard"     && <DashboardPage profile={profile} projects={projects} employees={employees} employeeMetricsById={projectCaches.employeeMetricsById} progressByProjectId={projectProgressByProjectId} dashboardSummary={dashboardSummary} loading={primaryLoading} onOpenProject={id => { setSelectedProjectId(id); setPage("projects"); }} />}
          {page === "projects"      && <ProjectsPage profile={profile} projects={projects} employees={employees} selectedProjectId={selectedProjectId} selectedProject={selectedProject} projectReady={projectWorkspaceReady} onSelectProject={setSelectedProjectId} onBackToList={() => setSelectedProjectId("")} onCreateProject={createProject} onSaveProject={saveProject} onDeleteProject={deleteProject} loading={primaryLoading} progressByProjectId={projectProgressByProjectId} designProgressByProjectId={projectCaches.designProgressByProjectId} designTaskCountByProjectId={projectCaches.designTaskCountByProjectId} taskMetricsByProjectId={liveWorkspaceMetricsByProjectId} />}
          {page === "team"          && <TeamPage profile={profile} employees={employees} projects={projects} employeeMetricsById={projectCaches.employeeMetricsById} assignmentsByEmployeeId={projectCaches.assignmentsByEmployeeId} onSaveEmployee={saveEmployee} onCreateEmployee={createEmployee} onDeleteEmployee={deleteEmployee} loading={teamLoading} />}
          {page === "shooting"      && <ShootingPage profile={profile} shoots={shoots} projects={projects} employees={employees} onSaveShoot={saveShoot} onDeleteShoot={deleteShoot} />}
          {page === "montaj"        && <MontajPage profile={profile} projects={projects} employees={employees} employeeMetricsById={projectCaches.employeeMetricsById} onSaveVideoTask={saveProject} />}
          {page === "design"        && (
            <DesignPage
              profile={profile}
              projects={projects}
              employees={employees}
              designTaskDocs={designTaskDocs}
              onSaveDesignTask={saveDesignTask}
              onDeleteDesignTask={deleteDesignTask}
            />
          )}
          {page === "target"        && (
            <TargetPage
              profile={profile}
              projects={projects}
              employees={employees}
              targetTaskDocs={targetTaskDocs}
              onSaveTargetTask={saveTargetTask}
              onDeleteTargetTask={deleteTargetTask}
            />
          )}
          {page === "finance" && canViewFinancialDashboard(profile.role) && <FinancePage projects={projects} employees={employees} />}
          {page === "workflow"      && <WorkflowPage />}
        </main>
        <ToastStack toasts={toasts} />
      </div>
    </>
  );
}

export default function App() {
  return <AppErrorBoundary><AppShell /></AppErrorBoundary>;
}
