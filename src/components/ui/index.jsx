import React, { memo, useState, useRef, useEffect } from "react";
import { T, STATUS_META, PRIORITY_META, EMOJI_GROUPS } from "../../core/constants.js";
import { initials, fieldValue, sortByRecent, toMoney } from "../../core/utils.js";
import { normalizeComments, createComment } from "../../core/normalizers.js";
import { LIMITS } from "../../core/constants.js";

// ─── Avatar ───────────────────────────────────────────────────────────────────
export const Avatar = memo(function Avatar({ name, url, size = 34 }) {
  const palette = [T.colors.accent, T.colors.purple, T.colors.orange, T.colors.green, T.colors.indigo, "#e11d48"];
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: bg, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: Math.max(12, size * 0.35), flexShrink: 0, letterSpacing: "-0.4px" }}>
      {url ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
    </div>
  );
});

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = "primary", style = {}, ...props }) {
  const variants = {
    primary:   { background: T.colors.accent,      color: "#ffffff" },
    secondary: { background: T.colors.borderLight,  color: T.colors.text },
    ghost:     { background: "transparent",          color: T.colors.textSecondary },
    danger:    { background: T.colors.redSoft,       color: T.colors.red },
    success:   { background: T.colors.greenSoft,     color: "#1a7f37" },
    warning:   { background: T.colors.orangeSoft,    color: "#b45309" },
  };
  return (
    <button {...props} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: T.radius.md, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: props.disabled ? "not-allowed" : "pointer", fontFamily: T.font, opacity: props.disabled ? 0.55 : 1, transition: "opacity .15s", ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background: T.colors.surface, border: `1px solid ${T.colors.border}`, borderRadius: T.radius.xl, boxShadow: T.shadow.sm, padding: T.space.xl, cursor: onClick ? "pointer" : "default", transition: onClick ? "box-shadow .15s, transform .15s" : undefined, ...style }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = T.shadow.md; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = T.shadow.sm; e.currentTarget.style.transform = "translateY(0)"; } }}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: T.space.xl }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.1, fontWeight: 700 }}>{title}</h1>
        {subtitle ? <p style={{ margin: "4px 0 0", color: T.colors.textSecondary, fontSize: 14 }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ─── Field (UX-03 FIX: maxLength validation added) ───────────────────────────
export function Field({ label, value, onChange, type = "text", options, placeholder, rows = 4, maxLength, required }) {
  const [error, setError] = useState("");
  const commonStyle = { width: "100%", background: T.colors.bg, border: `1.5px solid ${error ? T.colors.red : T.colors.border}`, borderRadius: T.radius.md, padding: "9px 12px", fontSize: 14, color: T.colors.text, fontFamily: T.font, outline: "none", boxSizing: "border-box" };

  function handleChange(val) {
    if (maxLength && String(val).length > maxLength) {
      setError(`Maksimal ${maxLength} belgi`);
    } else if (required && !String(val).trim()) {
      setError("Majburiy maydon");
    } else {
      setError("");
    }
    onChange(val);
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? <span style={{ fontSize: 12, fontWeight: 600, color: T.colors.textSecondary }}>{label}{required ? " *" : ""}</span> : null}
      {options ? (
        <select value={value} onChange={e => handleChange(fieldValue(e))} style={commonStyle}>
          {options.map(o => typeof o === "object"
            ? <option key={o.value} value={o.value}>{o.label}</option>
            : <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea rows={rows} value={value} onChange={e => handleChange(fieldValue(e))} placeholder={placeholder} maxLength={maxLength} style={{ ...commonStyle, resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={e => handleChange(fieldValue(e))} placeholder={placeholder} maxLength={maxLength} style={commonStyle} />
      )}
      {error ? <span style={{ fontSize: 11, color: T.colors.red, marginTop: -2 }}>{error}</span> : null}
      {maxLength && type !== "select" ? <span style={{ fontSize: 10, color: T.colors.textTertiary, textAlign: "right" }}>{String(value || "").length}/{maxLength}</span> : null}
    </label>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose, width = 860 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: T.space.xl, zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", background: T.colors.surfaceElevated, borderRadius: T.radius.xl, boxShadow: T.shadow.lg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: T.space.xl, borderBottom: `1px solid ${T.colors.border}` }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: T.colors.borderLight, border: "none", borderRadius: T.radius.full, width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: T.colors.textSecondary }}>×</button>
        </div>
        <div style={{ padding: T.space.xl }}>{children}</div>
      </div>
    </div>
  );
}

// ─── UX-02 FIX: Custom Confirm Dialog (replaces window.confirm) ───────────────
export function ConfirmDialog({ message, confirmLabel = "Tasdiqlash", cancelLabel = "Bekor", onConfirm, onCancel, danger = true }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onCancel(); if (e.key === "Enter") onConfirm(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ background: T.colors.surface, borderRadius: T.radius.xl, boxShadow: T.shadow.lg, padding: T.space.xxl, maxWidth: 420, width: "90%" }}>
        <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ title, desc, icon = "◌" }) {
  return (
    <div style={{ textAlign: "center", color: T.colors.textSecondary, padding: "48px 24px" }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: T.colors.textTertiary }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.colors.text }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>{desc}</div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function SkeletonBlock({ height = 16, width = "100%", radius = T.radius.md, style = {} }) {
  return (
    <div style={{ width, height, borderRadius: radius, background: "linear-gradient(90deg,rgba(229,229,234,.6)0%,rgba(245,245,247,1)50%,rgba(229,229,234,.6)100%)", backgroundSize: "200% 100%", animation: "skeletonShimmer 1.4s linear infinite", ...style }} />
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
        {[0,1,2,3].map(i => <Card key={i} style={{ padding: 18 }}><SkeletonBlock width="42%" height={28} /><SkeletonBlock width="68%" height={14} style={{ marginTop: 12 }} /><SkeletonBlock width="52%" height={12} style={{ marginTop: 8 }} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(320px,0.85fr)", gap: 18, marginTop: 20 }}>
        <Card><SkeletonBlock height={280} /></Card>
        <Card><SkeletonBlock height={280} /></Card>
      </div>
    </div>
  );
}

export function GridSkeleton({ cards = 6, minWidth = 280 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${minWidth}px,1fr))`, gap: 14 }}>
      {Array.from({ length: cards }).map((_, i) => <Card key={i}><SkeletonBlock width="55%" height={18} /><SkeletonBlock width="32%" height={12} style={{ marginTop: 8 }} /><SkeletonBlock height={90} style={{ marginTop: 16 }} /></Card>)}
    </div>
  );
}

// ─── StatusBadge / StatusSelect ───────────────────────────────────────────────
export const StatusBadge = memo(function StatusBadge({ value }) {
  const meta = STATUS_META[value] || STATUS_META["Rejalashtirildi"];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", background: meta.bg, color: meta.text, borderRadius: T.radius.full, border: `1px solid ${meta.border}`, fontSize: 12, fontWeight: 800 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.text }} />{value}</span>;
});

export function StatusSelect({ value, options, onChange, disabled }) {
  const meta = STATUS_META[value] || STATUS_META["Rejalashtirildi"];
  if (disabled || !onChange) return <StatusBadge value={value} />;
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ appearance: "none", background: meta.bg, color: meta.text, border: `1px solid ${meta.border}`, borderRadius: T.radius.full, padding: "6px 28px 6px 12px", fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: "pointer" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export const PriorityBadge = memo(function PriorityBadge({ value }) {
  const meta = PRIORITY_META[value] || PRIORITY_META["O'rta"];
  return <span style={{ background: meta.bg, color: meta.text, borderRadius: T.radius.full, padding: "5px 10px", fontSize: 12, fontWeight: 800 }}>{value}</span>;
});

// ─── CircleProgress ───────────────────────────────────────────────────────────
export const CircleProgress = memo(function CircleProgress({ pct, size = 66, stroke = 6, color = T.colors.accent }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (circ * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.colors.borderLight} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, hint, color }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 4, color: T.colors.textSecondary, fontSize: 12 }}>{hint}</div>
    </Card>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────
export function DataTable({ columns, children }) {
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.colors.border}`, borderRadius: T.radius.lg }}>
      <table style={{ width: "100%", minWidth: 840, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.colors.bg }}>
            {columns.map(c => <th key={c} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 700, color: T.colors.textSecondary, letterSpacing: 0.4, textTransform: "uppercase" }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Row({ children }) { return <tr>{children}</tr>; }
export function Cell({ children, style = {} }) { return <td style={{ padding: "11px 14px", borderTop: `1px solid ${T.colors.borderLight}`, fontSize: 13.5, verticalAlign: "top", ...style }}>{children}</td>; }

// ─── TeamSelector ─────────────────────────────────────────────────────────────
export function TeamSelector({ employees, value, onChange }) {
  const v = Array.isArray(value) ? value : [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {employees.map(emp => {
        const active = v.includes(emp.id);
        return (
          <button key={emp.id} type="button" onClick={() => onChange(active ? v.filter(i => i !== emp.id) : [...v, emp.id])} style={{ border: `1px solid ${active ? T.colors.accent : T.colors.border}`, background: active ? T.colors.accentSoft : T.colors.bg, color: active ? T.colors.accent : T.colors.textMuted, borderRadius: T.radius.full, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: T.font }}>
            {emp.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── CommentThread ────────────────────────────────────────────────────────────
export function CommentThread({ comments = [], onAddComment, placeholder = "Izoh qoldiring...", accent = T.colors.accent }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const list = sortByRecent(normalizeComments(comments), "createdAt").slice(0, open ? comments.length : 2);

  function submit() {
    const text = value.trim();
    if (!text || !onAddComment) return;
    onAddComment(text);
    setValue("");
    setOpen(true);
  }

  return (
    <div style={{ minWidth: 180 }}>
      <button type="button" onClick={() => setOpen(p => !p)} style={{ border: "none", background: T.colors.borderLight, color: accent, borderRadius: T.radius.full, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
        {comments.length ? `${comments.length} ta izoh` : "Izoh qo'shish"}
      </button>
      {(open || comments.length) ? (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {list.map(c => (
            <div key={c.id} style={{ background: "#fff", border: `1px solid ${T.colors.borderLight}`, borderRadius: T.radius.md, padding: "8px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800 }}>{c.authorName || "Xodim"}</span>
                <span style={{ fontSize: 10, color: T.colors.textTertiary }}>{String(c.createdAt || "").slice(5, 16).replace("T", " ")}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: T.colors.textSecondary }}>{c.text}</div>
            </div>
          ))}
          {onAddComment ? (
            <div style={{ display: "grid", gap: 6 }}>
              <textarea value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} rows={2} maxLength={LIMITS.note} style={{ width: "100%", border: `1px solid ${T.colors.border}`, borderRadius: T.radius.md, padding: "9px 10px", resize: "vertical", background: "#fff", fontFamily: T.font, fontSize: 12 }} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={submit} style={{ padding: "6px 10px" }}>Yuborish</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── EmojiPicker ──────────────────────────────────────────────────────────────
export function EmojiPicker({ onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(EMOJI_GROUPS[0].id);
  const group = EMOJI_GROUPS.find(g => g.id === activeGroup) || EMOJI_GROUPS[0];
  return (
    <Card style={{ position: "absolute", bottom: "calc(100% + 12px)", left: 0, width: 320, padding: 12, boxShadow: T.shadow.lg, zIndex: 25 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Emoji picker</div>
        <button type="button" onClick={onClose} style={{ border: "none", background: T.colors.borderLight, color: T.colors.textSecondary, width: 26, height: 26, borderRadius: T.radius.full, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {EMOJI_GROUPS.map(g => <button key={g.id} type="button" onClick={() => setActiveGroup(g.id)} style={{ border: "none", borderRadius: T.radius.full, background: g.id === activeGroup ? T.colors.accentSoft : T.colors.borderLight, color: g.id === activeGroup ? T.colors.accent : T.colors.textSecondary, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{g.label}</button>)}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.colors.textSecondary, marginBottom: 8 }}>{group.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 6 }}>
        {group.items.map(em => <button key={em} type="button" onClick={() => onSelect(em)} style={{ border: "none", background: T.colors.bg, borderRadius: T.radius.md, padding: "9px 0", cursor: "pointer", fontSize: 18 }}>{em}</button>)}
      </div>
    </Card>
  );
}

// ─── ToastStack ───────────────────────────────────────────────────────────────
export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", right: 22, bottom: 22, zIndex: 1400, display: "grid", gap: 10, width: 320 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding: "12px 14px", borderRadius: T.radius.lg, background: t.tone === "error" ? T.colors.redSoft : "#ffffff", color: t.tone === "error" ? T.colors.red : T.colors.text, border: `1px solid ${t.tone === "error" ? "#fecaca" : T.colors.border}`, boxShadow: T.shadow.md }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 2 }}>{t.tone === "error" ? "Xatolik" : "Muvaffaqiyatli"}</div>
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>{t.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─── GlobalStyles ─────────────────────────────────────────────────────────────
export function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; }
      body { font-family: ${T.font}; background: ${T.colors.bg}; color: ${T.colors.text}; }
      a { color: ${T.colors.accent}; }
      button, input, select, textarea { font: inherit; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: #c7c7cc; border-radius: 999px; }
      @keyframes sidebarPulse { 0%{box-shadow:0 0 0 0 rgba(255,59,48,.55)} 70%{box-shadow:0 0 0 10px rgba(255,59,48,0)} 100%{box-shadow:0 0 0 0 rgba(220,38,38,0)} }
      @keyframes syncPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(.7);opacity:.45} }
      @keyframes appleSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes appleSpinReverse { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
      @keyframes loaderPulse { 0%,100%{transform:scale(.9);opacity:.45} 50%{transform:scale(1.08);opacity:1} }
      @keyframes loaderBounce { 0%,100%{transform:translateY(0);opacity:.25} 50%{transform:translateY(-4px);opacity:1} }
      @keyframes loaderFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes loaderDrift { 0%{transform:translate3d(-1.5%, -1%, 0) scale(1)} 100%{transform:translate3d(1.5%, 1%, 0) scale(1.03)} }
      @keyframes skeletonShimmer { from{background-position:200% 0} to{background-position:-200% 0} }
      @media(max-width:1080px){main{max-width:100%!important;padding:24px!important}}
      @media(max-width:920px){aside{width:100%!important;min-height:auto!important;position:static!important} body>div,#root>div{min-width:0} #root>div>main{max-width:100%!important}}
    `}</style>
  );
}
