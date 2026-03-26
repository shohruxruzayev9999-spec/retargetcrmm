import React, { memo, useEffect, useMemo, useState } from "react";
import {
  T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES,
  CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, VIDEO_FORMATS, MONTAJ_STATUSES, STATUS_META, getCurrentMonthId, getMonthLabel,
} from "../core/constants.js";
import { toMoney, isoNow, makeId, indexById, calcProjectProgress } from "../core/utils.js";
import { canWorkInProject, canManageProjectMeta, canViewProjectFinance, projectMembers } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import {
  Avatar, Button, Card, Field, Modal, EmptyState, StatusBadge,
  StatusSelect, PriorityBadge, CircleProgress, DataTable, Row, Cell, TeamSelector, CommentThread, ConfirmDialog,
} from "../components/ui/index.jsx";

const MONTH_SECTIONS = ["Topshiriqlar", "Kontent reja", "Media plan", "Rejalar", "Aloqalar"];
const DAY_ROWS = Array.from({ length: 31 }, (_, index) => index + 1);
const SHEET_INPUT_STYLE = {
  width: "100%",
  minWidth: 0,
  background: T.colors.bg,
  border: `1px solid ${T.colors.border}`,
  borderRadius: T.radius.md,
  padding: "8px 10px",
  fontSize: 12,
  color: T.colors.text,
  fontFamily: T.font,
  boxSizing: "border-box",
};
const WORKSPACE_TAB_META = [
  { id: "tasks", label: "Topshiriqlar" },
  { id: "content", label: "Kontent reja" },
  { id: "media", label: "Media plan" },
  { id: "plans", label: "Rejalar" },
  { id: "calls", label: "Aloqalar" },
];

function getMonthList(months) {
  if (Array.isArray(months) && months.length) return months;
  const currentMonthId = getCurrentMonthId();
  return [{ id: currentMonthId, label: getMonthLabel(currentMonthId), status: "active", createdAt: new Date().toISOString() }];
}

function buildMonthDate(monthId, day) {
  return `${monthId}-${String(day).padStart(2, "0")}`;
}

function getRecordDay(record) {
  const rawDate = String(record?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return null;
  const day = Number(rawDate.slice(8, 10));
  return day >= 1 && day <= 31 ? day : null;
}

function recordMatchesMonth(record, monthId) {
  if (!record || !monthId) return false;
  if (record.monthId) return record.monthId === monthId;
  if (String(record.date || "").slice(0, 7) === monthId) return true;
  return false;
}

function taskMatchesMonth(task, monthId, monthsExist) {
  if (!monthsExist) return true;
  if (task.monthId) return task.monthId === monthId;
  if (String(task.start || "").slice(0, 7) === monthId) return true;
  if (String(task.deadline || "").slice(0, 7) === monthId) return true;
  return false;
}

function monthScopedTasks(tasks, monthId, monthsExist) {
  return (tasks || []).filter((task) => taskMatchesMonth(task, monthId, monthsExist));
}

function isVideoTask(taskOrFormat) {
  const format = typeof taskOrFormat === "string" ? taskOrFormat : taskOrFormat?.format;
  return VIDEO_FORMATS.includes(format);
}

function monthScopedCount(items, monthId) {
  return (items || []).filter((item) => recordMatchesMonth(item, monthId)).length;
}

function buildMonthStats(project, monthId) {
  const monthsExist = Array.isArray(project.months) && project.months.length > 0;
  const scopedTasks = monthScopedTasks(project.tasks || [], monthId, monthsExist);
  const doneTasks = scopedTasks.filter((task) => task.status === "Bajarildi").length;
  const progress = scopedTasks.length ? Math.round((doneTasks / scopedTasks.length) * 100) : 0;
  return {
    progress,
    doneTasks,
    totalTasks: scopedTasks.length,
    contentCount: monthScopedCount(project.contentPlan, monthId),
    mediaCount: monthScopedCount(project.mediaPlan, monthId),
    plansCount: monthScopedCount(project.plans?.daily || [], monthId),
    callsCount: monthScopedCount(project.calls, monthId),
  };
}

function TextCellInput({ value, onChange, disabled, placeholder = "" }) {
  return <input type="text" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} style={SHEET_INPUT_STYLE} />;
}

function NumberCellInput({ value, onChange, disabled, placeholder = "" }) {
  return <input type="number" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} style={SHEET_INPUT_STYLE} />;
}

function SelectCellInput({ value, onChange, disabled, options }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} style={SHEET_INPUT_STYLE}>
      {options.map((option) => (
        typeof option === "object"
          ? <option key={option.value} value={option.value}>{option.label}</option>
          : <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

function StatusCellSelect({ value, onChange, disabled, options }) {
  const meta = STATUS_META[value] || STATUS_META["Rejalashtirildi"];
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{
        ...SHEET_INPUT_STYLE,
        background: meta.bg,
        color: meta.text,
        border: `1px solid ${meta.border}`,
        fontWeight: 700,
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const MonthWorkspaceCards = memo(function MonthWorkspaceCards({
  project,
  selectedMonthId,
  onSelectMonth,
  onCreateMonth,
  onEditMonth,
  onToggleMonthStatus,
  onDeleteMonth,
  editable,
}) {
  const months = getMonthList(project.months);
  const employeeCount = Array.isArray(project.teamIds) ? project.teamIds.length : 0;
  const selectedMonth = months.find((month) => month.id === selectedMonthId) || months[0];
  const stats = buildMonthStats(project, selectedMonthId);
  const progressColor = stats.progress >= 75 ? T.colors.green : stats.progress >= 40 ? T.colors.accent : T.colors.orange;

  return (
    <Card style={{ marginBottom: 20, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1, minWidth: 260 }}>
          {months.map((month) => {
            const active = month.id === selectedMonthId;
            return (
              <button
                key={month.id}
                type="button"
                onClick={() => onSelectMonth(month.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${active ? T.colors.accent : T.colors.border}`,
                  background: active ? T.colors.accentSoft : T.colors.borderLight,
                  color: active ? T.colors.accent : T.colors.textSecondary,
                  borderRadius: T.radius.full,
                  padding: "9px 14px",
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: active ? T.shadow.sm : "none",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: month.status === "active" ? T.colors.green : T.colors.textTertiary }} />
                {month.label || getMonthLabel(month.id)}
              </button>
            );
          })}
        </div>
        {editable ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={onCreateMonth}>+ Yangi oyna</Button>
            {selectedMonth ? (
              <>
                <Button variant="secondary" onClick={() => onEditMonth(selectedMonth)}>Nomlash</Button>
                <Button variant={selectedMonth.status === "active" ? "warning" : "success"} onClick={() => onToggleMonthStatus(selectedMonth)}>
                  {selectedMonth.status === "active" ? "Arxiv" : "Faol qilish"}
                </Button>
                <Button variant="danger" onClick={() => onDeleteMonth(selectedMonth)}>O'chirish</Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(240px, 1.15fr) minmax(280px, 1fr)", gap: 16, alignItems: "stretch" }}>
        <div style={{ background: T.colors.borderLight, borderRadius: T.radius.xl, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedMonth?.label || getMonthLabel(selectedMonthId)}</div>
              <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 13 }}>
                {selectedMonth?.status === "active" ? "Faol workspace" : "Arxiv workspace"}
              </div>
            </div>
            <span style={{ background: selectedMonth?.status === "active" ? T.colors.accentSoft : T.colors.border, color: selectedMonth?.status === "active" ? T.colors.accent : T.colors.textSecondary, borderRadius: T.radius.full, padding: "7px 11px", fontSize: 12, fontWeight: 800 }}>
              {selectedMonth?.status === "active" ? "Faol" : "Arxiv"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <CircleProgress pct={stats.progress} size={76} stroke={7} color={progressColor} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: progressColor }}>{stats.progress}%</span>
                <span style={{ fontSize: 11, color: T.colors.textTertiary }}>{stats.doneTasks}/{stats.totalTasks}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MONTH_SECTIONS.map((label) => (
                <span key={label} style={{ padding: "7px 11px", borderRadius: T.radius.full, background: T.colors.surface, color: T.colors.textSecondary, fontSize: 12, fontWeight: 700, border: `1px solid ${T.colors.border}` }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {[
            { label: "Task", value: stats.totalTasks, color: T.colors.accent },
            { label: "Kontent", value: stats.contentCount, color: T.colors.green },
            { label: "Media", value: stats.mediaCount, color: T.colors.orange },
            { label: "Rejalar", value: stats.plansCount, color: T.colors.purple },
            { label: "Aloqalar", value: stats.callsCount, color: T.colors.indigo },
          ].map((item) => (
            <div key={item.label} style={{ background: T.colors.borderLight, borderRadius: T.radius.xl, padding: "16px 10px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 110 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: item.color, textAlign: "center" }}>{item.value}</div>
              <div style={{ marginTop: 6, textAlign: "center", fontSize: 12, color: T.colors.textSecondary, fontWeight: 700 }}>{item.label}</div>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>
            <span>{employeeCount} kishi biriktirilgan</span>
            <StatusBadge value={project.status} />
          </div>
        </div>
      </div>
    </Card>
  );
});

export const TasksTab = memo(function TasksTab({ profile, project, employees, selectedMonthId, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const editorEmployees = useMemo(
    () => employees.filter((employee) => employee.roleCode === "EDITOR" || employee.dept === "Media bo'limi"),
    [employees]
  );
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const monthsExist = Array.isArray(project.months) && project.months.length > 0;
  const [showLegacyTasks, setShowLegacyTasks] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    ownerId: assignableEmployees[0]?.id || "",
    format: "",
    montajorId: "",
    start: "",
    deadline: "",
    status: "Rejalashtirildi",
    note: "",
    comments: [],
  });
  const [editingTask, setEditingTask] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const filteredTasks = monthScopedTasks(project.tasks || [], selectedMonthId, monthsExist);
  const legacyTasks = monthsExist
    ? (project.tasks || []).filter((task) => !task.monthId && !taskMatchesMonth(task, selectedMonthId, true))
    : [];

  function resetForm() {
    setDraft({
      name: "",
      ownerId: assignableEmployees[0]?.id || "",
      format: "",
      montajorId: "",
      start: "",
      deadline: "",
      status: "Rejalashtirildi",
      note: "",
      comments: [],
    });
    setEditingTask("");
    setShowComposer(false);
  }

  function openForEdit(task) {
    setEditingTask(task.id);
    setDraft({
      name: task.name || "",
      ownerId: task.ownerId || assignableEmployees[0]?.id || "",
      format: task.format || "",
      montajorId: task.montajorId || "",
      start: task.start || "",
      deadline: task.deadline || "",
      status: task.status || "Rejalashtirildi",
      note: task.note || "",
      comments: task.comments || [],
      monthId: task.monthId || selectedMonthId,
    });
    setShowComposer(true);
  }

  function updateDraftFormat(value) {
    setDraft((prev) => {
      const nextIsVideo = isVideoTask(value);
      const nextStatus = nextIsVideo
        ? (MONTAJ_STATUSES.includes(prev.status) ? prev.status : "Kutilmoqda")
        : (TASK_STATUSES.includes(prev.status) ? prev.status : "Rejalashtirildi");
      return {
        ...prev,
        format: value,
        montajorId: nextIsVideo ? prev.montajorId : "",
        status: nextStatus,
      };
    });
  }

  function saveTask() {
    if (!draft.name?.trim()) return;
    const normalizedDraft = {
      ...draft,
      format: draft.format || "",
      montajorId: isVideoTask(draft.format) ? (draft.montajorId || "") : "",
      status: isVideoTask(draft.format)
        ? (MONTAJ_STATUSES.includes(draft.status) ? draft.status : "Kutilmoqda")
        : (TASK_STATUSES.includes(draft.status) ? draft.status : "Rejalashtirildi"),
    };
    const tasks = editingTask
      ? project.tasks.map((task) => (task.id === editingTask ? withRecordMeta({ ...task, ...normalizedDraft, monthId: normalizedDraft.monthId || selectedMonthId }, profile) : task))
      : [...project.tasks, withRecordMeta({ ...normalizedDraft, id: makeId("task"), monthId: selectedMonthId }, profile)];
    onUpdateProject({ ...project, tasks }, { notifyText: `Task yangilandi: ${draft.name}`, auditText: `Task saqlandi: ${draft.name}`, page: "projects" });
    resetForm();
  }

  function updateTaskStatus(taskId, status) {
    onUpdateProject(
      { ...project, tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)) },
      { notifyText: "Task holati yangilandi", auditText: `Task statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(taskId, text) {
    onUpdateProject(
      {
        ...project,
        tasks: project.tasks.map((task) =>
          task.id === taskId ? { ...task, comments: [...normalizeComments(task.comments), createComment(text, profile)] } : task
        ),
      },
      { notifyText: "Task izohi qo'shildi", auditText: "Taskga izoh qo'shildi", page: "projects" }
    );
  }

  function deleteTask(taskId) {
    if (!window.confirm("Task o'chirilsinmi?")) return;
    onUpdateProject({ ...project, tasks: project.tasks.filter((task) => task.id !== taskId) }, { notifyText: "Task o'chirildi", auditText: "Task o'chirildi", page: "projects" });
  }

  function renderTaskRows(tasks) {
    return tasks.map((task) => {
      const owner = employeeMap[task.ownerId];
      const assignedEditor = employeeMap[task.montajorId];
      const canChangeStatus = sectionEditable;
      const done = task.status === "Bajarildi";
      const overdue = task.deadline && task.deadline < isoNow().slice(0, 10) && !done;
      const videoTask = isVideoTask(task);
      return (
        <Row key={task.id}>
          <Cell style={{ fontWeight: 800 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 18, height: 18, borderRadius: 6, background: done ? T.colors.green : T.colors.surface, border: `1px solid ${done ? T.colors.green : T.colors.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0 }}>
                {done ? "✓" : ""}
              </span>
              <div>
                <div>{task.name}</div>
                {task.format ? <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: T.colors.accent }}>{task.format}</div> : null}
                {assignedEditor ? <div style={{ marginTop: 4, fontSize: 11, color: T.colors.textSecondary }}>Montajor: {assignedEditor.name}</div> : null}
                {task.note ? <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>{task.note}</div> : null}
              </div>
            </div>
          </Cell>
          <Cell>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {owner ? <Avatar name={owner.name} url={owner.avatarUrl} size={28} /> : null}
              <span>{owner?.name || "Biriktirilmagan"}</span>
            </div>
          </Cell>
          <Cell>{task.start || "-"}</Cell>
          <Cell style={{ fontWeight: 800, color: overdue ? T.colors.red : T.colors.text }}>{task.deadline || "-"}</Cell>
          <Cell>
            <StatusSelect
              value={task.status}
              options={videoTask ? MONTAJ_STATUSES : TASK_STATUSES}
              onChange={canChangeStatus ? (status) => updateTaskStatus(task.id, status) : null}
              disabled={!canChangeStatus}
            />
          </Cell>
          <Cell style={{ color: T.colors.textMuted }}>{task.note || "—"}</Cell>
          <Cell>
            <CommentThread comments={task.comments} onAddComment={sectionEditable ? (text) => addComment(task.id, text) : null} placeholder="Task bo'yicha izoh yozing..." />
          </Cell>
          <Cell>
            {sectionEditable ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={() => openForEdit(task)} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                <Button variant="danger" onClick={() => deleteTask(task.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
              </div>
            ) : (
              "-"
            )}
          </Cell>
        </Row>
      );
    });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Topshiriqlar</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textSecondary }}>{getMonthLabel(selectedMonthId)} workspace</div>
        </div>
        {sectionEditable ? <Button onClick={() => { resetForm(); setShowComposer(true); }}>+ Task qo'shish</Button> : null}
      </div>

      {sectionEditable && showComposer ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Task nomi" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Format" value={draft.format} onChange={updateDraftFormat} options={[{ value: "", label: "Format tanlanmagan" }, ...FORMATS.map((format) => ({ value: format, label: format }))]} />
            {isVideoTask(draft.format) ? (
              <Field
                label="Montajor"
                value={draft.montajorId}
                onChange={(value) => setDraft((prev) => ({ ...prev, montajorId: value }))}
                options={[{ value: "", label: "Keyin biriktiriladi" }, ...editorEmployees.map((employee) => ({ value: employee.id, label: employee.name }))]}
              />
            ) : null}
            <Field label="Boshlanish" type="date" value={draft.start} onChange={(value) => setDraft((prev) => ({ ...prev, start: value }))} />
            <Field label="Deadline" type="date" value={draft.deadline} onChange={(value) => setDraft((prev) => ({ ...prev, deadline: value }))} />
            <Field
              label="Status"
              value={draft.status}
              onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))}
              options={isVideoTask(draft.format) ? MONTAJ_STATUSES : TASK_STATUSES}
            />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <Button variant="secondary" onClick={resetForm}>Bekor</Button>
            <Button onClick={saveTask}>{editingTask ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {filteredTasks.length ? (
        <DataTable columns={["Task", "Mas'ul", "Boshlanish", "Deadline", "Holat", "Izoh", "Komment", "Amal"]}>
          {renderTaskRows(filteredTasks)}
        </DataTable>
      ) : (
        <EmptyState title="Tasklar yo'q" desc={`${getMonthLabel(selectedMonthId)} uchun task yozuvlari shu yerda ko'rinadi.`} />
      )}

      {monthsExist && legacyTasks.length ? (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowLegacyTasks((current) => !current)}
            style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.font, fontSize: 13, fontWeight: 800, color: T.colors.textSecondary }}
          >
            📋 Eski tasklar ({legacyTasks.length} ta) {showLegacyTasks ? "−" : "+"}
          </button>
          {showLegacyTasks ? (
            <div style={{ marginTop: 12 }}>
              <DataTable columns={["Task", "Mas'ul", "Boshlanish", "Deadline", "Holat", "Izoh", "Komment", "Amal"]}>
                {renderTaskRows(legacyTasks)}
              </DataTable>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
});

function MonthlyContentSheet({ profile, project, employees, selectedMonthId, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const defaultOwnerId = assignableEmployees[0]?.id || "";
  const contentItems = project.contentPlan || [];
  const [rows, setRows] = useState([]);
  const [scenarioDay, setScenarioDay] = useState(null);

  useEffect(() => {
    const scoped = contentItems.filter((item) => recordMatchesMonth(item, selectedMonthId));
    setRows(DAY_ROWS.map((day) => {
      const existing = scoped.find((item) => getRecordDay(item) === day) || null;
      return {
        day,
        existing,
        platform: existing?.platform || "Instagram",
        format: existing?.format || "Post",
        topic: existing?.topic || "",
        caption: existing?.caption || "",
        ownerId: existing?.ownerId || defaultOwnerId,
        status: existing?.status || "Rejalashtirildi",
        note: existing?.note || "",
      };
    }));
  }, [contentItems, selectedMonthId, defaultOwnerId]);

  function updateRow(day, key, value) {
    setRows((current) => current.map((row) => (row.day === day ? { ...row, [key]: value } : row)));
  }

  const activeScenarioRow = rows.find((row) => row.day === scenarioDay) || null;

  function saveRows() {
    const otherItems = contentItems.filter((item) => !recordMatchesMonth(item, selectedMonthId));
    const nextItems = rows
      .filter((row) => row.topic.trim() || row.caption.trim() || row.note.trim())
      .map((row) => withRecordMeta({
        ...(row.existing || {}),
        id: row.existing?.id || makeId("content"),
        date: buildMonthDate(selectedMonthId, row.day),
        monthId: selectedMonthId,
        platform: row.platform,
        format: row.format,
        topic: row.topic.trim(),
        caption: row.caption.trim(),
        ownerId: row.ownerId || defaultOwnerId,
        status: row.status,
        note: row.note.trim(),
        comments: normalizeComments(row.existing?.comments),
      }, profile));
    onUpdateProject({ ...project, contentPlan: [...otherItems, ...nextItems] }, { notifyText: "Kontent reja saqlandi", auditText: `Kontent jadvali saqlandi: ${getMonthLabel(selectedMonthId)}`, page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Kontent reja</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textSecondary }}>{getMonthLabel(selectedMonthId)} uchun 31 kunlik jadval</div>
        </div>
        {sectionEditable ? <Button onClick={saveRows}>Jadvalni saqlash</Button> : null}
      </div>
      <DataTable columns={["Kun", "Platforma", "Format", "Mavzu", "Ssenariy", "Mas'ul", "Holat", "Izoh"]}>
        {rows.map((row) => (
          <Row key={row.day}>
            <Cell style={{ fontWeight: 800 }}>{String(row.day).padStart(2, "0")}</Cell>
            <Cell><SelectCellInput value={row.platform} onChange={(value) => updateRow(row.day, "platform", value)} disabled={!sectionEditable} options={PLATFORMS} /></Cell>
            <Cell><SelectCellInput value={row.format} onChange={(value) => updateRow(row.day, "format", value)} disabled={!sectionEditable} options={FORMATS} /></Cell>
            <Cell><TextCellInput value={row.topic} onChange={(value) => updateRow(row.day, "topic", value)} disabled={!sectionEditable} placeholder="Mavzu" /></Cell>
            <Cell>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setScenarioDay(row.day)}
                  style={{
                    ...SHEET_INPUT_STYLE,
                    cursor: "pointer",
                    textAlign: "left",
                    minHeight: 40,
                    background: row.caption ? T.colors.surface : T.colors.bg,
                  }}
                >
                  {row.caption ? (
                    <span style={{ display: "block", color: T.colors.text, fontSize: 12, lineHeight: 1.4 }}>
                      {row.caption.length > 88 ? `${row.caption.slice(0, 88)}...` : row.caption}
                    </span>
                  ) : (
                    <span style={{ color: T.colors.textSecondary }}>Ssenariy yozish / o'qish</span>
                  )}
                </button>
                <div style={{ fontSize: 11, color: T.colors.textTertiary }}>
                  {row.caption ? `${row.caption.length} belgi` : "Bo'sh"}
                </div>
              </div>
            </Cell>
            <Cell><SelectCellInput value={row.ownerId} onChange={(value) => updateRow(row.day, "ownerId", value)} disabled={!sectionEditable} options={[{ value: "", label: "Tanlanmagan" }, ...assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))]} /></Cell>
            <Cell><StatusCellSelect value={row.status} onChange={(value) => updateRow(row.day, "status", value)} disabled={!sectionEditable} options={CONTENT_STATUSES} /></Cell>
            <Cell><TextCellInput value={row.note} onChange={(value) => updateRow(row.day, "note", value)} disabled={!sectionEditable} placeholder="Izoh" /></Cell>
          </Row>
        ))}
      </DataTable>
      {activeScenarioRow ? (
        <ScenarioModal
          day={activeScenarioRow.day}
          value={activeScenarioRow.caption}
          editable={sectionEditable}
          onClose={() => setScenarioDay(null)}
          onSave={(text) => {
            updateRow(activeScenarioRow.day, "caption", text);
            setScenarioDay(null);
          }}
          onClear={() => {
            updateRow(activeScenarioRow.day, "caption", "");
            setScenarioDay(null);
          }}
        />
      ) : null}
    </Card>
  );
}

function MonthlyMediaSheet({ profile, project, employees, selectedMonthId, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const defaultOwnerId = assignableEmployees[0]?.id || "";
  const mediaItems = project.mediaPlan || [];
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const scoped = mediaItems.filter((item) => recordMatchesMonth(item, selectedMonthId));
    setRows(DAY_ROWS.map((day) => {
      const existing = scoped.find((item) => getRecordDay(item) === day) || null;
      return {
        day,
        existing,
        type: existing?.type || "Post",
        platform: existing?.platform || "Instagram",
        format: existing?.format || "Post",
        ownerId: existing?.ownerId || defaultOwnerId,
        budget: existing?.budget ? String(existing.budget) : "",
        status: existing?.status || "Rejalashtirildi",
        note: existing?.note || "",
      };
    }));
  }, [mediaItems, selectedMonthId, defaultOwnerId]);

  function updateRow(day, key, value) {
    setRows((current) => current.map((row) => (row.day === day ? { ...row, [key]: value } : row)));
  }

  function saveRows() {
    const otherItems = mediaItems.filter((item) => !recordMatchesMonth(item, selectedMonthId));
    const nextItems = rows
      .filter((row) => Number(row.budget || 0) > 0 || row.note.trim())
      .map((row) => withRecordMeta({
        ...(row.existing || {}),
        id: row.existing?.id || makeId("media"),
        date: buildMonthDate(selectedMonthId, row.day),
        monthId: selectedMonthId,
        type: row.type,
        platform: row.platform,
        format: row.format,
        ownerId: row.ownerId || defaultOwnerId,
        budget: Number(row.budget || 0),
        status: row.status,
        note: row.note.trim(),
        comments: normalizeComments(row.existing?.comments),
      }, profile));
    onUpdateProject({ ...project, mediaPlan: [...otherItems, ...nextItems] }, { notifyText: "Media plan saqlandi", auditText: `Media plan jadvali saqlandi: ${getMonthLabel(selectedMonthId)}`, page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Media plan</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textSecondary }}>{getMonthLabel(selectedMonthId)} uchun 31 kunlik jadval</div>
        </div>
        {sectionEditable ? <Button onClick={saveRows}>Jadvalni saqlash</Button> : null}
      </div>
      <DataTable columns={["Kun", "Tur", "Platforma", "Format", "Mas'ul", "Byudjet", "Holat", "Izoh"]}>
        {rows.map((row) => (
          <Row key={row.day}>
            <Cell style={{ fontWeight: 800 }}>{String(row.day).padStart(2, "0")}</Cell>
            <Cell><SelectCellInput value={row.type} onChange={(value) => updateRow(row.day, "type", value)} disabled={!sectionEditable} options={FORMATS} /></Cell>
            <Cell><SelectCellInput value={row.platform} onChange={(value) => updateRow(row.day, "platform", value)} disabled={!sectionEditable} options={PLATFORMS} /></Cell>
            <Cell><SelectCellInput value={row.format} onChange={(value) => updateRow(row.day, "format", value)} disabled={!sectionEditable} options={FORMATS} /></Cell>
            <Cell><SelectCellInput value={row.ownerId} onChange={(value) => updateRow(row.day, "ownerId", value)} disabled={!sectionEditable} options={[{ value: "", label: "Tanlanmagan" }, ...assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))]} /></Cell>
            <Cell><NumberCellInput value={row.budget} onChange={(value) => updateRow(row.day, "budget", value)} disabled={!sectionEditable} placeholder="0" /></Cell>
            <Cell><StatusCellSelect value={row.status} onChange={(value) => updateRow(row.day, "status", value)} disabled={!sectionEditable} options={PLAN_STATUSES} /></Cell>
            <Cell><TextCellInput value={row.note} onChange={(value) => updateRow(row.day, "note", value)} disabled={!sectionEditable} placeholder="Izoh" /></Cell>
          </Row>
        ))}
      </DataTable>
    </Card>
  );
}

function MonthlyPlansSheet({ profile, project, selectedMonthId, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const dailyPlans = project.plans?.daily || [];
  const taskOptions = [{ value: "", label: "Tanlanmagan" }, ...monthScopedTasks(project.tasks || [], selectedMonthId, Array.isArray(project.months) && project.months.length > 0).map((task) => ({ value: task.id, label: task.name }))];
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const scoped = dailyPlans.filter((item) => recordMatchesMonth(item, selectedMonthId));
    setRows(DAY_ROWS.map((day) => {
      const existing = scoped.find((item) => getRecordDay(item) === day) || null;
      return {
        day,
        existing,
        title: existing?.title || "",
        taskId: existing?.taskId || "",
        status: existing?.status || "Rejalashtirildi",
        note: existing?.note || "",
      };
    }));
  }, [dailyPlans, selectedMonthId]);

  function updateRow(day, key, value) {
    setRows((current) => current.map((row) => (row.day === day ? { ...row, [key]: value } : row)));
  }

  function saveRows() {
    const otherItems = dailyPlans.filter((item) => !recordMatchesMonth(item, selectedMonthId));
    const nextItems = rows
      .filter((row) => row.title.trim() || row.note.trim() || row.taskId)
      .map((row) => withRecordMeta({
        ...(row.existing || {}),
        id: row.existing?.id || makeId("plan"),
        date: buildMonthDate(selectedMonthId, row.day),
        monthId: selectedMonthId,
        title: row.title.trim(),
        taskId: row.taskId,
        status: row.status,
        note: row.note.trim(),
        comments: normalizeComments(row.existing?.comments),
      }, profile));
    onUpdateProject(
      { ...project, plans: { ...project.plans, daily: [...otherItems, ...nextItems] } },
      { notifyText: "Rejalar saqlandi", auditText: `Rejalar jadvali saqlandi: ${getMonthLabel(selectedMonthId)}`, page: "projects" }
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Rejalar</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textSecondary }}>{getMonthLabel(selectedMonthId)} uchun 31 kunlik jadval</div>
        </div>
        {sectionEditable ? <Button onClick={saveRows}>Jadvalni saqlash</Button> : null}
      </div>
      <DataTable columns={["Kun", "Sarlavha", "Bog'liq task", "Holat", "Izoh"]}>
        {rows.map((row) => (
          <Row key={row.day}>
            <Cell style={{ fontWeight: 800 }}>{String(row.day).padStart(2, "0")}</Cell>
            <Cell><TextCellInput value={row.title} onChange={(value) => updateRow(row.day, "title", value)} disabled={!sectionEditable} placeholder="Kunlik reja" /></Cell>
            <Cell><SelectCellInput value={row.taskId} onChange={(value) => updateRow(row.day, "taskId", value)} disabled={!sectionEditable} options={taskOptions} /></Cell>
            <Cell><StatusCellSelect value={row.status} onChange={(value) => updateRow(row.day, "status", value)} disabled={!sectionEditable} options={PLAN_STATUSES} /></Cell>
            <Cell><TextCellInput value={row.note} onChange={(value) => updateRow(row.day, "note", value)} disabled={!sectionEditable} placeholder="Izoh" /></Cell>
          </Row>
        ))}
      </DataTable>
    </Card>
  );
}

function MonthlyCallsSheet({ profile, project, employees, selectedMonthId, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const defaultWhoId = assignableEmployees[0]?.id || "";
  const calls = project.calls || [];
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const scoped = calls.filter((item) => recordMatchesMonth(item, selectedMonthId));
    setRows(DAY_ROWS.map((day) => {
      const existing = scoped.find((item) => getRecordDay(item) === day) || null;
      return {
        day,
        existing,
        type: existing?.type || "Call",
        whoId: existing?.whoId || defaultWhoId,
        result: existing?.result || "",
        next: existing?.next || "",
        status: existing?.status || "Yangi",
      };
    }));
  }, [calls, selectedMonthId, defaultWhoId]);

  function updateRow(day, key, value) {
    setRows((current) => current.map((row) => (row.day === day ? { ...row, [key]: value } : row)));
  }

  function saveRows() {
    const otherItems = calls.filter((item) => !recordMatchesMonth(item, selectedMonthId));
    const nextItems = rows
      .filter((row) => row.result.trim() || row.next.trim())
      .map((row) => withRecordMeta({
        ...(row.existing || {}),
        id: row.existing?.id || makeId("call"),
        date: buildMonthDate(selectedMonthId, row.day),
        monthId: selectedMonthId,
        type: row.type,
        whoId: row.whoId || defaultWhoId,
        result: row.result.trim(),
        next: row.next.trim(),
        status: row.status,
        comments: normalizeComments(row.existing?.comments),
      }, profile));
    onUpdateProject({ ...project, calls: [...otherItems, ...nextItems] }, { notifyText: "Aloqalar saqlandi", auditText: `Aloqalar jadvali saqlandi: ${getMonthLabel(selectedMonthId)}`, page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Aloqalar</div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textSecondary }}>{getMonthLabel(selectedMonthId)} uchun 31 kunlik jadval</div>
        </div>
        {sectionEditable ? <Button onClick={saveRows}>Jadvalni saqlash</Button> : null}
      </div>
      <DataTable columns={["Kun", "Tur", "Kim gaplashdi", "Natija", "Keyingi qadam", "Holat"]}>
        {rows.map((row) => (
          <Row key={row.day}>
            <Cell style={{ fontWeight: 800 }}>{String(row.day).padStart(2, "0")}</Cell>
            <Cell><SelectCellInput value={row.type} onChange={(value) => updateRow(row.day, "type", value)} disabled={!sectionEditable} options={["Call", "Meeting"]} /></Cell>
            <Cell><SelectCellInput value={row.whoId} onChange={(value) => updateRow(row.day, "whoId", value)} disabled={!sectionEditable} options={[{ value: "", label: "Tanlanmagan" }, ...assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))]} /></Cell>
            <Cell><TextCellInput value={row.result} onChange={(value) => updateRow(row.day, "result", value)} disabled={!sectionEditable} placeholder="Natija" /></Cell>
            <Cell><TextCellInput value={row.next} onChange={(value) => updateRow(row.day, "next", value)} disabled={!sectionEditable} placeholder="Keyingi qadam" /></Cell>
            <Cell><StatusCellSelect value={row.status} onChange={(value) => updateRow(row.day, "status", value)} disabled={!sectionEditable} options={CALL_STATUSES} /></Cell>
          </Row>
        ))}
      </DataTable>
    </Card>
  );
}

export const ContentPlanTab = memo(function ContentPlanTab(props) {
  return <MonthlyContentSheet {...props} />;
});

export const MediaPlanTab = memo(function MediaPlanTab(props) {
  return <MonthlyMediaSheet {...props} />;
});

export const PlansTab = memo(function PlansTab(props) {
  return <MonthlyPlansSheet {...props} />;
});

export const CallsTab = memo(function CallsTab(props) {
  return <MonthlyCallsSheet {...props} />;
});

function WorkspaceModal({ initialValue, onClose, onSubmit }) {
  const [form, setForm] = useState(() => {
    const currentMonthId = getCurrentMonthId();
    return initialValue || {
      id: currentMonthId,
      label: getMonthLabel(currentMonthId),
      status: "active",
    };
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMonthChange(value) {
    update("id", value);
    if (!initialValue?.label || initialValue?.label === getMonthLabel(initialValue?.id)) {
      update("label", getMonthLabel(value));
    }
  }

  function handleSubmit() {
    if (!form.id || !form.label.trim()) return;
    onSubmit({
      id: form.id,
      label: form.label.trim(),
      status: form.status || "active",
      createdAt: initialValue?.createdAt || isoNow(),
    });
  }

  return (
    <Modal title={initialValue ? "Workspace ni tahrirlash" : "Yangi workspace"} onClose={onClose} width={620}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        {initialValue ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>Oy / davr</span>
            <div style={{ ...SHEET_INPUT_STYLE, display: "flex", alignItems: "center", minHeight: 42, color: T.colors.textSecondary }}>
              {getMonthLabel(form.id)}
            </div>
          </div>
        ) : (
          <Field label="Oy / davr" type="month" value={form.id} onChange={handleMonthChange} />
        )}
        <Field label="Holati" value={form.status} onChange={(value) => update("status", value)} options={[{ value: "active", label: "Faol" }, { value: "archived", label: "Arxiv" }]} />
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Oyna nomi" value={form.label} onChange={(value) => update("label", value)} placeholder="Masalan: Mart 2026 yoki 1-davr" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Bekor</Button>
        <Button onClick={handleSubmit}>Saqlash</Button>
      </div>
    </Modal>
  );
}

function ScenarioModal({ value, onClose, onSave, onClear, editable, day }) {
  const [text, setText] = useState(value || "");

  return (
    <Modal title={`${String(day).padStart(2, "0")} kun — Ssenariy`} onClose={onClose} width={760}>
      <Field
        label="Ssenariy matni"
        type="textarea"
        rows={10}
        value={text}
        onChange={setText}
        placeholder="Video/post uchun ssenariy, kadrlar, matn va izohlarni shu yerga yozing..."
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 20 }}>
        <div>
          {editable ? <Button variant="danger" onClick={() => onClear()}>O'chirish</Button> : null}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          {editable ? <Button onClick={() => onSave(text)}>Saqlash</Button> : null}
        </div>
      </div>
    </Modal>
  );
}

export const ProjectDetailPage = memo(function ProjectDetailPage({ profile, project, employees, onBack, onSaveProject, onDeleteProject }) {
  const [tab, setTab] = useState("tasks");
  const [editingProject, setEditingProject] = useState(false);
  const [workspaceModalMonth, setWorkspaceModalMonth] = useState(null);
  const [showWorkspaceCreate, setShowWorkspaceCreate] = useState(false);
  const [workspaceDeleteTarget, setWorkspaceDeleteTarget] = useState(null);
  const editable = canManageProjectMeta(profile, project);
  const canViewProjectMoney = canViewProjectFinance(profile.role);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const manager = employeeMap[project.managerId];
  const progress = calcProjectProgress(project);
  const progressColor = progress >= 75 ? T.colors.green : progress >= 40 ? T.colors.accent : T.colors.orange;
  const months = useMemo(() => getMonthList(project.months), [project.months]);
  const [selectedMonthId, setSelectedMonthId] = useState(months[0]?.id || getCurrentMonthId());

  useEffect(() => {
    const activeMonthId = months.find((month) => month.status === "active")?.id || months[0]?.id || getCurrentMonthId();
    setSelectedMonthId((current) => (months.some((month) => month.id === current) ? current : activeMonthId));
  }, [months]);

  function saveWorkspaceMonth(nextMonth, mode = "create") {
    const existingIndex = months.findIndex((month) => month.id === nextMonth.id);
    let nextMonths = months.map((month) => ({ ...month }));

    if (nextMonth.status === "active") {
      nextMonths = nextMonths.map((month) => ({ ...month, status: "archived" }));
    }

    if (existingIndex >= 0) {
      nextMonths[existingIndex] = { ...nextMonths[existingIndex], ...nextMonth };
    } else {
      nextMonths.push({ ...nextMonth, createdAt: nextMonth.createdAt || isoNow() });
    }

    nextMonths.sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));
    setSelectedMonthId(nextMonth.id);
    onSaveProject(
      { ...project, months: nextMonths },
      {
        notifyText: mode === "create" ? `Yangi workspace yaratildi: ${nextMonth.label}` : `Workspace yangilandi: ${nextMonth.label}`,
        auditText: mode === "create" ? `Workspace yaratildi: ${nextMonth.label}` : `Workspace tahrirlandi: ${nextMonth.label}`,
        page: "projects",
      }
    );
  }

  function toggleWorkspaceStatus(month) {
    const nextStatus = month.status === "active" ? "archived" : "active";
    saveWorkspaceMonth({ ...month, status: nextStatus }, "edit");
  }

  function deleteWorkspaceMonth(month) {
    const nextMonths = months.filter((item) => item.id !== month.id);
    const nextProject = {
      ...project,
      months: nextMonths,
      tasks: (project.tasks || []).filter((task) => task.monthId !== month.id),
      contentPlan: (project.contentPlan || []).filter((item) => item.monthId !== month.id),
      mediaPlan: (project.mediaPlan || []).filter((item) => item.monthId !== month.id),
      plans: {
        ...project.plans,
        daily: (project.plans?.daily || []).filter((item) => item.monthId !== month.id),
      },
      calls: (project.calls || []).filter((item) => item.monthId !== month.id),
    };
    const fallbackMonthId = nextMonths.find((item) => item.status === "active")?.id || nextMonths[0]?.id || getCurrentMonthId();
    setSelectedMonthId(fallbackMonthId);
    onSaveProject(
      nextProject,
      { notifyText: `Workspace o'chirildi: ${month.label}`, auditText: `Workspace o'chirildi: ${month.label}`, page: "projects" }
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.colors.accent, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: 600, marginBottom: 20, padding: 0 }}>← Orqaga</button>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <CircleProgress pct={progress} size={90} stroke={8} color={progressColor} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: progressColor }}>{progress}%</span>
              <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{project.tasks.filter((task) => task.status === "Bajarildi").length}/{project.tasks.length}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{project.name}</h2>
              {editable ? (
                <StatusSelect value={project.status} options={PROJECT_STATUSES} onChange={(status) => onSaveProject({ ...project, status }, { notifyText: "Loyiha holati o'zgardi", auditText: `Loyiha statusi o'zgardi: ${status}`, page: "projects" })} />
              ) : (
                <StatusBadge value={project.status} />
              )}
              <PriorityBadge value={project.priority} />
            </div>
            <p style={{ margin: "0 0 10px", color: T.colors.textSecondary, fontSize: 14 }}>{project.client} · {project.type || "Xizmat turi yo'q"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: T.colors.textSecondary, fontSize: 12 }}>
              <span>📅 {project.start || "-"} → {project.end || "-"}</span>
              <span>👥 {project.teamIds.length} kishi</span>
              {canViewProjectMoney ? <span>💰 {project.servicePrice ? `${toMoney(project.servicePrice)} so'm` : "Xizmat narxi kiritilmagan"}</span> : null}
              {profile.role === "EMPLOYEE" ? <span>• Siz bu loyiha workspace ichida ishlay olasiz</span> : null}
            </div>
            {project.teamIds.length ? (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {project.teamIds.slice(0, 5).map((teamId, index) => {
                  const teamMember = employeeMap[teamId];
                  return teamMember ? <div key={teamId} style={{ marginLeft: index ? -6 : 0 }}><Avatar name={teamMember.name} url={teamMember.avatarUrl} size={24} /></div> : null;
                })}
              </div>
            ) : null}
          </div>
          <div style={{ flexShrink: 0, minWidth: 190 }}>
            <div style={{ fontSize: 11, color: T.colors.textTertiary, marginBottom: 6 }}>Manager</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {manager ? <Avatar name={manager.name} url={manager.avatarUrl} size={36} /> : <Avatar name="?" size={36} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{manager?.name || "Manager biriktirilmagan"}</div>
                <div style={{ fontSize: 12, color: T.colors.textSecondary }}>{manager?.role || "—"}</div>
              </div>
            </div>
            {editable ? (
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Button variant="secondary" onClick={() => setEditingProject(true)}>Tahrirlash</Button>
                <Button variant="danger" onClick={() => onDeleteProject(project.id)}>O'chirish</Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <MonthWorkspaceCards
        project={project}
        selectedMonthId={selectedMonthId}
        onSelectMonth={setSelectedMonthId}
        onCreateMonth={() => setShowWorkspaceCreate(true)}
        onEditMonth={setWorkspaceModalMonth}
        onToggleMonthStatus={toggleWorkspaceStatus}
        onDeleteMonth={setWorkspaceDeleteTarget}
        editable={editable}
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: T.colors.surface, borderRadius: T.radius.xl, padding: 6, overflowX: "auto", border: `1px solid ${T.colors.border}`, boxShadow: T.shadow.sm }}>
        {WORKSPACE_TAB_META.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              padding: "10px 18px",
              borderRadius: T.radius.lg,
              border: `1px solid ${tab === item.id ? T.colors.border : "transparent"}`,
              background: tab === item.id ? T.colors.borderLight : "transparent",
              color: tab === item.id ? T.colors.text : T.colors.textSecondary,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: T.font,
              boxShadow: tab === item.id ? T.shadow.sm : "none",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "tasks" ? <TasksTab profile={profile} project={project} employees={employees} selectedMonthId={selectedMonthId} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "content" ? <ContentPlanTab profile={profile} project={project} employees={employees} selectedMonthId={selectedMonthId} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "media" ? <MediaPlanTab profile={profile} project={project} employees={employees} selectedMonthId={selectedMonthId} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "plans" ? <PlansTab profile={profile} project={project} selectedMonthId={selectedMonthId} editable={editable} onUpdateProject={onSaveProject} /> : null}
      {tab === "calls" ? <CallsTab profile={profile} project={project} employees={employees} selectedMonthId={selectedMonthId} editable={editable} onUpdateProject={onSaveProject} /> : null}

      {editingProject ? (
        <ProjectFormModal
          employees={employees}
          initialValue={project}
          onClose={() => setEditingProject(false)}
          onSubmit={(next) => {
            onSaveProject({ ...project, ...next }, { notifyText: "Loyiha tahrirlandi", auditText: `Loyiha saqlandi: ${next.name}`, page: "projects" });
            setEditingProject(false);
          }}
        />
      ) : null}

      {showWorkspaceCreate ? (
        <WorkspaceModal
          onClose={() => setShowWorkspaceCreate(false)}
          onSubmit={(nextMonth) => {
            saveWorkspaceMonth(nextMonth, "create");
            setShowWorkspaceCreate(false);
          }}
        />
      ) : null}

      {workspaceModalMonth ? (
        <WorkspaceModal
          initialValue={workspaceModalMonth}
          onClose={() => setWorkspaceModalMonth(null)}
          onSubmit={(nextMonth) => {
            saveWorkspaceMonth(nextMonth, "edit");
            setWorkspaceModalMonth(null);
          }}
        />
      ) : null}

      {workspaceDeleteTarget ? (
        <ConfirmDialog
          message={`"${workspaceDeleteTarget.label}" workspace butunlay o'chirilsinmi? Shu oynadagi task, kontent, media plan, rejalar va aloqalar ham olib tashlanadi.`}
          onCancel={() => setWorkspaceDeleteTarget(null)}
          onConfirm={() => {
            deleteWorkspaceMonth(workspaceDeleteTarget);
            setWorkspaceDeleteTarget(null);
          }}
        />
      ) : null}
    </div>
  );
});

export function ProjectFormModal({ employees, initialValue, onClose, onSubmit }) {
  const [form, setForm] = useState(
    initialValue || {
      name: "",
      client: "",
      type: "",
      start: "",
      end: "",
      managerId: employees[0]?.id || "",
      teamIds: [],
      servicePrice: "",
      status: "Rejalashtirildi",
      priority: "O'rta",
    }
  );

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.client.trim() || Number(form.servicePrice || 0) <= 0) return;
    onSubmit({ ...form, servicePrice: Number(form.servicePrice || 0), teamIds: Array.from(new Set([...form.teamIds, form.managerId].filter(Boolean))) });
  }

  return (
    <Modal title={initialValue ? "Loyihani tahrirlash" : "Yangi loyiha"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <Field label="Loyiha nomi" value={form.name} onChange={(value) => update("name", value)} />
        <Field label="Mijoz" value={form.client} onChange={(value) => update("client", value)} />
        <Field label="Xizmat turi" value={form.type} onChange={(value) => update("type", value)} />
        <Field label="Manager" value={form.managerId} onChange={(value) => update("managerId", value)} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
        <Field label="Boshlanish" type="date" value={form.start} onChange={(value) => update("start", value)} />
        <Field label="Deadline" type="date" value={form.end} onChange={(value) => update("end", value)} />
        <Field label="Xizmat narxi (so'm)" type="number" required value={form.servicePrice} onChange={(value) => update("servicePrice", value)} />
        <Field label="Loyiha statusi" value={form.status} onChange={(value) => update("status", value)} options={PROJECT_STATUSES} />
        <Field label="Muhimlik" value={form.priority} onChange={(value) => update("priority", value)} options={PRIORITIES} />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.colors.textMuted, marginBottom: 8 }}>Jamoa</div>
        <TeamSelector employees={employees} value={form.teamIds} onChange={(value) => update("teamIds", value)} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Bekor</Button>
        <Button onClick={handleSubmit}>Saqlash</Button>
      </div>
    </Modal>
  );
}
