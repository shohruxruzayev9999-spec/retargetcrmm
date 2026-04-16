import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  T, VIDEO_FORMATS, MONTAJ_STATUSES, STATUS_META, getCurrentMonthId, getMonthLabel,
} from "../core/constants.js";
import { db } from "../core/firebase.js";
import { canApproveVideo, canEdit, canEditOwnVideoTask, canWorkInProject } from "../core/permissions.js";
import { normalizeStoredRecord } from "../core/normalizers.js";
import { isoNow } from "../core/utils.js";
import {
  Avatar, Button, Card, EmptyState, Field, PageHeader, StatusBadge, StatusSelect,
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

const DRAG_MIME = "application/x-montaj-task";

function canAssignTaskToEditor(profile, profileRoleCode, task, taskProject, targetMontajorId) {
  if (!taskProject || !canWorkInProject(profile, taskProject)) return false;
  if ((task.montajorId || "") === (targetMontajorId || "")) return false;
  if (canEdit(profile.role)) return true;
  return profileRoleCode === "EDITOR" && !task.montajorId && targetMontajorId === profile.uid;
}

function MontajTaskCard({
  task,
  index,
  projectsWithTasks,
  profile,
  profileRoleCode,
  employeeMap,
  editorEmployees,
  dragging,
  setDragging,
  onStatusChange,
  onClaim,
}) {
  const taskProject = task.project || projectsWithTasks.find((p) => p.id === task.projectId);
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
  const meta = STATUS_META[task.status] || STATUS_META["Kutilmoqda"];

  const onDragStart = (e) => {
    if (!canWork) return;
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ taskId: task.id, projectId: task.projectId, fromStatus: task.status }));
    e.dataTransfer.effectAllowed = "move";
    setDragging(task.id);
  };

  const onDragEnd = () => setDragging(null);

  return (
    <div
      draggable={canWork}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: T.colors.surface,
        border: `1px solid ${dragging === task.id ? T.colors.accent : T.colors.border}`,
        borderRadius: T.radius.lg,
        padding: "12px 12px 10px",
        boxShadow: dragging === task.id ? T.shadow.md : T.shadow.sm,
        cursor: canWork ? "grab" : "default",
        opacity: dragging && dragging !== task.id ? 0.92 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: T.colors.textTertiary }}>#{index + 1}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: T.radius.full, background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}>
          {task.status}
        </span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35, marginBottom: 6 }}>{task.name || "Nomsiz video"}</div>
      <div style={{ fontSize: 12, color: T.colors.textSecondary, marginBottom: 8 }}>{task.projectName}</div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "3px 8px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 800 }}>
          {task.format}
        </span>
        <span style={{ fontSize: 12, color: T.colors.textMuted }}>📅 {task.deadline || "—"}</span>
        {task.revisionCount ? (
          <span style={{ fontSize: 11, color: T.colors.red, fontWeight: 700 }}>Qayta: {task.revisionCount}</span>
        ) : null}
      </div>
      <div style={{ marginBottom: 10 }}>
        {canAssignEditor ? (
          <InlineSelect
            value={task.montajorId || ""}
            onChange={(montajorId) => onStatusChange(task, { montajorId })}
            options={[
              { value: "", label: "Biriktirilmagan" },
              ...editorEmployees.map((employee) => ({ value: employee.id, label: employee.name })),
            ]}
          />
        ) : assignedEditor ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={assignedEditor.name} url={assignedEditor.avatarUrl} size={26} />
            <span style={{ fontSize: 13 }}>{assignedEditor.name}</span>
          </div>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.colors.orangeSoft, color: "#b45309", padding: "5px 9px", borderRadius: T.radius.full, fontSize: 11, fontWeight: 800 }}>
            Biriktirilmagan
          </span>
        )}
      </div>
      <div style={{ marginBottom: 8 }} onMouseDown={(e) => e.stopPropagation()}>
        <StatusSelect
          value={task.status || "Kutilmoqda"}
          options={statusOptions}
          disabled={!(canEdit(profile.role) || canMutateOwnTask)}
          onChange={(status) => {
            if (canEdit(profile.role) && canWork) {
              onStatusChange(task, { status });
              return;
            }
            if (canMutateOwnTask && status === "Ko'rib chiqilmoqda") {
              onStatusChange(task, { status: "Ko'rib chiqilmoqda" });
            }
          }}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {canClaimTask ? (
          <Button
            variant="warning"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={() => onClaim(task)}
          >
            Olish
          </Button>
        ) : null}
        {showApproveActions ? (
          <>
            <Button
              variant="success"
              style={{ padding: "6px 10px", fontSize: 12 }}
              onClick={() => onStatusChange(task, {
                status: "Bajarildi",
                finishedAt: isoNow(),
                approvedBy: profile.uid,
              })}
            >
              Bajarildi
            </Button>
            <Button
              variant="danger"
              style={{ padding: "6px 10px", fontSize: 12 }}
              onClick={() => onStatusChange(task, {
                status: "Qayta ishlash",
                revisionCount: (task.revisionCount || 0) + 1,
              })}
            >
              Qayta ishlash
            </Button>
          </>
        ) : null}
      </div>
    </div>
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
  const [dragging, setDragging] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

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

  useEffect(() => {
    function clearCol() {
      setDragOverColumn(null);
    }
    document.addEventListener("dragend", clearCol);
    return () => document.removeEventListener("dragend", clearCol);
  }, []);

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

  const boardTasks = useMemo(
    () =>
      monthScopedTasks.filter((task) => {
        if (selectedStatus !== "all" && task.status !== selectedStatus) return false;
        return true;
      }),
    [monthScopedTasks, selectedStatus]
  );

  const boardColumns = useMemo(() => {
    const sortedTasks = [...boardTasks].sort((a, b) => String(a.deadline || "").localeCompare(String(b.deadline || "")));
    const unassigned = sortedTasks.filter((task) => !task.montajorId);
    const editorColumns = editorEmployees.map((employee) => ({
      id: employee.id,
      employee,
      tasks: sortedTasks.filter((task) => task.montajorId === employee.id),
    }));
    return [
      { id: "unassigned", employee: null, tasks: unassigned },
      ...editorColumns,
    ];
  }, [boardTasks, editorEmployees]);

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

  const profileRoleCode = profile?.roleCode || profile?.role;

  const updateVideoTask = useCallback((task, patch) => {
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
  }, [onSaveVideoTask, profile, projectsWithTasks]);

  const applyTaskPatch = useCallback((task, patch) => {
    if (patch.status === "Bajarildi") {
      updateVideoTask(task, {
        status: "Bajarildi",
        finishedAt: patch.finishedAt || isoNow(),
        approvedBy: patch.approvedBy || profile.uid,
      });
      return;
    }
    if (patch.status === "Qayta ishlash" && task.status === "Ko'rib chiqilmoqda" && patch.revisionCount != null) {
      updateVideoTask(task, {
        status: "Qayta ishlash",
        revisionCount: patch.revisionCount,
      });
      return;
    }
    updateVideoTask(task, patch);
  }, [profile.uid, updateVideoTask]);

  const handleDropOnColumn = useCallback((e, targetMontajorId) => {
    e.preventDefault();
    setDragOverColumn(null);
    let raw;
    try {
      raw = e.dataTransfer.getData(DRAG_MIME);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const task = boardTasks.find((t) => t.id === parsed.taskId && t.projectId === parsed.projectId);
    if (!task) return;
    const taskProject = task.project || projectsWithTasks.find((p) => p.id === task.projectId);
    if (!canAssignTaskToEditor(profile, profileRoleCode, task, taskProject, targetMontajorId)) return;
    const patch = { montajorId: targetMontajorId || "" };
    if (targetMontajorId && task.status === "Kutilmoqda") {
      patch.status = "Montajda";
    }
    applyTaskPatch(task, patch);
  }, [applyTaskPatch, boardTasks, profile, profileRoleCode, projectsWithTasks]);

  const handleClaim = useCallback((task) => {
    updateVideoTask(task, { montajorId: profile.uid, status: task.status === "Kutilmoqda" ? "Montajda" : task.status });
  }, [profile.uid, updateVideoTask]);

  return (
    <div>
      <PageHeader
        title="Montaj bo'limi"
        subtitle={`${getMonthLabel(selectedMonthId)} · Kanban taxtasi`}
      />

      <Card style={{ marginBottom: 18, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(200px, 280px)", gap: 12 }}>
          <Field
            label="Oy"
            value={selectedMonthId}
            onChange={setSelectedMonthId}
            options={monthIds.map((monthId) => ({ value: monthId, label: getMonthLabel(monthId) }))}
          />
          <Field
            label="Holat (filtr)"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[{ value: "all", label: "Barcha holatlar" }, ...MONTAJ_STATUSES.map((status) => ({ value: status, label: status }))]}
          />
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: T.colors.textMuted, lineHeight: 1.5 }}>
          Kartani boshqa montajor ustuniga tortsangiz biriktirish yangilanadi. Kichik ekranda ustunlarni gorizontal aylantiring.
        </p>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.accent }}>{summary.total}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Jami video</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Tanlangan oy</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.green }}>{summary.ready}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Tayyor</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Bajarildi</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.accent }}>{summary.active}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Montajda</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Aktiv ish</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.colors.orange }}>{summary.review}</div>
          <div style={{ marginTop: 8, fontWeight: 800 }}>Ko'rib chiqilmoqda</div>
          <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>Tasdiq kutmoqda</div>
        </Card>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
          alignItems: "stretch",
          marginBottom: canEdit(profile.role) ? 18 : 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {boardColumns.map((col) => {
          const list = col.tasks || [];
          const isOver = dragOverColumn === col.id;
          const headerColor = col.employee ? designerTone(col.employee.name) : T.colors.orange;
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverColumn(col.id);
              }}
              onDrop={(e) => handleDropOnColumn(e, col.employee?.id || "")}
              style={{
                flex: "1 1 280px",
                minWidth: 260,
                maxWidth: 340,
                display: "flex",
                flexDirection: "column",
                background: T.colors.borderLight,
                borderRadius: T.radius.xl,
                border: `2px solid ${isOver ? T.colors.accent : "transparent"}`,
                boxSizing: "border-box",
                transition: "border-color .15s ease",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: `1px solid ${T.colors.border}`,
                  borderRadius: `${T.radius.xl}px ${T.radius.xl}px 0 0`,
                  background: `linear-gradient(180deg, ${col.employee ? `${headerColor}1a` : T.colors.orangeSoft} 0%, ${T.colors.surface} 100%)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {col.employee ? <Avatar name={col.employee.name} url={col.employee.avatarUrl} size={28} /> : null}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, color: col.employee ? headerColor : "#b45309" }}>
                      {col.employee ? col.employee.name : "Biriktirilmagan"}
                    </div>
                    <div style={{ fontSize: 11, color: T.colors.textMuted, marginTop: 4 }}>
                      {list.length} ta TZ
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 120, maxHeight: "min(70vh, 720px)", overflowY: "auto" }}>
                {list.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.colors.textTertiary, textAlign: "center", padding: "20px 8px" }}>
                    Bo'sh
                  </div>
                ) : (
                  list.map((task, i) => (
                    <MontajTaskCard
                      key={`${task.projectId}-${task.id}`}
                      task={task}
                      index={i}
                      projectsWithTasks={projectsWithTasks}
                      profile={profile}
                      profileRoleCode={profileRoleCode}
                      employeeMap={employeeMap}
                      editorEmployees={editorEmployees}
                      dragging={dragging}
                      setDragging={setDragging}
                      onStatusChange={applyTaskPatch}
                      onClaim={handleClaim}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!boardTasks.length ? (
        <Card style={{ marginBottom: 18 }}>
          <EmptyState title="Video tasklar topilmadi" desc="Tanlangan oy yoki montajor filtri bo'yicha mos video/reels tasklar hali yo'q." />
        </Card>
      ) : null}

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
