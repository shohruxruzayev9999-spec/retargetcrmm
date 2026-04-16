import React, { memo, useCallback, useMemo, useState } from "react";
import {
  T, TASK_STATUSES, PRIORITIES, LIMITS,
} from "../core/constants.js";
import {
  canManageTargetStatus, canWorkInProject, projectMembers,
} from "../core/permissions.js";
import {
  Avatar, Button, Card, CircleProgress, EmptyState, Field, Modal, PageHeader, PriorityBadge, StatusSelect,
} from "../components/ui/index.jsx";

const DONE_STATUSES = new Set(["Tasdiqlandi", "Bajarildi"]);
const BOARD_MIN_WIDTH = 320;

function formatDeadline(value) {
  if (!value) return "Deadline yo'q";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function isOverdue(task) {
  if (!task?.deadline || DONE_STATUSES.has(task.status)) return false;
  return task.deadline < new Date().toISOString().slice(0, 10);
}

function taskProgress(tasks) {
  const total = tasks.length;
  if (!total) return 0;
  const done = tasks.filter((task) => DONE_STATUSES.has(task.status)).length;
  return Math.round((done / total) * 100);
}

function progressColor(pct) {
  if (pct >= 75) return T.colors.green;
  if (pct >= 40) return T.colors.accent;
  return T.colors.orange;
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const leftDone = DONE_STATUSES.has(left.status) ? 1 : 0;
    const rightDone = DONE_STATUSES.has(right.status) ? 1 : 0;
    if (leftDone !== rightDone) return leftDone - rightDone;
    return String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
  });
}

const TargetTaskCard = memo(function TargetTaskCard({
  task,
  project,
  employeeMap,
  canManageStatus,
  onOpen,
  onStatusChange,
}) {
  const owner = employeeMap[task.ownerId];
  const overdue = isOverdue(task);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task);
        }
      }}
      style={{
        width: "100%",
        border: `1px solid ${T.colors.border}`,
        borderRadius: T.radius.lg,
        background: T.colors.surface,
        padding: "12px 12px 10px",
        boxShadow: T.shadow.sm,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.colors.text, lineHeight: 1.35 }}>
            {task.title || "Nomsiz target task"}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>{project.name}</span>
            <span style={{ color: overdue ? T.colors.red : T.colors.textSecondary }}>
              {formatDeadline(task.deadline)}
            </span>
          </div>
        </div>
        <PriorityBadge value={task.priority || "O'rta"} />
      </div>

      {task.note ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: T.colors.textSecondary,
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.note}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {owner ? <Avatar name={owner.name} url={owner.avatarUrl} size={26} /> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.colors.textMuted }}>Mas'ul</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {owner?.name || "Belgilanmagan"}
            </div>
          </div>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <StatusSelect
            value={task.status || "Rejalashtirildi"}
            options={TASK_STATUSES}
            disabled={!canManageStatus}
            onChange={(status) => onStatusChange(task, status)}
          />
        </div>
      </div>
    </div>
  );
});

const TargetTaskModal = memo(function TargetTaskModal({
  task,
  profile,
  projects,
  employees,
  onClose,
  onSaveTargetTask,
  onDeleteTargetTask,
}) {
  const [form, setForm] = useState({
    id: task?.id || "",
    projectId: task?.projectId || projects[0]?.id || "",
    title: task?.title || "",
    ownerId: task?.ownerId || "",
    priority: task?.priority || "O'rta",
    deadline: task?.deadline || "",
    status: task?.status || "Rejalashtirildi",
    note: task?.note || "",
    comments: Array.isArray(task?.comments) ? task.comments : [],
    createdBy: task?.createdBy || profile?.uid || "",
    createdAt: task?.createdAt || "",
    updatedBy: task?.updatedBy || "",
    updatedAt: task?.updatedAt || "",
  });
  const [saving, setSaving] = useState(false);

  const project = useMemo(
    () => projects.find((item) => item.id === form.projectId) || null,
    [projects, form.projectId]
  );
  const memberOptions = useMemo(
    () => projectMembers(project, employees).map((employee) => ({
      value: employee.id,
      label: employee.name,
    })),
    [project, employees]
  );
  const canManageStatus = canManageTargetStatus(profile);
  const canDelete = Boolean(form.id && (form.createdBy === profile?.uid || canManageStatus));

  const update = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.projectId || !form.title.trim()) return;
    setSaving(true);
    try {
      await onSaveTargetTask(form.projectId, {
        ...form,
        title: form.title.trim(),
        status: canManageStatus ? form.status : (task?.status || form.status || "Rejalashtirildi"),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [form, onClose, onSaveTargetTask, canManageStatus, task]);

  const handleDelete = useCallback(async () => {
    if (!form.id || !canDelete) return;
    await onDeleteTargetTask(form.projectId, form.id);
    onClose();
  }, [form.id, form.projectId, canDelete, onDeleteTargetTask, onClose]);

  return (
    <Modal title={form.id ? "Target task tahrirlash" : "Yangi target task"} onClose={onClose} width={760}>
      <div style={{ display: "grid", gap: 14 }}>
        <Field
          label="Loyiha"
          options={projects.map((projectItem) => ({ value: projectItem.id, label: projectItem.name }))}
          value={form.projectId}
          onChange={(value) => update("projectId", value)}
          required
        />
        <Field
          label="Task nomi"
          value={form.title}
          onChange={(value) => update("title", value)}
          placeholder="Masalan: yangi target kreativi"
          required
          maxLength={LIMITS.taskName}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field
            label="Mas'ul"
            options={[{ value: "", label: "Belgilanmagan" }, ...memberOptions]}
            value={form.ownerId}
            onChange={(value) => update("ownerId", value)}
          />
          <Field
            label="Prioritet"
            options={PRIORITIES}
            value={form.priority}
            onChange={(value) => update("priority", value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={(value) => update("deadline", value)}
          />
          {canManageStatus ? (
            <Field
              label="Holat"
              options={TASK_STATUSES}
              value={form.status}
              onChange={(value) => update("status", value)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>Holat</span>
              <StatusBadge value={form.status || "Rejalashtirildi"} />
            </div>
          )}
        </div>
        <Field
          label="Izoh"
          type="textarea"
          rows={5}
          value={form.note}
          onChange={(value) => update("note", value)}
          placeholder="Target bo'yicha qisqa izoh yoki brief"
          maxLength={LIMITS.note}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
          <div>
            {canDelete ? <Button variant="danger" onClick={handleDelete}>O'chirish</Button> : null}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={onClose}>Bekor</Button>
            <Button onClick={handleSave} disabled={saving || !form.projectId || !form.title.trim()}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

export const TargetPage = memo(function TargetPage({
  profile,
  projects,
  employees,
  targetTaskDocs,
  onSaveTargetTask,
  onDeleteTargetTask,
}) {
  const [editingTask, setEditingTask] = useState(null);

  const employeeMap = useMemo(
    () => Object.fromEntries((employees || []).map((employee) => [employee.id, employee])),
    [employees]
  );

  const tasksByProjectId = useMemo(() => {
    const next = Object.fromEntries(projects.map((project) => [project.id, []]));
    (targetTaskDocs || []).forEach((task) => {
      if (next[task.projectId]) next[task.projectId].push(task);
    });
    Object.keys(next).forEach((projectId) => {
      next[projectId] = sortTasks(next[projectId]);
    });
    return next;
  }, [projects, targetTaskDocs]);

  const boardColumns = useMemo(() => (
    projects.map((project) => {
      const tasks = tasksByProjectId[project.id] || [];
      const done = tasks.filter((task) => DONE_STATUSES.has(task.status)).length;
      const pct = taskProgress(tasks);
      return {
        project,
        tasks,
        done,
        pct,
        color: progressColor(pct),
      };
    })
  ), [projects, tasksByProjectId]);

  const overallStats = useMemo(() => {
    const total = targetTaskDocs.length;
    const done = targetTaskDocs.filter((task) => DONE_STATUSES.has(task.status)).length;
    return {
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [targetTaskDocs]);

  const canCreateAny = useMemo(
    () => projects.some((project) => canWorkInProject(profile, project)),
    [projects, profile]
  );

  const openNewTask = useCallback((projectId = "") => {
    setEditingTask({
      projectId: projectId || projects[0]?.id || "",
      title: "",
      ownerId: "",
      priority: "O'rta",
      deadline: "",
      status: "Rejalashtirildi",
      note: "",
      comments: [],
    });
  }, [projects]);

  const openTask = useCallback((task) => {
    setEditingTask(task);
  }, []);

  const closeModal = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleStatusChange = useCallback(async (task, status) => {
    if (!canManageTargetStatus(profile)) return;
    await onSaveTargetTask(task.projectId, {
      ...task,
      status,
    });
  }, [onSaveTargetTask, profile]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <PageHeader
          title="Target bo'limi"
        />
        {canCreateAny ? <Button onClick={() => openNewTask("")}>+ Task qo'shish</Button> : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Card style={{ padding: "14px 16px", minWidth: 220, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
            <CircleProgress pct={overallStats.pct} size={64} stroke={6} color={progressColor(overallStats.pct)} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: progressColor(overallStats.pct) }}>
              {overallStats.pct}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Umumiy target progress</div>
            <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>
              {overallStats.done}/{overallStats.total} task bajarilgan
            </div>
          </div>
        </Card>
      </div>

      {!projects.length ? (
        <Card>
          <EmptyState
            title="Ko'rinadigan loyiha topilmadi"
            desc="Target bo'limi uchun avval loyiha a'zoligini tekshirib ko'ring."
            icon="◌"
          />
        </Card>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: `minmax(${BOARD_MIN_WIDTH}px, 1fr)`, gap: 14, alignItems: "start", minWidth: "max-content" }}>
            {boardColumns.map(({ project, tasks, done, pct, color }) => (
              <Card key={project.id} style={{ padding: "16px 16px 14px", minHeight: 520, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                    <CircleProgress pct={pct} size={48} stroke={5} color={color} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color }}>
                      {pct}%
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {project.name}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>
                      {tasks.length} ta task · {done} bajarildi
                    </div>
                  </div>
                  {canWorkInProject(profile, project) ? (
                    <Button variant="secondary" style={{ padding: "7px 10px", fontSize: 12 }} onClick={() => openNewTask(project.id)}>
                      +
                    </Button>
                  ) : null}
                </div>

                <div style={{ height: 4, borderRadius: 999, background: T.colors.borderLight, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
                </div>

                <div style={{ display: "grid", gap: 10, flex: 1, alignContent: "start" }}>
                  {tasks.length ? tasks.map((task) => (
                    <TargetTaskCard
                      key={task.id}
                      task={task}
                      project={project}
                      employeeMap={employeeMap}
                      canManageStatus={canManageTargetStatus(profile)}
                      onOpen={openTask}
                      onStatusChange={handleStatusChange}
                    />
                  )) : (
                    <div style={{ border: `1px dashed ${T.colors.border}`, borderRadius: T.radius.lg, padding: "18px 14px", background: T.colors.bg }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.colors.textSecondary }}>Bu loyihada target task yo'q</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>
                        {canWorkInProject(profile, project) ? "Yangi task qo'shib ustunni to'ldirish mumkin." : "Faqat ko'rish rejimida."}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {editingTask ? (
        <TargetTaskModal
          task={editingTask}
          profile={profile}
          projects={projects}
          employees={employees}
          onClose={closeModal}
          onSaveTargetTask={onSaveTargetTask}
          onDeleteTargetTask={onDeleteTargetTask}
        />
      ) : null}
    </div>
  );
});
