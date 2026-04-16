import React, {
  memo, startTransition, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  T, DESIGN_TASK_STATUSES, DESIGN_FORMATS, PRIORITIES,
  PLATFORMS, STATUS_META, LIMITS,
  getCurrentMonthId, getMonthLabel,
} from "../core/constants.js";
import { makeId, isoNow, indexById } from "../core/utils.js";
import {
  canCreateDesignTask, canApproveDesignTask, canEditDesignTask, projectMembers,
} from "../core/permissions.js";
import { normalizeComments, createComment } from "../core/normalizers.js";
import {
  Avatar, Button, Card, PageHeader, Field, Modal, EmptyState,
  StatusBadge, PriorityBadge, CircleProgress, CommentThread, StatusSelect, TeamSelector,
} from "../components/ui/index.jsx";
import { DesignTaskKanban } from "../components/DesignTaskKanban.jsx";

const FILTER_OPTIONS = ["Barchasi", "Jarayonda", "Ko'rib chiqilmoqda", "Yakunlandi"];
const CLOSED_STATUSES = new Set(["Yakunlandi", "Rad etildi"]);
const DONE_STATUSES = new Set(["Yakunlandi"]);
const REVIEW_STATUSES = new Set(["Ko'rib chiqilmoqda"]);
const ACTIVE_STATUSES = new Set(["Yangi TZ", "Jarayonda"]);
const DESIGNER_COLORS = [
  T.colors.accent,
  T.colors.purple,
  T.colors.orange,
  T.colors.green,
  T.colors.indigo,
  T.colors.red,
];

function buildAvailableMonths(tasks) {
  const ids = new Set(tasks.map((task) => task.monthId).filter(Boolean));
  const current = getCurrentMonthId();
  ids.add(current);
  return Array.from(ids).sort().reverse();
}

function pickProgressColor(pct) {
  if (pct >= 75) return T.colors.green;
  if (pct >= 40) return T.colors.accent;
  return T.colors.orange;
}

function matchesMonth(task, monthId) {
  return task.monthId === monthId || (!task.monthId && monthId === getCurrentMonthId());
}

function statusDotColor(status) {
  if (status === "Yakunlandi" || status === "Tasdiqlandi") return T.colors.green;
  if (status === "Ko'rib chiqilmoqda") return T.colors.orange;
  if (status === "Jarayonda") return T.colors.accent;
  if (status === "Yangi TZ") return T.colors.purple;
  if (status === "Rad etildi") return T.colors.red;
  return T.colors.textTertiary;
}

function dominantStatus(tasks) {
  const counts = {};
  tasks.forEach((task) => {
    counts[task.status] = (counts[task.status] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Yangi TZ";
}

function designerTone(name = "") {
  return DESIGNER_COLORS[(name?.charCodeAt(0) || 0) % DESIGNER_COLORS.length];
}

function isDesignDepartmentEmployee(employee) {
  const dept = String(employee?.dept || "").trim().toLowerCase();
  const title = String(employee?.title || employee?.role || "").trim().toLowerCase();
  return dept === "grafik dizayn bo'limi" || title.includes("dizayn");
}

function deadlineLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const safe = String(value);
    return safe.length >= 10 ? `${safe.slice(8, 10)} ${safe.slice(5, 7)}` : "—";
  }
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function deadlineColor(task) {
  if (!task?.deadline) return T.colors.textTertiary;
  if (CLOSED_STATUSES.has(task.status)) return T.colors.textSecondary;
  const today = new Date().toISOString().slice(0, 10);
  return task.deadline < today ? T.colors.red : T.colors.textSecondary;
}

function normalizeTaskForUi(task) {
  return {
    ...task,
    comments: normalizeComments(task.comments),
    referenceLinks: Array.isArray(task.referenceLinks) ? task.referenceLinks : [],
  };
}

const InlineStatusSelect = memo(function InlineStatusSelect({
  value,
  onChange,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClose(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, [open]);

  const meta = STATUS_META[value] || {};

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          setOpen((current) => !current);
        }}
        style={{
          background: meta.bg || T.colors.bg,
          color: meta.text || T.colors.textSecondary,
          border: `1px solid ${meta.border || T.colors.border}`,
          borderRadius: T.radius.sm,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: T.font,
          cursor: disabled ? "default" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {value}
        {!disabled ? " ▾" : ""}
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 20,
            minWidth: 180,
            background: T.colors.surface,
            border: `1px solid ${T.colors.border}`,
            borderRadius: T.radius.md,
            boxShadow: T.shadow.md,
            padding: 4,
          }}
        >
          {DESIGN_TASK_STATUSES.map((status) => {
            const optionMeta = STATUS_META[status] || {};
            return (
              <button
                key={status}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(status);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: status === value ? optionMeta.bg || T.colors.bg : "transparent",
                  color: optionMeta.text || T.colors.text,
                  borderRadius: T.radius.sm,
                  padding: "6px 10px",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: status === value ? 700 : 400,
                  fontFamily: T.font,
                  cursor: "pointer",
                }}
              >
                {status}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

const DesignCircle = memo(function DesignCircle({
  pct,
  size = 48,
  stroke = 5,
}) {
  const color = pickProgressColor(pct);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <CircleProgress pct={pct} size={size} stroke={stroke} color={color} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size <= 40 ? 9 : 11,
          fontWeight: 700,
          color,
          fontFamily: T.font,
          pointerEvents: "none",
        }}
      >
        {pct}%
      </div>
    </div>
  );
});

const SoftStatCard = memo(function SoftStatCard({
  label,
  value,
  hint,
  color,
}) {
  return (
    <Card style={{ padding: "16px 18px", background: T.colors.bg }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 26, lineHeight: 1, fontWeight: 700, color }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 11, color: T.colors.textMuted }}>{hint}</div>
    </Card>
  );
});

const DesignerSingleSelect = memo(function DesignerSingleSelect({
  employees,
  value,
  onChange,
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>Dizayner</div>
      <TeamSelector
        compact
        employees={employees}
        value={value ? [value] : []}
        onChange={(next) => onChange(next[next.length - 1] || "")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            justifySelf: "flex-start",
            border: "none",
            background: "transparent",
            color: T.colors.textSecondary,
            cursor: "pointer",
            padding: 0,
            fontSize: 11,
            fontFamily: T.font,
          }}
        >
          Belgilashni bekor qilish
        </button>
      ) : null}
    </div>
  );
});

export const DesignPage = memo(function DesignPage({
  profile,
  projects,
  employees,
  designTaskDocs,
  onSaveDesignTask,
  onDeleteDesignTask,
}) {
  const [activeMonth, setActiveMonth] = useState(() => getCurrentMonthId());
  const [activeFilter, setActiveFilter] = useState("Barchasi");
  const [projectFilter, setProjectFilter] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("kanban");

  const employeeMap = useMemo(() => indexById(employees), [employees]);
  const projectMap = useMemo(() => indexById(projects), [projects]);

  const allTasks = useMemo(
    () => (Array.isArray(designTaskDocs) ? designTaskDocs.map(normalizeTaskForUi) : []),
    [designTaskDocs]
  );

  const availableMonths = useMemo(
    () => buildAvailableMonths(allTasks),
    [allTasks]
  );

  useEffect(() => {
    if (availableMonths.includes(activeMonth)) return;
    setActiveMonth(availableMonths[0] || getCurrentMonthId());
  }, [availableMonths, activeMonth]);

  const overallStats = useMemo(() => {
    const total = allTasks.length;
    const review = allTasks.filter((task) => task.status === "Ko'rib chiqilmoqda").length;
    const inProgress = allTasks.filter((task) => ACTIVE_STATUSES.has(task.status)).length;
    const done = allTasks.filter((task) => task.status === "Yakunlandi").length;
    const countThisMonth = allTasks.filter((task) => matchesMonth(task, getCurrentMonthId()) && task.status === "Yakunlandi").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return {
      total,
      review,
      inProgress,
      done,
      countThisMonth,
      pct,
    };
  }, [allTasks]);

  const monthTasks = useMemo(
    () => allTasks.filter((task) => !task.archived && matchesMonth(task, activeMonth)),
    [allTasks, activeMonth]
  );

  const filteredTasks = useMemo(() => {
    let next = monthTasks;
    if (projectFilter) {
      next = next.filter((task) => task.projectId === projectFilter);
    }
    if (activeFilter === "Jarayonda") {
      next = next.filter((task) => ACTIVE_STATUSES.has(task.status));
    } else if (activeFilter === "Ko'rib chiqilmoqda") {
      next = next.filter((task) => REVIEW_STATUSES.has(task.status));
    } else if (activeFilter === "Yakunlandi") {
      next = next.filter((task) => CLOSED_STATUSES.has(task.status));
    }
    return next;
  }, [monthTasks, projectFilter, activeFilter]);

  const groupedProjectData = useMemo(() => {
    const groups = new Map();
    filteredTasks.forEach((task) => {
      if (!groups.has(task.projectId)) groups.set(task.projectId, []);
      groups.get(task.projectId).push(task);
    });
    return projects
      .filter((project) => groups.has(project.id))
      .map((project) => {
        const tasks = groups.get(project.id).slice().sort((a, b) => {
          if (a.deadline && b.deadline) return String(a.deadline).localeCompare(String(b.deadline));
          if (a.deadline) return -1;
          if (b.deadline) return 1;
          return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        });
        const done = tasks.filter((task) => task.status === "Yakunlandi").length;
        const total = tasks.length;
        return {
          project,
          tasks,
          total,
          done,
          pct: total ? Math.round((done / total) * 100) : 0,
          dominant: dominantStatus(tasks),
        };
      });
  }, [filteredTasks, projects]);

  const projectSummaryRows = useMemo(() => {
    const stats = {};
    monthTasks.forEach((task) => {
      if (!stats[task.projectId]) stats[task.projectId] = { total: 0, done: 0 };
      stats[task.projectId].total += 1;
      if (task.status === "Yakunlandi") stats[task.projectId].done += 1;
    });
    return projects
      .filter((project) => stats[project.id])
      .map((project) => {
        const total = stats[project.id].total;
        const done = stats[project.id].done;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return {
          projectId: project.id,
          name: project.name,
          total,
          done,
          pct,
          color: pickProgressColor(pct),
        };
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [monthTasks, projects]);

  const designerRows = useMemo(() => {
    const stats = {};
    monthTasks.forEach((task) => {
      if (!task.designerId) return;
      if (!stats[task.designerId]) {
        stats[task.designerId] = { total: 0, done: 0 };
      }
      stats[task.designerId].total += 1;
      if (task.status === "Yakunlandi") {
        stats[task.designerId].done += 1;
      }
    });
    const maxTotal = Math.max(...Object.values(stats).map((item) => item.total), 1);
    return Object.entries(stats)
      .map(([designerId, stat]) => {
        const designer = employeeMap[designerId];
        if (!designer) return null;
        return {
          id: designerId,
          name: designer.name,
          avatarUrl: designer.avatarUrl,
          total: stat.total,
          done: stat.done,
          loadPct: Math.round((stat.total / maxTotal) * 100),
          color: designerTone(designer.name),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [monthTasks, employeeMap]);

  const monthButtons = useMemo(
    () => availableMonths.map((monthId) => ({
      id: monthId,
      label: getMonthLabel(monthId),
      active: monthId === activeMonth,
    })),
    [availableMonths, activeMonth]
  );

  const filterButtons = useMemo(
    () => FILTER_OPTIONS.map((label) => ({
      label,
      active: activeFilter === label,
    })),
    [activeFilter]
  );

  const openNewTask = useCallback(() => {
    setEditingTask({
      id: "",
      projectId: projects[0]?.id || "",
      title: "",
      brief: "",
      format: DESIGN_FORMATS[0] || "Banner",
      platform: PLATFORMS[0] || "Instagram",
      priority: PRIORITIES[1] || "O'rta",
      deadline: "",
      referenceLinks: [],
      smmManagerId: profile?.uid || "",
      designerId: "",
      status: "Yangi TZ",
      comments: [],
      archived: false,
      monthId: activeMonth,
    });
    setModalOpen(true);
  }, [projects, profile?.uid, activeMonth]);

  const openExistingTask = useCallback((task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTask(null);
  }, []);

  const changeMonth = useCallback((monthId) => {
    startTransition(() => {
      setActiveMonth(monthId);
    });
  }, []);

  const changeFilter = useCallback((nextFilter) => {
    startTransition(() => {
      setActiveFilter(nextFilter);
    });
  }, []);

  const changeProjectFilter = useCallback((projectId) => {
    startTransition(() => {
      setProjectFilter((current) => (current === projectId ? null : projectId));
    });
  }, []);

  const clearProjectFilter = useCallback(() => {
    startTransition(() => {
      setProjectFilter(null);
    });
  }, []);

  const canChangeInlineStatus = useCallback((task) => (
    canEditDesignTask(profile, task)
  ), [profile]);

  const handleInlineStatus = useCallback(async (task, nextStatus) => {
    if (!task || !nextStatus || nextStatus === task.status) return;
    await onSaveDesignTask(task.projectId, {
      ...task,
      status: nextStatus,
      updatedAt: isoNow(),
      updatedBy: profile?.uid || "",
    });
  }, [onSaveDesignTask, profile?.uid]);

  return (
    <div style={{ fontFamily: T.font }}>
      <PageHeader
        title="Grafik dizayn bo'limi"
        subtitle="Barcha loyihalar bo'yicha dizayn TZlari"
        action={
          canCreateDesignTask(profile?.role)
            ? <Button onClick={openNewTask}>+ Yangi TZ</Button>
            : null
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {monthButtons.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeMonth(item.id)}
            style={{
              border: "none",
              borderRadius: T.radius.full,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: item.active ? 700 : 500,
              fontFamily: T.font,
              cursor: "pointer",
              background: item.active ? T.colors.accentSoft : T.colors.bg,
              color: item.active ? T.colors.accent : T.colors.textSecondary,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,140px) repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
        <Card style={{ padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 120 }}>
          <DesignCircle pct={overallStats.pct} size={80} stroke={6} />
          <div style={{ marginTop: 10, fontSize: 11, color: T.colors.textMuted, textAlign: "center", lineHeight: 1.35 }}>
            Umumiy CRM progress
          </div>
        </Card>
        <SoftStatCard
          label="Jami TZ"
          value={overallStats.total}
          hint={`${projects.length} ta loyiha`}
          color={T.colors.accent}
        />
        <SoftStatCard
          label="Jarayonda"
          value={overallStats.inProgress}
          hint={`Tasdiq kutmoqda: ${overallStats.review}`}
          color={T.colors.orange}
        />
        <SoftStatCard
          label="Yakunlandi"
          value={overallStats.done}
          hint={`Bu oy: ${overallStats.countThisMonth}`}
          color={T.colors.green}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 12, alignItems: "start" }}>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.colors.text }}>
              {projectFilter ? projectMap[projectFilter]?.name || "Barcha TZlar" : "Barcha TZlar"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {viewMode === "list" && filterButtons.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => changeFilter(item.label)}
                  style={{
                    border: "none",
                    borderRadius: T.radius.full,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: item.active ? 700 : 500,
                    fontFamily: T.font,
                    cursor: "pointer",
                    background: item.active ? T.colors.accentSoft : T.colors.bg,
                    color: item.active ? T.colors.accent : T.colors.textSecondary,
                  }}
                >
                  {item.label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  style={{
                    border: "none",
                    borderRadius: T.radius.md,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: viewMode === "kanban" ? 700 : 500,
                    fontFamily: T.font,
                    cursor: "pointer",
                    background: viewMode === "kanban" ? T.colors.accentSoft : T.colors.bg,
                    color: viewMode === "kanban" ? T.colors.accent : T.colors.textSecondary,
                  }}
                >
                  📋 Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  style={{
                    border: "none",
                    borderRadius: T.radius.md,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: viewMode === "list" ? 700 : 500,
                    fontFamily: T.font,
                    cursor: "pointer",
                    background: viewMode === "list" ? T.colors.accentSoft : T.colors.bg,
                    color: viewMode === "list" ? T.colors.accent : T.colors.textSecondary,
                  }}
                >
                  📊 List
                </button>
              </div>
            </div>
          </div>

          {viewMode === "list" && projectFilter ? (
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                onClick={clearProjectFilter}
                style={{
                  border: "none",
                  background: "transparent",
                  color: T.colors.accent,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: T.font,
                }}
              >
                ← Barcha loyihalarga qaytish
              </button>
            </div>
          ) : null}

          {!groupedProjectData.length ? (
            <EmptyState
              title="Dizayn TZ topilmadi"
              desc={`${getMonthLabel(activeMonth)} uchun mos TZ hali yo'q.`}
            />
          ) : viewMode === "kanban" ? (
            <DesignTaskKanban
              tasks={filteredTasks}
              employeeMap={employeeMap}
              onTaskClick={openExistingTask}
              onAddTask={(status) => {
                setEditingTask({
                  id: "",
                  projectId: projects[0]?.id || "",
                  title: "",
                  brief: "",
                  format: DESIGN_FORMATS[0] || "Banner",
                  platform: PLATFORMS[0] || "Instagram",
                  priority: PRIORITIES[1] || "O'rta",
                  deadline: "",
                  referenceLinks: [],
                  smmManagerId: profile?.uid || "",
                  designerId: "",
                  status: status,
                  comments: [],
                  archived: false,
                  monthId: activeMonth,
                });
                setModalOpen(true);
              }}
            />
          ) : (
            groupedProjectData.map((group) => (
              <div key={group.project.id} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${T.colors.border}`,
                    marginBottom: 6,
                  }}
                >
                  <DesignCircle pct={group.pct} size={36} stroke={4} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.colors.text }}>
                      {group.project.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.colors.textMuted }}>
                      {group.total} ta TZ · {group.done} bajarildi
                    </div>
                  </div>
                  <StatusBadge value={group.dominant} />
                </div>

                <div style={{ display: "grid", gap: 2 }}>
                  {group.tasks.map((task) => {
                    const designer = task.designerId ? employeeMap[task.designerId] : null;
                    const finished = CLOSED_STATUSES.has(task.status);
                    return (
                      <div
                        key={task.id}
                        onClick={() => openExistingTask(task)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 6px",
                          borderRadius: T.radius.md,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(event) => { event.currentTarget.style.background = T.colors.bg; }}
                        onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusDotColor(task.status), flexShrink: 0 }} />
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13,
                            color: T.colors.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textDecoration: finished ? "line-through" : "none",
                            opacity: finished ? 0.6 : 1,
                          }}
                        >
                          {task.title}
                        </div>
                        <PriorityBadge value={task.priority || "O'rta"} />
                        <div style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                          {designer ? <Avatar name={designer.name} url={designer.avatarUrl} size={20} /> : <span style={{ fontSize: 11, color: T.colors.textMuted }}>—</span>}
                        </div>
                        <div onClick={(event) => event.stopPropagation()}>
                          <InlineStatusSelect
                            value={task.status}
                            disabled={!canChangeInlineStatus(task)}
                            onChange={(nextStatus) => handleInlineStatus(task, nextStatus)}
                          />
                        </div>
                        <div style={{ minWidth: 56, textAlign: "right", fontSize: 11, color: deadlineColor(task) }}>
                          {deadlineLabel(task.deadline)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </Card>

        <div style={{ display: "grid", gap: 12 }}>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.colors.text, marginBottom: 12 }}>Loyihalar bo'yicha</div>

            <div style={{ display: "grid", gap: 8 }}>
              <div
                onClick={clearProjectFilter}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 8,
                  background: projectFilter === null ? T.colors.accentSoft : T.colors.bg,
                  borderRadius: T.radius.md,
                  cursor: "pointer",
                  border: `1px solid ${projectFilter === null ? T.colors.accent : "transparent"}`,
                }}
              >
                <DesignCircle pct={overallStats.pct} size={48} stroke={5} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.colors.text }}>Barchasi</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: T.colors.textMuted }}>
                    {overallStats.done}/{overallStats.total} TZ bajarildi
                  </div>
                  <div style={{ marginTop: 6, height: 3, borderRadius: 3, background: T.colors.borderLight, overflow: "hidden" }}>
                    <div style={{ width: `${overallStats.pct}%`, height: "100%", background: pickProgressColor(overallStats.pct), borderRadius: 3 }} />
                  </div>
                </div>
              </div>

              {projectSummaryRows.map((row) => (
                <div
                  key={row.projectId}
                  onClick={() => changeProjectFilter(row.projectId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                    background: projectFilter === row.projectId ? T.colors.accentSoft : T.colors.bg,
                    borderRadius: T.radius.md,
                    cursor: "pointer",
                    border: `1px solid ${projectFilter === row.projectId ? T.colors.accent : "transparent"}`,
                  }}
                >
                  <DesignCircle pct={row.pct} size={48} stroke={5} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.name}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, color: T.colors.textMuted }}>
                      {row.done}/{row.total} TZ bajarildi
                    </div>
                    <div style={{ marginTop: 6, height: 3, borderRadius: 3, background: T.colors.borderLight, overflow: "hidden" }}>
                      <div style={{ width: `${row.pct}%`, height: "100%", background: row.color, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.colors.text, marginBottom: 12 }}>Dizaynerlar yuklamasi</div>
            {!designerRows.length ? (
              <div style={{ fontSize: 12, color: T.colors.textMuted }}>Hali dizaynerlarga biriktirilgan TZ yo'q.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {designerRows.map((row) => (
                  <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={row.name} url={row.avatarUrl} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.name}
                      </div>
                      <div style={{ marginTop: 5, height: 4, borderRadius: 4, background: T.colors.borderLight, overflow: "hidden" }}>
                        <div style={{ width: `${row.loadPct}%`, height: "100%", background: row.color, borderRadius: 4 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: T.colors.textMuted }}>{row.total} TZ</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {modalOpen && editingTask ? (
        <DesignTaskModal
          task={editingTask}
          profile={profile}
          projects={projects}
          employees={employees}
          employeeMap={employeeMap}
          activeMonth={activeMonth}
          onSave={onSaveDesignTask}
          onDelete={onDeleteDesignTask}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
});

const DesignTaskModal = memo(function DesignTaskModal({
  task,
  profile,
  projects,
  employees,
  employeeMap,
  activeMonth,
  onSave,
  onDelete,
  onClose,
}) {
  const [form, setForm] = useState(() => ({
    ...task,
    referenceLinks: Array.isArray(task.referenceLinks) ? task.referenceLinks : [],
    comments: normalizeComments(task.comments),
    monthId: task.monthId || activeMonth,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      ...task,
      referenceLinks: Array.isArray(task.referenceLinks) ? task.referenceLinks : [],
      comments: normalizeComments(task.comments),
      monthId: task.monthId || activeMonth,
    });
  }, [task, activeMonth]);

  const isNew = !task.id;
  const canEditForm = isNew ? canCreateDesignTask(profile?.role) : canEditDesignTask(profile, task);
  const canApprove = canApproveDesignTask(profile?.role);
  const canDelete = Boolean(task.id && (canApprove || task.smmManagerId === profile?.uid));
  const canChangeStatus = canEditDesignTask(profile, form);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.projectId) || null,
    [projects, form.projectId]
  );

  const designerOptions = useMemo(() => {
    const activeDesignEmployees = employees.filter((employee) =>
      employee.status !== "inactive"
      && employee.status !== "merged"
      && isDesignDepartmentEmployee(employee)
    );
    if (!selectedProject) return activeDesignEmployees;
    const projectDesignEmployees = projectMembers(selectedProject, activeDesignEmployees)
      .filter((employee) => isDesignDepartmentEmployee(employee));
    return projectDesignEmployees.length ? projectDesignEmployees : activeDesignEmployees;
  }, [selectedProject, employees]);

  const smmName = useMemo(
    () => (form.smmManagerId ? employeeMap[form.smmManagerId]?.name || "—" : "—"),
    [form.smmManagerId, employeeMap]
  );

  const updateForm = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const addReferenceLink = useCallback(() => {
    setForm((current) => ({
      ...current,
      referenceLinks: [...(current.referenceLinks || []), ""].slice(0, 5),
    }));
  }, []);

  const updateReferenceLink = useCallback((index, value) => {
    setForm((current) => ({
      ...current,
      referenceLinks: (current.referenceLinks || []).map((link, linkIndex) => (linkIndex === index ? value : link)),
    }));
  }, []);

  const removeReferenceLink = useCallback((index) => {
    setForm((current) => ({
      ...current,
      referenceLinks: (current.referenceLinks || []).filter((_, linkIndex) => linkIndex !== index),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!canEditForm) return;
    const projectId = form.projectId || task.projectId;
    if (!projectId || !form.title.trim()) return;
    setSaving(true);
    try {
      const updated = {
        ...task,
        ...form,
        projectId,
        title: form.title.trim(),
        brief: form.brief,
        format: form.format,
        platform: form.platform,
        priority: form.priority,
        deadline: form.deadline,
        designerId: form.designerId,
        status: form.status,
        referenceLinks: (form.referenceLinks || []).filter((link) => String(link || "").trim()),
        comments: normalizeComments(form.comments),
        updatedAt: isoNow(),
        updatedBy: profile.uid,
        smmManagerId: task.smmManagerId || profile.uid,
        createdAt: task.createdAt || isoNow(),
        createdBy: task.createdBy || profile.uid,
        archived: false,
        monthId: form.monthId || task.monthId || (form.deadline ? form.deadline.slice(0, 7) : activeMonth),
      };
      if (!updated.id) updated.id = makeId("design");
      await onSave(projectId, updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [form, task, profile.uid, activeMonth, onSave, onClose, canEditForm]);

  const handleDelete = useCallback(async () => {
    if (!task.id) return;
    setSaving(true);
    try {
      await onDelete(task.projectId, task.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [task, onDelete, onClose]);

  const handleAddComment = useCallback(async (text) => {
    if (!task.id || !text.trim()) return;
    const projectId = form.projectId || task.projectId;
    const nextComments = [...normalizeComments(form.comments), createComment(text.trim(), profile)];
    setForm((current) => ({ ...current, comments: nextComments }));
    await onSave(projectId, {
      ...task,
      ...form,
      projectId,
      comments: nextComments,
      updatedAt: isoNow(),
      updatedBy: profile.uid,
      monthId: form.monthId || task.monthId || activeMonth,
    });
  }, [task, form, profile, activeMonth, onSave]);

  const referenceLinkRows = useMemo(
    () => (form.referenceLinks || []).map((link, index) => ({ id: `${index}-${link}`, link, index })),
    [form.referenceLinks]
  );

  return (
    <Modal title={task.id ? "TZ tahrirlash" : "Yangi TZ"} onClose={onClose} width={900}>
      <div style={{ display: "grid", gap: 14 }}>
        {!task.projectId ? (
          <Field
            label="Loyiha"
            value={form.projectId}
            onChange={(value) => updateForm("projectId", value)}
            options={projectOptions}
          />
        ) : (
          <div style={{ fontSize: 12, color: T.colors.textMuted }}>
            Loyiha: <strong style={{ color: T.colors.text }}>{selectedProject?.name || "—"}</strong>
          </div>
        )}

        <Field
          label="Sarlavha"
          value={form.title}
          onChange={(value) => updateForm("title", value)}
          maxLength={LIMITS.taskName}
          required
        />

        <Field
          label="TZ tavsifi (brief)"
          type="textarea"
          rows={5}
          value={form.brief}
          onChange={(value) => updateForm("brief", value)}
          maxLength={LIMITS.note}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <Field label="Format" value={form.format} onChange={(value) => updateForm("format", value)} options={DESIGN_FORMATS} />
          <Field label="Platforma" value={form.platform} onChange={(value) => updateForm("platform", value)} options={PLATFORMS} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <Field label="Prioritet" value={form.priority} onChange={(value) => updateForm("priority", value)} options={PRIORITIES} />
          <Field label="Deadline" type="date" value={form.deadline} onChange={(value) => updateForm("deadline", value)} />
        </div>

        <DesignerSingleSelect
          employees={designerOptions}
          value={form.designerId}
          onChange={(value) => updateForm("designerId", value)}
        />

        {task.id ? (
          <div style={{ fontSize: 12, color: T.colors.textMuted }}>
            SMM menejer: <strong style={{ color: T.colors.text }}>{smmName}</strong>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>Holat</div>
          {canChangeStatus ? (
            <div style={{ width: "fit-content" }}>
              <StatusSelect
                value={form.status}
                options={DESIGN_TASK_STATUSES}
                onChange={(value) => updateForm("status", value)}
              />
            </div>
          ) : (
            <div><StatusBadge value={form.status} /></div>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>Havolalar</div>
          {referenceLinkRows.map((row) => (
            <div key={row.id} style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field
                  value={row.link}
                  onChange={(value) => updateReferenceLink(row.index, value)}
                  placeholder="https://..."
                />
              </div>
              <button
                type="button"
                onClick={() => removeReferenceLink(row.index)}
                style={{
                  border: "none",
                  background: T.colors.redSoft,
                  color: T.colors.red,
                  borderRadius: T.radius.md,
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontSize: 16,
                  fontFamily: T.font,
                }}
              >
                ×
              </button>
            </div>
          ))}
          {referenceLinkRows.length < 5 ? (
            <button
              type="button"
              onClick={addReferenceLink}
              style={{
                justifySelf: "flex-start",
                border: `1px dashed ${T.colors.accent}`,
                background: "transparent",
                color: T.colors.accent,
                borderRadius: T.radius.md,
                padding: "7px 10px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: T.font,
              }}
            >
              Havola qo'shish
            </button>
          ) : null}
        </div>

        {task.id ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>Izohlar</div>
            <CommentThread
              comments={form.comments}
              onAddComment={handleAddComment}
            />
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 6 }}>
          <div>
            {canDelete ? (
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                O'chirish
              </Button>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Bekor
            </Button>
            <Button onClick={handleSave} disabled={saving || !canEditForm || !form.title.trim() || !(form.projectId || task.projectId)}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});
