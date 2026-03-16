// src/pages/Hisobotlar.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { SkeletonCard } from '../components/ui';

const CHART_COLORS = ['#0071e3', '#34c759', '#ff9500', '#bf5af2', '#ff3b30', '#5ac8fa'];

function MetricCard({ label, value, prefix = '', suffix = '', color = 'var(--accent)', trend }) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" style={{ color }}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </span>
      {trend !== undefined && (
        <span style={{
          fontSize: '0.78rem',
          color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
          fontWeight: 500,
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

export default function Hisobotlar() {
  const { can } = useAuth();
  const { projects, users, dataLoading } = useApp();
  const [period, setPeriod] = useState('all');

  const stats = useMemo(() => {
    if (!projects.length) return null;

    const totalBudget = projects.reduce((a, p) => a + (Number(p.budget) || 0), 0);
    const active = projects.filter((p) => p.status === 'Faol' || p.status === 'Aktiv').length;
    const completed = projects.filter((p) => p.status === 'Yakunlandi').length;
    const paused = projects.filter((p) => p.status === 'Pauza').length;

    // Budget by project (top 8)
    const budgetByProject = projects
      .filter((p) => p.budget > 0)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 8)
      .map((p) => ({ name: p.name?.slice(0, 15) + (p.name?.length > 15 ? '…' : ''), budget: Number(p.budget) || 0 }));

    // Status distribution for pie
    const statusPie = [
      { name: 'Faol', value: active },
      { name: 'Pauza', value: paused },
      { name: 'Yakunlandi', value: completed },
    ].filter((s) => s.value > 0);

    // Team performance: projects per user
    const teamPerf = users
      .map((u) => ({
        name: u.displayName?.split(' ')[0] || 'N/A',
        loyihalar: projects.filter((p) => p.teamIds?.includes(u.id)).length,
      }))
      .filter((u) => u.loyihalar > 0)
      .sort((a, b) => b.loyihalar - a.loyihalar)
      .slice(0, 8);

    return { totalBudget, active, completed, paused, budgetByProject, statusPie, teamPerf };
  }, [projects, users]);

  if (!can.seeReports) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2>Ruxsat yo'q</h2>
          <p style={{ marginTop: 8, fontSize: '0.9rem' }}>Bu sahifa faqat CEO va Investor uchun</p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="page">
        <div className="stats-grid">{[1,2,3,4].map((i) => <SkeletonCard key={i} lines={2} />)}</div>
        <div className="grid-2">{[1,2].map((i) => <SkeletonCard key={i} lines={6} />)}</div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hisobotlar</h1>
          <div className="page-subtitle">Umumiy ko'rsatkichlar va tahlil</div>
        </div>
        <select
          className="input"
          style={{ width: 'auto' }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">Barcha vaqt</option>
          <option value="month">Bu oy</option>
          <option value="quarter">Bu chorak</option>
          <option value="year">Bu yil</option>
        </select>
      </div>

      {/* KPI metrics */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <MetricCard
          label="Jami loyihalar"
          value={projects.length}
          color="var(--accent)"
        />
        <MetricCard
          label="Faol loyihalar"
          value={stats?.active || 0}
          color="var(--success)"
        />
        <MetricCard
          label="Yakunlangan"
          value={stats?.completed || 0}
          color="var(--purple)"
        />
        <MetricCard
          label="Umumiy byudjet"
          value={stats?.totalBudget || 0}
          prefix="$"
          color="var(--warning)"
        />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Budget by project */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Loyihalar bo'yicha byudjet</h3>
          {stats?.budgetByProject?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.budgetByProject} barSize={20} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}
                  formatter={(v) => [`$${v.toLocaleString()}`, 'Byudjet']}
                  cursor={{ fill: 'var(--bg)' }}
                />
                <Bar dataKey="budget" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              Byudjet ma'lumotlari yo'q
            </div>
          )}
        </div>

        {/* Status pie */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Loyihalar holati</h3>
          {stats?.statusPie?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.statusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.statusPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.statusPie.map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i], flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{s.value} ta</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              Ma'lumot yo'q
            </div>
          )}
        </div>
      </div>

      {/* Team performance */}
      {stats?.teamPerf?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>Jamoa samaradorligi (loyihalar soni)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.teamPerf} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}
                cursor={{ fill: 'var(--bg)' }}
              />
              <Bar dataKey="loyihalar" fill="var(--purple)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed projects table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3>Loyihalar jadvali</h3>
        </div>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Loyiha</th>
                <th>Mijoz</th>
                <th>Holat</th>
                <th>Byudjet</th>
                <th>Xodimlar</th>
                <th>Topshiriqlar</th>
                <th>Bajarilish</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const taskCount = p.taskCount || 0;
                const doneCount = p.doneCount || 0;
                const completion = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {p.client || '—'}
                    </td>
                    <td>
                      <span className={`badge status-${
                        p.status === 'Faol' ? 'active' :
                        p.status === 'Pauza' ? 'paused' :
                        p.status === 'Yakunlandi' ? 'completed' : 'planned'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {p.budget ? `$${Number(p.budget).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {p.teamIds?.length || 0}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {doneCount}/{taskCount}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{
                            height: '100%',
                            width: `${completion}%`,
                            background: completion === 100 ? 'var(--success)' : 'var(--accent)',
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: 32, textAlign: 'right' }}>
                          {completion}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
