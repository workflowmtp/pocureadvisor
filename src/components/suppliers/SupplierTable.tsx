'use client';

import React, { memo, useCallback } from 'react';
import { truncate } from '@/lib/format';
import { X3Badge } from '@/components/shared/Badges';

interface Supplier {
  id?: string;
  code: string;
  name: string;
  country: string;
  city?: string;
  categoryName?: string;
  scoreGlobal?: number;
  trend?: string;
  status?: string;
  riskLevel?: string;
  volumeYtd?: number;
  dependencyRatio?: number;
  incidentsCount?: number;
  x3SyncStatus?: string;
  // X3 fields
  currency?: string;
  paymentTerms?: string;
  contactName?: string;
  contactEmail?: string;
  contractRef?: string;
  contractExpiry?: string | null;
  contractActive?: boolean;
}

interface Pagination {
  page: number;
  size?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
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
const SupplierRow = memo(function SupplierRow({ s }: { s: Supplier }) {
  const href = s.id ? `/suppliers/${s.id}` : undefined;
  return (
    <tr
      className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
      onClick={() => href && (window.location.href = href)}
    >
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
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.country || '—'}</td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.city || s.categoryName || '—'}</td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)] font-mono">{s.currency || '—'}</td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.paymentTerms || '—'}</td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{s.contactName || s.contactEmail || '—'}</td>
      <td className="px-3 py-3 text-center">
        {s.contractRef ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            s.contractActive
              ? 'bg-brand-green-soft text-brand-green'
              : 'bg-brand-orange-soft text-brand-orange'
          }`}>
            {s.contractActive ? '✓' : '⚠'} {truncate(s.contractRef, 14)}
          </span>
        ) : (
          <span className="text-[var(--text-tertiary)] text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <X3Badge status={s.x3SyncStatus || 'synced'} />
      </td>
    </tr>
  );
});


function SupplierTable({ suppliers, pagination, filters, onFilterChange, onPageChange }: SupplierTableProps) {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) =>
    onFilterChange({ search: e.target.value }), [onFilterChange]);

  const handlePrevPage = useCallback(() =>
    onPageChange(pagination.page - 1), [onPageChange, pagination.page]);

  const handleNextPage = useCallback(() =>
    onPageChange(pagination.page + 1), [onPageChange, pagination.page]);

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
        <span className="ml-auto text-xs text-[var(--text-tertiary)] font-mono">
          {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''} · Page {pagination.page}
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
                <th className="px-3 py-3 text-left font-semibold">Ville</th>
                <th className="px-3 py-3 text-left font-semibold">Devise</th>
                <th className="px-3 py-3 text-left font-semibold">Cond. paiement</th>
                <th className="px-3 py-3 text-left font-semibold">Contact</th>
                <th className="px-3 py-3 text-center font-semibold">Contrat</th>
                <th className="px-3 py-3 text-center font-semibold">X3</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <SupplierRow key={s.code} s={s} />
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="text-3xl mb-2">🔍</div>
                    <div className="text-sm text-[var(--text-tertiary)]">Aucun fournisseur trouvé</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─── */}
        {(pagination.page > 1 || pagination.hasMore) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-secondary)]">
            <span className="text-xs text-[var(--text-tertiary)]">
              Page {pagination.page}{pagination.hasMore ? ' — suite disponible' : ' (dernière page)'}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={handlePrevPage}
                className="px-3 py-1 text-xs rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Précédent
              </button>
              <button
                disabled={!pagination.hasMore}
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
