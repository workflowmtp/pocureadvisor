'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCurrency } from '@/lib/format';
import { POLES } from '@/lib/constants';
import KpiCard from '@/components/dashboard/KpiCard';

export default function SourcingPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({});
  const [trendFilter, setTrendFilter] = useState('');
  const [alertFilter, setAlertFilter] = useState('');
  const [apiStats, setApiStats] = useState<any>({});

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (trendFilter) params.set('trend', trendFilter);
    if (alertFilter) params.set('alert', alertFilter);
    params.set('page', String(page));
    params.set('limit', '20');
    try {
      const res = await fetch(`/api/sourcing?${params}`);
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      setMaterials(json.materials || []);
      setPagination(json.pagination || {});
      setApiStats(json.stats || {});
    } catch (e) { console.error('[SOURCING] Fetch error:', e); }
    setLoading(false);
  }, [search, trendFilter, alertFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtering is now done server-side via API params
  const filteredMaterials = materials;

  const stats = {
    total: apiStats.total || 0,
    rising: apiStats.rising || 0,
    falling: apiStats.falling || 0,
    opportunities: apiStats.opportunities || 0,
    risks: apiStats.risks || 0,
  };
  const alertConfig: Record<string, { label: string; cls: string }> = {
    risk: { label: '⚠ Risque hausse', cls: 'bg-brand-red-soft text-brand-red border-red-200 dark:border-red-800/30' },
    opportunity: { label: '✅ Opportunité', cls: 'bg-brand-green-soft text-brand-green border-green-200 dark:border-green-800/30' },
    neutral: { label: '→ Stable', cls: 'bg-[var(--bg-input)] text-[var(--text-tertiary)] border-[var(--border-primary)]' },
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Matières Premières (Sage X3)</h2>
      </div>

      {/* KPIs */}
      <div className="kpi-grid grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <KpiCard icon="📊" label="Matières suivies" value={stats.total || 0} color="blue" />
        <KpiCard icon="📈" label="En hausse" value={stats.rising || 0} color="red" />
        <KpiCard icon="📉" label="En baisse" value={stats.falling || 0} color="green" />
        <KpiCard icon="✅" label="Opportunités" value={stats.opportunities || 0} color="green" />
        <KpiCard icon="⚠️" label="Risques" value={stats.risks || 0} color="orange" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher une matière..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm focus:border-brand-blue focus:outline-none w-64" />
        <select value={trendFilter} onChange={e => setTrendFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
          <option value="">Toutes tendances</option>
          <option value="rising">En hausse</option><option value="falling">En baisse</option><option value="stable">Stable</option>
        </select>
        <select value={alertFilter} onChange={e => setAlertFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
          <option value="">Toutes alertes</option>
          <option value="risk">Risque</option><option value="opportunity">Opportunité</option><option value="neutral">Neutre</option>
        </select>
        <span className="ml-auto text-xs text-[var(--text-tertiary)] font-mono">{pagination.total || 0} matière(s)</span>
      </div>

      {/* Material cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {filteredMaterials.map((m: any) => {
          const ac = alertConfig[m.alertType] || alertConfig.neutral;
          const variationColor = (m.variationPct || 0) > 0 ? 'text-brand-red' : (m.variationPct || 0) < 0 ? 'text-brand-green' : 'text-[var(--text-tertiary)]';
          const trend = (m.variationPct || 0) > 2 ? 'rising' : (m.variationPct || 0) < -2 ? 'falling' : 'stable';
          const trendBars = generateBars(m.variationPct || 0, trend);

          return (
            <div key={m.id} className="matiere-card bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 hover:border-brand-blue transition-colors">
              <div className="matiere-header flex items-start justify-between mb-3">
                <div>
                  <div className="matiere-name text-base font-semibold text-[var(--text-primary)]">{m.name}</div>
                  <div className="matiere-category text-xs text-[var(--text-tertiary)]">{m.category} · <span className="font-mono">{m.id.substring(0, 8)}</span></div>
                </div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${ac.cls}`}>{ac.label}</span>
              </div>

              {/* Price */}
              <div className="matiere-price-row flex items-baseline gap-2 mb-3">
                <span className="matiere-price font-mono text-xl font-bold text-[var(--text-primary)]">{(m.currentPrice || 0).toLocaleString('fr-FR')}</span>
                <span className="matiere-unit text-xs text-[var(--text-tertiary)]">{m.currency || 'USD'}/{m.unit}</span>
                {m.variationPct !== null && m.variationPct !== undefined ? (
                  <span className={`matiere-variation font-mono text-sm font-bold ${variationColor}`}>
                    {m.variationPct > 0 ? '+' : ''}{m.variationPct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)]">—</span>
                )}
              </div>

              {/* Sparkline bars */}
              <div className="mini-chart flex items-end gap-0.5 h-8 mb-3">
                {trendBars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm transition-all" style={{
                    height: h + '%',
                    background: i === trendBars.length - 1
                      ? (trend === 'rising' ? '#EF4444' : trend === 'falling' ? '#10B981' : '#3B82F6')
                      : 'rgba(59,130,246,0.25)',
                  }} />
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                <span>Unité: {m.unit}</span>
                {m.status && <span className={`px-1.5 py-0.5 rounded ${m.status === 'active' ? 'bg-brand-green-soft text-brand-green' : 'bg-[var(--bg-input)]'}`}>{m.status}</span>}
              </div>
            </div>
          );
        })}
        {filteredMaterials.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-[var(--text-tertiary)]">Aucune matière trouvée.</div>
        )}
      </div>

      {/* Pagination */}
      {(pagination.page > 1 || pagination.hasMore) && (
        <div className="flex items-center justify-between px-4 py-3 mt-4 border border-[var(--border-primary)] rounded-xl bg-[var(--bg-card)]">
          <span className="text-xs text-[var(--text-tertiary)]">Page {pagination.page}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] disabled:opacity-40">← Préc.</button>
            <button disabled={!pagination.hasMore} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] disabled:opacity-40">Suiv. →</button>
          </div>
        </div>
      )}

    </div>
  );
}

function generateBars(variation: number, trend: string): number[] {
  const bars: number[] = [];
  const base = 40 + Math.random() * 20;
  for (let i = 0; i < 12; i++) {
    const factor = trend === 'rising' ? 1 + (i * 0.03) : trend === 'falling' ? 1 - (i * 0.02) : 1 + (Math.random() - 0.5) * 0.1;
    bars.push(Math.min(100, Math.max(15, base * factor + (Math.random() - 0.5) * 15)));
  }
  return bars;
}
