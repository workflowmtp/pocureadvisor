'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, truncate, ageDays } from '@/lib/format';
import { ANOMALY_CATEGORY_ICONS, SEVERITY_CONFIG } from '@/lib/constants';

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  open: { label: 'Ouvert', cls: 'badge-high' },
  investigating: { label: 'Investigation', cls: 'badge-info' },
  resolved: { label: 'Résolu', cls: 'badge-success' },
  escalated: { label: 'Escaladé', cls: 'badge-neutral' },
};

export default function AuditPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const fetchData = () => {
    const params = new URLSearchParams();
    if (sevFilter) params.set('severity', sevFilter);
    if (catFilter) params.set('category', catFilter);
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/anomalies?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [sevFilter, catFilter, statusFilter]);

  async function quickAction(id: string, action: string, payload: Record<string, string> = {}) {
    await fetch(`/api/anomalies/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    setResolveModal(null);
    setFormData({});
    fetchData();
  }

  const stats = data?.stats || {};
  const anomalies = data?.anomalies || [];
  const categories = data?.categories || [];
  const auditRules = data?.auditRules || [];

  const filtered = anomalies.filter((a: any) => {
    if (search && !(a.title + ' ' + a.id + ' ' + a.category).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function exportCSV() {
    const rows = filtered.map((a: any) => [a.id, a.category, a.severity, a.priority, a.title, a.supplier?.name || '', a.user?.fullName || '', a.financialImpact || '', a.dateDetected, a.status].join(';'));
    const csv = '\ufeff' + 'ID;Catégorie;Sévérité;Priorité;Titre;Fournisseur;Utilisateur;Impact;Date;Statut\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ProcureAdvisor_Anomalies.csv'; a.click();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Triangle de Contrôle */}
      <div className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="card-header">
          <div className="card-title">🔺 Triangle de Contrôle</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--sp-2)' }}>🔺</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: 'var(--sp-4)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>📄</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginTop: 'var(--sp-1)' }}>Document réel</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Scan / OCR</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>💻</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginTop: 'var(--sp-1)' }}>Saisie Sage X3</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>ERP</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>📑</div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginTop: 'var(--sp-1)' }}>Contrat / Règles</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Référentiel</div>
              </div>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 'var(--sp-3)' }}>
              Tout écart entre ces trois sommets génère une alerte potentielle
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div className="suppliers-stats">
              <div className="supplier-stat-card">
                <div className="supplier-stat-value" style={{ color: 'var(--accent-red)' }}>{stats.criticals || 0}</div>
                <div className="supplier-stat-label">Critiques ouvertes</div>
              </div>
              <div className="supplier-stat-card">
                <div className="supplier-stat-value" style={{ color: 'var(--accent-orange)' }}>{stats.open || 0}</div>
                <div className="supplier-stat-label">Ouvertes</div>
              </div>
              <div className="supplier-stat-card">
                <div className="supplier-stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.investigating || 0}</div>
                <div className="supplier-stat-label">En investigation</div>
              </div>
              <div className="supplier-stat-card">
                <div className="supplier-stat-value" style={{ color: 'var(--accent-red)' }}>{formatCurrency(stats.totalImpact || 0)}</div>
                <div className="supplier-stat-label">Impact financier</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input 
          type="text" 
          className="filter-search"
          placeholder="Rechercher anomalie..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
        <select 
          className="filter-select"
          value={sevFilter} 
          onChange={e => setSevFilter(e.target.value)}
        >
          <option value="">Toutes sévérités</option>
          <option value="critical">Critique</option>
          <option value="high">Élevée</option>
          <option value="medium">Moyenne</option>
        </select>
        <select 
          className="filter-select"
          value={catFilter} 
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">Toutes catégories</option>
          {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select 
          className="filter-select"
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Tous statuts</option>
          <option value="open">Ouvert</option>
          <option value="investigating">Investigation</option>
          <option value="resolved">Résolu</option>
        </select>
        <button className="btn btn-sm btn-secondary" onClick={exportCSV} style={{ marginLeft: 'auto' }}>📤 Exporter CSV</button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>P</th>
              <th>Catégorie</th>
              <th>Sévérité</th>
              <th>Titre</th>
              <th>Fournisseur</th>
              <th>Utilisateur</th>
              <th>Impact</th>
              <th>Date</th>
              <th>Âge</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a: any) => {
              const age = ageDays(a.dateDetected);
              const ageColor = a.status !== 'resolved' 
                ? (age > 14 ? 'var(--accent-red)' : age > 7 ? 'var(--accent-orange)' : 'var(--text-tertiary)')
                : 'var(--text-tertiary)';
              const ageWarn = a.status !== 'resolved' 
                ? (age > 14 ? ' 🔥' : age > 7 ? ' ⚠' : '') 
                : '';
              const rowBg = a.status !== 'resolved'
                ? (a.severity === 'critical' ? 'rgba(239,68,68,0.05)' : age > 14 ? 'rgba(245,158,11,0.04)' : '')
                : '';
              const statusConf = STATUS_BADGES[a.status] || STATUS_BADGES.open;
              const sevConf = SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;

              return (
                <tr 
                  key={a.id} 
                  className="anomaly-row"
                  style={rowBg ? { background: rowBg } : undefined}
                >
                  <td 
                    className="table-mono"
                    style={{ fontSize: 'var(--fs-xs)', cursor: 'pointer', color: 'var(--accent-blue)' }}
                    onClick={() => window.location.href = `/audit/${a.id}`}
                  >
                    {a.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td>
                    <span className={`priority-tag p${a.priority || 3}`}>P{a.priority || 3}</span>
                  </td>
                  <td>
                    {ANOMALY_CATEGORY_ICONS[a.category] || '📋'} 
                    <span style={{ fontSize: 'var(--fs-xs)' }}>{a.category}</span>
                  </td>
                  <td>
                    <span className={`badge ${sevConf.cls}`}>{sevConf.label}</span>
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{truncate(a.title, 35)}</span>
                  </td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{a.supplier ? truncate(a.supplier.name, 16) : '—'}</td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{a.user ? truncate(a.user.fullName, 14) : '—'}</td>
                  <td className="table-amount">{a.financialImpact ? formatCurrency(a.financialImpact) : '—'}</td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{formatDate(a.dateDetected)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)', color: ageColor }}>
                    {age}j{ageWarn}
                  </td>
                  <td>
                    <span className={`badge ${statusConf.cls}`}>{statusConf.label}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button 
                        className="btn-icon" 
                        style={{ width: '28px', height: '28px' }} 
                        onClick={() => window.location.href = `/audit/${a.id}`}
                        title="Voir détails"
                      >👁</button>
                      {a.status === 'open' && (
                        <>
                          <button 
                            className="btn-icon" 
                            style={{ width: '28px', height: '28px' }} 
                            onClick={() => quickAction(a.id, 'investigate')}
                            title="Investiguer"
                          >🔎</button>
                          <button 
                            className="btn-icon" 
                            style={{ width: '28px', height: '28px' }} 
                            onClick={() => setResolveModal(a.id)}
                            title="Résoudre"
                          >✅</button>
                        </>
                      )}
                      {a.status === 'investigating' && (
                        <button 
                          className="btn-icon" 
                          style={{ width: '28px', height: '28px' }} 
                          onClick={() => setResolveModal(a.id)}
                          title="Résoudre"
                        >✅</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="text-center py-12 text-sm text-[var(--text-tertiary)]">Aucune anomalie</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Rules */}
      <div className="card" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="card-header">
          <div className="card-title">📋 Règles d&apos;audit actives ({auditRules.filter((r: any) => r.active).length}/20)</div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Règle</th>
                <th>Catégorie</th>
                <th>Sévérité</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {auditRules.map((rule: any) => {
                const sevConf = SEVERITY_CONFIG[rule.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                return (
                  <tr key={rule.id}>
                    <td className="table-mono">{rule.id}</td>
                    <td style={{ fontSize: 'var(--fs-sm)' }}>{rule.name}</td>
                    <td>{ANOMALY_CATEGORY_ICONS[rule.category] || ''} {rule.category}</td>
                    <td><span className={`badge ${sevConf.cls}`}>{sevConf.label}</span></td>
                    <td>
                      <span className={`badge ${rule.active ? 'badge-success' : 'badge-neutral'}`}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setResolveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Résolution de l&apos;anomalie</h3>
            <select 
              value={formData.corrective_action || ''} 
              onChange={e => setFormData({ ...formData, corrective_action: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-3 focus:outline-none"
            >
              <option value="">— Action corrective —</option>
              <option value="Corrigé dans Sage X3">Corrigé dans Sage X3</option>
              <option value="Avoir émis par fournisseur">Avoir émis par fournisseur</option>
              <option value="Écart justifié et accepté">Écart justifié et accepté</option>
              <option value="Formation / rappel procédure">Formation / rappel procédure</option>
              <option value="Action corrective fournisseur">Action corrective fournisseur</option>
              <option value="Faux positif">Faux positif</option>
              <option value="Autre">Autre</option>
            </select>
            <textarea 
              placeholder="Commentaire de résolution..." 
              value={formData.comment || ''} 
              onChange={e => setFormData({ ...formData, comment: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[80px] focus:outline-none" 
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setResolveModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
              <button 
                onClick={() => resolveModal && quickAction(resolveModal, 'resolve', { corrective_action: formData.corrective_action || '', comment: formData.comment || '' })}
                className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600"
              >✅ Résoudre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
