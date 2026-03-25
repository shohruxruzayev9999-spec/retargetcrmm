import React, { memo, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { T, getCurrentMonthId, getMonthLabel } from "../core/constants.js";
import { db } from "../core/firebase.js";
import { buildFinancialDashboard, collectFinancialMonths } from "../core/financeService.js";
import { normalizeStoredRecord } from "../core/normalizers.js";
import { toMoney } from "../core/utils.js";
import { Card, DataTable, EmptyState, PageHeader, Row, Cell, StatCard } from "../components/ui/index.jsx";

export const FinancePage = memo(function FinancePage({ projects, employees }) {
  const [projectTasksById, setProjectTasksById] = useState({});
  const [selectedMonthId, setSelectedMonthId] = useState(getCurrentMonthId());

  useEffect(() => {
    if (!db || !projects.length) {
      setProjectTasksById({});
      return undefined;
    }

    const unsubscribes = projects.map((project) =>
      onSnapshot(collection(db, "projects", project.id, "tasks"), (snapshot) => {
        const nextTasks = snapshot.docs.map((entry) => normalizeStoredRecord(entry.id, entry.data()));
        setProjectTasksById((current) => ({ ...current, [project.id]: nextTasks }));
      })
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [projects]);

  const projectsWithTasks = useMemo(
    () => projects.map((project) => ({ ...project, tasks: projectTasksById[project.id] || project.tasks || [] })),
    [projects, projectTasksById]
  );

  const months = useMemo(() => collectFinancialMonths(projectsWithTasks), [projectsWithTasks]);
  const dashboard = useMemo(
    () => buildFinancialDashboard({ projects: projectsWithTasks, employees, selectedMonthId }),
    [projectsWithTasks, employees, selectedMonthId]
  );
  const { summary, projectRows, employeeRows } = dashboard;

  useEffect(() => {
    if (!months.includes(selectedMonthId)) setSelectedMonthId(getCurrentMonthId());
  }, [months, selectedMonthId]);

  return (
    <div>
      <PageHeader
        title="Moliyaviy Dashboard"
        subtitle="Faqat CEO uchun"
      />

      <Card style={{ marginBottom: 18, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {months.map((monthId) => {
            const active = monthId === selectedMonthId;
            return (
              <button
                key={monthId}
                type="button"
                onClick={() => setSelectedMonthId(monthId)}
                style={{
                  border: `1px solid ${active ? T.colors.accent : T.colors.border}`,
                  background: active ? T.colors.accentSoft : T.colors.bg,
                  color: active ? T.colors.accent : T.colors.textSecondary,
                  borderRadius: T.radius.full,
                  padding: "8px 12px",
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {getMonthLabel(monthId)}
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="Jami daromad" value={`${toMoney(summary.totalRevenue)} so'm`} hint="Barcha loyihalar narxi" color={T.colors.green} />
        <StatCard label="Jami oylik xarajat" value={`${toMoney(summary.totalSalaryExpense)} so'm`} hint="Barcha bazaviy oyliklar" color={T.colors.orange} />
        <StatCard label="Sof foyda" value={`${toMoney(summary.netProfit)} so'm`} hint="Daromad - oyliklar" color={T.colors.accent} />
        <StatCard label="Investor ulushi" value={`${toMoney(summary.investorShare)} so'm`} hint="35% ulush" color={T.colors.purple} />
        <StatCard label="CEO foydasi" value={`${toMoney(summary.ceoShare)} so'm`} hint="Qolgan 65%" color={T.colors.indigo} />
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <Card>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Loyihalar moliyasi</div>
          {projectRows.length ? (
            <DataTable columns={["Loyiha", "Xizmat narxi", "Biriktirilgan xodimlar", "Holati"]}>
              {projectRows.map((project) => (
                <Row key={project.id}>
                  <Cell>
                    <div style={{ fontWeight: 900 }}>{project.name}</div>
                  </Cell>
                  <Cell>{toMoney(project.revenue)} so'm</Cell>
                  <Cell>
                    {project.assignedEmployees.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {project.assignedEmployees.map((name) => (
                          <span key={`${project.id}-${name}`} style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "4px 9px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 700 }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: T.colors.textMuted }}>Xodim biriktirilmagan</span>
                    )}
                  </Cell>
                  <Cell>{project.status}</Cell>
                </Row>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="Moliyaviy ma'lumot hali yo'q" desc="Loyihalarga narx va jamoa biriktirilgach moliyaviy jadval to'ladi." />
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Xodimlar oylik hisobi</div>
          {employeeRows.length ? (
            <DataTable columns={["Xodim", "KPI (%)", "Asosiy oylik", "Hisoblangan oylik", "Bajarilgan/Biriktirilgan tasks"]}>
              {employeeRows.map((employee) => (
                <Row key={employee.id}>
                  <Cell>
                    <div style={{ fontWeight: 900 }}>{employee.name}</div>
                    <div style={{ marginTop: 4, color: T.colors.textMuted, fontSize: 12 }}>{employee.role} · {employee.dept}</div>
                  </Cell>
                  <Cell>{employee.kpi}%</Cell>
                  <Cell>{toMoney(employee.baseSalary)} so'm</Cell>
                  <Cell>{toMoney(employee.calculatedSalary)} so'm</Cell>
                  <Cell>{employee.doneTasks}/{employee.assignedTasks}</Cell>
                </Row>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="Xodimlar ma'lumoti yo'q" desc="Xodimlar va ularning ish hajmi paydo bo'lgach oylik hisob-kitob chiqadi." />
          )}
        </Card>
      </div>
    </div>
  );
});
