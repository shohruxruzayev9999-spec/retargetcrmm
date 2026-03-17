import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export function ReportsPage({ projects }) {
  const totalBudget = projects.reduce((sum, project) => sum + Number(project.report.budget || 0), 0);
  const totalLeads = projects.reduce((sum, project) => sum + Number(project.report.leads || 0), 0);
  const totalSales = projects.reduce((sum, project) => sum + Number(project.report.sales || 0), 0);
  const roiProjects = projects.filter((project) => Number(project.report.roi || 0) > 0);
  const avgRoi = roiProjects.length ? (roiProjects.reduce((sum, project) => sum + Number(project.report.roi || 0), 0) / roiProjects.length).toFixed(1) : "0";

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="CEO va investor uchun jamlangan ko'rsatkichlar." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="Jami byudjet" value={`${toMoney(totalBudget)} so'm`} hint="Barcha loyihalar" color={T.colors.accent} />
        <StatCard label="Jami lidlar" value={totalLeads} hint="Yig'ilgan leadlar" color={T.colors.green} />
        <StatCard label="Jami sotuvlar" value={totalSales} hint="Yakuniy natija" color={T.colors.blue} />
        <StatCard label="O'rtacha ROI" value={avgRoi} hint="Faol hisobotlar" color={T.colors.purple} />
      </div>

      {projects.length ? (
        <Card>
          <DataTable columns={["Loyiha", "Byudjet", "Lead", "CPL", "Sotuv", "ROI", "Progress"]}>
            {projects.map((project) => (
              <Row key={project.id}>
                <Cell>
                  <div style={{ fontWeight: 900 }}>{project.name}</div>
                  <div style={{ marginTop: 4, color: T.colors.textMuted, fontSize: 12 }}>{project.client}</div>
                </Cell>
                <Cell>{toMoney(project.report.budget)} so'm</Cell>
                <Cell>{project.report.leads}</Cell>
                <Cell>{toMoney(project.report.cpl)} so'm</Cell>
                <Cell>{project.report.sales}</Cell>
                <Cell>{project.report.roi}</Cell>
                <Cell>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: T.radius.full, background: T.colors.borderLight, overflow: "hidden" }}>
                      <div style={{ width: `${calcProjectProgress(project)}%`, height: "100%", background: T.colors.accent }} />
                    </div>
                    <span style={{ fontWeight: 900 }}>{calcProjectProgress(project)}%</span>
                  </div>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </Card>
      ) : (
        <EmptyState title="Hisobotlar hali bo'sh" desc="Loyihalar va hisobotlar qo'shilgach ko'rinadi." />
      )}
    </div>
  );
}

