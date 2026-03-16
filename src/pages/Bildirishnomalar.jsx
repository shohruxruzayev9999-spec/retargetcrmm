// src/pages/Bildirishnomalar.jsx
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import {
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
} from '../firebase/firestore';
import { EmptyState } from '../components/ui';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

const NOTIF_ICONS = {
  task:    { icon: '✅', color: '#34c759', bg: '#edfbf1' },
  project: { icon: '📁', color: '#0071e3', bg: '#e8f0fe' },
  meeting: { icon: '📅', color: '#ff9500', bg: '#fff8ed' },
  shoot:   { icon: '🎬', color: '#bf5af2', bg: '#f5eeff' },
  system:  { icon: '🔔', color: '#6e6e73', bg: '#f5f5f7' },
  warning: { icon: '⚠️', color: '#ff3b30', bg: '#fff2f1' },
};

function timeAgo(ts) {
  if (!ts) return '';
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(date, { addSuffix: true, locale: uz });
  } catch {
    return '';
  }
}

function NotifItem({ notif, onRead }) {
  const typeInfo = NOTIF_ICONS[notif.type] || NOTIF_ICONS.system;

  return (
    <div
      onClick={() => !notif.read && onRead(notif.id)}
      style={{
        display: 'flex',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-light)',
        background: notif.read ? 'transparent' : 'rgba(0,113,227,0.03)',
        cursor: notif.read ? 'default' : 'pointer',
        transition: 'background var(--transition)',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!notif.read) e.currentTarget.style.background = 'rgba(0,113,227,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(0,113,227,0.03)'; }}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div style={{
          position: 'absolute',
          left: 6, top: '50%', transform: 'translateY(-50%)',
          width: 6, height: 6,
          background: 'var(--accent)',
          borderRadius: '50%',
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: typeInfo.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem',
      }}>
        {typeInfo.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: notif.read ? 400 : 600,
          fontSize: '0.875rem',
          marginBottom: 2,
          color: 'var(--text-primary)',
        }}>
          {notif.title}
        </div>
        {notif.body && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {notif.body}
          </div>
        )}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
          {timeAgo(notif.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function Bildirishnomalar() {
  const { user, can } = useAuth();
  const { notifications } = useApp();

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  // Demo: CEO can create test notifications
  const handleTestNotif = async () => {
    if (!user) return;
    const types = ['task', 'project', 'meeting', 'shoot', 'warning'];
    const titles = [
      'Yangi topshiriq biriktirildi',
      'Loyiha yangilandi',
      'Uchrashuv eslatmasi',
      'Bugun syomka bor',
      'Muddati o\'tgan topshiriq',
    ];
    const bodies = [
      'Sizga yangi topshiriq biriktirildi. Iltimos tekshiring.',
      'Faol Reklama Campaign loyihasi yangilandi.',
      'Bugun soat 15:00 da mijoz bilan uchrashuv.',
      'Ertaga soat 10:00 da Chilonzor studiyasida syomka.',
      'Bajarilmagan 3 ta topshiriq muddati o\'tib ketdi.',
    ];
    const idx = Math.floor(Math.random() * 5);
    await addNotification({
      recipientId: user.uid,
      type: types[idx],
      title: titles[idx],
      body: bodies[idx],
    });
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bildirishnomalar</h1>
          <div className="page-subtitle">
            {unread.length > 0 ? `${unread.length} ta o'qilmagan` : 'Hammasi o\'qilgan'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {can.fullAccess && (
            <button className="btn btn-secondary btn-sm" onClick={handleTestNotif}>
              Test bildirishnoma
            </button>
          )}
          {unread.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAll}>
              Barchasini o'qildi deb belgilash
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Bildirishnomalar yo'q"
          description="Hozircha hech qanday bildirishnoma yo'q"
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          }
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Unread section */}
          {unread.length > 0 && (
            <>
              <div style={{
                padding: '10px 20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
              }}>
                O'qilmagan · {unread.length}
              </div>
              {unread.map((n) => (
                <NotifItem key={n.id} notif={n} onRead={markNotificationRead} />
              ))}
            </>
          )}

          {/* Read section */}
          {read.length > 0 && (
            <>
              <div style={{
                padding: '10px 20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
              }}>
                O'qilgan · {read.length}
              </div>
              {read.map((n) => (
                <NotifItem key={n.id} notif={n} onRead={markNotificationRead} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
