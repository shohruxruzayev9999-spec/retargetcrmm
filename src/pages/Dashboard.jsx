// src/pages/Dashboard.jsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { StatCard, SkeletonCard, Progress, Avatar, StatusBadge } from '../components/ui';

const TASK_STATUSES = ['Rejalashtirildi','Jarayonda',"Ko'rib chiqilmoqda",'Tasdiqlandi','Bajarildi','Rad etildi'];
const COLORS = ['#8884d8','#0071e3','#ff9500','#bf5af2','#34c759','#ff3b30'];

export default function Dashboard() {
  const { profile, role, can } = useAuth();
  const { projects, users, dataLoading } = useApp();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!projects.length) return null;

    const allTasks = projects.flatMap((p) => p.taskSummary || []);
    const totalTasks = projects.reduce((a, p) => a + (p.taskCount || 0), 0);
    const doneTasks = projects.reduce((a, p) => a + (p.doneCount || 0), 0);
    const activePros = projects.filter((p) => p.status === 'Faol' || p.status === 'Aktiv').length;

    // Bar chart: projects by status
    const statusData = ['Faol','Pauza','Yakunlandi'].map((s) => ({
      name: s,
      count: projects.filter((p) => p.status === s).length,
    }));

    // Load per user
    const userLoad = users.slice(0, 6).map((u) => ({
      name: u.displayName?.split(' ')[0] || 'N/A',
      projects: projects.filter((p) => p.teamIds?.includes(u.id)).length,
    }));

    return { totalTasks, doneTasks, activePros, statusData, userLoad };
  }, [projects, users]);

  const topEmployee = useMemo(() => {
    if (!users.length) return null;
    return users.reduce((best, u) => {
      const count = projects.filter((p) => p.teamIds?.includes(u.id)).length;
      return count > (best?.count || 0) ? { ...u, count } : best;
    }, null);
  }, [users, projects]);

  if (dataLoading) {
    return (
      <div className="page">
        <div className="stats-grid">
          {[1,2,3,4].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
        <div className="grid-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Xayrli tong';
    if (h < 17) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  const completionRate = stats?.totalTasks
    ? Math.round((stats.doneTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting()}, {profile?.displayName?.split(' ')[0]} 👋</h1>
          <div className="page-subtitle">
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Jami loyihalar"
          value={projects.length}
          sub={`${stats?.activePros || 0} ta faol`}
          color="#0071e3"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
        />
        <StatCard
          label="Jami topshiriqlar"
          value={stats?.totalTasks || 0}
          sub={`${stats?.doneTasks || 0} ta bajarildi`}
          color="#34c759"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <StatCard
          label="Bajarilish darajasi"
          value={`${completionRate}%`}
          sub="Barcha topshiriqlar"
          color="#bf5af2"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
        />
        {can.manageEmployees ? (
          <StatCard
            label="Xodimlar soni"
            value={users.length}
            sub="Barcha bo'limlar"
            color="#ff9500"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
        ) : (
          <StatCard
            label="Mening loyihalarim"
            value={projects.length}
            sub="Biriktirilgan"
            color="#ff9500"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          />
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Project status chart */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Loyihalar holati</h3>
          {projects.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.statusData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: 12 }}
                  cursor={{ fill: 'var(--bg)' }}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              Hali loyihalar yo'q
            </div>
          )}
        </div>

        {/* Team workload */}
        {can.manageEmployees && (
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Jamoa ish yuklamasi</h3>
            {users.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {users.slice(0, 5).map((u) => {
                  const count = projects.filter((p) => p.teamIds?.includes(u.id)).length;
                  const max = Math.max(...users.map((x) => projects.filter((p) => p.teamIds?.includes(x.id)).length), 1);
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={u.displayName} photo={u.photoURL} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.displayName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8 }}>
                            {count} loyiha
                          </span>
                        </div>
                        <Progress value={(count / max) * 100} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                Hali xodimlar yo'q
              </div>
            )}
          </div>
        )}

        {!can.manageEmployees && (
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Mening loyihalarim</h3>
            {projects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all var(--transition)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                Loyihalar biriktirilmagan
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Recent projects */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>So'nggi loyihalar</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>Barchasini ko'rish →</button>
          </div>
          {projects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {p.client || 'Mijoz ko\'rsatilmagan'}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              Hali loyihalar yo'q
            </div>
          )}
        </div>

        {/* Top employee & completion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {topEmployee && can.manageEmployees && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #0071e3, #bf5af2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>🏆 Eng faol xodim</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{topEmployee.displayName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{topEmployee.count} ta loyiha</div>
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Umumiy bajarilish</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="8"/>
                  <circle
                    cx="40" cy="40" r="32"
                    fill="none" stroke="var(--accent)" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - completionRate / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em',
                }}>
                  {completionRate}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Topshiriqlar statistikasi</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bajarildi</span>
                    <span style={{ fontWeight: 600 }}>{stats?.doneTasks || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Jami</span>
                    <span style={{ fontWeight: 600 }}>{stats?.totalTasks || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
