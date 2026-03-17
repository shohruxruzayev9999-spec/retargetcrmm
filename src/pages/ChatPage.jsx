import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, PROJECT_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLAN_STATUSES, SHOOT_STATUSES, CALL_STATUSES, PRIORITIES, PLATFORMS, FORMATS, DEPARTMENTS, LIMITS } from "../core/constants.js";
import { toMoney, clamp, isoNow, todayIso, makeId, sortByRecent, indexById, calcProjectProgress, healthScore } from "../core/utils.js";
import { canEdit, canViewReports, canManagePeople, canWorkInProject, canManageProjectMeta, projectMembers, visibleProjects } from "../core/permissions.js";
import { normalizeComments, createComment, withRecordMeta } from "../core/normalizers.js";
import { Avatar, Button, Card, PageHeader, Field, Modal, EmptyState, SkeletonBlock, GridSkeleton, StatusBadge, StatusSelect, PriorityBadge, CircleProgress, StatCard, DataTable, Row, Cell, TeamSelector, CommentThread, EmojiPicker } from "../components/ui/index.jsx";

export const ChatPage = memo(function ChatPage({ profile, employees, messages, onSendMessage, onEditMessage, onDeleteMessage, onMarkRead, onLoadOlder, hasMore, loadingOlder, loading }) {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const viewportRef = useRef(null);
  const endRef = useRef(null);
  const sortedMessages = useMemo(() => sortByRecent(messages, "createdAt").reverse(), [messages]);
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((employee) => [employee.id, employee])), [employees]);
  const quickReactions = ["👍", "🔥", "✅", "👏", "🎯", "🚀", "💡", "📌"];

  useEffect(() => {
    onMarkRead?.();
  }, [messages.length, profile.uid]);

  useEffect(() => {
    if (!isAtBottom) return;
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sortedMessages, isAtBottom]);

  function handleScroll() {
    if (!viewportRef.current) return;
    const distance = viewportRef.current.scrollHeight - viewportRef.current.scrollTop - viewportRef.current.clientHeight;
    setIsAtBottom(distance < 80);
  }

  function insertEmoji(emoji) {
    setInput((prev) => `${prev}${emoji}`);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    if (editingId) {
      onEditMessage?.(editingId, text);
      setEditingId("");
    } else {
      onSendMessage(text);
    }
    setInput("");
    setShowEmojiPicker(false);
    setIsAtBottom(true);
  }

  return (
    <div>
      <PageHeader title="Umumiy chat" subtitle="Realtime jamoa chat. Xabarlar Firestore orqali barcha foydalanuvchilarga darhol sinxronlanadi." />
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 420, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderBottom: `1px solid ${T.colors.border}` }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Jamoa xabarlari</div>
            <div style={{ marginTop: 2, color: T.colors.textSecondary, fontSize: 12 }}>{employees.length} foydalanuvchi · {sortedMessages.length} ta xabar</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: T.colors.borderLight, borderRadius: T.radius.full, padding: "6px 10px", fontSize: 12, color: T.colors.textSecondary }}>⚡ Realtime</span>
            <span style={{ background: T.colors.borderLight, borderRadius: T.radius.full, padding: "6px 10px", fontSize: 12, color: T.colors.textSecondary }}>🙂 Emoji</span>
          </div>
        </div>

        <div ref={viewportRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: T.space.xl, display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(180deg, #ffffff 0%, #fafafe 100%)" }}>
          {hasMore ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button variant="secondary" onClick={onLoadOlder} disabled={loadingOlder} style={{ padding: "8px 14px" }}>
                {loadingOlder ? "Eski xabarlar yuklanmoqda..." : "Eski xabarlarni ko'rsatish"}
              </Button>
            </div>
          ) : null}
          {loading ? (
            <div style={{ display: "grid", gap: 12 }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} style={{ display: "flex", justifyContent: index % 2 ? "flex-end" : "flex-start" }}>
                  <SkeletonBlock width={index % 2 ? "42%" : "58%"} height={52} radius={16} />
                </div>
              ))}
            </div>
          ) : sortedMessages.length ? (
            sortedMessages.map((message) => {
              const author = employeeMap[message.userId] || { name: message.authorName || "Noma'lum" };
              const mine = message.userId === profile.uid;
              const seenByOthers = Object.keys(message.readBy || {}).some((userId) => userId !== message.userId);
              return (
                <div key={message.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start", flexDirection: mine ? "row-reverse" : "row" }}>
                  {!mine ? <Avatar name={author.name} url={author.avatarUrl} size={30} /> : null}
                  <div style={{ maxWidth: "70%" }}>
                    {!mine ? <div style={{ fontSize: 11, color: T.colors.textSecondary, marginBottom: 4, fontWeight: 700 }}>{author.name}</div> : null}
                    <div
                      style={{
                        background: mine ? T.colors.accent : T.colors.bg,
                        color: mine ? "#fff" : T.colors.text,
                        padding: "12px 14px",
                        borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        lineHeight: 1.6,
                        boxShadow: mine ? "0 10px 24px rgba(0,113,227,0.16)" : "none",
                        whiteSpace: "pre-wrap",
                        opacity: message.status === "sending" ? 0.72 : 1,
                        border: message.status === "failed" ? `1px solid ${T.colors.red}` : "none",
                      }}
                    >
                      {message.text}
                    </div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: mine ? "flex-end" : "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 10, color: T.colors.textTertiary, textAlign: mine ? "right" : "left", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {String(message.createdAt || "").slice(0, 16).replace("T", " ")}
                        {message.editedAt ? <span>Tahrirlangan</span> : null}
                        {mine ? <span>{message.status === "failed" ? "Yuborilmadi" : message.status === "sending" ? "Yuborilmoqda" : seenByOthers ? "Ko'rildi" : "Yuborildi"}</span> : null}
                      </div>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        {quickReactions.slice(0, 2).map((emoji) => (
                          <button
                            key={`${message.id}_${emoji}`}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            style={{ border: "none", background: T.colors.borderLight, borderRadius: T.radius.full, width: 22, height: 22, cursor: "pointer", fontSize: 11 }}
                          >
                            {emoji}
                          </button>
                        ))}
                        {mine ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(message.id);
                                setInput(message.text);
                              }}
                              style={{ border: "none", background: "transparent", color: T.colors.textTertiary, cursor: "pointer", fontSize: 11, padding: "0 2px" }}
                            >
                              Tahrirlash
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteMessage?.(message.id)}
                              style={{ border: "none", background: "transparent", color: T.colors.red, cursor: "pointer", fontSize: 11, padding: "0 2px" }}
                            >
                              O'chirish
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: T.colors.textMuted }}>Chat hali bo'sh.</div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ borderTop: `1px solid ${T.colors.border}`, padding: 16, display: "flex", gap: 10, flexWrap: "wrap", background: T.colors.surface, position: "relative" }}>
          {showEmojiPicker ? <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} /> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                style={{
                  border: "none",
                  borderRadius: T.radius.full,
                  background: T.colors.borderLight,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={editingId ? "Xabarni tahrirlash..." : "Xabar yozing... (Enter yuboradi)"}
            style={{ flex: 1, minHeight: 44, maxHeight: 140, resize: "vertical", border: `1.5px solid ${editingId ? T.colors.accent : T.colors.border}`, borderRadius: T.radius.lg, padding: "10px 14px", fontFamily: T.font, fontSize: 14, background: T.colors.bg }}
          />
          <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
            <Button variant="secondary" onClick={() => setShowEmojiPicker((prev) => !prev)} style={{ padding: "10px 12px" }}>
              🙂
            </Button>
            {editingId ? <Button variant="secondary" onClick={() => { setEditingId(""); setInput(""); }} style={{ alignSelf: "flex-end", padding: "10px 12px" }}>Bekor</Button> : null}
            <Button onClick={send} style={{ alignSelf: "flex-end", padding: "10px 18px" }}>{editingId ? "Saqlash" : "Yuborish"}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
});
