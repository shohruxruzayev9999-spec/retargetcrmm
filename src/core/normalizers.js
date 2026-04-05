import { makeId, isoNow, todayIso } from "./utils.js";
import { ROLE_META, SCHEMA_VERSION } from "./constants.js";

// Forward declaration to avoid circular dep — canManagePeople logic inlined
function _canManagePeople(role) {
  return ["CEO", "MANAGER", "SUPERVISOR"].includes(role);
}

// ─── Comment helpers ──────────────────────────────────────────────────────────
export function normalizeComments(comments) {
  return Array.isArray(comments) ? comments : [];
}

export function createComment(text, actor) {
  return { id: makeId("comment"), text, userId: actor?.uid || "", authorName: actor?.name || actor?.email || "Xodim", createdAt: isoNow() };
}

export function withRecordMeta(record, actor) {
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

// ─── Project normalizer ───────────────────────────────────────────────────────
export function normalizeProject(project) {
  return {
    id: project.id || makeId("project"),
    name: project.name || "",
    client: project.client || "",
    type: project.type || "",
    start: project.start || "",
    end: project.end || "",
    managerId: project.managerId || "",
    teamIds: Array.isArray(project.teamIds) ? project.teamIds : [],
    months: Array.isArray(project.months) ? project.months : [],
    servicePrice: Number(project.servicePrice || 0),
    status: project.status || "Rejalashtirildi",
    priority: project.priority || "O'rta",
    visibility: project.visibility || "team",
    archived: Boolean(project.archived),
    tasks: Array.isArray(project.tasks) ? project.tasks : [],
    contentPlan: Array.isArray(project.contentPlan) ? project.contentPlan : [],
    mediaPlan: Array.isArray(project.mediaPlan) ? project.mediaPlan : [],
    plans: {
      daily:   Array.isArray(project.plans?.daily)   ? project.plans.daily   : [],
      weekly:  Array.isArray(project.plans?.weekly)  ? project.plans.weekly  : [],
      monthly: Array.isArray(project.plans?.monthly) ? project.plans.monthly : [],
    },
    calls: Array.isArray(project.calls) ? project.calls : [],
    report: {
      budget: Number(project.report?.budget || 0), leads: Number(project.report?.leads || 0),
      cpl:    Number(project.report?.cpl    || 0), sales: Number(project.report?.sales || 0),
      roi:    Number(project.report?.roi    || 0),
    },
    metrics: {
      totalTasks:     Number(project.metrics?.totalTasks    || 0),
      completedTasks: Number(project.metrics?.completedTasks|| 0),
      approvedTasks:  Number(project.metrics?.approvedTasks || 0),
      activeTasks:    Number(project.metrics?.activeTasks   || 0),
      overdueTasks:   Number(project.metrics?.overdueTasks  || 0),
      pendingReviews: Number(project.metrics?.pendingReviews|| 0),
      progress:       Number(project.metrics?.progress      || 0),
    },
    memberStats: project.memberStats && typeof project.memberStats === "object" ? project.memberStats : {},
    createdAt: project.createdAt || null,
    createdBy: project.createdBy || "",
    updatedAt: project.updatedAt || null,
    updatedBy: project.updatedBy || "",
  };
}

export function normalizeStoredProjectMeta(id, data) {
  return normalizeProject({ id, ...data, tasks: [], contentPlan: [], mediaPlan: [], plans: { daily: [], weekly: [], monthly: [] }, calls: [] });
}

export function normalizeStoredRecord(id, data) {
  return { id, ...data, comments: normalizeComments(data.comments) };
}

export function normalizeStoredUser(id, data) {
  return {
    id, uid: data.uid || id,
    email: data.email || "", name: data.name || "", avatarUrl: data.avatarUrl || "",
    roleCode: data.roleCode || data.role || "EMPLOYEE",
    role:  data.role  || data.title || ROLE_META[data.roleCode || data.role]?.title || "Xodim",
    title: data.title || data.role  || ROLE_META[data.roleCode || data.role]?.title || "Xodim",
    dept:  data.dept  || ROLE_META[data.roleCode || data.role]?.dept || "SMM bo'limi",
    status: data.status || "active",
    assignedProjectIds: Array.isArray(data.assignedProjectIds) ? data.assignedProjectIds : [],
    createdAt: data.createdAt || isoNow(),
    updatedAt: data.updatedAt || isoNow(),
  };
}

export function normalizeStoredPrivateUser(id, data) {
  return { id, salary: Number(data.salary || 0), kpiBase: Number(data.kpiBase || 80), load: Number(data.load || 0), updatedAt: data.updatedAt || isoNow() };
}

// ─── Employee converters ──────────────────────────────────────────────────────
export function employeeToPublicDoc(employee) {
  const roleCode = employee.roleCode || "EMPLOYEE";
  return {
    uid: employee.id, email: employee.email || "", name: employee.name || "",
    avatarUrl: employee.avatarUrl || "", roleCode,
    role:  employee.role  || ROLE_META[roleCode]?.title || "Xodim",
    dept:  employee.dept  || ROLE_META[roleCode]?.dept  || "SMM bo'limi",
    title: employee.role  || ROLE_META[roleCode]?.title || "Xodim",
    status: employee.status || "active",
    assignedProjectIds: Array.isArray(employee.assignedProjectIds) ? employee.assignedProjectIds : [],
    createdAt: employee.createdAt || isoNow(),
    updatedAt: employee.updatedAt || isoNow(),
  };
}

export function employeeToPrivateDoc(employee) {
  return { salary: Number(employee.salary || 0), kpiBase: Number(employee.kpiBase || 80), load: Number(employee.load || 0), updatedAt: isoNow() };
}

export function mergeEmployeeDocs(publicUsers, privateUsers, viewerRole, projects = []) {
  const assignedMap = {};
  projects.forEach(p => {
    [p.managerId, ...(p.teamIds || [])].filter(Boolean).forEach(uid => {
      if (!assignedMap[uid]) assignedMap[uid] = new Set();
      assignedMap[uid].add(p.id);
    });
  });
  return publicUsers
    .filter(u => u?.status !== "merged" && u?.roleCode !== "INVESTOR")
    .map(u => {
      const priv = privateUsers[u.id] || {};
      return {
        id: u.id, name: u.name || "", email: u.email || "", avatarUrl: u.avatarUrl || "",
        roleCode: u.roleCode || "EMPLOYEE",
        role:  u.role  || u.title || ROLE_META[u.roleCode]?.title || "Xodim",
        dept:  u.dept  || ROLE_META[u.roleCode]?.dept  || "SMM bo'limi",
        title: u.title || u.role  || ROLE_META[u.roleCode]?.title || "Xodim",
        status: u.status || "active",
        assignedProjectIds: Array.from(assignedMap[u.id] || u.assignedProjectIds || []),
        createdAt: u.createdAt || isoNow(),
        updatedAt: u.updatedAt || isoNow(),
        salary: _canManagePeople(viewerRole) ? Number(priv.salary || 0) : undefined,
        kpiBase: _canManagePeople(viewerRole) ? Number(priv.kpiBase || 80) : 80,
        load:   _canManagePeople(viewerRole) ? Number(priv.load   || 0) : 0,
      };
    });
}

// ─── Metric helpers ───────────────────────────────────────────────────────────
export function computeProjectMetrics(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const contentPlan = Array.isArray(project.contentPlan) ? project.contentPlan : [];
  const today = todayIso();
  const completedTasks = tasks.filter(t => t.status === "Bajarildi" || t.status === "Tasdiqlandi").length;
  const approvedTasks  = tasks.filter(t => t.status === "Tasdiqlandi").length;
  const activeTasks    = tasks.filter(t => t.status === "Jarayonda" || t.status === "Ko'rib chiqilmoqda").length;
  const overdueTasks   = tasks.filter(t => t.deadline && t.deadline < today && t.status !== "Bajarildi" && t.status !== "Tasdiqlandi").length;
  const pendingReviews = contentPlan.filter(i => i.status === "Ko'rib chiqilmoqda").length;
  const totalTasks = tasks.length;
  return { totalTasks, completedTasks, approvedTasks, activeTasks, overdueTasks, pendingReviews, progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0 };
}

export function computeProjectMemberStats(project) {
  const stats = {};
  const today = todayIso();
  for (const task of (project.tasks || [])) {
    if (!task.ownerId) continue;
    if (!stats[task.ownerId]) stats[task.ownerId] = { total: 0, completed: 0, approved: 0, active: 0, overdue: 0 };
    const s = stats[task.ownerId];
    s.total++;
    if (task.status === "Bajarildi" || task.status === "Tasdiqlandi") s.completed++;
    if (task.status === "Tasdiqlandi") s.approved++;
    if (task.status === "Jarayonda" || task.status === "Ko'rib chiqilmoqda") s.active++;
    if (task.deadline && task.deadline < today && task.status !== "Bajarildi" && task.status !== "Tasdiqlandi") s.overdue++;
  }
  return stats;
}

export function projectMetaDocFromProject(project, actor, fallback = null) {
  const n = normalizeProject(project);
  return {
    name: n.name, client: n.client, type: n.type, start: n.start, end: n.end,
    managerId: n.managerId, teamIds: n.teamIds, months: n.months, servicePrice: n.servicePrice, status: n.status,
    priority: n.priority, visibility: n.visibility || "team",
    archived: Boolean(n.archived), report: n.report,
    metrics: computeProjectMetrics(n), memberStats: computeProjectMemberStats(n),
    createdAt: fallback?.createdAt || n.createdAt || isoNow(),
    createdBy: fallback?.createdBy || n.createdBy || actor?.uid || "",
    updatedAt: isoNow(), updatedBy: actor?.uid || "",
  };
}

export function hydrateProject(metaProject, workspace = {}) {
  return normalizeProject({
    ...metaProject,
    tasks:       workspace.tasks       ?? metaProject.tasks       ?? [],
    contentPlan: workspace.contentPlan ?? metaProject.contentPlan ?? [],
    mediaPlan:   workspace.mediaPlan   ?? metaProject.mediaPlan   ?? [],
    months:      workspace.months      ?? metaProject.months      ?? [],
    plans:       workspace.plans       ?? metaProject.plans       ?? { daily: [], weekly: [], monthly: [] },
    calls:       workspace.calls       ?? metaProject.calls       ?? [],
  });
}

export function buildAssignedProjectIdsMap(projects) {
  const map = {};
  projects.forEach(p => {
    [p.managerId, ...(p.teamIds || [])].filter(Boolean).forEach(uid => {
      if (!map[uid]) map[uid] = [];
      if (!map[uid].includes(p.id)) map[uid].push(p.id);
    });
  });
  return map;
}
