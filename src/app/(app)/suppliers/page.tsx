'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import X3SyncBanner from '@/components/suppliers/X3SyncBanner';
import SupplierTable from '@/components/suppliers/SupplierTable';

interface Filters {
  search: string;
  status: string;
  risk: string;
  category: string;
}

interface Stats {
  total: number;
  strategic: number;
  active: number;
  probation: number;
  atRisk: number;
}

// Static stat chips config outside component
const STAT_CHIPS = [
  { label: 'Tous', filterVal: '', color: 'text-brand-blue', icon: '🏢' },
  { label: 'Stratégiques', filterVal: 'strategic', color: 'text-brand-purple', icon: '🟢' },
  { label: 'Actifs', filterVal: 'active', color: 'text-brand-green', icon: '🔵' },
  { label: 'Probation', filterVal: 'probation', color: 'text-brand-orange', icon: '🟡' },
  { label: 'À risque', filterVal: '_risk', color: 'text-brand-red', icon: '🔴' },
] as const;

export default function SuppliersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', risk: '', category: '' });
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats>({ total: 0, strategic: 0, active: 0, probation: 0, atRisk: 0 });

  // Use ref for debounce timeout to avoid re-renders
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.risk) params.set('risk', filters.risk);
    if (filters.category) params.set('category', filters.category);
    params.set('page', String(page));
    params.set('limit', '20');

    try {
      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const json = await res.json();
      setData(json);
      if (json.stats) setStats(json.stats);
    } catch {
      // silent fail
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Memoized filter change handler with debounce
  const handleFilterChange = useCallback((update: Partial<Filters>) => {
    if (update.search !== undefined) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setFilters(prev => {
        const newFilters = { ...prev, ...update };
        searchTimeoutRef.current = setTimeout(() => setPage(1), 300);
        return newFilters;
      });
      return;
    }
    setFilters(prev => ({ ...prev, ...update }));
    setPage(1);
  }, []);

  // Memoized export handler
  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.risk) params.set('risk', filters.risk);
    params.set('limit', '500');
    fetch(`/api/suppliers?${params.toString()}`)
      .then(r => r.json())
      .then(json => {
        const rows = json.suppliers || [];
        if (rows.length === 0) return;
        const headers = ['Code', 'Nom', 'Pays', 'Catégorie', 'Score', 'Statut', 'Risque', 'Tendance', 'Volume YTD', 'Dépendance %', 'Incidents'];
        const csvRows = rows.map((s: any) => [
          s.code, s.name, s.country, s.categoryName, s.scoreGlobal, s.status, s.riskLevel, s.trend,
          s.volumeYtd, s.dependencyRatio, s.incidentsCount,
        ].join(';'));
        const csv = '\ufeff' + headers.join(';') + '\n' + csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ProcureAdvisor_Fournisseurs_${new Date().toISOString().substring(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }, [filters]);

  // Memoized stat chips with active state
  const renderStatChips = useMemo(() => 
    STAT_CHIPS.map((chip) => {
      const isActive = chip.filterVal === ''
        ? !filters.status && !filters.risk
        : chip.filterVal === '_risk'
          ? filters.risk === 'critical' || filters.risk === 'high'
          : filters.status === chip.filterVal;

      const handleClick = () => {
        if (chip.filterVal === '') {
          handleFilterChange({ status: '', risk: '' });
        } else if (chip.filterVal === '_risk') {
          handleFilterChange({ status: '', risk: isActive ? '' : 'critical' });
        } else {
          handleFilterChange({ status: isActive ? '' : chip.filterVal, risk: '' });
        }
      };

      return (
        <button
          key={chip.label}
          onClick={handleClick}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
            isActive
              ? 'bg-brand-blue-soft border-brand-blue text-brand-blue'
              : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-brand-blue/40'
          }`}
        >
          <span className="text-lg">{chip.icon}</span>
          <span className={chip.color + ' font-mono font-bold'}>{stats[chip.filterVal === '' ? 'total' : chip.filterVal === '_risk' ? 'atRisk' : chip.filterVal as keyof Stats] || 0}</span>
          <span>{chip.label}</span>
        </button>
      );
    })
  , [filters.status, filters.risk, stats, handleFilterChange]);

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Gestion Fournisseurs</h2>
        <button onClick={handleExport} className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-colors">
          📥 Exporter CSV
        </button>
      </div>

      {/* ─── X3 Banner ─── */}
      <X3SyncBanner module="suppliers" />

      {/* ─── Stat chips ─── */}
      <div className="supplier-stats-row flex flex-wrap gap-3 mb-5">
        {renderStatChips}
      </div>

      {/* ─── Table ─── */}
      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="spinner" />
        </div>
      ) : data ? (
        <SupplierTable
          suppliers={data.suppliers || []}
          pagination={data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }}
          categories={data.categories || []}
          filters={filters}
          onFilterChange={handleFilterChange}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
