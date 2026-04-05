import React, { useMemo } from "react";
import { T } from "../core/constants.js";
import { Avatar, PriorityBadge, StatusBadge } from "./ui/index.jsx";

const KANBAN_COLUMNS = [
  { status: "Yangi TZ", label: "Yangi TZ", color: T.colors.purple },
  { status: "Jarayonda", label: "Jarayonda", color: T.colors.accent },
  { status: "Ko'rib chiqilmoqda", label: "Ko'rib chiqilmoqda", color: T.colors.orange },
  { status: "Yakunlandi", label: "Yakunlandi", color: T.colors.green },
  { status: "Rad etildi", label: "Rad etildi", color: T.colors.red },
];

const CLOSED_STATUSES = new Set(["Yakunlandi", "Rad etildi"]);

export function DesignTaskKanban({ tasks, employeeMap, onTaskClick }) {
  const groupedByStatus = useMemo(() => {
    const groups = {};
    KANBAN_COLUMNS.forEach((col) => {
      groups[col.status] = [];
    });
    tasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });
    return groups;
  }, [tasks]);

  return (
    <div style={{ 
      display: "flex", 
      gap: 16, 
      overflowX: "auto", 
      paddingBottom: 16,
      paddingRight: 16
    }}>
      {KANBAN_COLUMNS.map((column) => {
        const columnTasks = groupedByStatus[column.status] || [];
        return (
          <div
            key={column.status}
            style={{
              minWidth: 320,
              background: T.colors.surface,
              borderRadius: "16px",
              border: `1px solid ${T.colors.border}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Column Header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${T.colors.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: T.colors.surface,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: column.color,
                flexShrink: 0,
              }} />
              <h3 style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: T.colors.text,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                {column.label}
              </h3>
              <span style={{
                marginLeft: "auto",
                background: T.colors.bg,
                color: T.colors.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "6px",
              }}>
                {columnTasks.length}
              </span>
            </div>

            {/* Cards Container */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {columnTasks.length === 0 ? (
                <div style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: T.colors.textSecondary,
                  fontSize: 12,
                }}>
                  Hali nima yo'q
                </div>
              ) : (
                columnTasks.map((task) => {
                  const designer = task.designerId ? employeeMap[task.designerId] : null;
                  const finished = CLOSED_STATUSES.has(task.status);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      style={{
                        background: T.colors.borderLight,
                        border: `1px solid ${T.colors.border}`,
                        borderRadius: "12px",
                        padding: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: finished ? 0.6 : 1,
                        textDecoration: finished ? "line-through" : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = T.colors.accent + "20";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Card Title */}
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.colors.text,
                        marginBottom: 8,
                        lineHeight: 1.3,
                      }}>
                        {task.title}
                      </div>

                      {/* Format Badge */}
                      {task.format ? (
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.colors.accent,
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}>
                          {task.format}
                        </div>
                      ) : null}

                      {/* Metadata */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 10,
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          {designer ? (
                            <Avatar name={designer.name} url={designer.avatarUrl} size={20} />
                          ) : (
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: T.colors.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              color: T.colors.textTertiary,
                            }}>
                              —
                            </div>
                          )}
                        </div>
                        <PriorityBadge value={task.priority || "O'rta"} />
                      </div>

                      {/* Deadline */}
                      {task.deadline ? (
                        <div style={{
                          fontSize: 10,
                          color: new Date(task.deadline) < new Date() && !finished
                            ? T.colors.red
                            : T.colors.textSecondary,
                          fontWeight: 500,
                        }}>
                          📅 {task.deadline}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
