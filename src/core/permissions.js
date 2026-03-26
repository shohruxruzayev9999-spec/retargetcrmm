// ─── Role Sets ────────────────────────────────────────────────────────────────
const EDITOR_ROLES      = new Set(["CEO", "MANAGER", "SUPERVISOR"]);
// UX-01 FIX: canViewReports — toza va aniq
const REPORT_VIEW_ROLES = new Set(["CEO", "INVESTOR"]);
const PEOPLE_MGMT_ROLES = new Set(["CEO", "MANAGER", "SUPERVISOR"]);
const PROJECT_FINANCE_VIEW_ROLES = new Set(["CEO", "INVESTOR"]);

// ─── Permission Helpers ───────────────────────────────────────────────────────
export function canEdit(role)          { return EDITOR_ROLES.has(role); }
export function canViewReports(role)   { return REPORT_VIEW_ROLES.has(role); }
export function canManagePeople(role)  { return PEOPLE_MGMT_ROLES.has(role); }
export function canViewFinancialDashboard(role) { return role === "CEO"; }
export function canViewProjectFinance(role) { return PROJECT_FINANCE_VIEW_ROLES.has(role); }
export function canEditOwnVideoTask(profile, task) {
  const roleCode = profile?.roleCode || profile?.role;
  return roleCode === "EDITOR" && task?.montajorId === profile?.uid;
}
export function canApproveVideo(role) {
  return new Set(["CEO", "MANAGER", "SUPERVISOR"]).has(role);
}

export function isProjectMember(profile, project) {
  if (!profile || !project) return false;
  return project.managerId === profile.uid || (project.teamIds || []).includes(profile.uid);
}

export function canWorkInProject(profile, project) {
  if (!profile || !project || profile.role === "INVESTOR") return false;
  return canEdit(profile.role) || isProjectMember(profile, project);
}

export function canManageProjectMeta(profile, project) {
  if (!profile) return false;
  return canEdit(profile.role) || Boolean(project && project.managerId === profile.uid);
}

export function visibleProjects(profile, projects) {
  if (!profile) return [];
  if (profile.role === "EMPLOYEE") {
    return projects.filter(p =>
      !p.archived && (p.teamIds.includes(profile.uid) || p.managerId === profile.uid)
    );
  }
  return projects.filter(p => !p.archived);
}

export function visibleShoots(profile, shoots, projects) {
  const allowed = new Set(visibleProjects(profile, projects).map(p => p.id));
  return shoots.filter(s => allowed.has(s.projectId));
}

export function visibleEmployees(profile, employees) {
  if (!profile) return [];
  return employees.filter(e => e.roleCode !== "INVESTOR" && e.status !== "merged");
}

export function projectMembers(project, employees) {
  const ids = new Set([project?.managerId, ...(project?.teamIds || [])].filter(Boolean));
  const list = employees.filter(e => ids.has(e.id));
  return list.length ? list : employees;
}
