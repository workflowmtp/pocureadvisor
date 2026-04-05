'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, truncate } from '@/lib/format';

export default function QuotesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quoteLines, setQuoteLines] = useState<{supplierId: string, price: string}[]>([
    { supplierId: '', price: '' },
    { supplierId: '', price: '' },
    { supplierId: '', price: '' },
    { supplierId: '', price: '' },
  ]);

  const fetchData = () => {
    Promise.all([
      fetch('/api/quotes').then(r => r.json()),
      fetch('/api/suppliers?limit=200').then(r => r.json()),
    ]).then(([quoteData, supData]) => {
      setData(quoteData);
      setSuppliers(supData.suppliers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!subject) return;
    const lines = quoteLines
      .filter(l => l.supplierId && l.supplierId !== '')
      .map(l => ({
        supplierId: l.supplierId === '_custom' ? null : l.supplierId,
        supplierName: l.supplierId === '_custom' ? 'Autre fournisseur' : suppliers.find(s => s.id === l.supplierId)?.name || '',
        unitPrice: parseFloat(l.price) || 0,
      }));
    
    if (lines.length < 2) {
      alert('Sélectionnez au moins 2 fournisseurs à comparer.');
      return;
    }

    const res = await fetch('/api/quotes', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ subject, lines }) 
    });
    const comp = await res.json();
    setCreateModal(false); 
    setSubject('');
    setQuoteLines([{ supplierId: '', price: '' }, { supplierId: '', price: '' }, { supplierId: '', price: '' }, { supplierId: '', price: '' }]);
    router.push(`/quotes/${comp.id}`);
  }

  const comparisons = data?.comparisons || [];
  const stats = data?.stats || {};

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Comparatifs de devis ({comparisons.length})</h2>
        <button onClick={() => setCreateModal(true)} className="btn btn-sm btn-primary px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600">+ Nouveau comparatif</button>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {comparisons.map((c: any) => {
          const lines = c.lines || [];
          let bestTCO = Infinity;
          let bestSupplier = '';
          for (const l of lines) {
            if (l.tco && l.tco < bestTCO) {
              bestTCO = l.tco;
              bestSupplier = l.supplierName || '';
            }
          }
          
          return (
            <div key={c.id} 
              className="card bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg cursor-pointer hover:border-brand-blue transition-colors"
              onClick={() => router.push(`/quotes/${c.id}`)}>
              <div className="card-header p-4 border-b border-[var(--border-secondary)]">
                <div className="card-title text-sm font-semibold text-[var(--text-primary)]">{truncate(c.subject, 60)}</div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">{lines.length} fournisseur(s) comparés</span>
                  <span className={`badge px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === 'active' ? 'badge-success bg-brand-green-soft text-brand-green' : 'badge-info bg-brand-blue-soft text-brand-blue'}`}>
                    {c.status === 'active' ? 'Actif' : 'Terminé'}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">Créé le {formatDate(c.dateCreated)}</div>
                
                {bestTCO < Infinity && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-secondary)]">
                    <div className="text-xs text-[var(--text-tertiary)]">Meilleur TCO</div>
                    <div className="font-mono font-bold text-brand-green">{formatCurrency(bestTCO)}</div>
                    <div className="text-xs text-brand-green">{bestSupplier}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {comparisons.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-[var(--text-tertiary)]">
            Aucun comparatif. Créez-en un pour comparer les offres fournisseurs.
          </div>
        )}
      </div>

      {createModal && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreateModal(false)}>
          <div className="modal bg-[var(--bg-modal)] border border-[var(--border-primary)] rounded-[var(--radius-xl)] w-full max-w-[650px] max-h-[85vh] overflow-y-auto shadow-[var(--shadow-xl)]" onClick={e => e.stopPropagation()}>
            <div className="modal-header p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="modal-title text-[var(--fs-lg)] font-bold text-[var(--text-primary)]">Nouveau comparatif de devis</h3>
              <button onClick={() => setCreateModal(false)} className="modal-close w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-soft)] transition-colors text-lg">✕</button>
            </div>
            <div className="modal-body p-6">
              <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] mb-5">Créez un tableau comparatif pour évaluer les offres de plusieurs fournisseurs sur un même besoin.</p>

              {/* Objet */}
              <div className="login-field mb-4">
                <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Objet du comparatif *</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} autoFocus
                  className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                  placeholder="Ex: Film BOPP 20μ — Appro annuel 150t" />
              </div>

              {/* Fournisseurs à comparer */}
              <div className="font-semibold text-[var(--fs-sm)] text-[var(--text-primary)] mb-3">Fournisseurs à comparer (2 à 5)</div>
              {quoteLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3 mb-2">
                  <div className="login-field mb-0">
                    <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">
                      Fournisseur {idx + 1}{idx < 2 ? ' *' : ''}
                    </label>
                    <select 
                      value={line.supplierId} 
                      onChange={e => {
                        const newLines = [...quoteLines];
                        newLines[idx].supplierId = e.target.value;
                        setQuoteLines(newLines);
                      }}
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer"
                    >
                      <option value="">— Sélectionner —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                      <option value="_custom">Autre (saisie manuelle)</option>
                    </select>
                  </div>
                  <div className="login-field mb-0">
                    <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Prix unitaire (FCFA)</label>
                    <input 
                      type="number" 
                      value={line.price} 
                      onChange={e => {
                        const newLines = [...quoteLines];
                        newLines[idx].price = e.target.value;
                        setQuoteLines(newLines);
                      }}
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Prix unitaire" 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer p-4 border-t border-[var(--border-primary)] flex justify-end gap-3">
              <button onClick={() => setCreateModal(false)} className="btn btn-secondary px-4 py-2 bg-transparent border border-[var(--border-primary)] text-[var(--text-secondary)] text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors">Annuler</button>
              <button onClick={handleCreate} className="btn btn-primary px-4 py-2 bg-[var(--accent-blue)] text-white text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-blue-hover)] hover:shadow-[var(--shadow-glow-blue)] transition-all">✅ Créer le comparatif</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
