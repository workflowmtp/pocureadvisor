'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, truncate } from '@/lib/format';

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(d => { setDocs(d.documents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = docs.filter((d: any) => {
    if (search && !(d.fileName + ' ' + (d.invoiceNumber || '')).toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && d.fileType !== typeFilter) return false;
    return true;
  });

  const typeIcons: Record<string, string> = { invoice: '🧾', bl: '📦', certificate: '🏅', po: '📋' };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Bibliothèque Documents</h2>
        <span className="text-xs text-[var(--text-tertiary)] font-mono">{filtered.length} document(s)</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm focus:border-brand-blue focus:outline-none w-64" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm focus:outline-none">
          <option value="">Tous types</option>
          <option value="invoice">Factures</option>
          <option value="bl">Bons de livraison</option>
          <option value="certificate">Certificats</option>
          <option value="po">Bons de commande</option>
        </select>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-3 py-3 text-left font-semibold">Fichier</th>
                <th className="px-3 py-3 text-left font-semibold">Fournisseur</th>
                <th className="px-3 py-3 text-left font-semibold">Date</th>
                <th className="px-3 py-3 text-left font-semibold">N° Document</th>
                <th className="px-3 py-3 text-right font-semibold">Montant</th>
                <th className="px-3 py-3 text-center font-semibold">OCR</th>
                <th className="px-3 py-3 text-center font-semibold">Rapprochement</th>
                <th className="px-3 py-3 text-left font-semibold">Pipeline</th>
                <th className="px-3 py-3 text-left font-semibold">Assigné</th>
                <th className="px-3 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d: any) => {
                const stageLabels = ['—','Upload','OCR','Extraction','Vérif.','Rapproch.','Validation','Archivé'];
                return (
                  <tr key={d.id} className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)]">
                    <td className="px-4 py-3 text-sm">{typeIcons[d.fileType] || '📄'}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => router.push(`/ocr/${d.id}`)} className="text-sm text-brand-blue hover:underline text-left">{truncate(d.fileName, 22)}</button>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{d.supplier?.name ? truncate(d.supplier.name, 16) : '—'}</td>
                    <td className="px-3 py-3 text-xs">{formatDate(d.uploadDate)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{d.invoiceNumber || d.poNumber || '—'}</td>
                    <td className="px-3 py-3 text-right table-amount">{d.amountTtc ? formatCurrency(d.amountTtc) : '—'}</td>
                    <td className="px-3 py-3 text-center text-xs">{d.ocrStatus === 'extracted' ? '✅' : '⏳'}</td>
                    <td className="px-3 py-3 text-center text-xs">{d.reconciliationStatus}</td>
                    <td className="px-3 py-3 text-xs">{stageLabels[d.pipelineStage] || '—'}</td>
                    <td className="px-3 py-3 text-xs">{d.assignedTo?.fullName || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => router.push(`/ocr/${d.id}`)} className="px-2 py-1 text-xs bg-brand-blue-soft text-brand-blue rounded-full hover:bg-brand-blue hover:text-white transition-colors">Analyser</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
