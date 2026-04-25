'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, truncate } from '@/lib/format';

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; badge: string }> = {
  created:             { icon: '⏳', label: 'À valider',     color: '#F97316', badge: 'badge-orange' },
  validated:           { icon: '✓',  label: 'Validée',       color: '#3B82F6', badge: 'badge-blue' },
  confirmed:           { icon: '📨', label: 'Confirmée',     color: '#06B6D4', badge: 'badge-cyan' },
  in_transit:          { icon: '🚢', label: 'En transit',    color: '#8B5CF6', badge: 'badge-purple' },
  partially_received:  { icon: '📦', label: 'Partielle',     color: '#F59E0B', badge: 'badge-yellow' },
  received:            { icon: '✅', label: 'Réceptionnée',  color: '#22C55E', badge: 'badge-green' },
  closed:              { icon: '✔',  label: 'Clôturée',      color: '#6B7280', badge: 'badge-gray' },
};

export default function OrdersPage() {
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [poleFilter, setPoleFilter] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({});

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (poleFilter) params.set('pole', poleFilter);
    if (lateOnly) params.set('lateOnly', 'true');
    params.set('page', String(page));
    params.set('limit', '20');
    try {
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) {
        console.error('[ORDERS] API error:', res.status, await res.text());
        setLoading(false);
        return;
      }
      const json = await res.json();
      console.log('[ORDERS] Loaded:', json.orders?.length, 'orders, stats:', json.stats);
      setAllOrders(json.orders || []);
      setPagination(json.pagination || {});
      setStats(json.stats || {});
    } catch (e) {
      console.error('[ORDERS] Fetch error:', e);
    }
    setLoading(false);
  }, [search, statusFilter, poleFilter, lateOnly, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Status counts for chips
  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Commandes totales</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{stats.total || 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Volume total</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(stats.totalAmount || 0)}</div>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">En retard</div>
              <div className={`text-lg font-bold ${(stats.late || 0) > 3 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-orange)]'}`}>{stats.late || 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Risque rupture</div>
              <div className={`text-lg font-bold ${(stats.ruptureRisk || 0) > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}>{stats.ruptureRisk || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-xl p-4 mb-5 border border-purple-800/40" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">�</span>
          <div>
            <div className="font-bold text-white text-sm">Commandes synchronisées depuis Sage X3</div>
            <div className="text-xs text-purple-300 mt-0.5">Les bons de commande sont créés dans Sage X3. ProcureAdvisor surveille les retards, calcule les risques de rupture, détecte les anomalies et assiste les relances fournisseurs.</div>
          </div>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === '' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}>
          📋 Tout {stats.total || 0}
        </button>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => {
          const count = statusCounts[k] || 0;
          if (count === 0) return null;
          return (
            <button key={k} onClick={() => { setStatusFilter(k); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === k ? 'text-white border-transparent' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue'}`}
              style={statusFilter === k ? { background: v.color, borderColor: v.color } : {}}>
              {v.icon} {v.label} {count}
            </button>
          );
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher N° PO, fournisseur..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none w-64" />
        <select value={poleFilter} onChange={(e) => { setPoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none">
          <option value="">Tous les pôles</option>
          <option value="OE">Opérations</option>
          <option value="HF">Hors FAB</option>
          <option value="OC">Occasionnel</option>
          <option value="BC">Bureau</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
          <input type="checkbox" checked={lateOnly} onChange={e => { setLateOnly(e.target.checked); setPage(1); }} className="w-3.5 h-3.5" />
          Retards uniquement
        </label>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-3 text-left font-semibold">N° PO</th>
                <th className="px-3 py-3 text-left font-semibold">Fournisseur</th>
                <th className="px-3 py-3 text-left font-semibold">Pôle</th>
                <th className="px-3 py-3 text-left font-semibold">Date création</th>
                <th className="px-3 py-3 text-left font-semibold">Date prévue</th>
                <th className="px-3 py-3 text-right font-semibold">Montant</th>
                <th className="px-3 py-3 text-center font-semibold">Statut</th>
                <th className="px-3 py-3 text-center font-semibold">Retard</th>
                <th className="px-3 py-3 text-center font-semibold">Risque</th>
                <th className="px-3 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map((o: any) => {
                const st = STATUS_CONFIG[o.status] || { icon: '?', label: o.status, color: '#6B7280', badge: 'badge-gray' };
                const isLateActive = o.isLate && o.status !== 'received' && o.status !== 'closed';
                const supplierName = o.supplier?.name || '—';
                const supplierCode = o.supplier?.code || '';
                return (
                  <tr key={o.id}
                    className={`border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors ${isLateActive ? 'bg-red-500/[0.04]' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-brand-blue cursor-pointer" onClick={() => router.push(`/orders/${o.id}`)}>{o.poNumber}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-[var(--text-primary)]">{truncate(supplierName, 22)}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{supplierCode}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{o.poleId || '—'}</td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{formatDate(o.dateCreated)}</td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{formatDate(o.dateExpected)}</td>
                    <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(o.totalAmount)} <span className="text-[10px] text-[var(--text-tertiary)] font-normal">{o.currency}</span></td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: st.color + '20', color: st.color }}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isLateActive ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--accent-red)]">
                          ⚠ +{o.delayDays}j
                        </span>
                      ) : o.delayDays > 0 && (o.status === 'received' || o.status === 'closed') ? (
                        <span className="font-mono text-[11px] text-[var(--accent-orange)]">+{o.delayDays}j (livré)</span>
                      ) : (
                        <span className="text-xs text-[var(--accent-green)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {o.riskOfStockout && o.status !== 'received' && o.status !== 'closed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent-red)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" /> RUPTURE
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => router.push(`/orders/${o.id}`)} className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-colors">
                        Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
              {allOrders.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-[var(--text-tertiary)]">Aucune commande trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-secondary)]">
            <span className="text-xs text-[var(--text-tertiary)]">Page {page} / {pagination.totalPages} — {pagination.total} commandes</span>
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
