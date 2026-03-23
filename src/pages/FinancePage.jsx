import React, { memo } from "react";
import { T } from "../core/constants.js";
import { toMoney } from "../core/utils.js";
import { Card, DataTable, EmptyState, PageHeader, Row, Cell, StatCard } from "../components/ui/index.jsx";

export const FinancePage = memo(function FinancePage({ dashboard }) {
  const { summary, projectRows, employeeRows } = dashboard;

  return (
    <div>
      <PageHeader
        title="Moliyaviy Dashboard"
        subtitle="Faqat CEO uchun moliyaviy ko'rsatkichlar. KPI, ish haqi va loyiha daromadlari real vaqt rejimida hisoblanadi."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="Jami daromad" value={`${toMoney(summary.totalRevenue)} so'm`} hint="Barcha loyihalar narxi" color={T.colors.green} />
        <StatCard label="Jami oylik xarajat" value={`${toMoney(summary.totalSalaryExpense)} so'm`} hint="Hisoblangan ish haqlari" color={T.colors.orange} />
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
            <DataTable columns={["Xodim", "KPI", "Asosiy oylik", "Hisoblangan oylik", "Ish hajmi"]}>
              {employeeRows.map((employee) => (
                <Row key={employee.id}>
                  <Cell>
                    <div style={{ fontWeight: 900 }}>{employee.name}</div>
                    <div style={{ marginTop: 4, color: T.colors.textMuted, fontSize: 12 }}>{employee.role} · {employee.dept}</div>
                  </Cell>
                  <Cell>{employee.kpi}%</Cell>
                  <Cell>{toMoney(employee.baseSalary)} so'm</Cell>
                  <Cell>{toMoney(employee.calculatedSalary)} so'm</Cell>
                  <Cell>{employee.completedWork}/{employee.assignedWork}</Cell>
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
