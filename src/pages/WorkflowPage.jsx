import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export function WorkflowPage() {
  const steps = [
    { n: 1, title: "Mijoz keladi", desc: "Sales manager bilan birinchi uchrashuv va ehtiyojlar aniqlash", dept: "Sales" },
    { n: 2, title: "Brief olinadi", desc: "Maqsad, target auditoriya, byudjet va KPI aniqlanadi", dept: "Project Management" },
    { n: 3, title: "Strategiya yoziladi", desc: "Kontent strategiyasi, kanal tanlash va maqsadlar belgilanadi", dept: "Project Management" },
    { n: 4, title: "Media plan yaratiladi", desc: "Oylik kontent jadvali, byudjet taqsimoti tuziladi", dept: "SMM" },
    { n: 5, title: "Kontent reja tuziladi", desc: "Har bir post, reels, story alohida rejalashtiriladi", dept: "SMM" },
    { n: 6, title: "Materiallar tayyorlanadi", desc: "Kontent ishlab chiqiladi va tekshiruvga yuboriladi", dept: "SMM + Media" },
    { n: 7, title: "Tasdiqlanadi", desc: "Manager yoki CEO kontent rejasini tasdiqlaydi yoki rad etadi", dept: "Project Management" },
    { n: 8, title: "Syomka o'tkaziladi", desc: "Video va foto materiallar professional tarzda suratga olinadi", dept: "Media" },
    { n: 9, title: "Reklama ishga tushadi", desc: "Targeting reklamalari sozlanadi va faollashtiriladi", dept: "Target" },
    { n: 10, title: "Hisobot qilinadi", desc: "KPI, ROI va natijalar CEO ga taqdimot qilinadi", dept: "Project Management" },
  ];

  return (
    <div>
      <PageHeader title="Workflow" subtitle="Loyiha jarayoni yuborgan namuna ko'rinishiga mos yagona timeline formatida." />
      <Card>
        {steps.map((step, index) => (
          <div key={step.n} style={{ display: "flex", gap: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 92, flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.colors.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, boxShadow: "0 8px 18px rgba(0,113,227,0.18)" }}>
                {step.n}
              </div>
              {index < steps.length - 1 ? <div style={{ width: 4, flex: 1, minHeight: 48, background: T.colors.border, margin: "10px 0" }} /> : null}
            </div>
            <div style={{ padding: "4px 0 28px 18px", flex: 1 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>{step.title}</span>
                <span style={{ background: T.colors.accentSoft, color: T.colors.accent, padding: "5px 16px", borderRadius: T.radius.full, fontSize: 12, fontWeight: 700 }}>
                  {step.dept}
                </span>
              </div>
              <div style={{ marginTop: 8, color: T.colors.textSecondary, lineHeight: 1.5, fontSize: 15 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

