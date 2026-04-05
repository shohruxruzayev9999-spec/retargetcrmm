import React, { useMemo } from "react";
import { T, SHOOT_STATUSES } from "../core/constants.js";
import { Avatar, Button, StatusSelect, Card } from "./ui/index.jsx";
import { normalizeComments, createComment } from "../core/normalizers.js";
import { canWorkInProject } from "../core/permissions.js";

export function ShootingKanban({ shoots, projects, employees, profile, onSaveShoot, onDeleteShoot, onAddShoot }) {
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);
  const employeeMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);
  
  // Group shoots by project
  const shootsByProject = useMemo(() => {
    const grouped = {};
    projects.forEach(project => {
      grouped[project.id] = shoots.filter(s => s.projectId === project.id);
    });
    return grouped;
  }, [shoots, projects]);

  function addComment(shoot, text) {
    onSaveShoot({ ...shoot, comments: [...normalizeComments(shoot.comments), createComment(text, profile)] });
  }

  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 20 }}>
      {projects.map((project) => {
        const projectShoots = shootsByProject[project.id] || [];
        const canMutate = canWorkInProject(profile, project);

        return (
          <div
            key={project.id}
            style={{
              minWidth: 380,
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
              <div style={{ fontWeight: 900, fontSize: 15, color: T.colors.text }}>{project.name}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>
                {projectShoots.length} ta syomka
              </div>
            </div>

            {/* Shoots List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {projectShoots.length ? (
                projectShoots.map((shoot) => {
                  const operator = employeeMap[shoot.operatorId];
                  return (
                    <Card
                      key={shoot.id}
                      style={{
                        background: "#fff",
                        padding: 12,
                        borderRadius: T.radius.md,
                        border: `1px solid ${T.colors.border}`,
                        cursor: canMutate ? "pointer" : "default",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={e => {
                        if (canMutate) {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,113,227,.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Type & Status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{shoot.type || "Tur"}</div>
                        <StatusSelect
                          value={shoot.status || "Yangi"}
                          options={SHOOT_STATUSES}
                          onChange={canMutate ? (status) => onSaveShoot({ ...shoot, status }) : null}
                          disabled={!canMutate}
                          style={{ minWidth: 100 }}
                        />
                      </div>

                      {/* Details */}
                      <div style={{ fontSize: 12, color: T.colors.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                        <div>{shoot.date || "Sana"} · {shoot.time || "Vaqt"}</div>
                        <div>{shoot.location || "Lokatsiya"}</div>
                      </div>

                      {/* Operator */}
                      {operator && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <Avatar name={operator.name} url={operator.avatarUrl} size={20} />
                          <span style={{ fontSize: 11, color: T.colors.textMuted }}>{operator.name}</span>
                        </div>
                      )}

                      {/* Goal */}
                      {shoot.goal && (
                        <div style={{ fontSize: 11, color: T.colors.textSecondary, marginBottom: 8, fontStyle: "italic" }}>
                          {shoot.goal}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {canMutate && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Button variant="secondary" onClick={() => {}} style={{ padding: "5px 8px", fontSize: 11 }}>
                            Tahrirlash
                          </Button>
                          <Button variant="danger" onClick={() => onDeleteShoot(shoot.id)} style={{ padding: "5px 8px", fontSize: 11 }}>
                            O'chirish
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", color: T.colors.textMuted, fontSize: 12, padding: 20 }}>
                  Syomka yo'q
                </div>
              )}
            </div>

            {/* Add Button */}
            {canMutate && (
              <button
                onClick={() => onAddShoot?.(project.id)}
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
                + Syomka qo'shish
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
