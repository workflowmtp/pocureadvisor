'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, truncate } from '@/lib/format';
import { ORDER_STATUS_CONFIG, POLES } from '@/lib/constants';
import X3SyncBanner from '@/components/suppliers/X3SyncBanner';
import KpiCard from '@/components/dashboard/KpiCard';

export default function OrdersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [poleFilter, setPoleFilter] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (poleFilter) params.set('pole', poleFilter);
    if (lateOnly) params.set('lateOnly', 'true');
    params.set('page', String(page));
    try {
      const res = await fetch(`/api/orders?${params}`);
      setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [search, statusFilter, poleFilter, lateOnly, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = data?.stats || { total: 0, pending: 0, late: 0, ruptureRisk: 0, totalAmount: 0 };
  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icon="📦" label="Commandes totales" value={stats.total} color="blue" />
        <KpiCard icon="💰" label="Volume total" value={formatCurrency(stats.totalAmount)} color="purple" />
        <KpiCard icon="⏰" label="En retard" value={stats.late} color={stats.late > 3 ? 'red' : 'orange'} />
        <KpiCard icon="🚨" label="Risque rupture" value={stats.ruptureRisk} color={stats.ruptureRisk > 0 ? 'red' : 'green'} />
      </div>

      {/* X3 Banner */}
      <X3SyncBanner module="orders" />

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => { setStatusFilter(''); setLateOnly(false); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!statusFilter && !lateOnly ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
          Toutes
        </button>
        {Object.entries(ORDER_STATUS_CONFIG).map(([key, val]) => (
          <button key={key} onClick={() => { setStatusFilter(key); setLateOnly(false); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === key ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
            {val.label}
          </button>
        ))}
        <button onClick={() => { setLateOnly(!lateOnly); setStatusFilter(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${lateOnly ? 'bg-brand-red-soft border-brand-red text-brand-red' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
          ⏰ En retard uniquement
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher PO ou fournisseur..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none w-64" />
        <select value={poleFilter} onChange={(e) => { setPoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] focus:outline-none">
          <option value="">Tous pôles</option>
          {POLES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        <span className="ml-auto text-xs text-[var(--text-tertiary)] font-mono">{pagination.total} résultat{pagination.total > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-3 text-left font-semibold">N° PO</th>
                <th className="px-3 py-3 text-left font-semibold">Fournisseur</th>
                <th className="px-3 py-3 text-center font-semibold">Pôle</th>
                <th className="px-3 py-3 text-left font-semibold">Date prévue</th>
                <th className="px-3 py-3 text-right font-semibold">Montant</th>
                <th className="px-3 py-3 text-center font-semibold">Statut</th>
                <th className="px-3 py-3 text-center font-semibold">Retard</th>
                <th className="px-3 py-3 text-center font-semibold">Rupture</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const statusConf = ORDER_STATUS_CONFIG[o.status as keyof typeof ORDER_STATUS_CONFIG];
                const isLateActive = o.isLate && !['received', 'closed'].includes(o.status);
                return (
                  <tr key={o.id}
                    className={`border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer ${isLateActive && o.riskOfStockout ? 'bg-red-50/50 dark:bg-red-900/5' : isLateActive ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''}`}
                    onClick={() => window.location.href = `/orders/${o.id}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-brand-blue">{o.poNumber}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-[var(--text-primary)]">{truncate(o.supplier?.name || '—', 22)}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{o.supplier?.code || ''}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono" style={{ background: POLES.find(p => p.code === o.poleId)?.color + '20', color: POLES.find(p => p.code === o.poleId)?.color }}>{o.poleId}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{formatDate(o.dateExpected)}</td>
                    <td className="px-3 py-3 text-right table-amount">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: (statusConf?.color || '#6B7280') + '15', color: statusConf?.color || '#6B7280' }}>
                        {statusConf?.label || o.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isLateActive ? (
                        <span className="font-mono text-xs font-bold text-brand-red">+{o.delayDays}j</span>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {o.riskOfStockout && isLateActive ? (
                        <span className="px-2 py-0.5 bg-brand-red-soft text-brand-red text-[10px] font-bold rounded-full">🚨 Oui</span>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-[var(--text-tertiary)]">Aucune commande trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-secondary)]">
            <span className="text-xs text-[var(--text-tertiary)]">Page {pagination.page}/{pagination.totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] disabled:opacity-40">← Préc.</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] disabled:opacity-40">Suiv. →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
