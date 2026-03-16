// src/pages/Uchrashuvlar.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeMeetings, addMeeting, updateMeeting, deleteMeeting } from '../firebase/firestore';
import { StatusBadge, EmptyState, ConfirmDialog, SkeletonCard, SearchInput } from '../components/ui';
import { format, parseISO } from 'date-fns';
import { uz } from 'date-fns/locale';

const MEETING_TYPES = ['Mijoz bilan', 'Jamoa ichki', 'Online', 'Taqdimot', 'Muzokaralar', 'Boshqa'];
const MEETING_RESULTS = ['Muvaffaqiyatli', 'Qisman', 'Bekor qilindi', "Ko'rib chiqilmoqda"];
const EMPTY_FORM = { date: '', type: 'Mijoz bilan', participants: '', result: 'Muvaffaqiyatli', summary: '', nextStep: '', project: '' };

function MeetingRow({ meeting, can, onEdit, onDelete }) {
  let formattedDate = meeting.date;
  try {
    formattedDate = format(parseISO(meeting.date), 'd MMM yyyy', { locale: uz });
  } catch {}

  const resultColor = {
    'Muvaffaqiyatli': 'var(--success)',
    'Qisman': 'var(--warning)',
    'Bekor qilindi': 'var(--danger)',
    "Ko'rib chiqilmoqda": 'var(--purple)',
  }[meeting.result] || 'var(--text-secondary)';

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{formattedDate}</div>
      </td>
      <td>
        <span style={{
          background: 'var(--accent-light)', color: 'var(--accent)',
          borderRadius: 20, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 500,
        }}>
          {meeting.type}
        </span>
      </td>
      <td>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {meeting.participants || '—'}
        </div>
      </td>
      <td>
        <span style={{
          color: resultColor,
          fontSize: '0.82rem', fontWeight: 500,
        }}>
          ● {meeting.result}
        </span>
      </td>
      <td style={{ maxWidth: 200 }}>
        <div style={{
          fontSize: '0.82rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {meeting.nextStep || '—'}
        </div>
      </td>
      {can.crudProjects && (
        <td>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(meeting)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onDelete(meeting.id)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function Uchrashuvlar() {
  const { can } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Barchasi');
  const [showForm, setShowForm] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const unsub = subscribeMeetings((data) => { setMeetings(data); setLoading(false); });
    return unsub;
  }, []);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editMeeting) {
        await updateMeeting(editMeeting.id, form);
      } else {
        await addMeeting(form);
      }
      setShowForm(false);
      setEditMeeting(null);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m) => {
    setForm({
      date: m.date || '',
      type: m.type || 'Mijoz bilan',
      participants: m.participants || '',
      result: m.result || 'Muvaffaqiyatli',
      summary: m.summary || '',
      nextStep: m.nextStep || '',
      project: m.project || '',
    });
    setEditMeeting(m);
    setShowForm(true);
  };

  const filtered = meetings.filter((m) => {
    const matchSearch =
      m.participants?.toLowerCase().includes(search.toLowerCase()) ||
      m.summary?.toLowerCase().includes(search.toLowerCase()) ||
      m.project?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'Barchasi' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  if (loading) {
    return (
      <div className="page">
        <div style={{ height: 50 }} />
        <SkeletonCard lines={6} />
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Uchrashuvlar</h1>
          <div className="page-subtitle">{meetings.length} ta uchrashuv</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="input"
            style={{ width: 'auto' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>Barchasi</option>
            {MEETING_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          {can.crudProjects && (
            <button
              className="btn btn-primary"
              onClick={() => { setForm(EMPTY_FORM); setEditMeeting(null); setShowForm(true); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Yangi uchrashuv
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Uchrashuvlar topilmadi"
          description={search ? "Qidiruv bo'yicha natija yo'q" : "Hali uchrashuvlar qayd etilmagan"}
          action={can.crudProjects && !search && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Birinchi uchrashuvni qo'shing
            </button>
          )}
        />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Tur</th>
                  <th>Ishtirokchilar</th>
                  <th>Natija</th>
                  <th>Keyingi qadam</th>
                  {can.crudProjects && <th>Amallar</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <>
                    <MeetingRow
                      key={m.id}
                      meeting={m}
                      can={can}
                      onEdit={handleEdit}
                      onDelete={setDeleting}
                    />
                    {m.summary && (
                      <tr key={`${m.id}-summary`} style={{ background: 'var(--bg)' }}>
                        <td colSpan={can.crudProjects ? 6 : 5} style={{ paddingTop: 0, paddingBottom: 10 }}>
                          <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            paddingLeft: 4,
                            borderLeft: '2px solid var(--border)',
                            fontStyle: 'italic',
                          }}>
                            📝 {m.summary}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMeeting ? 'Uchrashuvni tahrirlash' : 'Yangi uchrashuv'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Sana</label>
                  <input className="input" type="date" value={form.date} onChange={(e) => setF('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Tur</label>
                  <select className="input" value={form.type} onChange={(e) => setF('type', e.target.value)}>
                    {MEETING_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Ishtirokchilar</label>
                <input
                  className="input"
                  value={form.participants}
                  onChange={(e) => setF('participants', e.target.value)}
                  placeholder="Ism yoki kompaniya nomlarini kiriting"
                />
              </div>
              <div className="form-group">
                <label className="label">Loyiha</label>
                <input
                  className="input"
                  value={form.project}
                  onChange={(e) => setF('project', e.target.value)}
                  placeholder="Qaysi loyiha bo'yicha?"
                />
              </div>
              <div className="form-group">
                <label className="label">Natija</label>
                <select className="input" value={form.result} onChange={(e) => setF('result', e.target.value)}>
                  {MEETING_RESULTS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Qisqacha xulosa</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.summary}
                  onChange={(e) => setF('summary', e.target.value)}
                  placeholder="Uchrashuv qanday o'tdi?"
                />
              </div>
              <div className="form-group">
                <label className="label">Keyingi qadam</label>
                <input
                  className="input"
                  value={form.nextStep}
                  onChange={(e) => setF('nextStep', e.target.value)}
                  placeholder="Nima qilish kerak?"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title="O'chirishni tasdiqlang"
          message="Bu uchrashuv yozuvini o'chirmoqchimisiz?"
          danger
          onConfirm={async () => { await deleteMeeting(deleting); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
