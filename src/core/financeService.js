import { getCurrentMonthId } from "./constants.js";
import { clamp } from "./utils.js";

const INVESTOR_SHARE_RATIO = 0.35;
const CEO_SHARE_RATIO = 0.65;

function safeNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : 0;
}

function roundMoney(value) {
  return Math.round(safeNumber(value));
}

export function getProjectRevenue(project) {
  return roundMoney(project?.servicePrice ?? project?.report?.budget ?? 0);
}

export function calculateEmployeeFinancials(employee, metrics = {}) {
  const baseSalary = roundMoney(employee?.salary);
  const assignedWork = Math.max(
    0,
    Math.round(safeNumber(metrics?.assignedWork || metrics?.total || 0) || safeNumber(employee?.load || 0))
  );
  const completedWork = Math.max(0, Math.round(safeNumber(metrics?.completedWork || metrics?.completed || 0)));
  const kpi = assignedWork > 0
    ? clamp(Math.round((completedWork / assignedWork) * 100), 0, 100)
    : 100;
  const calculatedSalary = roundMoney(baseSalary * (kpi / 100));

  return {
    baseSalary,
    assignedWork,
    completedWork,
    kpi,
    calculatedSalary,
  };
}

export function collectFinancialMonths(projects = []) {
  const months = new Set([getCurrentMonthId()]);
  projects.forEach((project) => {
    (project.tasks || []).forEach((task) => {
      if (task.monthId) months.add(task.monthId);
    });
  });
  return Array.from(months).sort((left, right) => right.localeCompare(left));
}

export function buildFinancialDashboard({ projects = [], employees = [], employeeMetricsById = {}, selectedMonthId = getCurrentMonthId() }) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  const projectRows = projects.map((project) => {
    const assignedIds = Array.from(new Set([project.managerId, ...(project.teamIds || [])].filter(Boolean)));
    return {
      id: project.id,
      name: project.name || "Nomsiz loyiha",
      revenue: getProjectRevenue(project),
      assignedEmployees: assignedIds.map((id) => employeeById.get(id)?.name).filter(Boolean),
      status: project.status || "Rejalashtirildi",
    };
  });

  const employeeRows = employees.map((employee) => {
    const assignedTasks = projects.flatMap((project) =>
      (project.tasks || []).filter((task) => task.monthId === selectedMonthId && task.ownerId === employee.id)
    );
    const doneTasks = assignedTasks.filter((task) => task.status === "Bajarildi");
    const financials = calculateEmployeeFinancials(employee, {
      ...employeeMetricsById[employee.id],
      assignedWork: assignedTasks.length,
      completedWork: doneTasks.length,
    });
    return {
      id: employee.id,
      name: employee.name || "Nomsiz xodim",
      role: employee.role || employee.title || "Xodim",
      dept: employee.dept || "",
      assignedTasks: assignedTasks.length,
      doneTasks: doneTasks.length,
      ...financials,
    };
  });

  const totalRevenue = roundMoney(projectRows.reduce((sum, project) => sum + project.revenue, 0));
  const totalSalaryExpense = roundMoney(employeeRows.reduce((sum, employee) => sum + employee.baseSalary, 0));
  const netProfit = Math.max(0, totalRevenue - totalSalaryExpense);
  const investorShare = roundMoney(netProfit * INVESTOR_SHARE_RATIO);
  const ceoShare = roundMoney(netProfit * CEO_SHARE_RATIO);

  return {
    summary: {
      totalRevenue,
      totalSalaryExpense,
      netProfit,
      investorShare,
      ceoShare,
    },
    projectRows,
    employeeRows,
  };
}

export function buildFinancialSnapshotDoc(dashboard, actor) {
  return {
    summary: dashboard.summary,
    projectRows: dashboard.projectRows,
    employeeRows: dashboard.employeeRows,
    generatedAt: new Date().toISOString(),
    generatedBy: actor?.uid || "",
  };
}
