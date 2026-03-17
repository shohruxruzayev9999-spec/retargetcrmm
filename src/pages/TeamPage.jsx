import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export const TeamPage = memo(function TeamPage({ profile, employees, projects, employeeMetricsById, assignmentsByEmployeeId, onSaveEmployee, onCreateEmployee, onDeleteEmployee, loading }) {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const editable = canManagePeople(profile.role);
  const canViewCompensation = canManagePeople(profile.role);
  const grouped = useMemo(
    () =>
      DEPARTMENTS.map((dept) => ({
        dept,
        employees: employees.filter((employee) => employee.dept === dept),
      })).filter((group) => group.employees.length),
    [employees]
  );

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        subtitle={`${employees.length} ta xodim. Google orqali kirganlar va qo'lda kiritilgan jamoa kartochkalari shu yerda.`}
        action={editable ? <Button onClick={() => setShowAdd(true)}>+ Xodim</Button> : null}
      />
      {loading ? <GridSkeleton cards={8} minWidth={280} /> : null}
      {!loading && grouped.length ? (
        <div style={{ display: "grid", gap: 20 }}>
          {grouped.map((group) => (
            <div key={group.dept}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: { "SMM bo'limi": T.colors.indigo, "Target bo'limi": T.colors.orange, "Media bo'limi": T.colors.accent, "Sales bo'limi": T.colors.green, "Project Management": T.colors.purple, Boshqaruv: T.colors.text }[group.dept] || T.colors.accent }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>{group.dept}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {group.employees.map((employee) => {
                  const metrics = employeeMetricsById[employee.id] || { kpi: 0, active: 0, projects: 0 };
                  const projectAssignments = (assignmentsByEmployeeId[employee.id] || []).slice(0, 3);
                  const loadTone = metrics.active > 4 ? T.colors.orange : T.colors.green;
                  return (
                    <Card key={employee.id} style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <Avatar name={employee.name} url={employee.avatarUrl} size={46} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{employee.name}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: T.colors.textSecondary }}>{employee.role}</div>
                          <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: T.radius.sm, background: T.colors.bg, color: T.colors.textSecondary, fontSize: 11, fontWeight: 700 }}>
                            {employee.roleCode === "EMPLOYEE" ? "Xodim" : "Admin"}
                          </div>
                        </div>
                        {editable ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <Button variant="secondary" onClick={() => setEditingEmployee(employee)} style={{ padding: "6px 10px" }}>Tahrirlash</Button>
                            <Button variant="danger" onClick={() => onDeleteEmployee(employee.id)} style={{ padding: "6px 10px" }}>✕</Button>
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                        {[
                          { value: `${metrics.kpi}%`, label: "KPI", color: T.colors.accent },
                          { value: `${clamp(metrics.active * 18 + metrics.projects * 10, 0, 100)}%`, label: "Yuklanish", color: loadTone },
                          { value: metrics.projects, label: "Loyiha", color: T.colors.purple },
                        ].map((item) => (
                          <div key={item.label} style={{ background: T.colors.bg, borderRadius: T.radius.md, padding: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</div>
                            <div style={{ fontSize: 10, color: T.colors.textSecondary }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: T.colors.borderLight, borderRadius: T.radius.full, height: 5 }}>
                        <div style={{ width: `${metrics.kpi}%`, height: "100%", background: T.colors.accent, borderRadius: T.radius.full, transition: "width .35s ease" }} />
                      </div>
                      <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 12, color: T.colors.textSecondary }}>
                        <div>{employee.email || "Email ko'rsatilmagan"}</div>
                        <div>{canViewCompensation ? (employee.salary ? `${toMoney(employee.salary)} so'm / oy` : "Oylik kiritilmagan") : "Oylik faqat CEO/Admin ga ko'rinadi"}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {projectAssignments.length ? projectAssignments.map((project) => (
                            <span key={project.id} style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "3px 8px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 600 }}>
                              {project.name}
                            </span>
                          )) : <span style={{ color: T.colors.textTertiary }}>Loyiha biriktirilmagan</span>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <EmptyState title="Xodimlar hali yo'q" desc="Xodim Google orqali kirgach avtomatik ro'yxatga qo'shiladi." />
      ) : null}

      {showAdd ? (
        <Modal title="Yangi xodim qo'shish" onClose={() => setShowAdd(false)} width={620}>
          <EmployeeEditForm
            employee={{ name: "", role: "", dept: "SMM bo'limi", email: "", salary: 0, kpiBase: 80, load: 50 }}
            showCompensation={canViewCompensation}
            submitLabel="Xodimni saqlash"
            onCancel={() => setShowAdd(false)}
            onSave={(next) => {
              onCreateEmployee(next);
              setShowAdd(false);
            }}
          />
        </Modal>
      ) : null}

      {editingEmployee ? (
        <Modal title="Xodim ma'lumotini yangilash" onClose={() => setEditingEmployee(null)} width={640}>
          <EmployeeEditForm
            employee={editingEmployee}
            showCompensation={canViewCompensation}
            onCancel={() => setEditingEmployee(null)}
            onSave={(next) => {
              onSaveEmployee(next);
              setEditingEmployee(null);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
});

function EmployeeEditForm({ employee, onCancel, onSave, submitLabel = "Saqlash", showCompensation = true }) {
  const [form, setForm] = useState({ ...employee, salary: String(employee.salary || ""), kpiBase: String(employee.kpiBase || 80), load: String(employee.load || 0), email: employee.email || "" });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <Field label="Ism" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <Field label="Lavozim" value={form.role} onChange={(value) => setForm((prev) => ({ ...prev, role: value }))} />
        <Field label="Bo'lim" value={form.dept} onChange={(value) => setForm((prev) => ({ ...prev, dept: value }))} options={DEPARTMENTS} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} type="email" />
        {showCompensation ? <Field label="Oylik" type="number" value={form.salary} onChange={(value) => setForm((prev) => ({ ...prev, salary: value }))} /> : null}
        <Field label="Bazaviy KPI" type="number" value={form.kpiBase} onChange={(value) => setForm((prev) => ({ ...prev, kpiBase: value }))} />
        <Field label="Bandlik" type="number" value={form.load} onChange={(value) => setForm((prev) => ({ ...prev, load: value }))} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Button variant="secondary" onClick={onCancel}>Bekor</Button>
        <Button
          onClick={() =>
            onSave({
              ...employee,
              ...form,
              salary: showCompensation ? Number(form.salary || 0) : Number(employee.salary || 0),
              kpiBase: Number(form.kpiBase || 80),
              load: Number(form.load || 0),
            })
          }
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

