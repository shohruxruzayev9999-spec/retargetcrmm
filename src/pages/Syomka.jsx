// src/pages/Syomka.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeShoots, addShoot, updateShoot, deleteShoot } from '../firebase/firestore';
import { EmptyState, ConfirmDialog, SkeletonCard } from '../components/ui';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { uz } from 'date-fns/locale';

function groupByDate(shoots) {
  return shoots.reduce((acc, s) => {
    const date = s.date || 'Nomalum';
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});
}

function dateLabel(dateStr) {
  if (!dateStr || dateStr === 'Nomalum') return dateStr;
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return `🔴 Bugun — ${format(d, 'd MMMM yyyy', { locale: uz })}`;
    if (isTomorrow(d)) return `🟡 Ertaga — ${format(d, 'd MMMM yyyy', { locale: uz })}`;
    return format(d, 'd MMMM yyyy', { locale: uz });
  } catch {
    return dateStr;
  }
}

function ShootCard({ shoot, can, onEdit, onDelete }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        transition: 'all var(--transition)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Time badge */}
      <div style={{
        flexShrink: 0, width: 56, height: 56, borderRadius: 12,
        background: 'var(--accent-light)', color: 'var(--accent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 2 }}>{shoot.time || '—'}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{shoot.title}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {shoot.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {shoot.location}
            </span>
          )}
          {shoot.operator && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              {shoot.operator}
            </span>
          )}
          {shoot.project && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              {shoot.project}
            </span>
          )}
        </div>
        {shoot.notes && (
          <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            {shoot.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      {can.crudProjects && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(shoot)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onDelete(shoot.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { title: '', date: '', time: '', location: '', operator: '', project: '', notes: '' };

export default function Syomka() {
  const { can } = useAuth();
  const [shoots, setShoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editShoot, setEditShoot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const unsub = subscribeShoots((data) => { setShoots(data); setLoading(false); });
    return unsub;
  }, []);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editShoot) {
        await updateShoot(editShoot.id, form);
      } else {
        await addShoot(form);
      }
      setShowForm(false);
      setEditShoot(null);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s) => {
    setForm({ title: s.title || '', date: s.date || '', time: s.time || '', location: s.location || '', operator: s.operator || '', project: s.project || '', notes: s.notes || '' });
    setEditShoot(s);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteShoot(id);
    setDeleting(null);
  };

  const grouped = groupByDate(shoots);
  const sortedDates = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="page">
        <div style={{ height: 50 }} />
        {[1,2].map((i) => <SkeletonCard key={i} lines={3} />)}
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Syomka</h1>
          <div className="page-subtitle">{shoots.length} ta syomka</div>
        </div>
        {can.crudProjects && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditShoot(null); setShowForm(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yangi syomka
          </button>
        )}
      </div>

      {shoots.length === 0 ? (
        <EmptyState
          title="Syomkalar yo'q"
          description="Hali syomkalar rejalashtirилмаган"
          action={can.crudProjects && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Birinchi syomkani qo'shing
            </button>
          )}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {sortedDates.map((date) => (
            <div key={date}>
              <div style={{
                fontSize: '0.85rem', fontWeight: 700,
                color: 'var(--text-secondary)', letterSpacing: '0.02em',
                marginBottom: 12, paddingBottom: 8,
                borderBottom: '1px solid var(--border)',
              }}>
                {dateLabel(date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped[date].map((s) => (
                  <ShootCard
                    key={s.id}
                    shoot={s}
                    can={can}
                    onEdit={handleEdit}
                    onDelete={setDeleting}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editShoot ? 'Syomkani tahrirlash' : 'Yangi syomka'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">Nomi *</label>
                <input className="input" value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="Syomka nomi" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Sana</label>
                  <input className="input" type="date" value={form.date} onChange={(e) => setF('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Vaqt</label>
                  <input className="input" type="time" value={form.time} onChange={(e) => setF('time', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Joylashuv</label>
                <input className="input" value={form.location} onChange={(e) => setF('location', e.target.value)} placeholder="Manzil" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Operator</label>
                  <input className="input" value={form.operator} onChange={(e) => setF('operator', e.target.value)} placeholder="Operator ismi" />
                </div>
                <div className="form-group">
                  <label className="label">Loyiha</label>
                  <input className="input" value={form.project} onChange={(e) => setF('project', e.target.value)} placeholder="Loyiha nomi" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Eslatma</label>
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => setF('notes', e.target.value)} placeholder="Qo'shimcha ma'lumot..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title="O'chirishni tasdiqlang"
          message="Bu syomkani o'chirmoqchimisiz?"
          danger
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
