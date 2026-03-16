// src/pages/Loyihalar.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { addProject } from '../firebase/firestore';
import { StatusBadge, SearchInput, EmptyState, SkeletonCard } from '../components/ui';

const PROJECT_STATUSES = ['Faol','Pauza','Yakunlandi'];

function ProjectCard({ project, onClick }) {
  const taskCount = project.taskCount || 0;
  const doneCount = project.doneCount || 0;
  const completion = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'all var(--transition)', display: 'flex', flexDirection: 'column', gap: 14 }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{project.client || '—'}</div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {project.description && (
        <p style={{
          fontSize: '0.83rem', color: 'var(--text-secondary)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {project.description}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          <span>Topshiriqlar</span>
          <span>{doneCount}/{taskCount}</span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${completion}%`,
            background: completion === 100 ? 'var(--success)' : 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
        <span>
          {project.startDate
            ? new Date(project.startDate).toLocaleDateString('uz-UZ')
            : 'Sana belgilanmagan'}
        </span>
        <span>{project.teamIds?.length || 0} ta xodim</span>
      </div>
    </div>
  );
}

function AddProjectModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', client: '', description: '', status: 'Faol',
    startDate: '', endDate: '', budget: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addProject({
        ...form,
        budget: form.budget ? Number(form.budget) : 0,
        teamIds: [],
        taskCount: 0,
        doneCount: 0,
      });
      onAdd?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Yangi loyiha qo'shish</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="label">Loyiha nomi *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Loyiha nomini kiriting" />
          </div>
          <div className="form-group">
            <label className="label">Mijoz</label>
            <input className="input" value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="Mijoz nomi" />
          </div>
          <div className="form-group">
            <label className="label">Tavsif</label>
            <textarea className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Loyiha haqida qisqacha..." rows={3} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Holat</label>
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Byudjet (USD)</label>
              <input className="input" type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Boshlanish sanasi</label>
              <input className="input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Tugash sanasi</label>
              <input className="input" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Loyihalar() {
  const { can } = useAuth();
  const { projects, dataLoading } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Barchasi');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Barchasi' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (dataLoading) {
    return (
      <div className="page">
        <div style={{ height: 50 }} />
        <div className="grid-3">
          {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} lines={4} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loyihalar</h1>
          <div className="page-subtitle">{projects.length} ta loyiha</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="input"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>Barchasi</option>
            {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {can.crudProjects && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Yangi loyiha
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Loyihalar topilmadi"
          description={search ? "Qidiruv natijasi bo'sh" : "Hali loyihalar qo'shilmagan"}
          action={can.crudProjects && !search && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              Birinchi loyihani qo'shing
            </button>
          )}
        />
      )}

      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
