import React, { memo, useState, useMemo, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, makeId, sortByRecent, indexById, calcProjectProgress, flattenPlans, splitPlans } from "../core/utils.js";
import { canEdit, canViewReports, canWorkInProject, canManageProjectMeta, projectMembers } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread } from "../components/ui/index.jsx";

export const TasksTab = memo(function TasksTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({
    name: "",
    ownerId: assignableEmployees[0]?.id || "",
    start: "",
    deadline: "",
    status: "Rejalashtirildi",
    note: "",
    comments: [],
  });
  const [editingTask, setEditingTask] = useState("");

  function resetForm() {
    setDraft({
      name: "",
      ownerId: assignableEmployees[0]?.id || "",
      start: "",
      deadline: "",
      status: "Rejalashtirildi",
      note: "",
      comments: [],
    });
    setEditingTask("");
  }

  function openForEdit(task) {
    setEditingTask(task.id);
    setDraft({ ...task });
  }

  function saveTask() {
    if (!draft.name?.trim()) return;
    const tasks = editingTask
      ? project.tasks.map((task) => (task.id === editingTask ? withRecordMeta({ ...task, ...draft }, profile) : task))
      : [...project.tasks, withRecordMeta({ ...draft, id: makeId("task") }, profile)];
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

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Topshiriqlar</div>
        {sectionEditable ? <Button onClick={resetForm}>Yangi task</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Task nomi" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Boshlanish" type="date" value={draft.start} onChange={(value) => setDraft((prev) => ({ ...prev, start: value }))} />
            <Field label="Deadline" type="date" value={draft.deadline} onChange={(value) => setDraft((prev) => ({ ...prev, deadline: value }))} />
            <Field label="Status" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={TASK_STATUSES} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingTask ? <Button variant="secondary" onClick={resetForm}>Bekor</Button> : null}
            <Button onClick={saveTask}>{editingTask ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.tasks.length ? (
        <DataTable columns={["Task", "Mas'ul", "Boshlanish", "Deadline", "Holat", "Izoh", "Komment", "Amal"]}>
          {project.tasks.map((task) => {
            const owner = employeeMap[task.ownerId];
            const canChangeStatus = sectionEditable;
            return (
              <Row key={task.id}>
                <Cell style={{ fontWeight: 800 }}>{task.name}</Cell>
                <Cell>{owner?.name || "Biriktirilmagan"}</Cell>
                <Cell>{task.start || "-"}</Cell>
                <Cell style={{ fontWeight: 800 }}>{task.deadline || "-"}</Cell>
                <Cell>
                  <StatusSelect value={task.status} options={TASK_STATUSES} onChange={canChangeStatus ? (status) => updateTaskStatus(task.id, status) : null} disabled={!canChangeStatus} />
                </Cell>
                <Cell style={{ color: T.colors.textMuted }}>{task.note || "-"}</Cell>
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
          })}
        </DataTable>
      ) : (
        <EmptyState title="Tasklar yo'q" desc="Yangi task qo'shilgach shu yerda ko'rinadi." />
      )}
    </Card>
  );
});

export const ContentPlanTab = memo(function ContentPlanTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", ownerId: assignableEmployees[0]?.id || "", status: "Rejalashtirildi", note: "", comments: [] });
  const [editingId, setEditingId] = useState("");

  function reset() {
    setDraft({ date: "", platform: "Instagram", format: "Post", topic: "", caption: "", ownerId: assignableEmployees[0]?.id || "", status: "Rejalashtirildi", note: "", comments: [] });
    setEditingId("");
  }

  function save() {
    if (!draft.topic.trim()) return;
    const contentPlan = editingId
      ? project.contentPlan.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft }, profile) : item))
      : [...project.contentPlan, withRecordMeta({ ...draft, id: makeId("content") }, profile)];
    onUpdateProject({ ...project, contentPlan }, { notifyText: "Kontent reja yangilandi", auditText: `Kontent saqlandi: ${draft.topic}`, page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, contentPlan: project.contentPlan.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Kontent holati o'zgardi", auditText: `Kontent statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        contentPlan: project.contentPlan.map((item) =>
          item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
        ),
      },
      { notifyText: "Kontentga izoh qo'shildi", auditText: "Kontentga izoh qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Kontent yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, contentPlan: project.contentPlan.filter((item) => item.id !== id) }, { notifyText: "Kontent yozuvi o'chirildi", auditText: "Kontent yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Kontent reja</div>
        {sectionEditable ? <Button onClick={reset}>Yangi kontent</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Platforma" value={draft.platform} onChange={(value) => setDraft((prev) => ({ ...prev, platform: value }))} options={PLATFORMS} />
            <Field label="Format" value={draft.format} onChange={(value) => setDraft((prev) => ({ ...prev, format: value }))} options={FORMATS} />
            <Field label="Mavzu" value={draft.topic} onChange={(value) => setDraft((prev) => ({ ...prev, topic: value }))} />
            <Field label="Caption" value={draft.caption} onChange={(value) => setDraft((prev) => ({ ...prev, caption: value }))} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={CONTENT_STATUSES} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.contentPlan.length ? (
        <DataTable columns={["Sana", "Platforma", "Format", "Mavzu", "Mas'ul", "Holat", "Izoh", "Komment", "Amal"]}>
          {project.contentPlan.map((item) => {
            const owner = employeeMap[item.ownerId];
            const canChangeStatus = sectionEditable;
            return (
              <Row key={item.id}>
                <Cell>{item.date || "-"}</Cell>
                <Cell>{item.platform}</Cell>
                <Cell>{item.format}</Cell>
                <Cell style={{ fontWeight: 800 }}>{item.topic}</Cell>
                <Cell>{owner?.name || "Biriktirilmagan"}</Cell>
                <Cell>
                  <StatusSelect value={item.status} options={CONTENT_STATUSES} onChange={canChangeStatus ? (status) => updateStatus(item.id, status) : null} disabled={!canChangeStatus} />
                </Cell>
                <Cell style={{ color: T.colors.textMuted }}>{item.note || "-"}</Cell>
                <Cell>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Kontent izohi..." />
                </Cell>
                <Cell>
                  {sectionEditable ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                      <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                    </div>
                  ) : (
                    "-"
                  )}
                </Cell>
              </Row>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState title="Kontent reja yo'q" desc="Kontent yozuvlari shu yerda boshqariladi." />
      )}
    </Card>
  );
});

export const MediaPlanTab = memo(function MediaPlanTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({ date: "", type: "Post", platform: "Instagram", format: "Post", ownerId: assignableEmployees[0]?.id || "", budget: "", status: "Rejalashtirildi", note: "", comments: [] });
  const [editingId, setEditingId] = useState("");

  function reset() {
    setDraft({ date: "", type: "Post", platform: "Instagram", format: "Post", ownerId: assignableEmployees[0]?.id || "", budget: "", status: "Rejalashtirildi", note: "", comments: [] });
    setEditingId("");
  }

  function save() {
    const mediaPlan = editingId
      ? project.mediaPlan.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft, budget: Number(draft.budget || 0) }, profile) : item))
      : [...project.mediaPlan, withRecordMeta({ ...draft, id: makeId("media"), budget: Number(draft.budget || 0) }, profile)];
    onUpdateProject({ ...project, mediaPlan }, { notifyText: "Media plan yangilandi", auditText: "Media plan saqlandi", page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, mediaPlan: project.mediaPlan.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Media plan holati o'zgardi", auditText: `Media plan statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        mediaPlan: project.mediaPlan.map((item) =>
          item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
        ),
      },
      { notifyText: "Mediaplan izohi qo'shildi", auditText: "Mediaplan izohi qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Media plan yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, mediaPlan: project.mediaPlan.filter((item) => item.id !== id) }, { notifyText: "Media plan yozuvi o'chirildi", auditText: "Media plan yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Media plan</div>
        {sectionEditable ? <Button onClick={reset}>Yangi yozuv</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={FORMATS} />
            <Field label="Platforma" value={draft.platform} onChange={(value) => setDraft((prev) => ({ ...prev, platform: value }))} options={PLATFORMS} />
            <Field label="Format" value={draft.format} onChange={(value) => setDraft((prev) => ({ ...prev, format: value }))} options={FORMATS} />
            <Field label="Mas'ul" value={draft.ownerId} onChange={(value) => setDraft((prev) => ({ ...prev, ownerId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Byudjet" type="number" value={draft.budget} onChange={(value) => setDraft((prev) => ({ ...prev, budget: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={PLAN_STATUSES} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.mediaPlan.length ? (
        <DataTable columns={["Sana", "Tur", "Platforma", "Mas'ul", "Byudjet", "Holat", "Izoh", "Komment", "Amal"]}>
          {project.mediaPlan.map((item) => {
            const owner = employeeMap[item.ownerId];
            const canChangeStatus = sectionEditable;
            return (
              <Row key={item.id}>
                <Cell>{item.date || "-"}</Cell>
                <Cell>{item.type}</Cell>
                <Cell>{item.platform}</Cell>
                <Cell>{owner?.name || "Biriktirilmagan"}</Cell>
                <Cell>{toMoney(item.budget)} so'm</Cell>
                <Cell>
                  <StatusSelect value={item.status} options={PLAN_STATUSES} onChange={canChangeStatus ? (status) => updateStatus(item.id, status) : null} disabled={!canChangeStatus} />
                </Cell>
                <Cell style={{ color: T.colors.textMuted }}>{item.note || "-"}</Cell>
                <Cell>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Mediaplan izohi..." />
                </Cell>
                <Cell>
                  {sectionEditable ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item, budget: String(item.budget || "") }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                      <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                    </div>
                  ) : (
                    "-"
                  )}
                </Cell>
              </Row>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState title="Media plan yo'q" desc="Byudjet va media yozuvlarini shu yerda qo'shing." />
      )}
    </Card>
  );
});

export const PlansTab = memo(function PlansTab({ profile, project, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const [planType, setPlanType] = useState("daily");
  const [draft, setDraft] = useState({ title: "", status: "Rejalashtirildi", taskId: "", note: "", date: "", week: "", month: "", comments: [] });
  const [editingId, setEditingId] = useState("");
  const currentItems = project.plans?.[planType] || [];

  function reset() {
    setDraft({ title: "", status: "Rejalashtirildi", taskId: "", note: "", date: "", week: "", month: "", comments: [] });
    setEditingId("");
  }

  function save() {
    if (!draft.title.trim()) return;
    const list = editingId
      ? currentItems.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft }, profile) : item))
      : [...currentItems, withRecordMeta({ ...draft, id: makeId("plan") }, profile)];
    onUpdateProject(
      { ...project, plans: { ...project.plans, [planType]: list } },
      { notifyText: "Reja yangilandi", auditText: `Reja saqlandi: ${draft.title}`, page: "projects" }
    );
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, plans: { ...project.plans, [planType]: currentItems.map((item) => (item.id === id ? { ...item, status } : item)) } },
      { notifyText: "Reja holati o'zgardi", auditText: `Reja statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        plans: {
          ...project.plans,
          [planType]: currentItems.map((item) =>
            item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
          ),
        },
      },
      { notifyText: "Rejaga izoh qo'shildi", auditText: "Rejaga izoh qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Reja o'chirilsinmi?")) return;
    onUpdateProject(
      { ...project, plans: { ...project.plans, [planType]: currentItems.filter((item) => item.id !== id) } },
      { notifyText: "Reja o'chirildi", auditText: "Reja o'chirildi", page: "projects" }
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "daily", label: "Kunlik" },
            { id: "weekly", label: "Haftalik" },
            { id: "monthly", label: "Oylik" },
          ].map((tab) => (
            <Button key={tab.id} variant={planType === tab.id ? "primary" : "secondary"} onClick={() => setPlanType(tab.id)} style={{ padding: "8px 12px" }}>
              {tab.label}
            </Button>
          ))}
        </div>
        {sectionEditable ? <Button onClick={reset}>Yangi reja</Button> : null}
      </div>

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {planType === "daily" ? <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} /> : null}
            {planType === "weekly" ? <Field label="Hafta" value={draft.week} onChange={(value) => setDraft((prev) => ({ ...prev, week: value }))} placeholder="Mar 11 - Mar 17" /> : null}
            {planType === "monthly" ? <Field label="Oy" value={draft.month} onChange={(value) => setDraft((prev) => ({ ...prev, month: value }))} placeholder="Mart 2026" /> : null}
            <Field label="Sarlavha" value={draft.title} onChange={(value) => setDraft((prev) => ({ ...prev, title: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={PLAN_STATUSES} />
            <Field label="Bog'liq task" value={draft.taskId} onChange={(value) => setDraft((prev) => ({ ...prev, taskId: value }))} options={[{ value: "", label: "Tanlanmagan" }, ...project.tasks.map((task) => ({ value: task.id, label: task.name }))]} />
            <Field label="Izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {currentItems.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {currentItems.map((item) => {
            const relatedTask = project.tasks.find((task) => task.id === item.taskId);
            return (
              <Card key={item.id} style={{ padding: 16, background: T.colors.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{item.title}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>
                      {item.date || item.week || item.month || "Davr kiritilmagan"}
                      {relatedTask ? ` · Task: ${relatedTask.name}` : ""}
                      {item.note ? ` · ${item.note}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <StatusSelect value={item.status} options={PLAN_STATUSES} onChange={sectionEditable ? (status) => updateStatus(item.id, status) : null} disabled={!sectionEditable} />
                    {sectionEditable ? <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button> : null}
                    {sectionEditable ? <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : null}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Reja bo'yicha izoh..." />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Rejalar yo'q" desc="Kunlik, haftalik va oylik rejalaringiz shu yerda bo'ladi." />
      )}
    </Card>
  );
});

export const CallsTab = memo(function CallsTab({ profile, project, employees, editable, onUpdateProject }) {
  const sectionEditable = canWorkInProject(profile, project);
  const assignableEmployees = projectMembers(project, employees);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ date: "", type: "Call", whoId: assignableEmployees[0]?.id || "", result: "", next: "", status: "Yangi", comments: [] });

  function reset() {
    setEditingId("");
    setDraft({ date: "", type: "Call", whoId: assignableEmployees[0]?.id || "", result: "", next: "", status: "Yangi", comments: [] });
  }

  function save() {
    if (!draft.date && !draft.result && !draft.next) return;
    const calls = editingId
      ? project.calls.map((item) => (item.id === editingId ? withRecordMeta({ ...item, ...draft }, profile) : item))
      : [...project.calls, withRecordMeta({ ...draft, id: makeId("call") }, profile)];
    onUpdateProject({ ...project, calls }, { notifyText: "Mijoz bilan aloqa saqlandi", auditText: "Mijoz bilan aloqa saqlandi", page: "projects" });
    reset();
  }

  function updateStatus(id, status) {
    onUpdateProject(
      { ...project, calls: project.calls.map((item) => (item.id === id ? { ...item, status } : item)) },
      { notifyText: "Aloqa holati yangilandi", auditText: `Aloqa statusi o'zgardi: ${status}`, page: "projects" }
    );
  }

  function addComment(id, text) {
    onUpdateProject(
      {
        ...project,
        calls: project.calls.map((item) =>
          item.id === id ? { ...item, comments: [...normalizeComments(item.comments), createComment(text, profile)] } : item
        ),
      },
      { notifyText: "Aloqaga izoh qo'shildi", auditText: "Aloqaga izoh qo'shildi", page: "projects" }
    );
  }

  function remove(id) {
    if (!window.confirm("Aloqa yozuvi o'chirilsinmi?")) return;
    onUpdateProject({ ...project, calls: project.calls.filter((item) => item.id !== id) }, { notifyText: "Aloqa yozuvi o'chirildi", auditText: "Aloqa yozuvi o'chirildi", page: "projects" });
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Mijoz bilan aloqalar</div>
        {sectionEditable ? <Button onClick={reset}>Yangi aloqa</Button> : null}
      </div>
      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={["Call", "Meeting"]} />
            <Field label="Kim gaplashdi" value={draft.whoId} onChange={(value) => setDraft((prev) => ({ ...prev, whoId: value }))} options={assignableEmployees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Natija" value={draft.result} onChange={(value) => setDraft((prev) => ({ ...prev, result: value }))} />
            <Field label="Keyingi qadam" value={draft.next} onChange={(value) => setDraft((prev) => ({ ...prev, next: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={CALL_STATUSES} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {project.calls.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {project.calls.map((item) => {
            const person = employeeMap[item.whoId];
            return (
              <Card key={item.id} style={{ background: T.colors.bg }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{item.type}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>{item.date || "-"}</div>
                    <div style={{ marginTop: 8 }}>{person?.name || "Mas'ul ko'rsatilmagan"}</div>
                    {item.result ? <div style={{ marginTop: 8, color: T.colors.textMuted }}>Natija: {item.result}</div> : null}
                    {item.next ? <div style={{ marginTop: 4, color: T.colors.accent, fontWeight: 700 }}>Keyingi qadam: {item.next}</div> : null}
                  </div>
                  <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <StatusSelect value={item.status || "Yangi"} options={CALL_STATUSES} onChange={sectionEditable ? (status) => updateStatus(item.id, status) : null} disabled={!sectionEditable} />
                    {sectionEditable ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button variant="secondary" onClick={() => { setEditingId(item.id); setDraft({ ...item }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                        <Button variant="danger" onClick={() => remove(item.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <CommentThread comments={item.comments} onAddComment={sectionEditable ? (text) => addComment(item.id, text) : null} placeholder="Aloqa bo'yicha izoh..." />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Aloqa yozuvlari yo'q" desc="Mijoz bilan call va meetinglar tarixi shu yerda saqlanadi." />
      )}
    </Card>
  );
});

export const ProjectDetailPage = memo(function ProjectDetailPage({ profile, project, employees, onBack, onSaveProject, onDeleteProject }) {
  const [tab, setTab] = useState("tasks");
  const [editingProject, setEditingProject] = useState(false);
  const editable = canManageProjectMeta(profile);
  const sectionEditable = canWorkInProject(profile, project);
  const progress = calcProjectProgress(project);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const manager = employeeMap[project.managerId];
  const progressColor = progress >= 75 ? T.colors.green : progress >= 40 ? T.colors.accent : T.colors.orange;

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

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.colors.bg, borderRadius: T.radius.md, padding: 4, overflowX: "auto" }}>
        {[
          { id: "tasks", label: "Topshiriqlar" },
          { id: "content", label: "Kontent reja" },
          { id: "media", label: "Media plan" },
          { id: "plans", label: "Rejalar" },
          { id: "calls", label: "Aloqalar" },
          ...(canViewReports(profile.role) ? [{ id: "report", label: "Hisobot" }] : []),
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              padding: "7px 16px",
              borderRadius: T.radius.sm,
              border: "none",
              background: tab === item.id ? T.colors.surface : "transparent",
              color: tab === item.id ? T.colors.accent : T.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
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

      {tab === "tasks" ? <TasksTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "content" ? <ContentPlanTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "media" ? <MediaPlanTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "plans" ? <PlansTab profile={profile} project={project} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "calls" ? <CallsTab profile={profile} project={project} employees={employees} editable={sectionEditable} onUpdateProject={onSaveProject} /> : null}
      {tab === "report" && canViewReports(profile.role) ? (
        <ReportEditor
          project={project}
          editable={editable}
          onChange={(report) => onSaveProject({ ...project, report }, { notifyText: "Hisobot yangilandi", auditText: "Loyiha hisobot ma'lumoti yangilandi", page: "reports" })}
        />
      ) : null}

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
      status: "Rejalashtirildi",
      priority: "O'rta",
    }
  );

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.client.trim()) return;
    onSubmit({ ...form, teamIds: Array.from(new Set([...form.teamIds, form.managerId].filter(Boolean))) });
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
