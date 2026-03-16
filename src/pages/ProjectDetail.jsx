// src/pages/ProjectDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import {
  subscribeSubCollection, addSubDoc, updateSubDoc, deleteSubDoc,
  updateProject, deleteProject,
} from '../firebase/firestore';
import { StatusBadge, ConfirmDialog, EmptyState } from '../components/ui';

const TASK_STATUSES = ['Rejalashtirildi','Jarayonda',"Ko'rib chiqilmoqda",'Tasdiqlandi','Bajarildi','Rad etildi'];
const TABS = ['Topshiriqlar','Kontent reja','Media plan','Rejalar','Aloqalar','Hisobot'];

// ── Generic list tab ──────────────────────────────────
function GenericTab({ projectId, subCol, fields, can }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const unsub = subscribeSubCollection(projectId, subCol, setItems);
    return unsub;
  }, [projectId, subCol]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const initForm = () => {
    const init = {};
    fields.forEach((f) => { init[f.key] = f.default || ''; });
    return init;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        await updateSubDoc(projectId, subCol, editItem.id, form);
      } else {
        await addSubDoc(projectId, subCol, form);
      }
      setShowForm(false);
      setEditItem(null);
      setForm({});
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    const f = {};
    fields.forEach((fd) => { f[fd.key] = item[fd.key] || fd.default || ''; });
    setForm(f);
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteSubDoc(projectId, subCol, id);
    setDeleting(null);
  };

  const openAdd = () => {
    setForm(initForm());
    setEditItem(null);
    setShowForm(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {can.crudProjects && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Qo'shish
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Ma'lumot yo'q" description="Hali hech narsa qo'shilmagan" />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {fields.map((f) => <th key={f.key}>{f.label}</th>)}
                {can.crudProjects && <th>Amallar</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {fields.map((f) => (
                    <td key={f.key}>
                      {f.type === 'status' ? (
                        <StatusBadge status={item[f.key]} />
                      ) : f.type === 'currency' ? (
                        item[f.key] ? `$${Number(item[f.key]).toLocaleString()}` : '—'
                      ) : (
                        item[f.key] || '—'
                      )}
                    </td>
                  ))}
                  {can.crudProjects && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(item)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(item.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? "Tahrirlash" : "Yangi qo'shish"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {fields.map((f) => (
                <div key={f.key} className="form-group">
                  <label className="label">{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input" value={form[f.key] || ''} onChange={(e) => setF(f.key, e.target.value)}>
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea className="input" rows={3} value={form[f.key] || ''} onChange={(e) => setF(f.key, e.target.value)} placeholder={f.placeholder} />
                  ) : (
                    <input className="input" type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setF(f.key, e.target.value)} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
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
          message="Ushbu yozuvni o'chirmoqchimisiz?"
          danger
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ── Tasks tab ─────────────────────────────────────────
function TasksTab({ projectId, can }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', assignee: '', dueDate: '', status: 'Rejalashtirildi', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const { users } = useApp();

  useEffect(() => {
    const unsub = subscribeSubCollection(projectId, 'tasks', setTasks);
    return unsub;
  }, [projectId]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTask) {
        await updateSubDoc(projectId, 'tasks', editTask.id, form);
      } else {
        await addSubDoc(projectId, 'tasks', form);
      }
      setShowForm(false);
      setEditTask(null);
      setForm({ title: '', assignee: '', dueDate: '', status: 'Rejalashtirildi', description: '' });
    } finally {
      setSaving(false);
    }
  };

  const grouped = TASK_STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {can.crudProjects && (
          <button className="btn btn-primary btn-sm" onClick={() => {
            setForm({ title: '', assignee: '', dueDate: '', status: 'Rejalashtirildi', description: '' });
            setEditTask(null);
            setShowForm(true);
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Topshiriq qo'shish
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="Topshiriqlar yo'q" description="Hali topshiriqlar qo'shilmagan" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: 3 }}>{task.title}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  {task.assignee && <span>👤 {task.assignee}</span>}
                  {task.dueDate && <span>📅 {task.dueDate}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={task.status} />
                {can.crudProjects && (
                  <>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                      setForm({ title: task.title, assignee: task.assignee || '', dueDate: task.dueDate || '', status: task.status, description: task.description || '' });
                      setEditTask(task);
                      setShowForm(true);
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(task.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTask ? 'Topshiriqni tahrirlash' : 'Yangi topshiriq'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">Topshiriq nomi *</label>
                <input className="input" value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="Nima qilish kerak?" />
              </div>
              <div className="form-group">
                <label className="label">Mas'ul xodim</label>
                <input className="input" value={form.assignee} onChange={(e) => setF('assignee', e.target.value)} placeholder="F.I.O." />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Muddat</label>
                  <input className="input" type="date" value={form.dueDate} onChange={(e) => setF('dueDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Holat</label>
                  <select className="input" value={form.status} onChange={(e) => setF('status', e.target.value)}>
                    {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Tavsif</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setF('description', e.target.value)} placeholder="Qo'shimcha ma'lumot..." />
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
          message="Bu topshiriqni o'chirmoqchimisiz?"
          danger
          onConfirm={async () => { await deleteSubDoc(projectId, 'tasks', deleting); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ── Report tab ────────────────────────────────────────
function ReportTab({ project }) {
  const [report, setReport] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ budget: 0, leads: 0, cpl: 0, sales: 0, roi: 0, notes: '' });
  const { can } = useAuth();

  useEffect(() => {
    const unsub = subscribeSubCollection(project.id, 'reports', (items) => {
      if (items.length > 0) {
        setReport(items[0]);
        setForm(items[0]);
      }
    });
    return unsub;
  }, [project.id]);

  const handleSave = async () => {
    if (report) {
      await updateSubDoc(project.id, 'reports', report.id, form);
    } else {
      await addSubDoc(project.id, 'reports', form);
    }
    setEditing(false);
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const metrics = [
    { key: 'budget', label: 'Byudjet', prefix: '$', color: '#0071e3' },
    { key: 'leads', label: 'Lidlar', prefix: '', color: '#34c759' },
    { key: 'cpl', label: 'CPL', prefix: '$', color: '#ff9500' },
    { key: 'sales', label: 'Sotuvlar', prefix: '$', color: '#bf5af2' },
    { key: 'roi', label: 'ROI', prefix: '', suffix: '%', color: '#ff3b30' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {can.crudProjects && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
            {report ? 'Tahrirlash' : "Hisobot qo'shish"}
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {metrics.map((m) => (
          <div key={m.key} className="kpi-card">
            <span className="kpi-label">{m.label}</span>
            <span className="kpi-value" style={{ color: m.color }}>
              {m.prefix}{report ? Number(report[m.key] || 0).toLocaleString() : '—'}{m.suffix || ''}
            </span>
          </div>
        ))}
      </div>

      {report?.notes && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8 }}>Eslatmalar</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.notes}</p>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Hisobot ma'lumotlari</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                {metrics.map((m) => (
                  <div key={m.key} className="form-group">
                    <label className="label">{m.label} {m.prefix && `(${m.prefix})`}{m.suffix && `(${m.suffix})`}</label>
                    <input className="input" type="number" value={form[m.key] || ''} onChange={(e) => setF(m.key, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="label">Eslatmalar</label>
                <textarea className="input" rows={3} value={form.notes || ''} onChange={(e) => setF('notes', e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { projects } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState title="Loyiha topilmadi" description="Bu loyiha mavjud emas yoki o'chirilgan" action={
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>Orqaga</button>
        } />
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteProject(id);
    navigate('/projects');
  };

  const CONTENT_FIELDS = [
    { key: 'title', label: 'Sarlavha', placeholder: 'Kontent sarlavhasi' },
    { key: 'format', label: 'Format', type: 'select', options: ['Post','Reels','Story','Video','Blog'] },
    { key: 'platform', label: 'Platforma', type: 'select', options: ['Instagram','TikTok','YouTube','Telegram','Facebook','LinkedIn'] },
    { key: 'dueDate', label: 'Muddat', type: 'date' },
    { key: 'status', label: 'Holat', type: 'status', type2: 'select', options: TASK_STATUSES, default: 'Rejalashtirildi' },
  ];

  const MEDIA_FIELDS = [
    { key: 'platform', label: 'Platforma', type: 'select', options: ['Instagram','TikTok','YouTube','Telegram','Facebook','LinkedIn','Google Ads'] },
    { key: 'budget', label: 'Byudjet', type: 'currency', type2: 'number' },
    { key: 'kpi', label: 'KPI', placeholder: 'Masalan: 1000 ta klik' },
    { key: 'startDate', label: 'Boshlanish', type: 'date' },
    { key: 'endDate', label: 'Tugash', type: 'date' },
    { key: 'status', label: 'Holat', type: 'status', type2: 'select', options: ['Rejalashtirildi','Jarayonda','Bajarildi'], default: 'Rejalashtirildi' },
  ];

  const PLAN_FIELDS = [
    { key: 'type', label: 'Tur', type: 'select', options: ['Kunlik','Haftalik','Oylik'] },
    { key: 'title', label: 'Sarlavha', placeholder: 'Reja nomi' },
    { key: 'description', label: 'Tavsif', type: 'textarea', placeholder: 'Batafsil...' },
    { key: 'date', label: 'Sana', type: 'date' },
    { key: 'status', label: 'Holat', type: 'status', type2: 'select', options: ['Rejalashtirildi','Jarayonda','Bajarildi'], default: 'Rejalashtirildi' },
  ];

  const CALL_FIELDS = [
    { key: 'date', label: 'Sana', type: 'date' },
    { key: 'type', label: 'Tur', type: 'select', options: ['Qo\'ng\'iroq','Uchrashuv','Video-qo\'ng\'iroq','Email'] },
    { key: 'contact', label: 'Aloqa', placeholder: 'Ism yoki kompaniya' },
    { key: 'result', label: 'Natija', type: 'textarea', placeholder: 'Muloqot natijasi...' },
    { key: 'nextStep', label: 'Keyingi qadam', placeholder: 'Nima qilish kerak?' },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <TasksTab projectId={id} can={can} />;
      case 1: return (
        <GenericTab
          projectId={id}
          subCol="content"
          fields={CONTENT_FIELDS.map((f) => ({ ...f, type: f.type2 || f.type }))}
          can={can}
        />
      );
      case 2: return (
        <GenericTab
          projectId={id}
          subCol="mediaPlans"
          fields={MEDIA_FIELDS.map((f) => ({ ...f, type: f.type2 || f.type }))}
          can={can}
        />
      );
      case 3: return (
        <GenericTab
          projectId={id}
          subCol="plans"
          fields={PLAN_FIELDS.map((f) => ({ ...f, type: f.type2 || f.type }))}
          can={can}
        />
      );
      case 4: return (
        <GenericTab
          projectId={id}
          subCol="calls"
          fields={CALL_FIELDS.map((f) => ({ ...f, type: f.type2 || f.type }))}
          can={can}
        />
      );
      case 5: return <ReportTab project={project} />;
      default: return null;
    }
  };

  return (
    <div className="page fade-in">
      {/* Back + header */}
      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/projects')}
          style={{ marginBottom: 12, gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Loyihalar
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 className="page-title">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {project.client && <span>{project.client}</span>}
              {project.budget > 0 && <span style={{ marginLeft: 16 }}>💰 ${Number(project.budget).toLocaleString()}</span>}
              {project.startDate && <span style={{ marginLeft: 16 }}>📅 {project.startDate}</span>}
            </div>
          </div>
          {can.crudProjects && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setDeleting(true)}
              >
                O'chirish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0 }}>
        <div className="tabs" style={{ padding: '0 16px', margin: 0 }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {renderTab()}
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Loyihani o'chirish"
          message={`"${project.name}" loyihasini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
