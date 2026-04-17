import { CRM_CACHE_KEY, SCHEMA_VERSION, VIDEO_FORMATS } from "./constants.js";

// ─── ID / Time ────────────────────────────────────────────────────────────────
export function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// PERF-FIX: isoNow() to'g'ri UTC timestamp qaytaradi
// DATA-02 NOTE: subcollectionlarda serverTimestamp() ishlatiladi
export function isoNow()  { return new Date().toISOString(); }
export function todayIso(){ return new Date().toISOString().slice(0, 10); }
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─── Formatting ───────────────────────────────────────────────────────────────
export function toMoney(value) { return Number(value || 0).toLocaleString("uz-UZ"); }

export function initials(name = "?") {
  return name.split(" ").map(p => p[0] || "").join("").slice(0, 2).toUpperCase();
}

export function pageLabel(page) {
  return {
    dashboard: "Dashboard", projects: "Loyihalar", team: "Xodimlar",
    shooting: "Syomka", montaj: "Montaj bo'limi", design: "Grafik dizayn",
    workflow: "Workflow", finance: "Moliyaviy dashboard",
  }[page] || "CRM";
}

// ─── Cache (localStorage wrapper) ────────────────────────────────────────────
export function readCache(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function writeCache(key, value) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function projectWorkspaceCacheKey(projectId) {
  return `${CRM_CACHE_KEY}:project:${projectId}`;
}

// ─── Array / Object Helpers ───────────────────────────────────────────────────
export function indexById(items) {
  return Object.fromEntries((items || []).filter(Boolean).map(item => [item.id, item]));
}

export function sortByRecent(items, field = "createdAt") {
  return [...items].sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")));
}

// PERF-03 FIX: JSON.stringify o'rniga tez shallow compare
export function recordsEqual(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  const lKeys = Object.keys(left);
  const rKeys = Object.keys(right);
  if (lKeys.length !== rKeys.length) return false;
  for (const k of lKeys) {
    const lv = left[k], rv = right[k];
    if (typeof lv === "object" && lv !== null) {
      // shallow JSON compare faqat nested uchun, lekin top-level fast path
      if (JSON.stringify(lv) !== JSON.stringify(rv)) return false;
    } else if (lv !== rv) return false;
  }
  return true;
}

export function fieldValue(eventOrValue) {
  if (eventOrValue && eventOrValue.target) {
    if (eventOrValue.target.type === "checkbox") return eventOrValue.target.checked;
    return eventOrValue.target.value;
  }
  return eventOrValue;
}

// ─── Plan helpers ─────────────────────────────────────────────────────────────
export function flattenPlans(plans = {}) {
  return [
    ...(Array.isArray(plans.daily)   ? plans.daily.map(i  => ({ ...i, planType: "daily" }))   : []),
    ...(Array.isArray(plans.weekly)  ? plans.weekly.map(i => ({ ...i, planType: "weekly" }))  : []),
    ...(Array.isArray(plans.monthly) ? plans.monthly.map(i=> ({ ...i, planType: "monthly" })) : []),
  ];
}

export function splitPlans(items = []) {
  return items.reduce(
    (acc, item) => { const t = item.planType || "daily"; acc[t].push(item); return acc; },
    { daily: [], weekly: [], monthly: [] }
  );
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export function isTaskDoneStatus(status) {
  return status === "Bajarildi" || status === "Tasdiqlandi";
}

export function isContentDoneStatus(status) {
  return status === "Tasdiqlandi" || status === "E'lon qilindi" || status === "Bajarildi";
}

export function isPlanDoneStatus(status) {
  return status === "Bajarildi" || status === "Tasdiqlandi";
}

export function isCallDoneStatus(status) {
  return status === "Tasdiqlangan" || status === "Tugallangan" || status === "Bajarildi";
}

export function isDesignDoneStatus(status) {
  return status === "Yakunlandi" || status === "Tasdiqlandi";
}

export function isTargetDoneStatus(status) {
  return status === "Bajarildi" || status === "Tasdiqlandi";
}

export function calculateProjectAggregate(project) {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
  const contentPlan = Array.isArray(project?.contentPlan) ? project.contentPlan : [];
  const mediaPlan = Array.isArray(project?.mediaPlan) ? project.mediaPlan : [];
  const designTasks = Array.isArray(project?.designTasks) ? project.designTasks : [];
  const targetTasks = Array.isArray(project?.targetTasks) ? project.targetTasks : [];
  const planItems = [
    ...(Array.isArray(project?.plans?.daily) ? project.plans.daily : []),
    ...(Array.isArray(project?.plans?.weekly) ? project.plans.weekly : []),
    ...(Array.isArray(project?.plans?.monthly) ? project.plans.monthly : []),
  ];
  const calls = Array.isArray(project?.calls) ? project.calls : [];
  const today = todayIso();

  const completedTasks =
    tasks.filter((task) => isTaskDoneStatus(task.status)).length +
    contentPlan.filter((item) => isContentDoneStatus(item.status)).length +
    mediaPlan.filter((item) => isContentDoneStatus(item.status)).length +
    planItems.filter((item) => isPlanDoneStatus(item.status)).length +
    calls.filter((item) => isCallDoneStatus(item.status)).length +
    designTasks.filter((item) => isDesignDoneStatus(item.status)).length +
    targetTasks.filter((item) => isTargetDoneStatus(item.status)).length;

  const approvedTasks =
    tasks.filter((task) => task.status === "Tasdiqlandi").length +
    contentPlan.filter((item) => item.status === "Tasdiqlandi").length +
    mediaPlan.filter((item) => item.status === "Tasdiqlandi").length +
    planItems.filter((item) => item.status === "Tasdiqlandi").length +
    calls.filter((item) => item.status === "Tasdiqlangan").length +
    designTasks.filter((item) => item.status === "Tasdiqlandi").length +
    targetTasks.filter((item) => item.status === "Tasdiqlandi").length;

  const activeTasks =
    tasks.filter((task) => task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda").length +
    contentPlan.filter((item) => item.status === "Jarayonda" || item.status === "Ko'rib chiqilmoqda").length +
    mediaPlan.filter((item) => item.status === "Jarayonda" || item.status === "Ko'rib chiqilmoqda").length +
    planItems.filter((item) => item.status === "Jarayonda").length +
    calls.filter((item) => item.status === "Jarayonda" || item.status === "Kutilmoqda").length +
    designTasks.filter((item) => item.status === "Yangi TZ" || item.status === "Jarayonda" || item.status === "Ko'rib chiqilmoqda").length +
    targetTasks.filter((item) => item.status === "Rejalashtirildi" || item.status === "Jarayonda" || item.status === "Ko'rib chiqilmoqda").length;

  const overdueTasks =
    tasks.filter((task) => task.deadline && task.deadline < today && !isTaskDoneStatus(task.status)).length +
    contentPlan.filter((item) => item.date && item.date < today && !isContentDoneStatus(item.status)).length +
    mediaPlan.filter((item) => item.date && item.date < today && !isContentDoneStatus(item.status)).length +
    planItems.filter((item) => item.date && item.date < today && !isPlanDoneStatus(item.status)).length +
    calls.filter((item) => item.date && item.date < today && !isCallDoneStatus(item.status)).length +
    designTasks.filter((item) => item.deadline && item.deadline < today && !isDesignDoneStatus(item.status)).length +
    targetTasks.filter((item) => item.deadline && item.deadline < today && !isTargetDoneStatus(item.status)).length;

  const pendingReviews =
    tasks.filter((task) => task.status === "Ko'rib chiqilmoqda").length +
    contentPlan.filter((item) => item.status === "Ko'rib chiqilmoqda").length +
    mediaPlan.filter((item) => item.status === "Ko'rib chiqilmoqda").length +
    designTasks.filter((item) => item.status === "Ko'rib chiqilmoqda").length +
    targetTasks.filter((item) => item.status === "Ko'rib chiqilmoqda").length;

  const totalTasks =
    tasks.length +
    contentPlan.length +
    mediaPlan.length +
    planItems.length +
    calls.length +
    designTasks.length +
    targetTasks.length;

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

export function summarizePortfolioMetrics(projects = []) {
  return (projects || []).reduce((acc, project) => {
    const hasWorkspaceItems =
      (Array.isArray(project?.tasks) && project.tasks.length) ||
      (Array.isArray(project?.contentPlan) && project.contentPlan.length) ||
      (Array.isArray(project?.mediaPlan) && project.mediaPlan.length) ||
      (Array.isArray(project?.designTasks) && project.designTasks.length) ||
      (Array.isArray(project?.targetTasks) && project.targetTasks.length) ||
      (Array.isArray(project?.calls) && project.calls.length) ||
      (Array.isArray(project?.plans?.daily) && project.plans.daily.length) ||
      (Array.isArray(project?.plans?.weekly) && project.plans.weekly.length) ||
      (Array.isArray(project?.plans?.monthly) && project.plans.monthly.length);
    const metrics = hasWorkspaceItems ? calculateProjectAggregate(project) : (project?.metrics || {});
    acc.totalTasks += Number(metrics.totalTasks || 0);
    acc.completedTasks += Number(metrics.completedTasks || 0);
    acc.approvedTasks += Number(metrics.approvedTasks || 0);
    acc.activeTasks += Number(metrics.activeTasks || 0);
    acc.overdueTasks += Number(metrics.overdueTasks || 0);
    acc.pendingReviews += Number(metrics.pendingReviews || 0);
    if (project?.status === "Jarayonda") acc.activeProjects += 1;
    return acc;
  }, {
    totalTasks: 0,
    completedTasks: 0,
    approvedTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    pendingReviews: 0,
    activeProjects: 0,
  });
}

export function calcProjectProgress(project) {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
  const contentPlan = Array.isArray(project?.contentPlan) ? project.contentPlan : [];
  const mediaPlan = Array.isArray(project?.mediaPlan) ? project.mediaPlan : [];
  const designTasks = Array.isArray(project?.designTasks) ? project.designTasks : [];
  const targetTasks = Array.isArray(project?.targetTasks) ? project.targetTasks : [];
  const planItems = [
    ...(Array.isArray(project?.plans?.daily) ? project.plans.daily : []),
    ...(Array.isArray(project?.plans?.weekly) ? project.plans.weekly : []),
    ...(Array.isArray(project?.plans?.monthly) ? project.plans.monthly : []),
  ];
  const calls = Array.isArray(project?.calls) ? project.calls : [];
  const hasWorkspaceItems = tasks.length || contentPlan.length || mediaPlan.length || planItems.length || calls.length || designTasks.length || targetTasks.length;
  if (Number.isFinite(project?.metrics?.progress) && !hasWorkspaceItems) {
    return Number(project.metrics.progress);
  }
  return calculateProjectAggregate(project).progress;
}

// PERF-04 FIX: O(employees × projects × tasks) → O(n) index lookup
export function buildEmployeeTaskIndex(projects) {
  const index = new Map();
  for (const project of projects) {
    for (const task of (project.tasks || [])) {
      if (!task.ownerId) continue;
      if (!index.has(task.ownerId)) index.set(task.ownerId, []);
      index.get(task.ownerId).push({ ...task, projectId: project.id });
    }
  }
  return index;
}

export function buildProjectCaches(projects, designTaskDocs = []) {
  const progressByProjectId = {};
  const designProgressByProjectId = {};
  const designTaskCountByProjectId = {};
  const employeeStats = new Map();
  const assignmentsByEmployeeId = new Map();
  let totalTasks = 0, completedTasks = 0;

  const ensureEmployee = id => {
    if (!id) return null;
    if (!employeeStats.has(id)) {
      employeeStats.set(id, {
        total: 0,
        completed: 0,
        approved: 0,
        active: 0,
        overdue: 0,
        projects: 0,
        videoDone: 0,
        videoRevision: 0,
        videoFirstApproval: 0,
        videoDeadlineMet: 0,
        videoActive: 0,
      });
    }
    return employeeStats.get(id);
  };

  const normalizeVideoStatus = (status) => {
    if (status === "Review") return "Ko'rib chiqilmoqda";
    if (status === "Revision") return "Qayta ishlash";
    if (status === "Tasdiqlandi") return "Bajarildi";
    return status;
  };

  // Single pass — PERF-04 fix
  for (const project of projects) {
    const progress = calcProjectProgress(project);
    progressByProjectId[project.id] = progress;

    const memberIds = new Set([project.managerId, ...project.teamIds].filter(Boolean));
    const chip = { id: project.id, name: project.name, status: project.status, progress };
    for (const id of memberIds) {
      const stats = ensureEmployee(id);
      if (!stats) continue;
      stats.projects++;
      if (!assignmentsByEmployeeId.has(id)) assignmentsByEmployeeId.set(id, []);
      assignmentsByEmployeeId.get(id).push(chip);
    }

    if (Array.isArray(project.tasks) && project.tasks.length) {
      for (const task of project.tasks) {
        totalTasks++;
        const stats = ensureEmployee(task.ownerId);
        if (task.status === "Bajarildi" || task.status === "Tasdiqlandi") { completedTasks++; if (stats) stats.completed++; }
        if (stats) {
          stats.total++;
          if (task.status === "Tasdiqlandi") stats.approved++;
          if (task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") stats.active++;
          if (task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi" && task.status !== "Tasdiqlandi") stats.overdue++;
          const isVideo = VIDEO_FORMATS.includes(task.format);
          if (isVideo) {
            const videoStatus = normalizeVideoStatus(task.status);
            if (videoStatus === "Bajarildi") {
              stats.videoDone = (stats.videoDone || 0) + 1;
              if ((task.revisionCount || 0) === 0) {
                stats.videoFirstApproval = (stats.videoFirstApproval || 0) + 1;
              }
              if (task.deadline && task.finishedAt && task.finishedAt <= task.deadline) {
                stats.videoDeadlineMet = (stats.videoDeadlineMet || 0) + 1;
              }
            }
            if (videoStatus === "Montajda") {
              stats.videoActive = (stats.videoActive || 0) + 1;
            }
            if ((task.revisionCount || 0) > 0) {
              stats.videoRevision = (stats.videoRevision || 0) + (task.revisionCount || 0);
            }
          }
        }
      }
    } else {
      totalTasks += Number(project.metrics?.totalTasks || 0);
      completedTasks += Number(project.metrics?.completedTasks || 0);
      for (const [id, ms] of Object.entries(project.memberStats || {})) {
        const stats = ensureEmployee(id);
        if (!stats) continue;
        stats.total += Number(ms.total || 0); stats.completed += Number(ms.completed || 0);
        stats.approved += Number(ms.approved || 0); stats.active += Number(ms.active || 0);
        stats.overdue += Number(ms.overdue || 0);
      }
    }
  }

  const employeeMetricsById = {};
  for (const [id, stats] of employeeStats) {
    const score = stats.total ? Math.round(clamp(((stats.completed + stats.approved * 0.85 + stats.active * 0.55) / stats.total) * 100, 10, 100)) : 0;
    employeeMetricsById[id] = {
      ...stats,
      kpi: score,
      videoDone: stats.videoDone || 0,
      videoRevision: stats.videoRevision || 0,
      videoFirstApproval: stats.videoFirstApproval || 0,
      videoDeadlineMet: stats.videoDeadlineMet || 0,
      videoActive: stats.videoActive || 0,
    };
  }

  const designGroups = new Map();
  for (const task of designTaskDocs || []) {
    if (!task?.projectId || task.archived) continue;
    if (!designGroups.has(task.projectId)) designGroups.set(task.projectId, []);
    designGroups.get(task.projectId).push(task);
  }
  for (const [projectId, tasks] of designGroups.entries()) {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "Yakunlandi").length;
    designTaskCountByProjectId[projectId] = total;
    designProgressByProjectId[projectId] = total ? Math.round((completed / total) * 100) : 0;
  }

  return {
    progressByProjectId,
    designProgressByProjectId,
    designTaskCountByProjectId,
    assignmentsByEmployeeId: Object.fromEntries(assignmentsByEmployeeId),
    employeeMetricsById,
    dashboardSummary: summarizePortfolioMetrics(projects),
  };
}

export function healthScore(input) {
  const summary = Array.isArray(input) ? summarizePortfolioMetrics(input) : {
    totalTasks: Number(input?.totalTasks || 0),
    completedTasks: Number(input?.completedTasks || 0),
    approvedTasks: Number(input?.approvedTasks || 0),
    activeTasks: Number(input?.activeTasks || 0),
    overdueTasks: Number(input?.overdueTasks || 0),
    pendingReviews: Number(input?.pendingReviews || 0),
  };
  if (!summary.totalTasks) return 55;
  const completionRate = summary.completedTasks / summary.totalTasks;
  const approvalRate = summary.approvedTasks / summary.totalTasks;
  const activeRate = summary.activeTasks / summary.totalTasks;
  const overdueRate = summary.overdueTasks / summary.totalTasks;
  const reviewRate = summary.pendingReviews / summary.totalTasks;
  const score = 35
    + completionRate * 35
    + approvalRate * 15
    + activeRate * 6
    + reviewRate * 4
    - overdueRate * 30;
  return Math.round(clamp(score, 12, 100));
}

export function humanizeAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential":                  "Email yoki parol noto'g'ri.",
    "auth/invalid-email":                        "Email formati noto'g'ri.",
    "auth/user-not-found":                       "Bunday foydalanuvchi topilmadi.",
    "auth/wrong-password":                       "Parol noto'g'ri.",
    "auth/network-request-failed":               "Internet yoki Firebase bilan aloqa xatosi.",
    "auth/too-many-requests":                    "Juda ko'p urinish. Biroz kutib qayta urinib ko'ring.",
    "auth/popup-closed-by-user":                 "Google oynasi yopib yuborildi.",
    "auth/popup-blocked":                        "Brauzer Google oynasini blokladi.",
    "auth/account-exists-with-different-credential": "Bu email boshqa usul bilan ro'yxatdan o'tgan.",
    "permission-denied":                         "Firestore ruxsatlari yetarli emas.",
    "unavailable":                               "Firestore bilan aloqa uzildi.",
    "resource-exhausted":                        "Firestore limitiga urildi.",
  };
  return map[code] || `Firebase xatosi: ${code || error?.message || "noma'lum xato"}`;
}
