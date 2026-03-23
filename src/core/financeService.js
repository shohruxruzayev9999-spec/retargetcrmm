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
    Math.round(safeNumber(metrics?.total || 0) || safeNumber(employee?.load || 0))
  );
  const completedWork = Math.max(0, Math.round(safeNumber(metrics?.completed || 0)));
  const fallbackKpi = clamp(Math.round(safeNumber(employee?.kpiBase || 100)), 0, 100);
  const kpi = assignedWork > 0
    ? clamp(Math.round((completedWork / assignedWork) * 100), 0, 100)
    : fallbackKpi;
  const calculatedSalary = roundMoney(baseSalary * (kpi / 100));

  return {
    baseSalary,
    assignedWork,
    completedWork,
    kpi,
    calculatedSalary,
  };
}

export function buildFinancialDashboard({ projects = [], employees = [], employeeMetricsById = {} }) {
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
    const financials = calculateEmployeeFinancials(employee, employeeMetricsById[employee.id]);
    return {
      id: employee.id,
      name: employee.name || "Nomsiz xodim",
      role: employee.role || employee.title || "Xodim",
      dept: employee.dept || "",
      ...financials,
    };
  });

  const totalRevenue = roundMoney(projectRows.reduce((sum, project) => sum + project.revenue, 0));
  const totalSalaryExpense = roundMoney(employeeRows.reduce((sum, employee) => sum + employee.calculatedSalary, 0));
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
