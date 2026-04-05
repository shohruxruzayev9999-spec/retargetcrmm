import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export function NotificationsPage({ notifications, profile, onMarkAllRead }) {
  const unread = notifications.filter((item) => !item.readBy?.[profile.uid]);
  const sorted = sortByRecent(notifications, "createdAt");
  return (
    <div>
      <PageHeader
        title="Bildirishnomalar"
        subtitle={`${notifications.length} ta yozuv. O'qilmagan: ${unread.length}.`}
        action={notifications.length ? <Button variant="secondary" onClick={onMarkAllRead}>Hammasini o'qilgan deb belgilash</Button> : null}
      />
      {sorted.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {sorted.map((item) => {
            const unreadItem = !item.readBy?.[profile.uid];
            return (
              <Card key={item.id} style={{ borderColor: unreadItem ? "#fecaca" : T.colors.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{item.text}</div>
                    <div style={{ marginTop: 6, color: T.colors.textMuted, fontSize: 13 }}>
                      {item.actorName || "Tizim"} · {String(item.createdAt || "").slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                  {unreadItem ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: T.colors.red, animation: "sidebarPulse 1.2s infinite" }} /> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Bildirishnomalar yo'q" desc="Yangi xabar yoki o'zgarish bo'lsa shu yerga tushadi." />
      )}
    </div>
  );
}

function LoadingScreen({ label = "Yuklanmoqda..." }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f5f5f7 0%, #e8f0fe 100%)", fontFamily: T.font, color: T.colors.text }}>
      <Card style={{ textAlign: "center", maxWidth: 380, padding: 30, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 120deg, rgba(0,113,227,0.08), rgba(0,113,227,0.92), rgba(90,200,250,0.16), rgba(0,113,227,0.08))", animation: "appleSpin 1.15s cubic-bezier(.55,.08,.48,.95) infinite" }} />
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(229,229,234,0.9)" }} />
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.16), transparent 68%)", animation: "loaderPulse 1.8s ease-in-out infinite" }} />
        </div>
        <div style={{ marginTop: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>{label}</div>
        <div style={{ marginTop: 6, color: T.colors.textSecondary, fontSize: 13 }}>Realtime CRM ma'lumotlari tayyorlanmoqda.</div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 6 }}>
          {[0, 1, 2].map((index) => (
            <span key={index} style={{ width: 6, height: 6, borderRadius: "50%", background: T.colors.accent, opacity: 0.2 + index * 0.2, animation: `loaderBounce 1.2s ease-in-out ${index * 0.12}s infinite` }} />
          ))}
        </div>
      </Card>
    </div>
  );
}
