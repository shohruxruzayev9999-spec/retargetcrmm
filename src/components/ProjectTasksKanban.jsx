import React, { useMemo } from "react";
import { T, TASK_STATUSES, MONTAJ_STATUSES, VIDEO_FORMATS } from "../core/constants.js";
import { Avatar, Card, Button, StatusSelect } from "./ui/index.jsx";

function isVideoTask(taskOrFormat) {
  const format = typeof taskOrFormat === "string" ? taskOrFormat : taskOrFormat?.format;
  return VIDEO_FORMATS.includes(format);
}

function normalizeMontajStatus(status) {
  if (status === "Review") return "Ko'rib chiqilmoqda";
  if (status === "Revision") return "Qayta ishlash";
  if (status === "Tasdiqlandi") return "Bajarildi";
  return status || "Kutilmoqda";
}

function isCompletedTaskStatus(status) {
  return status === "Bajarildi" || status === "Tasdiqlandi";
}

export function ProjectTasksKanban({ 
  tasks, 
  employees, 
  profile, 
  onUpdateStatus, 
  onDeleteTask, 
  onEditTask, 
  onAddTask,
  sectionEditable 
}) {
  const employeeMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);
  
  // Determine which statuses to use (video or regular tasks)
  const hasVideoTasks = tasks.some(t => isVideoTask(t.format));
  const statusOptions = hasVideoTasks ? MONTAJ_STATUSES : TASK_STATUSES;
  
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped = {};
    statusOptions.forEach(status => {
      grouped[status] = [];
    });
    tasks.forEach(task => {
      const videoTask = isVideoTask(task.format);
      const displayStatus = videoTask ? normalizeMontajStatus(task.status) : task.status;
      if (grouped[displayStatus]) {
        grouped[displayStatus].push(task);
      }
    });
    return grouped;
  }, [tasks, statusOptions]);

  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 20 }}>
      {statusOptions.map((status) => {
        const columnTasks = tasksByStatus[status] || [];

        return (
          <div
            key={status}
            style={{
              minWidth: 360,
              background: T.colors.bg,
              border: `1px solid ${T.colors.border}`,
              borderRadius: T.radius.lg,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 300px)",
              overflow: "hidden",
              transition: "box-shadow 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,113,227,.12)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            {/* Column Header */}
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${T.colors.border}` }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: T.colors.text }}>{status}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>
                {columnTasks.length} ta task
              </div>
            </div>

            {/* Tasks List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {columnTasks.length ? (
                columnTasks.map((task) => {
                  const owner = employeeMap[task.ownerId];
                  const montajor = employeeMap[task.montajorId];
                  const videoTask = isVideoTask(task.format);
                  const displayStatus = videoTask ? normalizeMontajStatus(task.status) : task.status;
                  const done = isCompletedTaskStatus(task.status) || (videoTask && displayStatus === "Bajarildi");
                  const overdue = task.deadline && task.deadline < new Date().toISOString().slice(0, 10) && !done;

                  return (
                    <Card
                      key={task.id}
                      style={{
                        background: "#fff",
                        padding: 12,
                        borderRadius: T.radius.md,
                        border: `1px solid ${T.colors.border}`,
                        cursor: sectionEditable ? "pointer" : "default",
                        transition: "all 0.15s ease",
                        opacity: done ? 0.7 : 1,
                      }}
                      onMouseEnter={e => {
                        if (sectionEditable) {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,113,227,.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Task Name */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <span style={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: 4, 
                          background: done ? T.colors.green : T.colors.surface, 
                          border: `1px solid ${done ? T.colors.green : T.colors.border}`, 
                          display: "inline-flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          color: "#fff", 
                          fontSize: 10, 
                          flexShrink: 0,
                          marginTop: 2
                        }}>
                          {done ? "✓" : ""}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: 13, 
                            textDecoration: done ? "line-through" : "none",
                            color: done ? T.colors.textMuted : T.colors.text
                          }}>
                            {task.name}
                          </div>
                        </div>
                      </div>

                      {/* Format */}
                      {task.format && (
                        <div style={{ fontSize: 11, color: T.colors.accent, fontWeight: 700, marginBottom: 6 }}>
                          {task.format}
                        </div>
                      )}

                      {/* Owner */}
                      {owner && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Avatar name={owner.name} url={owner.avatarUrl} size={18} />
                          <span style={{ fontSize: 11, color: T.colors.textMuted }}>{owner.name}</span>
                        </div>
                      )}

                      {/* Montajor (if video) */}
                      {videoTask && montajor && (
                        <div style={{ fontSize: 10, color: T.colors.textSecondary, marginBottom: 6, fontStyle: "italic" }}>
                          Montajor: {montajor.name}
                        </div>
                      )}

                      {/* Deadline */}
                      {task.deadline && (
                        <div style={{ 
                          fontSize: 11, 
                          marginBottom: 8, 
                          color: overdue ? T.colors.red : T.colors.textMuted,
                          fontWeight: overdue ? 700 : 400
                        }}>
                          {overdue ? "⚠️ " : "📅 "}{task.deadline}
                        </div>
                      )}

                      {/* Note */}
                      {task.note && (
                        <div style={{ fontSize: 10, color: T.colors.textSecondary, marginBottom: 8 }}>
                          {task.note}
                        </div>
                      )}

                      {/* Status Select */}
                      {sectionEditable && (
                        <div style={{ marginBottom: 8, minHeight: 36 }}>
                          <StatusSelect
                            value={displayStatus}
                            options={videoTask ? MONTAJ_STATUSES : TASK_STATUSES}
                            onChange={(newStatus) => {
                              const normalizedStatus = videoTask ? normalizeMontajStatus(newStatus) : newStatus;
                              onUpdateStatus?.(task.id, normalizedStatus);
                            }}
                            disabled={false}
                            style={{ fontSize: 11 }}
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      {sectionEditable && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <Button 
                            variant="secondary" 
                            onClick={() => onEditTask?.(task)}
                            style={{ padding: "5px 8px", fontSize: 11, flex: 1 }}
                          >
                            Tahrirlash
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={() => onDeleteTask?.(task.id)}
                            style={{ padding: "5px 8px", fontSize: 11 }}
                          >
                            O'chirish
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", color: T.colors.textMuted, fontSize: 12, padding: 20 }}>
                  Task yo'q
                </div>
              )}
            </div>

            {/* Add Button */}
            {sectionEditable && (
              <button
                onClick={() => onAddTask?.(status)}
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  paddingBottom: 12,
                  paddingLeft: 14,
                  paddingRight: 14,
                  background: "transparent",
                  border: `2px dashed ${T.colors.border}`,
                  borderRadius: T.radius.md,
                  color: T.colors.accent,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${T.colors.accent}15`;
                  e.currentTarget.style.borderColor = T.colors.accent;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = T.colors.border;
                }}
              >
                + Task qo'shish
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
