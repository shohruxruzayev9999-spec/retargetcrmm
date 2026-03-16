// src/components/ui/index.jsx

// ── Skeleton ──────────────────────────────────────────
export function Skeleton({ width, height, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width: width || '100%', height: height || '16px', ...style }}
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height="20px" width="60%" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="14px" width={i % 2 === 0 ? '90%' : '75%'} />
      ))}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────
export function Badge({ children, className = '', style = {} }) {
  return (
    <span className={`badge ${className}`} style={style}>
      {children}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────
const STATUS_MAP = {
  'Rejalashtirildi': 'status-planned',
  'Jarayonda': 'status-progress',
  "Ko'rib chiqilmoqda": 'status-review',
  'Tasdiqlandi': 'status-approved',
  'Bajarildi': 'status-done',
  'Rad etildi': 'status-rejected',
  'Faol': 'status-active',
  'Aktiv': 'status-active',
  'Pauza': 'status-paused',
  'Yakunlandi': 'status-completed',
};

export function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] || 'status-planned';
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ── Role badge ────────────────────────────────────────
const ROLE_LABELS = {
  ceo: 'CEO',
  manager: 'Manager',
  supervisor: 'Supervisor',
  investor: 'Investor',
  employee: 'Xodim',
};

export function RoleBadge({ role }) {
  return <span className={`badge role-${role}`}>{ROLE_LABELS[role] || role}</span>;
}

// ── Avatar ────────────────────────────────────────────
export function Avatar({ name, photo, size = 'md', style = {} }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : 'avatar';
  return (
    <div className={cls} style={style}>
      {photo ? <img src={photo} alt={name} /> : initials}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon || (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{title || "Ma'lumot topilmadi"}</div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || "Tasdiqlash"}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Bekor qilish</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            Tasdiqlash
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KPI stat card ─────────────────────────────────────
export function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span className="kpi-label">{label}</span>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: color ? `${color}18` : 'var(--accent-light)',
            color: color || 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ animation: 'spin 0.7s linear infinite' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </div>
  );
}

// ── Section header ────────────────────────────────────
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────
export function Progress({ value, color, height = 6 }) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div
        className="progress-fill"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color || 'var(--accent)',
          height,
        }}
      />
    </div>
  );
}

// ── Search input ──────────────────────────────────────
export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        className="input"
        style={{ paddingLeft: 32, width: 220 }}
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Qidirish..."}
      />
    </div>
  );
}
