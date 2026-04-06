'use client';

import React, { memo, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency, truncate } from '@/lib/format';
import { ScoreBadge, SupplierStatusBadge, TrendBadge, X3Badge } from '@/components/shared/Badges';
import { SUPPLIER_STATUS_CONFIG } from '@/lib/constants';

interface Supplier {
  id: string;
  code: string;
  name: string;
  country: string;
  categoryName: string;
  scoreGlobal: number;
  trend: string;
  status: string;
  riskLevel: string;
  volumeYtd: number;
  dependencyRatio: number;
  incidentsCount: number;
  x3SyncStatus: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Category {
  id: string;
  name: string;
}

interface Filters {
  search: string;
  status: string;
  risk: string;
  category: string;
}

interface SupplierTableProps {
  suppliers: Supplier[];
  pagination: Pagination;
  categories: Category[];
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
  onPageChange: (page: number) => void;
}

// Memoized row component to prevent unnecessary re-renders
const SupplierRow = memo(function SupplierRow({ s, riskBadge }: { s: Supplier; riskBadge: (risk: string) => React.JSX.Element }) {
  return (
    <tr className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer" onClick={() => window.location.href = `/suppliers/${s.id}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue-soft text-brand-blue flex items-center justify-center text-xs font-bold font-mono flex-shrink-0">
            {s.code.substring(0, 3)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{truncate(s.name, 24)}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{s.code}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.country}</td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{truncate(s.categoryName, 16)}</td>
      <td className="px-3 py-3 text-center"><ScoreBadge score={s.scoreGlobal} size="sm" /></td>
      <td className="px-3 py-3 text-center"><TrendBadge trend={s.trend} /></td>
      <td className="px-3 py-3 text-center"><SupplierStatusBadge status={s.status} /></td>
      <td className="px-3 py-3 text-center">{riskBadge(s.riskLevel)}</td>
      <td className="px-3 py-3 text-right table-amount">{formatCurrency(s.volumeYtd)}</td>
      <td className="px-3 py-3 text-right">
        <span className={`font-mono text-sm font-semibold ${s.dependencyRatio > 60 ? 'text-brand-red' : s.dependencyRatio > 40 ? 'text-brand-orange' : 'text-[var(--text-secondary)]'}`}>
          {s.dependencyRatio}%
        </span>
      </td>
      <td className="px-3 py-3 text-center"><X3Badge status={s.x3SyncStatus} /></td>
    </tr>
  );
});

// Memoized risk badge function moved outside component
const RISK_CONFIG: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Critique', cls: 'bg-brand-red-soft text-brand-red' },
  high: { label: 'Élevé', cls: 'bg-brand-orange-soft text-brand-orange' },
  medium: { label: 'Moyen', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  low: { label: 'Bas', cls: 'bg-brand-green-soft text-brand-green' },
};

function SupplierTable({ suppliers, pagination, categories, filters, onFilterChange, onPageChange }: SupplierTableProps) {
  // Memoize risk badge function
  const riskBadge = useCallback((risk: string) => {
    const c = RISK_CONFIG[risk] || RISK_CONFIG.low;
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.cls}`}>{c.label}</span>;
  }, []);

  // Memoize status options
  const statusOptions = useMemo(() => 
    Object.entries(SUPPLIER_STATUS_CONFIG).map(([key, val]) => (
      <option key={key} value={key}>{val.label}</option>
    ))
  , []);

  // Memoize category options
  const categoryOptions = useMemo(() => 
    categories.map((c) => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))
  , [categories]);

  // Stable callbacks
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => 
    onFilterChange({ search: e.target.value }), [onFilterChange]);
  
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => 
    onFilterChange({ status: e.target.value }), [onFilterChange]);
  
  const handleRiskChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => 
    onFilterChange({ risk: e.target.value }), [onFilterChange]);
  
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => 
    onFilterChange({ category: e.target.value }), [onFilterChange]);

  const handlePrevPage = useCallback(() => 
    onPageChange(pagination.page - 1), [onPageChange, pagination.page]);
  
  const handleNextPage = useCallback(() => 
    onPageChange(pagination.page + 1), [onPageChange, pagination.page]);

  // Memoize pagination buttons
  const paginationButtons = useMemo(() => {
    const pages = Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1);
    return pages.map((p) => (
      <button
        key={p}
        onClick={() => onPageChange(p)}
        className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
          p === pagination.page
            ? 'bg-brand-blue text-white border-brand-blue'
            : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)]'
        }`}
      >
        {p}
      </button>
    ));
  }, [pagination.page, pagination.totalPages, onPageChange]);

  return (
    <div>
      {/* ─── Filters bar ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Rechercher un fournisseur..."
          value={filters.search}
          onChange={handleSearchChange}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:border-brand-blue focus:outline-none w-64"
        />
        <select
          value={filters.status}
          onChange={handleStatusChange}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          {statusOptions}
        </select>
        <select
          value={filters.risk}
          onChange={handleRiskChange}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] focus:outline-none"
        >
          <option value="">Tous risques</option>
          <option value="critical">Critique</option>
          <option value="high">Élevé</option>
          <option value="medium">Moyen</option>
          <option value="low">Bas</option>
        </select>
        <select
          value={filters.category}
          onChange={handleCategoryChange}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] focus:outline-none"
        >
          <option value="">Toutes catégories</option>
          {categoryOptions}
        </select>

        <span className="ml-auto text-xs text-[var(--text-tertiary)] font-mono">
          {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-3 text-left font-semibold">Fournisseur</th>
                <th className="px-3 py-3 text-left font-semibold">Pays</th>
                <th className="px-3 py-3 text-left font-semibold">Catégorie</th>
                <th className="px-3 py-3 text-center font-semibold">Score</th>
                <th className="px-3 py-3 text-center font-semibold">Trend</th>
                <th className="px-3 py-3 text-center font-semibold">Statut</th>
                <th className="px-3 py-3 text-center font-semibold">Risque</th>
                <th className="px-3 py-3 text-right font-semibold">Volume YTD</th>
                <th className="px-3 py-3 text-right font-semibold">Dépend.</th>
                <th className="px-3 py-3 text-center font-semibold">X3</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <SupplierRow key={s.id} s={s} riskBadge={riskBadge} />
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="text-3xl mb-2">🔍</div>
                    <div className="text-sm text-[var(--text-tertiary)]">Aucun fournisseur trouvé</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-secondary)]">
            <span className="text-xs text-[var(--text-tertiary)]">
              Page {pagination.page} sur {pagination.totalPages} · {pagination.total} fournisseurs
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={handlePrevPage}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              {paginationButtons}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={handleNextPage}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SupplierTable);
