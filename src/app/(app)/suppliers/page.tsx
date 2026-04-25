'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, truncate } from '@/lib/format';

const STATUS_LABELS: Record<string, string> = {
  strategic: 'Stratégique',
  active: 'Actif',
  probation: 'Probation',
  inactive: 'Inactif',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#22C55E',
};

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  rising:  { icon: '📈', color: '#22C55E' },
  stable:  { icon: '➡️', color: '#3B82F6' },
  declining: { icon: '📉', color: '#EF4444' },
};

const SCORE_CLASS = (s: number) => s >= 80 ? 'bg-brand-green-soft text-brand-green' : s >= 60 ? 'bg-brand-blue-soft text-brand-blue' : s >= 40 ? 'bg-brand-orange-soft text-brand-orange' : 'bg-brand-red-soft text-brand-red';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({});

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (riskFilter) params.set('risk', riskFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    params.set('page', String(page));
    params.set('limit', '20');
    try {
      const res = await fetch(`/api/suppliers?${params}`);
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      setSuppliers(json.suppliers || []);
      setPagination(json.pagination || {});
      setStats(json.stats || {});
      setCategories(json.categories || []);
    } catch (e) {
      console.error('[SUPPLIERS] Fetch error:', e);
    }
    setLoading(false);
  }, [search, statusFilter, riskFilter, categoryFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Gestion Fournisseurs</h2>
        <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-colors">
          📥 Exporter CSV
        </button>
      </div>

      {/* X3 Banner — alert-card style with left border */}
      <div className="rounded-xl p-4 mb-5 bg-[var(--bg-card)] border border-[var(--border-primary)] border-l-[3px] border-l-purple-500">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💻</span>
          <div>
            <div className="font-semibold text-[var(--text-primary)] text-sm">Données synchronisées depuis Sage X3</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">Les fournisseurs sont créés et gérés dans Sage X3. ProcureAdvisor enrichit les données avec scoring, anomalies, évaluations et recommandations IA. Pour ajouter un fournisseur, créez-le d'abord dans Sage X3. Pour prospecter, utilisez le module <span className="text-brand-blue underline cursor-pointer">Fournisseurs Alternatifs</span>.</div>
          </div>
        </div>
      </div>

      {/* Stat chips — matching HTML supplier-stat-chip style */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button onClick={() => { setStatusFilter(''); setRiskFilter(''); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!statusFilter && !riskFilter ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}>
          🏢 Tous <span className="font-mono font-bold">{stats.total || 0}</span>
        </button>
        <button onClick={() => { setStatusFilter('strategic'); setRiskFilter(''); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${statusFilter === 'strategic' ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}>
          🟢 Stratégiques <span className="font-mono font-bold text-brand-green">{stats.strategic || 0}</span>
        </button>
        <button onClick={() => { setStatusFilter('active'); setRiskFilter(''); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${statusFilter === 'active' ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}>
          🔵 Actifs <span className="font-mono font-bold text-brand-blue">{stats.active || 0}</span>
        </button>
        <button onClick={() => { setStatusFilter('probation'); setRiskFilter(''); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${statusFilter === 'probation' ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}>
          🟡 Probation <span className="font-mono font-bold text-brand-orange">{stats.probation || 0}</span>
        </button>
        <button onClick={() => { setRiskFilter(riskFilter ? '' : 'critical'); setStatusFilter(''); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${riskFilter === 'critical' ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}>
          🔴 Critiques <span className="font-mono font-bold text-brand-red">{stats.atRisk || 0}</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher un fournisseur..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none w-64" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none">
          <option value="">Tous les statuts</option>
          <option value="strategic">Stratégique</option>
          <option value="active">Actif</option>
          <option value="probation">Probation</option>
          <option value="inactive">Inactif</option>
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none">
          <option value="">Tous les pôles</option>
          <option value="OE">Opérations</option>
          <option value="HF">Hors FAB</option>
          <option value="OC">Occasionnel</option>
          <option value="BC">Bureau</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-3 text-left font-semibold">Fournisseur</th>
                <th className="px-3 py-3 text-left font-semibold">Pays</th>
                <th className="px-3 py-3 text-left font-semibold">Catégorie</th>
                <th className="px-3 py-3 text-center font-semibold">Score</th>
                <th className="px-3 py-3 text-center font-semibold">Tendance</th>
                <th className="px-3 py-3 text-center font-semibold">Statut</th>
                <th className="px-3 py-3 text-center font-semibold">Risque</th>
                <th className="px-3 py-3 text-right font-semibold">Volume YTD</th>
                <th className="px-3 py-3 text-center font-semibold">Dépendance</th>
                <th className="px-3 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s: any) => {
                const trend = TREND_ICONS[s.trend] || TREND_ICONS.stable;
                const riskColor = RISK_COLORS[s.riskLevel] || '#6B7280';
                const depColor = s.dependencyRatio > 60 ? 'text-brand-red font-bold' : s.dependencyRatio > 40 ? 'text-brand-orange' : 'text-[var(--text-secondary)]';
                return (
                  <tr key={s.id}
                    className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                    onClick={() => router.push(`/suppliers/${s.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-blue-soft text-brand-blue flex items-center justify-center text-xs font-bold font-mono flex-shrink-0">
                          {s.code?.substring(0, 3) || '—'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)]">{truncate(s.name, 28)}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{s.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.country || '—'}</td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.categoryName || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-[42px] h-[42px] rounded-lg text-sm font-bold ${SCORE_CLASS(s.scoreGlobal || 0)}`}>
                        {s.scoreGlobal || 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm">{trend.icon}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.status === 'strategic' ? 'bg-brand-green-soft text-brand-green' :
                        s.status === 'active' ? 'bg-brand-blue-soft text-brand-blue' :
                        s.status === 'probation' ? 'bg-brand-orange-soft text-brand-orange' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: riskColor }} />
                        <span className="text-[10px] font-semibold" style={{ color: riskColor }}>{s.riskLevel || '—'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-mono text-[var(--text-primary)]">{formatCurrency(s.volumeYtd || 0)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-mono text-xs ${depColor}`}>{s.dependencyRatio || 0}%</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/suppliers/${s.id}`); }}
                        className="w-8 h-8 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center" title="Voir détails">
                        👁
                      </button>
                    </td>
                  </tr>
                );
              })}
              {suppliers.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-sm text-[var(--text-tertiary)]">Aucun fournisseur trouvé</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-secondary)]">
            <span className="text-xs text-[var(--text-tertiary)]">Page {page} / {pagination.totalPages} — {pagination.total} fournisseurs</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] disabled:opacity-40 hover:border-brand-blue transition-colors">← Préc.</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] disabled:opacity-40 hover:border-brand-blue transition-colors">Suiv. →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
