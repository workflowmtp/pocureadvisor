'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDateTime, truncate } from '@/lib/format';

const ACTION_CONFIG: Record<string, { label: string; cls: string }> = {
  login: { label: 'Connexion', cls: 'login' },
  logout: { label: 'Déconnexion', cls: 'logout' },
  navigate: { label: 'Navigation', cls: 'navigate' },
  create: { label: 'Création', cls: 'create' },
  update: { label: 'Modification', cls: 'update' },
  ai_query: { label: 'IA', cls: 'ai_query' },
  delete: { label: 'Suppression', cls: 'delete' },
  export: { label: 'Export', cls: 'export' },
};

export default function LogsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (userFilter) params.set('userId', userFilter);
    if (actionFilter) params.set('action', actionFilter);
    params.set('page', String(page));
    params.set('limit', '200');
    const res = await fetch(`/api/logs?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [userFilter, actionFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleExport() {
    window.open('/api/export/logs', '_blank');
  }

  const logs = data?.logs || [];
  const users = data?.users || [];
  const totalLogs = data?.total || logs.length;
  const aiLogs = logs.filter((l: any) => l.aiInvolved).length;
  const uniqueUsers = new Set(logs.map((l: any) => l.userId)).size;

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Stats */}
      <div className="suppliers-stats" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-blue)' }}>{totalLogs}</div>
          <div className="supplier-stat-label">Entrées</div>
        </div>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-purple)' }}>{aiLogs}</div>
          <div className="supplier-stat-label">Actions IA</div>
        </div>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-green)' }}>{uniqueUsers}</div>
          <div className="supplier-stat-label">Utilisateurs</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-select" value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1); }}>
          <option value="">Tous utilisateurs</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select className="filter-select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">Toutes actions</option>
          <option value="login">Connexion</option>
          <option value="logout">Déconnexion</option>
          <option value="navigate">Navigation</option>
          <option value="create">Création</option>
          <option value="update">Modification</option>
          <option value="ai_query">Requête IA</option>
        </select>
        <button className="btn btn-sm btn-secondary" onClick={handleExport}>📤 Exporter CSV</button>
      </div>

      {/* Logs list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-text">Aucun log enregistré</div>
            </div>
          ) : (
            logs.map((log: any) => {
              const actionConf = ACTION_CONFIG[log.action] || { label: log.action, cls: 'navigate' };
              return (
                <div key={log.id} className="log-entry log-row" data-user={log.userId} data-action={log.action}>
                  <div className="log-timestamp">{formatDateTime(log.createdAt)}</div>
                  <div className="log-user">{log.userName || '—'}</div>
                  <span className={`log-action-badge ${actionConf.cls}`}>{actionConf.label}</span>
                  <div className="log-details">
                    {truncate(log.details || '—', 60)}
                    {log.aiInvolved && <span className="log-ai-badge">IA</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
