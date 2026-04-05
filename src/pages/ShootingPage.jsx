import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";
import { ShootingKanban } from "../components/ShootingKanban.jsx";

export function ShootingPage({ profile, shoots, projects, employees, onSaveShoot, onDeleteShoot }) {
  const sectionEditable = profile.role !== "INVESTOR" && projects.length > 0;
  const projectMap = useMemo(() => indexById(projects), [projects]);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [editingId, setEditingId] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({
    date: "",
    time: "",
    projectId: projects[0]?.id || "",
    type: "",
    location: "",
    operatorId: employees[0]?.id || "",
    goal: "",
    note: "",
    status: "Yangi",
    comments: [],
  });

  const sortedShoots = useMemo(
    () => [...shoots].sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`)),
    [shoots]
  );

  function reset() {
    setEditingId("");
    setShowComposer(false);
    setDraft({
      date: "",
      time: "",
      projectId: projects[0]?.id || "",
      type: "",
      location: "",
      operatorId: employees[0]?.id || "",
      goal: "",
      note: "",
      status: "Yangi",
      comments: [],
    });
  }

  function save() {
    if (!draft.projectId || !draft.type.trim()) return;
    onSaveShoot(editingId ? { ...draft, id: editingId } : draft);
    reset();
  }

  function addComment(shoot, text) {
    onSaveShoot({ ...shoot, comments: [...normalizeComments(shoot.comments), createComment(text, profile)] });
  }

  function handleAddShootInKanban(projectId) {
    setDraft(prev => ({ ...prev, projectId, status: "Yangi" }));
    setEditingId("");
    setShowComposer(true);
  }

  return (
    <div>
      <PageHeader title="Syomka kalendari" subtitle="Biriktirilgan loyihalar bo'yicha syomka eventlari realtime ishlaydi." />

      {projects.length > 0 ? (
        <ShootingKanban 
          shoots={sortedShoots}
          projects={projects}
          employees={employees}
          profile={profile}
          onSaveShoot={onSaveShoot}
          onDeleteShoot={onDeleteShoot}
          onAddShoot={handleAddShootInKanban}
        />
      ) : (
        <EmptyState title="Syomka yozuvlari yo'q" desc="Syomka kalendari shu yerda yuritiladi." />
      )}

      {showComposer ? (
        <Modal title={editingId ? "Syomkani tahrirlash" : "Yangi syomka qo'shish"} onClose={reset} width={760}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Vaqt" type="time" value={draft.time} onChange={(value) => setDraft((prev) => ({ ...prev, time: value }))} />
            <Field label="Loyiha" value={draft.projectId} onChange={(value) => setDraft((prev) => ({ ...prev, projectId: value }))} options={projects.map((project) => ({ value: project.id, label: project.name }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} placeholder="Reels, product, backstage..." />
            <Field label="Lokatsiya" value={draft.location} onChange={(value) => setDraft((prev) => ({ ...prev, location: value }))} />
            <Field label="Mas'ul xodim" value={draft.operatorId} onChange={(value) => setDraft((prev) => ({ ...prev, operatorId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Maqsad" value={draft.goal} onChange={(value) => setDraft((prev) => ({ ...prev, goal: value }))} />
            <Field label="Holat" value={draft.status} onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))} options={SHOOT_STATUSES} />
            <Field label="Qisqa izoh" value={draft.note} onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <Button variant="secondary" onClick={reset}>Bekor</Button>
            <Button onClick={save}>{editingId ? "Syomkani yangilash" : "Syomka qo'shish"}</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
