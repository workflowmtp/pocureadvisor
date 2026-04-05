'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRelative, formatCurrency } from '@/lib/format';
import { SEVERITY_CONFIG } from '@/lib/constants';
import { useAppStore } from '@/stores/appStore';

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  readAt: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

interface PriorityAction {
  id: string;
  label: string;
  desc: string;
  priority: 'P1' | 'P2' | 'P3';
  type: string;
  href: string;
  impact?: number;
}

export default function NotificationsPage() {
  const router = useRouter();
  const updateBadges = useAppStore(s => s.updateBadges);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actions, setActions] = useState<PriorityAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [sevFilter, setSevFilter] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/notifications').then(r => r.json()),
      fetch('/api/notifications?priorities=true').then(r => r.json()),
    ]).then(([notifs, priData]) => {
      setNotifications(Array.isArray(notifs) ? notifs : []);
      setActions(priData.actions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
    updateBadges({ unreadNotifs: notifications.filter(n => !n.isRead && n.id !== id).length });
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    updateBadges({ unreadNotifs: 0 });
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.isRead) return false;
    if (filter === 'read' && !n.isRead) return false;
    if (sevFilter && n.severity !== sevFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const entityRoutes: Record<string, string> = {
    anomaly: '/audit', order: '/orders', supplier: '/suppliers',
    rawMaterial: '/sourcing', document: '/ocr', negotiation: '/negotiations',
  };

  const priColors = { P1: 'bg-brand-red text-white', P2: 'bg-brand-orange text-white', P3: 'bg-brand-blue text-white' };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Priority Actions Center */}
      {actions.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-secondary)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Centre d'actions prioritaires</h3>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{actions.length} action(s)</span>
          </div>
          <div className="divide-y divide-[var(--border-secondary)]">
            {actions.map(a => (
              <div key={a.id} onClick={() => router.push(a.href)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer">
                <span className={`min-w-[36px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold ${priColors[a.priority]}`}>
                  {a.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{a.label}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{a.desc}</div>
                </div>
                {a.impact && a.impact > 0 && (
                  <span className="table-amount text-brand-red flex-shrink-0">{formatCurrency(a.impact)}</span>
                )}
                <span className="text-xs text-brand-blue flex-shrink-0">Agir →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Notifications</h2>
          {unreadCount > 0 && (
            <span className="min-w-[24px] h-6 px-2 rounded-full bg-brand-red text-white text-xs font-bold flex items-center justify-center">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg hover:border-brand-blue transition-colors">
            ✅ Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === f ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Lues'}
            {f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
          className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-full text-xs focus:outline-none ml-2">
          <option value="">Toutes sévérités</option>
          <option value="critical">Critique</option><option value="high">Élevée</option>
          <option value="medium">Moyenne</option><option value="info">Info</option>
        </select>
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filtered.map(n => {
          const sc = SEVERITY_CONFIG[n.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
          const route = n.relatedEntityType ? entityRoutes[n.relatedEntityType] : null;

          return (
            <div key={n.id}
              className={`bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 transition-colors ${!n.isRead ? 'border-l-4' : ''}`}
              style={!n.isRead ? { borderLeftColor: sc.color } : undefined}>
              <div className="flex items-start gap-3">
                {/* Severity dot */}
                <div className="mt-1 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: n.isRead ? 'var(--border-primary)' : sc.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${n.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{n.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bgClass}`}>{sc.label}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${n.isRead ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[var(--text-tertiary)]">{formatRelative(n.createdAt)}</span>
                    {route && (
                      <button onClick={() => router.push(route)} className="text-[10px] text-brand-blue hover:underline">Voir →</button>
                    )}
                  </div>
                </div>

                {/* Mark read */}
                {!n.isRead && (
                  <button onClick={() => markRead(n.id)} className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-[var(--bg-input)] flex items-center justify-center text-xs" title="Marquer comme lu">
                    ✓
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔔</div>
            <div className="text-sm text-[var(--text-tertiary)]">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
