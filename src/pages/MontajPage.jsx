import React, { memo, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  T, VIDEO_FORMATS, MONTAJ_STATUSES, getCurrentMonthId, getMonthLabel,
} from "../core/constants.js";
import { db } from "../core/firebase.js";
import { canApproveVideo, canEdit, canEditOwnVideoTask, canWorkInProject } from "../core/permissions.js";
import { normalizeStoredRecord } from "../core/normalizers.js";
import { isoNow } from "../core/utils.js";
import {
  Avatar, Button, Card, DataTable, EmptyState, Field, PageHeader, Row, Cell, StatusBadge, StatusSelect,
} from "../components/ui/index.jsx";

function monthMatches(task, monthId) {
  if (!task.monthId) return monthId === getCurrentMonthId();
  return task.monthId === monthId;
}

function isVideoLikeTask(task) {
  if (VIDEO_FORMATS.includes(task?.format)) return true;
  const probe = `${task?.name || ""} ${task?.note || ""}`.toLowerCase();
  return ["video", "reels", "rolik", "montaj"].some((token) => probe.includes(token));
}

function normalizeMontajStatus(status) {
  if (status === "Review") return "Ko'rib chiqilmoqda";
  if (status === "Revision") return "Qayta ishlash";
  if (status === "Tasdiqlandi") return "Bajarildi";
  return status || "Kutilmoqda";
}

function collectMonthIds(projects) {
  const set = new Set([getCurrentMonthId()]);
  projects.forEach((project) => {
    (project.tasks || []).forEach((task) => {
      if (task.monthId) set.add(task.monthId);
    });
  });
  return Array.from(set).sort((left, right) => String(right).localeCompare(String(left)));
}

function calcEditorKpi(metrics) {
  const base = (metrics.videoDone || 0) * 10;
  const deadline = (metrics.videoDeadlineMet || 0) * 5;
  const bonus = (metrics.videoFirstApproval || 0) * 8;
  const penalty = (metrics.videoRevision || 0) * 3;
  const raw = base + deadline + bonus - penalty;
  return Math.max(0, Math.min(100, raw));
}

function buildVideoMetrics(tasks, employeeMap) {
  const stats = {};
  tasks.forEach((task) => {
    const owner = employeeMap[task.ownerId];
    const effectiveMontajorId = task.montajorId || ((owner?.roleCode === "EDITOR" || owner?.dept === "Media bo'limi") ? owner.id : "");
    if (!effectiveMontajorId) return;
    if (!stats[effectiveMontajorId]) {
      stats[effectiveMontajorId] = {
        videoDone: 0,
        videoRevision: 0,
        videoFirstApproval: 0,
        videoDeadlineMet: 0,
        videoActive: 0,
      };
    }
    const metric = stats[effectiveMontajorId];
    const normalizedStatus = normalizeMontajStatus(task.status);
    if (normalizedStatus === "Bajarildi") {
      metric.videoDone += 1;
      if ((task.revisionCount || 0) === 0) metric.videoFirstApproval += 1;
      if (task.deadline && task.finishedAt && task.finishedAt <= task.deadline) metric.videoDeadlineMet += 1;
    }
    if (normalizedStatus === "Montajda") metric.videoActive += 1;
    if ((task.revisionCount || 0) > 0) metric.videoRevision += (task.revisionCount || 0);
  });
  return stats;
}

function InlineSelect({ value, options, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        minWidth: 140,
        background: T.colors.bg,
        border: `1px solid ${T.colors.border}`,
        borderRadius: T.radius.md,
        padding: "8px 10px",
        fontFamily: T.font,
        fontSize: 12.5,
        color: T.colors.text,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

export const MontajPage = memo(function MontajPage({
  profile,
  projects,
  employees,
  employeeMetricsById,
  onSaveVideoTask,
}) {
  const [projectTasksById, setProjectTasksById] = useState({});
  const [selectedMonthId, setSelectedMonthId] = useState(getCurrentMonthId());
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEditorId, setSelectedEditorId] = useState("all");

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

  const monthIds = useMemo(() => collectMonthIds(projectsWithTasks), [projectsWithTasks]);

  useEffect(() => {
    if (!monthIds.includes(selectedMonthId)) setSelectedMonthId(getCurrentMonthId());
  }, [monthIds, selectedMonthId]);

  const editorEmployees = useMemo(
    () => employees.filter((employee) => employee.roleCode === "EDITOR" || employee.dept === "Media bo'limi"),
    [employees]
  );

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const allVideoTasks = useMemo(() => {
    const result = [];
    for (const project of projectsWithTasks) {
      for (const task of (project.tasks || [])) {
        if (isVideoLikeTask(task)) {
          const owner = employeeMap[task.ownerId];
          const effectiveMontajorId = task.montajorId || ((owner?.roleCode === "EDITOR" || owner?.dept === "Media bo'limi") ? owner.id : "");
          result.push({
            ...task,
            format: task.format || "Video",
            status: normalizeMontajStatus(task.status),
            montajorId: effectiveMontajorId,
            projectId: project.id,
            projectName: project.name,
            project,
          });
        }
      }
    }
    return result.sort((left, right) => String(left.deadline || "").localeCompare(String(right.deadline || "")));
  }, [employeeMap, projectsWithTasks]);

  const monthScopedTasks = useMemo(
    () => allVideoTasks.filter((task) => monthMatches(task, selectedMonthId)),
    [allVideoTasks, selectedMonthId]
  );

  const filteredTasks = useMemo(
    () =>
      monthScopedTasks.filter((task) => {
        if (selectedStatus !== "all" && task.status !== selectedStatus) return false;
        if (selectedEditorId !== "all" && task.montajorId !== selectedEditorId) return false;
        return true;
      }),
    [monthScopedTasks, selectedEditorId, selectedStatus]
  );

  const summary = useMemo(
    () => ({
      total: monthScopedTasks.length,
      ready: monthScopedTasks.filter((task) => task.status === "Bajarildi").length,
      active: monthScopedTasks.filter((task) => task.status === "Montajda").length,
      review: monthScopedTasks.filter((task) => task.status === "Ko'rib chiqilmoqda").length,
    }),
    [monthScopedTasks]
  );

  const localMetricsById = useMemo(() => buildVideoMetrics(monthScopedTasks, employeeMap), [employeeMap, monthScopedTasks]);

  const editorCards = useMemo(
    () =>
      editorEmployees.map((employee) => {
        const baseMetrics = employeeMetricsById?.[employee.id] || {};
        const localMetrics = localMetricsById[employee.id] || {};
        const metrics = { ...baseMetrics, ...localMetrics };
        const done = metrics.videoDone || 0;
        const deadlineRate = done ? Math.round(((metrics.videoDeadlineMet || 0) / done) * 100) : 0;
        const firstApprovalRate = done ? Math.round(((metrics.videoFirstApproval || 0) / done) * 100) : 0;
        return {
          employee,
          metrics,
          deadlineRate,
          firstApprovalRate,
          kpi: calcEditorKpi(metrics),
        };
      }),
    [editorEmployees, employeeMetricsById, localMetricsById]
  );

  function updateVideoTask(task, patch) {
    const project = projectsWithTasks.find((item) => item.id === task.projectId);
    if (!project || !canWorkInProject(profile, project)) return;
    const updatedTasks = (project.tasks || []).map((item) =>
      item.id === task.id
        ? {
          ...item,
          ...patch,
          updatedAt: isoNow(),
          updatedBy: profile.uid,
        }
        : item
    );
    onSaveVideoTask({ ...project, tasks: updatedTasks }, { silent: true });
  }

  const profileRoleCode = profile?.roleCode || profile?.role;

  return (
    <div>
      <PageHeader
        title="Montaj bo'limi"
        subtitle={`${getMonthLabel(selectedMonthId)} bo'yicha video va reels nazorati`}
      />

      <Card style={{ marginBottom: 18, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 220px) minmax(180px, 220px)", gap: 12 }}>
          <Field
            label="Oy"
            value={selectedMonthId}
            onChange={setSelectedMonthId}
            options={monthIds.map((monthId) => ({ value: monthId, label: getMonthLabel(monthId) }))}
          />
          <Field
            label="Holat"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[{ value: "all", label: "Barcha statuslar" }, ...MONTAJ_STATUSES.map((status) => ({ value: status, label: status }))]}
          />
          <Field
            label="Montajor"
            value={selectedEditorId}
            onChange={setSelectedEditorId}
            options={[{ value: "all", label: "Barcha montajorlar" }, ...editorEmployees.map((employee) => ({ value: employee.id, label: employee.name }))]}
          />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.accent }}>{summary.total}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Jami video</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Tanlangan oy uchun umumiy video ishlar</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.green }}>{summary.ready}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Tayyor</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Bajarilib yakunlangan videolar</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.accent }}>{summary.active}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Jarayonda</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Hozir montaj jarayonidagi videolar</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.orange }}>{summary.review}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Ko'rib chiqilmoqda</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>SMM ko'rib chiqishi kerak bo'lgan videolar</div>
        </Card>
      </div>

      <Card style={{ marginBottom: canEdit(profile.role) ? 18 : 0 }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Barcha video tasklar</div>
        {filteredTasks.length ? (
          <DataTable columns={["#", "Video nomi", "Loyiha", "Format", "Deadline", "Montajor", "Holat", "Qayta ishlash", "Amal"]}>
            {filteredTasks.map((task, index) => {
              const taskProject = task.project || projectsWithTasks.find((project) => project.id === task.projectId);
              const canWork = canWorkInProject(profile, taskProject);
              const canAssignEditor = canEdit(profile.role) && canWork;
              const canClaimTask = profileRoleCode === "EDITOR" && !task.montajorId && canWork;
              const canMutateOwnTask = canEditOwnVideoTask(profile, task) && canWork && ["Montajda", "Qayta ishlash"].includes(task.status);
              const statusOptions = canEdit(profile.role)
                ? MONTAJ_STATUSES
                : canMutateOwnTask
                  ? [task.status, "Ko'rib chiqilmoqda"]
                  : MONTAJ_STATUSES;
              const assignedEditor = employeeMap[task.montajorId];
              const showApproveActions = canApproveVideo(profile.role) && task.status === "Ko'rib chiqilmoqda" && canWork;

              return (
                <Row key={task.id}>
                  <Cell>{index + 1}</Cell>
                  <Cell>
                    <div style={{ fontWeight: 800 }}>{task.name || "Nomsiz video"}</div>
                    <div style={{ marginTop: 4, color: T.colors.textMuted, fontSize: 12 }}>{task.monthId ? getMonthLabel(task.monthId) : "Legacy / joriy oy"}</div>
                  </Cell>
                  <Cell>{task.projectName}</Cell>
                  <Cell>
                    <span style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "4px 8px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 800 }}>
                      {task.format}
                    </span>
                  </Cell>
                  <Cell>{task.deadline || "-"}</Cell>
                  <Cell style={{ minWidth: 180 }}>
                    {canAssignEditor ? (
                      <InlineSelect
                        value={task.montajorId || ""}
                        onChange={(montajorId) => updateVideoTask(task, { montajorId })}
                        options={[
                          { value: "", label: "Biriktirilmagan" },
                          ...editorEmployees.map((employee) => ({ value: employee.id, label: employee.name })),
                        ]}
                      />
                    ) : assignedEditor ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={assignedEditor.name} url={assignedEditor.avatarUrl} size={26} />
                        <span>{assignedEditor.name}</span>
                      </div>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.colors.orangeSoft, color: "#b45309", padding: "5px 9px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 800 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#b45309" }} />
                        Biriktirilmagan
                      </span>
                    )}
                  </Cell>
                  <Cell>
                    <StatusSelect
                      value={task.status || "Kutilmoqda"}
                      options={statusOptions}
                      disabled={!(canEdit(profile.role) || canMutateOwnTask)}
                      onChange={(status) => {
                        if (canEdit(profile.role) && canWork) {
                          updateVideoTask(task, { status });
                          return;
                        }
                        if (canMutateOwnTask && status === "Ko'rib chiqilmoqda") {
                          updateVideoTask(task, { status: "Ko'rib chiqilmoqda" });
                        }
                      }}
                    />
                  </Cell>
                  <Cell>{task.revisionCount || 0}</Cell>
                  <Cell>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {canClaimTask ? (
                        <Button
                          variant="warning"
                          style={{ padding: "6px 10px" }}
                          onClick={() => updateVideoTask(task, { montajorId: profile.uid, status: task.status === "Kutilmoqda" ? "Montajda" : task.status })}
                        >
                          Olish
                        </Button>
                      ) : null}
                      {showApproveActions ? (
                        <>
                          <Button
                            variant="success"
                            style={{ padding: "6px 10px" }}
                            onClick={() => updateVideoTask(task, {
                              status: "Bajarildi",
                              finishedAt: isoNow(),
                              approvedBy: profile.uid,
                            })}
                          >
                            Bajarildi
                          </Button>
                          <Button
                            variant="danger"
                            style={{ padding: "6px 10px" }}
                            onClick={() => updateVideoTask(task, {
                              status: "Qayta ishlash",
                              revisionCount: (task.revisionCount || 0) + 1,
                            })}
                          >
                            Qayta ishlash
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </Cell>
                </Row>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState title="Video tasklar topilmadi" desc="Tanlangan oy yoki filtr bo'yicha mos video/reels tasklar hali yo'q." />
        )}
      </Card>

      {canEdit(profile.role) ? (
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Montajorlar KPI paneli</div>
          {editorCards.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {editorCards.map(({ employee, metrics, deadlineRate, firstApprovalRate, kpi }) => (
                <Card key={employee.id} style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <Avatar name={employee.name} url={employee.avatarUrl} size={42} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{employee.name}</div>
                      <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>{employee.title || employee.role} · {employee.dept}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${T.colors.borderLight}`, paddingTop: 12, display: "grid", gap: 8, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.colors.textSecondary }}>Tayyor video:</span><strong>{metrics.videoDone || 0} ta</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.colors.textSecondary }}>Deadline:</span><strong>{deadlineRate}% o'z vaqtida</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.colors.textSecondary }}>Qayta ishlash:</span><strong>{metrics.videoRevision || 0} ta</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.colors.textSecondary }}>1-tasdiqlash:</span><strong>{firstApprovalRate}% bonus</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.colors.textSecondary }}>Aktiv video:</span><strong>{metrics.videoActive || 0} ta</strong></div>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 900, color: kpi >= 70 ? T.colors.green : kpi >= 45 ? T.colors.accent : T.colors.orange }}>KPI ball: {kpi}</div>
                    <StatusBadge value={kpi >= 70 ? "Bajarildi" : kpi >= 45 ? "Jarayonda" : "Kutilmoqda"} />
                  </div>
                  <div style={{ marginTop: 10, background: T.colors.borderLight, borderRadius: T.radius.full, height: 8 }}>
                    <div style={{ width: `${kpi}%`, height: "100%", borderRadius: T.radius.full, background: kpi >= 70 ? T.colors.green : kpi >= 45 ? T.colors.accent : T.colors.orange, transition: "width .3s ease" }} />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="Montajorlar topilmadi" desc="Media bo'limidagi montajorlar paydo bo'lgach KPI paneli to'ladi." />
          )}
        </div>
      ) : null}
    </div>
  );
});
