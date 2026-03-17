import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";
import { ProjectDetailPage, ProjectFormModal } from "./ProjectDetailPage.jsx";

export const ProjectsPage = memo(function ProjectsPage({ profile, projects, employees, selectedProjectId, selectedProject, projectReady, onSelectProject, onBackToList, onCreateProject, onSaveProject, onDeleteProject, loading, progressByProjectId }) {
  const [showCreate, setShowCreate] = useState(false);
  const editable = canEdit(profile.role);
  const employeeMap = useMemo(() => indexById(employees), [employees]);

  if (selectedProject) {
    if (!projectReady) {
      return (
        <div>
          <PageHeader title="Loyiha yuklanmoqda" subtitle="Topshiriqlar, kontent, media plan va boshqa bo'limlar sinxronlanmoqda." action={<Button variant="secondary" onClick={onBackToList}>Orqaga</Button>} />
          <Card>
            <div style={{ display: "grid", gap: 14 }}>
              <SkeletonBlock width="34%" height={24} />
              <SkeletonBlock width="56%" height={18} />
              <GridSkeleton cards={5} minWidth={240} />
            </div>
          </Card>
        </div>
      );
    }
    return (
      <ProjectDetailPage
        profile={profile}
        project={selectedProject}
        employees={employees}
        onBack={onBackToList}
        onSaveProject={onSaveProject}
        onDeleteProject={onDeleteProject}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Loyihalar"
        subtitle={`${projects.length} ta loyiha.`}
        action={editable ? <Button onClick={() => setShowCreate(true)}>Yangi loyiha</Button> : null}
      />

      {loading ? <GridSkeleton cards={6} minWidth={320} /> : null}

      {!loading && projects.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {projects.map((project) => {
            const manager = employeeMap[project.managerId];
            const progress = progressByProjectId[project.id] ?? calcProjectProgress(project);
            const progressColor = progress >= 75 ? T.colors.green : progress >= 40 ? T.colors.accent : T.colors.orange;
            return (
              <Card key={project.id} onClick={() => onSelectProject(project.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: T.colors.textSecondary }}>{project.client}</div>
                  </div>
                  <PriorityBadge value={project.priority} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, marginBottom: 14 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <CircleProgress pct={progress} size={72} stroke={7} color={progressColor} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: progressColor }}>{progress}%</span>
                      <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{project.tasks.filter((task) => task.status === "Bajarildi").length}/{project.tasks.length}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {editable ? (
                      <div onClick={(event) => event.stopPropagation()}>
                        <StatusSelect value={project.status} options={PROJECT_STATUSES} onChange={(status) => onSaveProject({ ...project, status }, { notifyText: "Loyiha holati o'zgardi", auditText: `Loyiha statusi o'zgardi: ${status}`, page: "projects" })} />
                      </div>
                    ) : (
                      <StatusBadge value={project.status} />
                    )}
                    <div style={{ fontSize: 12, color: T.colors.textSecondary, marginTop: 8 }}>{project.type || "Xizmat turi kiritilmagan"}</div>
                    <div style={{ fontSize: 12, color: T.colors.textSecondary }}>Muddat: {project.end || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 12, borderTop: `1px solid ${T.colors.borderLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {manager ? <Avatar name={manager.name} url={manager.avatarUrl} size={26} /> : null}
                    <span style={{ fontSize: 12, color: T.colors.textSecondary }}>{manager?.name || "Manager biriktirilmagan"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 0 }}>
                    {project.teamIds.slice(0, 3).map((teamId, index) => {
                      const teamMember = employeeMap[teamId];
                      return teamMember ? <div key={teamId} style={{ marginLeft: index ? -6 : 0 }}><Avatar name={teamMember.name} url={teamMember.avatarUrl} size={22} /></div> : null;
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : !loading ? (
        <EmptyState title="Loyihalar hali yo'q" desc="Yangi loyiha yaratilgach bu yerda ko'rinadi." />
      ) : null}

      {showCreate ? (
        <ProjectFormModal
          employees={employees}
          onClose={() => setShowCreate(false)}
          onSubmit={(project) => {
            onCreateProject(project);
            setShowCreate(false);
          }}
        />
      ) : null}
    </div>
  );
});

