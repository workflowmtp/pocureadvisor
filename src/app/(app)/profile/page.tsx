'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { formatDateTime } from '@/lib/format';
import { useAppStore } from '@/stores/appStore';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useAppStore();
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  const user = session?.user as any;

  useEffect(() => {
    fetch('/api/logs?limit=10').then(r => r.json()).then(d => setRecentLogs(d.logs || [])).catch(() => {});
    if (user?.id) {
      fetch(`/api/audit/users/${user.id}`).then(r => r.json()).then(d => setUserProfile(d)).catch(() => {});
    }
  }, [user?.id]);

  if (!user) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  const initials = user.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || '??';

  return (
    <div>
      {/* Profile header */}
      <div className="profile-card">
        <div className="profile-avatar-lg">{user.avatar || initials}</div>
        <div className="profile-info">
          <h2>{user.name}</h2>
          <div className="role-badge">{user.roleLabel || user.role}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--sp-1)' }}>{user.email}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Connexions</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--accent-blue)' }}>{user.loginCount || 0}</div>
        </div>
      </div>

      {/* Grid 2 */}
      <div className="grid-2" style={{ marginTop: 'var(--sp-5)' }}>
        {/* Account info */}
        <div className="card">
          <div className="card-header"><div className="card-title">Informations du compte</div></div>
          <div className="info-grid">
            <InfoItem label="Identifiant" value={user.username || '—'} />
            <InfoItem label="Nom complet" value={user.name || '—'} />
            <InfoItem label="Email" value={user.email || '—'} />
            <InfoItem label="Rôle" value={user.roleLabel || user.role || '—'} />
            <InfoItem label="Pôles d'accès" value={(user.poleIds || []).join(', ') || 'Tous'} />
            <InfoItem label="Statut" value={user.isActive ? <span className="badge badge-success">Actif</span> : <span className="badge badge-critical">Inactif</span>} />
          </div>
        </div>

        {/* Permissions */}
        <div className="card">
          <div className="card-header"><div className="card-title">Permissions</div></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {user.permissions && Object.entries(user.permissions).map(([mod, level]: [string, any]) => {
              if (level === 'none') return null;
              const color = level === 'full' ? 'badge-success' : 'badge-info';
              return <span key={mod} className={`badge ${color}`}>{mod}: {level}</span>;
            })}
            {!user.permissions && <span style={{ color: 'var(--text-tertiary)' }}>Chargement...</span>}
          </div>
        </div>
      </div>

      {/* Discipline profile */}
      {userProfile && (
        <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="card-header"><div className="card-title">📊 Mon profil de discipline</div></div>
          <div className="grid-4">
            <div className="supplier-stat-card">
              <div className="supplier-stat-value" style={{ color: userProfile.discipline >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{userProfile.discipline}/100</div>
              <div className="supplier-stat-label">Score discipline</div>
            </div>
            <div className="supplier-stat-card">
              <div className="supplier-stat-value" style={{ color: 'var(--accent-orange)' }}>{userProfile.totalAnomalies}</div>
              <div className="supplier-stat-label">Anomalies</div>
            </div>
            <div className="supplier-stat-card">
              <div className="supplier-stat-value" style={{ color: 'var(--accent-red)' }}>{userProfile.criticalAnomalies}</div>
              <div className="supplier-stat-label">Critiques</div>
            </div>
            <div className="supplier-stat-card">
              <div className="supplier-stat-value">{userProfile.risk}</div>
              <div className="supplier-stat-label">Niveau risque</div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-header"><div className="card-title">Préférences</div></div>
        <div className="setting-row">
          <div><div className="setting-label">Thème</div></div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('dark')}>🌙 Sombre</button>
            <button className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('light')}>☀️ Clair</button>
          </div>
        </div>
        <div className="setting-row">
          <div><div className="setting-label">Notifications email</div><div className="setting-desc">Recevoir les alertes critiques par email (futur)</div></div>
          <div className="toggle-switch on" />
        </div>
      </div>

      {/* Recent activity */}
      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-header"><div className="card-title">Activité récente</div></div>
        {recentLogs.length > 0 ? (
          <div className="log-list">
            {recentLogs.slice(0, 8).map((l: any) => (
              <div key={l.id} className="log-entry log-row">
                <div className="log-timestamp">{formatDateTime(l.createdAt)}</div>
                <div className="log-details">
                  {l.details || l.action}
                  {l.aiInvolved && <span className="log-ai-badge">IA</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>Aucune activité récente</p>
        )}
      </div>

      {/* Logout */}
      <div style={{ marginTop: 'var(--sp-5)' }}>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-danger">⏻ Se déconnecter</button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}
