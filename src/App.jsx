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
  EMPTY_PROJECT_WORKSPACE, CRM_CACHE_KEY, LIMITS,
} from "./core/constants.js";
import {
  makeId, isoNow, toMoney, clamp, sortByRecent, indexById,
  readCache, writeCache, projectWorkspaceCacheKey,
  flattenPlans, splitPlans, calcProjectProgress, buildProjectCaches,
  healthScore, unreadNotifications, humanizeAuthError,
} from "./core/utils.js";
import {
  canEdit, canManagePeople, canWorkInProject,
  canManageProjectMeta, visibleProjects, visibleShoots, visibleEmployees,
  projectMembers, isProjectMember, canViewFinancialDashboard,
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
import { MeetingsPage }      from "./pages/MeetingsPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";
import { FinancePage }       from "./pages/FinancePage.jsx";
import { MontajPage }        from "./pages/MontajPage.jsx";
import { WorkflowPage }      from "./pages/WorkflowPage.jsx";
// ─── Firestore collection refs (ARCH-02 FIX: module-level, not per-render) ────
// These are stable references — created once when module loads.
const COLS = db ? {
  projects:      collection(db, "projects"),
  users:         collection(db, "users"),
  userPrivate:   collection(db, "userPrivate"),
  shoots:        collection(db, "shoots"),
  meetings:      collection(db, "meetings"),
  notifications: collection(db, "notifications"),
  auditLogs:     collection(db, "auditLogs"),
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ profile, page, onNavigate, onLogout, unreadCount }) {
  const items = [
    { id: "dashboard",     label: "Dashboard",        icon: "◈" },
    { id: "projects",      label: "Loyihalar",         icon: "◫" },
    { id: "team",          label: "Xodimlar",          icon: "◉" },
    { id: "shooting",      label: "Syomka",            icon: "◎" },
    { id: "montaj",        label: "Montaj bo'limi",    icon: "✂" },
    { id: "meetings",      label: "Uchrashuvlar",      icon: "◷" },
    { id: "notifications", label: "Bildirishnomalar",  icon: "◌", badge: unreadCount },
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
          const blink = item.id === "notifications" && Number(item.badge || 0) > 0;
          return (
            <button key={item.id} type="button" onClick={() => onNavigate(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", borderRadius: T.radius.md, padding: "9px 12px", cursor: "pointer", background: active ? T.colors.accent : "transparent", color: active ? "#fff" : T.colors.textSecondary, fontWeight: 600, fontSize: 13.5, fontFamily: T.font, position: "relative", textAlign: "left" }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span style={{ marginLeft: "auto", minWidth: 22, height: 22, borderRadius: T.radius.full, background: active ? "#ffffff" : T.colors.red, color: active ? T.colors.red : "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, animation: blink ? "sidebarPulse 1.2s infinite" : "none" }}>{item.badge}</span> : null}
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
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f5f5f7 0%,#e8f0fe 100%)", fontFamily: T.font, color: T.colors.text }}>
      <Card style={{ textAlign: "center", maxWidth: 380, padding: 30 }}>
        <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 120deg,rgba(0,113,227,.08),rgba(0,113,227,.92),rgba(90,200,250,.16),rgba(0,113,227,.08))", animation: "appleSpin 1.15s cubic-bezier(.55,.08,.48,.95) infinite" }} />
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "#fff" }} />
        </div>
        <div style={{ marginTop: 18, fontWeight: 800 }}>{label}</div>
        <div style={{ marginTop: 6, color: T.colors.textSecondary, fontSize: 13 }}>Realtime CRM ma'lumotlari tayyorlanmoqda.</div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 6 }}>
          {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.colors.accent, opacity: 0.2 + i * 0.2, animation: `loaderBounce 1.2s ease-in-out ${i*0.12}s infinite` }} />)}
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
  const initMeetings   = Array.isArray(cachedCrm.meetings)      ? cachedCrm.meetings.map(i => normalizeStoredRecord(i.id, i))      : [];
  const initNotifs     = Array.isArray(cachedCrm.notifications) ? cachedCrm.notifications.map(i => normalizeStoredRecord(i.id, i)) : [];
  const initAudit      = Array.isArray(cachedCrm.auditLog)      ? cachedCrm.auditLog.map(i => normalizeStoredRecord(i.id, i))      : [];

  // ── State ────────────────────────────────────────────────────────────────
  const [profile,             setProfile]             = useState(null);
  const [projectDocs,         setProjectDocs]         = useState(initProjects);
  const [publicUsers,         setPublicUsers]         = useState(initPublicUsers);
  const [privateUsers,        setPrivateUsers]        = useState(initPrivate);
  const [shootDocs,           setShootDocs]           = useState(initShoots);
  const [meetingDocs,         setMeetingDocs]         = useState(initMeetings);
  const [notificationDocs,    setNotificationDocs]    = useState(initNotifs);
  const [auditDocs,           setAuditDocs]           = useState(initAudit);
  const [selectedProjectWorkspace, setSelectedProjectWorkspace] = useState(EMPTY_PROJECT_WORKSPACE);
  const [page,               setPage]               = useState("dashboard");
  const [selectedProjectId,  setSelectedProjectId]  = useState("");
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
  const selectedProjectRef     = useRef(null);
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
  const projectCaches= useMemo(() => buildProjectCaches(projects), [projects]);
  const unreadCount  = useMemo(() => profile ? unreadNotifications(notificationDocs, profile.uid) : 0, [notificationDocs, profile]);
  const financialDashboard = useMemo(() => buildFinancialDashboard({
    projects,
    employees,
    employeeMetricsById: projectCaches.employeeMetricsById,
  }), [projects, employees, projectCaches.employeeMetricsById]);

  // ── Ref sync ──────────────────────────────────────────────────────────────
  useEffect(() => { projectDocsRef.current  = projectDocs; },  [projectDocs]);
  useEffect(() => { publicUsersRef.current  = publicUsers; },  [publicUsers]);
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);

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
  function applyOptimisticMetaDocs(metaDocs) {
    const notifs  = metaDocs.filter(i => i.collection === "notifications");
    const audits  = metaDocs.filter(i => i.collection === "auditLogs");
    startTransition(() => {
      if (notifs.length)  setNotificationDocs(cur => [...notifs.map(i => normalizeStoredRecord(i.id, i.data)), ...cur].slice(0, 120));
      if (audits.length)  setAuditDocs(cur => [...audits.map(i => normalizeStoredRecord(i.id, i.data)), ...cur].slice(0, 180));
    });
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
          setShootDocs([]); setMeetingDocs([]); setNotificationDocs([]);
          setAuditDocs([]);
          setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
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
        await setDoc(userRef, nextUserDoc, { merge: true });

        const privateSnap = canManagePeople(roleCode) ? await getDoc(privateRef) : null;
        pendingRegistrationRef.current = null;
        setProfile({ uid: firebaseUser.uid, email: nextUserDoc.email, name: nextUserDoc.name, avatarUrl: nextUserDoc.avatarUrl || "", role: roleCode, dept: nextUserDoc.dept, title: nextUserDoc.title, salary: Number(privateSnap?.data()?.salary || 0), kpiBase: Number(privateSnap?.data()?.kpiBase || 80), load: Number(privateSnap?.data()?.load || 0), createdAt: nextUserDoc.createdAt });
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
      startTransition(() => { setPublicUsers(next); setPublicUsersReady(true); });
    }, error => { console.error("[CRM] users:", error?.code); setPublicUsersReady(true); });
  }, [profile?.uid]);

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

  // ── Meetings (page-gated) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !COLS.meetings || page !== "meetings") return;
    return onSnapshot(COLS.meetings, snap => {
      startTransition(() => setMeetingDocs(sortByRecent(snap.docs.map(e => normalizeStoredRecord(e.id, e.data())), "date")));
    }, e => console.error("[CRM] meetings:", e?.code));
  }, [profile?.uid, page]);

  // ── Notifications (always-on for badge) ───────────────────────────────────
  useEffect(() => {
    if (!profile || !COLS.notifications) return;
    const cached = Array.isArray(initialCacheRef.current.notifications) ? initialCacheRef.current.notifications : [];
    if (cached.length) startTransition(() => setNotificationDocs(cached.map(i => normalizeStoredRecord(i.id, i))));
    return onSnapshot(COLS.notifications, snap => {
      startTransition(() => setNotificationDocs(sortByRecent(snap.docs.map(e => normalizeStoredRecord(e.id, e.data())), "createdAt").slice(0, 120)));
    }, () => {});
  }, [profile?.uid]);

  // ── Audit logs (page-gated) ───────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !COLS.auditLogs || page !== "notifications") return;
    return onSnapshot(COLS.auditLogs, snap => {
      startTransition(() => setAuditDocs(sortByRecent(snap.docs.map(e => normalizeStoredRecord(e.id, e.data())), "createdAt").slice(0, 180)));
    }, () => {});
  }, [profile?.uid, page]);

  // ── Project workspace subscription ────────────────────────────────────────
  useEffect(() => {
    if (!profile || !selectedProjectId || !db) {
      setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
      setProjectWorkspaceReady(true);
      return;
    }
    const cached = readCache(projectWorkspaceCacheKey(selectedProjectId), null);
    if (cached) {
      setSelectedProjectWorkspace({ tasks: cached.tasks || [], contentPlan: cached.contentPlan || [], mediaPlan: cached.mediaPlan || [], plans: cached.plans || { daily: [], weekly: [], monthly: [] }, calls: cached.calls || [] });
      setProjectWorkspaceReady(true);
    } else {
      setSelectedProjectWorkspace(EMPTY_PROJECT_WORKSPACE);
      setProjectWorkspaceReady(false);
    }

    const projectRef = doc(db, "projects", selectedProjectId);
    const pending = { tasks: null, contentPlan: null, mediaPlan: null, plans: null, calls: null };
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
        if (pending.plans       !== null) patch.plans       = pending.plans;
        if (pending.calls       !== null) patch.calls       = pending.calls;
        startTransition(() => {
          setSelectedProjectWorkspace(cur => { const next = { ...cur, ...patch }; writeCache(projectWorkspaceCacheKey(pid), next); return next; });
          if (["tasks","contentPlan","mediaPlan","plans","calls"].every(k => loaded.has(k))) setProjectWorkspaceReady(true);
        });
      }, 0);
    }

    function commit(key, patch) { Object.assign(pending, patch); loaded.add(key); scheduleFlush(); }
    function onErr(e) { console.error("[CRM] workspace:", e?.code); setProjectWorkspaceReady(true); }

    const unsubs = [
      onSnapshot(collection(projectRef, "tasks"),      s => { commit("tasks",       { tasks:       sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "content"),    s => { commit("contentPlan", { contentPlan: sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "mediaPlans"), s => { commit("mediaPlan",   { mediaPlan:   sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
      onSnapshot(collection(projectRef, "plans"),      s => { commit("plans",       { plans:       splitPlans(sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse()) }); }, onErr),
      onSnapshot(collection(projectRef, "calls"),      s => { commit("calls",       { calls:       sortByRecent(s.docs.map(e => normalizeStoredRecord(e.id, e.data())), "updatedAt").reverse() }); }, onErr),
    ];
    return () => unsubs.forEach(u => u());
  }, [profile?.uid, selectedProjectId]);

  // ── Boot settled safety net (PERF-05 FIX: 3s instead of 2s) ─────────────
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => {
      setProjectsReady(true); setPublicUsersReady(true);
      setPrivateUsersReady(true);
      setProjectWorkspaceReady(true); setBootSettled(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [profile?.uid]);

  useEffect(() => {
    if (projectsReady || publicUsersReady) setBootSettled(true);
  }, [projectsReady, publicUsersReady]);

  // ── Cache write debounce ──────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => writeCache(CRM_CACHE_KEY, { projects: projectDocs, users: publicUsers, userPrivate: privateUsers, shoots: shootDocs, meetings: meetingDocs, notifications: notificationDocs, auditLog: auditDocs }), 400);
    return () => clearTimeout(t);
  }, [profile?.uid, projectDocs, publicUsers, privateUsers, shootDocs, meetingDocs, notificationDocs, auditDocs]);

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
    if (nextPage === "notifications") markAllNotificationsRead();
  }, []);

  // ─── Helpers shared across actions ────────────────────────────────────────
  function nextProjectListAfterSave(projectMetaDoc, projectId, mode = "upsert") {
    const next = mode === "delete"
      ? projectDocsRef.current.filter(i => i.id !== projectId)
      : sortByRecent([...projectDocsRef.current.filter(i => i.id !== projectId), normalizeStoredProjectMeta(projectId, projectMetaDoc)], "updatedAt");
    return next.filter(p => !p.archived);
  }

  // ─── Action: Mark all notifications read ──────────────────────────────────
  const markAllNotificationsRead = useCallback(async () => {  // ARCH-03 FIX
    if (!profile || !COLS.notifications) return;
    const unread = notificationDocs.filter(n => !n.readBy?.[profile.uid]).slice(0, 50);
    if (!unread.length) return;
    startTransition(() => setNotificationDocs(cur => cur.map(n => unread.some(u => u.id === n.id) ? { ...n, readBy: { ...(n.readBy || {}), [profile.uid]: true } } : n)));
    try {
      await commitBatchOperations(unread.map(n => ({ type: "set", ref: doc(db, "notifications", n.id), data: { readBy: { ...(n.readBy || {}), [profile.uid]: true } }, options: { merge: true } })));
    } catch (e) { setAuthError(humanizeAuthError(e)); }
  }, [profile, notificationDocs]);

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
    const nextProjects= nextProjectListAfterSave(metaDoc, next.id);
    const affected    = new Set([currentMeta?.managerId, ...(currentMeta?.teamIds || []), next.managerId, ...next.teamIds].filter(Boolean));
    const metaDocs    = canEdit(profile.role) ? createMetaDocs(meta, profile) : [];
    const ops = [
      ...(canWriteMeta ? [{ type: "set", ref: projectRef, data: metaDoc, options: { merge: true } }] : []),
      ...metaDocs.map(i => ({ type: "set", ref: doc(db, i.collection, i.id), data: i.data, options: { merge: false } })),
      ...(canWriteMeta ? buildAssignedProjectIdOps(nextProjects, affected, publicUsersRef.current) : []),
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
      if (selectedProjectId === next.id) setSelectedProjectWorkspace({ tasks: next.tasks, contentPlan: next.contentPlan, mediaPlan: next.mediaPlan, plans: next.plans, calls: next.calls });
      applyOptimisticMetaDocs(metaDocs);
    });

    if (!meta.silent) setSyncing(true);
    try {
      await commitBatchOperations(ops);
      if (meta.toastText || meta.notifyText) pushToast(meta.toastText || meta.notifyText);
    } catch (e) {
      if (String(e?.code || "").includes("permission-denied")) {
        const cachedWs = readCache(projectWorkspaceCacheKey(next.id), null);
        if (cachedWs && selectedProjectId === next.id) startTransition(() => setSelectedProjectWorkspace({ tasks: cachedWs.tasks || [], contentPlan: cachedWs.contentPlan || [], mediaPlan: cachedWs.mediaPlan || [], plans: cachedWs.plans || { daily: [], weekly: [], monthly: [] }, calls: cachedWs.calls || [] }));
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
    const metaDocs = createMetaDocs({ notifyText: "Syomka yozuvi yangilandi", auditText: `Syomka saqlandi: ${next.type}`, page: "shooting" }, profile);
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
    const metaDocs = createMetaDocs({ notifyText: "Syomka yozuvi o'chirildi", auditText: "Syomka yozuvi o'chirildi", page: "shooting" }, profile);
    startTransition(() => { setShootDocs(cur => cur.filter(s => s.id !== id)); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations([{ type: "delete", ref: doc(db, "shoots", id) }, ...metaDocs.map(e => ({ type: "set", ref: doc(db, e.collection, e.id), data: e.data, options: { merge: false } }))]); pushToast("Syomka yozuvi o'chirildi"); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile, shootDocs, confirm]);

  // ─── Meeting CRUD ──────────────────────────────────────────────────────────
  const addMeeting = useCallback(async (item) => {
    if (!canEdit(profile?.role) || !item.client.trim() || !db) return;
    const meeting = { ...item, id: makeId("meeting"), createdAt: isoNow(), updatedAt: isoNow(), createdBy: profile.uid, updatedBy: profile.uid };
    const metaDocs= createMetaDocs({ notifyText: "Meeting yozuvi qo'shildi", auditText: `Meeting saqlandi: ${item.client}`, page: "meetings" }, profile);
    startTransition(() => { setMeetingDocs(cur => [meeting, ...cur]); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations([{ type: "set", ref: doc(db, "meetings", meeting.id), data: meeting, options: { merge: false } }, ...metaDocs.map(e => ({ type: "set", ref: doc(db, e.collection, e.id), data: e.data, options: { merge: false } }))]); pushToast("Meeting yozuvi qo'shildi"); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile]);

  const deleteMeeting = useCallback(async (id) => {
    if (!canEdit(profile?.role)) return;
    const ok = await confirm("Meeting yozuvi o'chirilsinmi?");
    if (!ok) return;
    const metaDocs = createMetaDocs({ notifyText: "Meeting yozuvi o'chirildi", auditText: "Meeting yozuvi o'chirildi", page: "meetings" }, profile);
    startTransition(() => { setMeetingDocs(cur => cur.filter(m => m.id !== id)); applyOptimisticMetaDocs(metaDocs); });
    setSyncing(true);
    try { await commitBatchOperations([{ type: "delete", ref: doc(db, "meetings", id) }, ...metaDocs.map(e => ({ type: "set", ref: doc(db, e.collection, e.id), data: e.data, options: { merge: false } }))]); pushToast("Meeting yozuvi o'chirildi"); }
    catch (e) { setAuthError(humanizeAuthError(e)); pushToast(humanizeAuthError(e), "error"); }
    finally { setSyncing(false); }
  }, [profile, confirm]);

  // ─── Render guard ──────────────────────────────────────────────────────────
  if (!hasFirebaseConfig) return <SetupScreen />;
  if (booting) return <LoadingScreen label="CRM yuklanmoqda..." />;
  if (!profile) return (<><GlobalStyles /><AuthScreen busy={authBusy} error={authError} onEmailLogin={handleEmailLogin} onGoogleRegister={handleGoogleRegister} onGoogleLogin={handleGoogleLogin} /></>);

  return (
    <>
      <GlobalStyles />
      {confirmDialog}
      <div style={{ display: "flex", minHeight: "100vh", background: T.colors.bg, color: T.colors.text, fontFamily: T.font }}>
        <Sidebar profile={profile} page={page} onNavigate={navigate} onLogout={handleLogout} unreadCount={unreadCount} />
        <main style={{ flex: 1, overflow: "auto", padding: "32px 36px", maxWidth: "calc(100% - 220px)" }}>
          {authError && !authError.includes("ruxsat") && !authError.includes("permission") ? (
            <div style={{ marginBottom: 14, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: T.radius.lg, fontSize: 13, fontWeight: 600 }}>{authError}</div>
          ) : null}
          {syncing ? (
            <div style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 8, background: T.colors.accentSoft, color: T.colors.accent, padding: "6px 10px", borderRadius: T.radius.full, fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.colors.accent, animation: "syncPulse 1s ease-in-out infinite" }} />Saqlanmoqda
            </div>
          ) : null}

          {page === "dashboard"     && <DashboardPage profile={profile} projects={projects} employees={employees} employeeMetricsById={projectCaches.employeeMetricsById} progressByProjectId={projectCaches.progressByProjectId} dashboardSummary={projectCaches.dashboardSummary} loading={primaryLoading} onOpenProject={id => { setSelectedProjectId(id); setPage("projects"); }} />}
          {page === "projects"      && <ProjectsPage profile={profile} projects={projects} employees={employees} selectedProjectId={selectedProjectId} selectedProject={selectedProject} projectReady={projectWorkspaceReady} onSelectProject={setSelectedProjectId} onBackToList={() => setSelectedProjectId("")} onCreateProject={createProject} onSaveProject={saveProject} onDeleteProject={deleteProject} loading={primaryLoading} progressByProjectId={projectCaches.progressByProjectId} />}
          {page === "team"          && <TeamPage profile={profile} employees={employees} projects={projects} employeeMetricsById={projectCaches.employeeMetricsById} assignmentsByEmployeeId={projectCaches.assignmentsByEmployeeId} onSaveEmployee={saveEmployee} onCreateEmployee={createEmployee} onDeleteEmployee={deleteEmployee} loading={teamLoading} />}
          {page === "shooting"      && <ShootingPage profile={profile} shoots={shoots} projects={projects} employees={employees} onSaveShoot={saveShoot} onDeleteShoot={deleteShoot} />}
          {page === "montaj"        && <MontajPage profile={profile} projects={projects} employees={employees} employeeMetricsById={projectCaches.employeeMetricsById} onSaveVideoTask={saveProject} />}
          {page === "meetings"      && <MeetingsPage profile={profile} meetings={meetingDocs} employees={employees} onAddMeeting={addMeeting} onDeleteMeeting={deleteMeeting} />}
          {page === "notifications" && <NotificationsPage notifications={notificationDocs} profile={profile} onMarkAllRead={markAllNotificationsRead} />}
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
