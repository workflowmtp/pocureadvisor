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
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState<string[]>(['', '', '', '']);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{top: number, left: number, width: number} | null>(null);
  const [quoteLines, setQuoteLines] = useState<{supplierCode: string, supplierName: string, price: string}[]>([
    { supplierCode: '', supplierName: '', price: '' },
    { supplierCode: '', supplierName: '', price: '' },
    { supplierCode: '', supplierName: '', price: '' },
    { supplierCode: '', supplierName: '', price: '' },
  ]);

  const handleSupplierSearch = (idx: number, query: string) => {
    const newSearch = [...supplierSearch];
    newSearch[idx] = query;
    setSupplierSearch(newSearch);
    // Clear selected supplier when typing
    const newLines = [...quoteLines];
    if (newLines[idx].supplierCode) {
      newLines[idx].supplierCode = '';
      newLines[idx].supplierName = query;
      setQuoteLines(newLines);
    }
    // Local filter from pre-loaded suppliers, excluding already selected
    const q = query.toLowerCase();
    const selectedCodes = quoteLines.filter((l, i) => i !== idx && l.supplierCode).map(l => l.supplierCode);
    if (q.length >= 1) {
      setFilteredSuppliers(
        allSuppliers.filter(s =>
          !selectedCodes.includes(s.code) &&
          (s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q))
        ).slice(0, 20)
      );
      setActiveDropdown(idx);
    } else {
      setFilteredSuppliers([]);
      setActiveDropdown(null);
      setDropdownPos(null);
    }
  };

  const selectSupplier = (idx: number, sup: any) => {
    const newLines = [...quoteLines];
    newLines[idx].supplierCode = sup.code;
    newLines[idx].supplierName = sup.name;
    setQuoteLines(newLines);
    const newSearch = [...supplierSearch];
    newSearch[idx] = `${sup.code} — ${sup.name}`;
    setSupplierSearch(newSearch);
    setFilteredSuppliers([]);
    setActiveDropdown(null);
  };

  const loadAllSuppliers = async () => {
    try {
      // Load all suppliers from X3 (paginated)
      let all: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`/api/x3/suppliers?page=${page}&size=100`);
        const json = await res.json();
        const suppliers = json.suppliers || [];
        all = [...all, ...suppliers];
        hasMore = json.pagination?.hasMore && suppliers.length > 0;
        page++;
        // Safety limit
        if (page > 20) break;
      }
      setAllSuppliers(all);
    } catch { /* silent */ }
  };

  const fetchData = () => {
    fetch('/api/quotes').then(r => r.json()).then(quoteData => {
      setData(quoteData);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); loadAllSuppliers(); }, []);

  async function handleCreate() {
    if (!subject) { alert('Veuillez saisir un objet.'); return; }
    const lines = quoteLines
      .filter(l => l.supplierCode && l.supplierCode !== '')
      .map(l => ({
        supplierId: null,
        supplierName: l.supplierName || l.supplierCode,
        unitPrice: parseFloat(l.price) || 0,
      }));
    
    if (lines.length < 2) {
      alert('Sélectionnez au moins 2 fournisseurs à comparer.');
      return;
    }

    try {
      const res = await fetch('/api/quotes', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ subject, lines }) 
      });
      const comp = await res.json();
      if (!res.ok) {
        alert('Erreur: ' + (comp.error || comp.message || JSON.stringify(comp)));
        return;
      }
      setCreateModal(false); 
      setSubject('');
      setQuoteLines([{ supplierCode: '', supplierName: '', price: '' }, { supplierCode: '', supplierName: '', price: '' }, { supplierCode: '', supplierName: '', price: '' }, { supplierCode: '', supplierName: '', price: '' }]);
      setSupplierSearch(['', '', '', '']);
      fetchData();
    } catch (err: any) {
      alert('Erreur réseau: ' + err.message);
    }
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
          const lines = c.quoteLines || [];
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

      {/* Autocomplete dropdown portal (fixed position to avoid modal overflow clipping) */}
      {filteredSuppliers.length > 0 && activeDropdown !== null && dropdownPos && !quoteLines[activeDropdown]?.supplierCode && (
        <div className="fixed z-[100] bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}>
          {filteredSuppliers.map(s => (
            <div
              key={s.code}
              onClick={() => selectSupplier(activeDropdown, s)}
              className="px-3 py-2 cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border-secondary)] last:border-0"
            >
              <div className="text-sm font-medium text-[var(--text-primary)]">{s.name}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{s.code} · {s.country} · {s.currency}</div>
            </div>
          ))}
        </div>
      )}

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
                  <div className="login-field mb-0 relative">
                    <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">
                      Fournisseur {idx + 1}{idx < 2 ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      value={supplierSearch[idx]}
                      onChange={e => handleSupplierSearch(idx, e.target.value)}
                      onFocus={(e) => {
                        if (supplierSearch[idx].length >= 1) {
                          handleSupplierSearch(idx, supplierSearch[idx]);
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                      }}
                      placeholder="Rechercher fournisseur X3..."
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all"
                    />
                    {line.supplierCode && (
                      <span className="absolute right-3 top-[38px] text-brand-green text-xs">✓</span>
                    )}
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
