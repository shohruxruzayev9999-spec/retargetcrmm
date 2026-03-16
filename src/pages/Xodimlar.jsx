// src/pages/Xodimlar.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { setUserProfile, setUserPrivate, getUserPrivate } from '../firebase/firestore';
import { Avatar, RoleBadge, SearchInput, EmptyState, SkeletonCard } from '../components/ui';

const ROLES = ['employee','manager','supervisor','investor','ceo'];
const DEPARTMENTS = ['SMM','Kreativ','Videografiya','Marketing','Dizayn','Boshqaruv','Moliya'];
const ROLE_LABELS = { ceo:'CEO', manager:'Manager', supervisor:'Supervisor', investor:'Investor', employee:'Xodim' };

function EmployeeCard({ user, projects, can, onEdit }) {
  const userProjects = projects.filter((p) => p.teamIds?.includes(user.id));
  const initials = user.displayName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, transition: 'all var(--transition)' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Top */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: user.photoURL ? 'transparent' : 'linear-gradient(135deg, var(--accent-light), var(--purple-bg))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '1rem', color: 'var(--accent)',
          overflow: 'hidden',
        }}>
          {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.displayName || 'Noma\'lum'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.position || user.email}
          </div>
          <div style={{ marginTop: 4 }}>
            <RoleBadge role={user.role} />
          </div>
        </div>
        {can.fullAccess && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(user)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        )}
      </div>

      {/* Department */}
      {user.department && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          🏢 {user.department}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{userProjects.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Loyiha</div>
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user.kpi || '—'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>KPI</div>
        </div>
        {can.seeSalary && user.salary !== undefined && (
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
              ${Number(user.salary || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Maosh</div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditEmployeeModal({ user, onClose }) {
  const [form, setForm] = useState({
    displayName: user.displayName || '',
    role: user.role || 'employee',
    department: user.department || '',
    position: user.position || '',
    kpi: user.kpi || '',
    salary: '',
  });
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);
  const { can } = useAuth();

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await setUserProfile(user.id, {
        displayName: form.displayName,
        role: form.role,
        department: form.department,
        position: form.position,
        kpi: form.kpi,
      });
      if (can.seeSalary && salary !== '') {
        await setUserPrivate(user.id, { salary: Number(salary) });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Xodimni tahrirlash</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="label">Ism Familiya</label>
            <input className="input" value={form.displayName} onChange={(e) => setF('displayName', e.target.value)} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => setF('role', e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Bo'lim</label>
              <select className="input" value={form.department} onChange={(e) => setF('department', e.target.value)}>
                <option value="">Tanlanmagan</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Lavozim</label>
              <input className="input" value={form.position} onChange={(e) => setF('position', e.target.value)} placeholder="Masalan: SMM Mutaxassis" />
            </div>
            <div className="form-group">
              <label className="label">KPI</label>
              <input className="input" value={form.kpi} onChange={(e) => setF('kpi', e.target.value)} placeholder="Masalan: 95%" />
            </div>
          </div>
          {can.seeSalary && (
            <div className="form-group">
              <label className="label">Oylik maosh (USD)</label>
              <input
                className="input"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Mavjud maoshni yangilash uchun kiriting"
              />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Xodimlar() {
  const { can } = useAuth();
  const { users, projects, dataLoading } = useApp();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('Barchasi');
  const [editUser, setEditUser] = useState(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.position?.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'Barchasi' || u.department === deptFilter;
    return matchSearch && matchDept;
  });

  const grouped = DEPARTMENTS.reduce((acc, dept) => {
    const list = filtered.filter((u) => u.department === dept);
    if (list.length > 0) acc[dept] = list;
    return acc;
  }, {});
  const ungrouped = filtered.filter((u) => !u.department);

  if (dataLoading) {
    return (
      <div className="page">
        <div style={{ height: 50 }} />
        <div className="grid-4">
          {[1,2,3,4,5,6,7,8].map((i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      </div>
    );
  }

  const allDepts = [...new Set(users.map((u) => u.department).filter(Boolean))];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Xodimlar</h1>
          <div className="page-subtitle">{users.length} ta xodim</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="input"
            style={{ width: 'auto' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option>Barchasi</option>
            {allDepts.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Xodimlar topilmadi" />
      ) : (
        <>
          {Object.entries(grouped).map(([dept, members]) => (
            <div key={dept} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <h3 style={{ fontSize: '0.95rem' }}>{dept}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', background: 'var(--border-light)', borderRadius: 20, padding: '2px 8px' }}>
                  {members.length} ta
                </span>
              </div>
              <div className="grid-4">
                {members.map((u) => (
                  <EmployeeCard key={u.id} user={u} projects={projects} can={can} onEdit={setEditUser} />
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <h3 style={{ fontSize: '0.95rem' }}>Bo'limga biriktirilmagan</h3>
              </div>
              <div className="grid-4">
                {ungrouped.map((u) => (
                  <EmployeeCard key={u.id} user={u} projects={projects} can={can} onEdit={setEditUser} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {editUser && (
        <EditEmployeeModal user={editUser} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}
