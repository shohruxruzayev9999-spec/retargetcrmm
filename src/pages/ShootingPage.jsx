import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export function ShootingPage({ profile, shoots, projects, employees, onSaveShoot, onDeleteShoot }) {
  const sectionEditable = profile.role !== "INVESTOR" && projects.length > 0;
  const projectMap = useMemo(() => indexById(projects), [projects]);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [editingId, setEditingId] = useState("");
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
  const groupedShoots = useMemo(
    () =>
      sortedShoots.reduce((acc, shoot) => {
        const key = shoot.date || "Sana ko'rsatilmagan";
        if (!acc[key]) acc[key] = [];
        acc[key].push(shoot);
        return acc;
      }, {}),
    [sortedShoots]
  );

  function reset() {
    setEditingId("");
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

  return (
    <div>
      <PageHeader title="Syomka kalendari" subtitle="Biriktirilgan loyihalar bo'yicha syomka eventlari realtime ishlaydi." />

      {sectionEditable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            {editingId ? <Button variant="secondary" onClick={reset}>Bekor</Button> : null}
            <Button onClick={save}>{editingId ? "Syomkani yangilash" : "Syomka qo'shish"}</Button>
          </div>
        </Card>
      ) : null}

      {sortedShoots.length ? (
        <div style={{ display: "grid", gap: 18 }}>
          {Object.entries(groupedShoots).map(([date, items]) => (
            <Card key={date} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{date}</div>
                  <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>{items.length} ta syomka eventi</div>
                </div>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.colors.accent }} />
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {items.map((shoot) => {
                  const project = projectMap[shoot.projectId];
                  const operator = employeeMap[shoot.operatorId];
                  const canMutate = canEdit(profile.role) || Boolean(project);
                  return (
                    <Card key={shoot.id} style={{ background: "#fff", padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 900 }}>{shoot.type || "Syomka turi"}</div>
                            <StatusSelect value={shoot.status || "Yangi"} options={SHOOT_STATUSES} onChange={canMutate ? (status) => onSaveShoot({ ...shoot, status }) : null} disabled={!canMutate} />
                          </div>
                          <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>
                            {project?.name || "Loyiha tanlanmagan"} · {shoot.time || "--:--"} · {shoot.location || "Lokatsiya yo'q"}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
                            Maqsad: {shoot.goal || "-"}<br />
                            Izoh: {shoot.note || "-"}
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.colors.textMuted }}>
                            {operator ? <Avatar name={operator.name} url={operator.avatarUrl} size={24} /> : null}
                            <span style={{ fontSize: 12 }}>{operator?.name || "Mas'ul yo'q"}</span>
                          </div>
                          {canMutate ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button variant="secondary" onClick={() => { setEditingId(shoot.id); setDraft({ ...shoot, comments: normalizeComments(shoot.comments) }); }} style={{ padding: "7px 10px" }}>Tahrirlash</Button>
                              <Button variant="danger" onClick={() => onDeleteShoot(shoot.id)} style={{ padding: "7px 10px" }}>O'chirish</Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <CommentThread comments={shoot.comments} onAddComment={canMutate ? (text) => addComment(shoot, text) : null} placeholder="Syomka bo'yicha izoh..." />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Syomka yozuvlari yo'q" desc="Syomka kalendari shu yerda yuritiladi." />
      )}
    </div>
  );
}

