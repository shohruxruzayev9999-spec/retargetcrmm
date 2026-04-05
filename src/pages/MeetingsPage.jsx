import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export function MeetingsPage({ profile, meetings, employees, onAddMeeting, onDeleteMeeting }) {
  const editable = canEdit(profile.role);
  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const [draft, setDraft] = useState({ client: "", date: "", type: "Call", whoId: employees[0]?.id || "", result: "", next: "" });

  return (
    <div>
      <PageHeader title="Uchrashuvlar va qo'ng'iroqlar" subtitle="Barcha uchrashuv va call yozuvlari saqlanadi." />

      {editable ? (
        <Card style={{ background: T.colors.bg, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Field label="Mijoz" value={draft.client} onChange={(value) => setDraft((prev) => ({ ...prev, client: value }))} />
            <Field label="Sana" type="date" value={draft.date} onChange={(value) => setDraft((prev) => ({ ...prev, date: value }))} />
            <Field label="Tur" value={draft.type} onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))} options={["Call", "Meeting"]} />
            <Field label="Kim gaplashdi" value={draft.whoId} onChange={(value) => setDraft((prev) => ({ ...prev, whoId: value }))} options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            <Field label="Natija" value={draft.result} onChange={(value) => setDraft((prev) => ({ ...prev, result: value }))} />
            <Field label="Keyingi qadam" value={draft.next} onChange={(value) => setDraft((prev) => ({ ...prev, next: value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Button
              onClick={() => {
                onAddMeeting(draft);
                setDraft({ client: "", date: "", type: "Call", whoId: employees[0]?.id || "", result: "", next: "" });
              }}
            >
              Yozuv qo'shish
            </Button>
          </div>
        </Card>
      ) : null}

      {meetings.length ? (
        <Card>
          <DataTable columns={["Mijoz", "Sana", "Tur", "Kim", "Natija", "Keyingi qadam", "Amal"]}>
            {meetings.map((meeting) => {
              const person = employeeMap[meeting.whoId];
              return (
                <Row key={meeting.id}>
                  <Cell style={{ fontWeight: 900 }}>{meeting.client}</Cell>
                  <Cell>{meeting.date || "-"}</Cell>
                  <Cell>{meeting.type}</Cell>
                  <Cell>{person?.name || "Belgilanmagan"}</Cell>
                  <Cell style={{ color: T.colors.textMuted }}>{meeting.result || "-"}</Cell>
                  <Cell style={{ color: T.colors.accent, fontWeight: 800 }}>{meeting.next || "-"}</Cell>
                  <Cell>{editable ? <Button variant="danger" onClick={() => onDeleteMeeting(meeting.id)} style={{ padding: "7px 10px" }}>O'chirish</Button> : "-"}</Cell>
                </Row>
              );
            })}
          </DataTable>
        </Card>
      ) : (
        <EmptyState title="Uchrashuvlar yo'q" desc="Yangi meeting yozuvi qo'shgach shu yerda ko'rinadi." />
      )}
    </div>
  );
}

