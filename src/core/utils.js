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
    shooting: "Syomka", meetings: "Uchrashuvlar",
    workflow: "Workflow", notifications: "Bildirishnomalar",
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
export function calcProjectProgress(project) {
  if (Number.isFinite(project?.metrics?.progress) && !(Array.isArray(project?.tasks) && project.tasks.length)) {
    return Number(project.metrics.progress);
  }
  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.status === "Bajarildi").length / tasks.length) * 100);
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

export function buildProjectCaches(projects) {
  const progressByProjectId = {};
  const employeeStats = new Map();
  const assignmentsByEmployeeId = new Map();
  let totalTasks = 0, completedTasks = 0, activeProjects = 0, pendingReviews = 0;

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

  // Single pass — PERF-04 fix
  for (const project of projects) {
    const progress = calcProjectProgress(project);
    progressByProjectId[project.id] = progress;
    if (project.status === "Jarayonda") activeProjects++;
    const pending = Array.isArray(project.contentPlan) && project.contentPlan.length
      ? project.contentPlan.filter(i => i.status === "Ko'rib chiqilmoqda").length
      : Number(project.metrics?.pendingReviews || 0);
    pendingReviews += pending;

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
        if (task.status === "Bajarildi") { completedTasks++; if (stats) stats.completed++; }
        if (stats) {
          stats.total++;
          if (task.status === "Tasdiqlandi") stats.approved++;
          if (task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") stats.active++;
          if (task.deadline && task.deadline < todayIso() && task.status !== "Bajarildi") stats.overdue++;
          const isVideo = VIDEO_FORMATS.includes(task.format);
          if (isVideo) {
            if (task.status === "Tasdiqlandi") {
              stats.videoDone = (stats.videoDone || 0) + 1;
              if ((task.revisionCount || 0) === 0) {
                stats.videoFirstApproval = (stats.videoFirstApproval || 0) + 1;
              }
              if (task.deadline && task.finishedAt && task.finishedAt <= task.deadline) {
                stats.videoDeadlineMet = (stats.videoDeadlineMet || 0) + 1;
              }
            }
            if (task.status === "Montajda") {
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

  return {
    progressByProjectId,
    assignmentsByEmployeeId: Object.fromEntries(assignmentsByEmployeeId),
    employeeMetricsById,
    dashboardSummary: { totalTasks, completedTasks, activeProjects, pendingReviews },
  };
}

export function healthScore(projects) {
  const allTasks = projects.flatMap(p => (Array.isArray(p.tasks) && p.tasks.length ? p.tasks : []));
  if (!allTasks.length && projects.some(p => p.metrics)) {
    const agg = projects.reduce(
      (acc, p) => {
        const m = p.metrics || {};
        acc.total += Number(m.totalTasks || 0); acc.completed += Number(m.completedTasks || 0);
        acc.approved += Number(m.approvedTasks || 0); acc.active += Number(m.activeTasks || 0);
        acc.overdue += Number(m.overdueTasks || 0);
        return acc;
      },
      { total: 0, completed: 0, approved: 0, active: 0, overdue: 0 }
    );
    if (!agg.total) return 55;
    return Math.round(clamp((agg.completed / agg.total) * 62 + (agg.approved / agg.total) * 18 + (agg.active / agg.total) * 10 - agg.overdue * 4 + 20, 0, 100));
  }
  if (!allTasks.length) return 55;
  const c = allTasks.filter(t => t.status === "Bajarildi").length;
  const a = allTasks.filter(t => t.status === "Jarayonda" || t.status === "Ko'rib chiqilmoqda").length;
  const ap = allTasks.filter(t => t.status === "Tasdiqlandi").length;
  const ov = allTasks.filter(t => t.deadline && t.deadline < todayIso() && t.status !== "Bajarildi").length;
  return Math.round(clamp((c / allTasks.length) * 62 + (ap / allTasks.length) * 18 + (a / allTasks.length) * 10 - ov * 4 + 20, 0, 100));
}

export function unreadNotifications(notifications, uid) {
  return notifications.filter(n => !n.readBy?.[uid]).length;
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
