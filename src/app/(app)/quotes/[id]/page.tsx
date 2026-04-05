'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/format';
import { ScoreBadge } from '@/components/shared/Badges';
import { INCOTERMS, PAYMENT_TERMS } from '@/lib/constants';

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addLineModal, setAddLineModal] = useState(false);
  const [selectModal, setSelectModal] = useState<any>(null);
  const [negoModal, setNegoModal] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fetchData = () => {
    Promise.all([
      fetch(`/api/quotes/${params.id}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/suppliers?limit=500').then(r => r.json()),
    ]).then(([qData, sData]) => {
      setData(qData); setSuppliers(sData.suppliers || []); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { if (params.id) fetchData(); }, [params.id]);

  async function addLine() {
    await fetch(`/api/quotes/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_line', ...form }),
    });
    setAddLineModal(false); setForm({}); fetchData();
  }

  async function selectSupplier(line: any) {
    await fetch(`/api/quotes/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'select_supplier', supplierId: line.supplierId, supplierName: line.supplierName }),
    });
    setSelectModal(null); fetchData();
  }

  async function openNego(line: any) {
    const res = await fetch(`/api/quotes/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open_negotiation', supplierId: line.supplierId, supplierName: line.supplierName, financialStake: line.tco * 100 }),
    });
    const d = await res.json();
    if (d.negotiation) router.push(`/negotiations/${d.negotiation.id}`);
  }

  function exportCSV() {
    if (!data?.lines?.length) return;
    const headers = 'Fournisseur;Code;Prix unitaire;Fret;TCO;MOQ;Délai (j);Incoterm;Paiement;Score;Recommandation';
    const rows = data.lines.map((l: any) => [l.supplierName, l.supplierCode, l.unitPrice, l.freightCost, l.tco, l.moq, l.leadTime, l.incoterm, l.paymentTerms, l.score, l.reco].join(';'));
    const csv = '\ufeff' + headers + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Comparatif_devis.csv'; a.click();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center py-20"><div className="text-4xl mb-3">❓</div><p className="text-[var(--text-secondary)]">Comparatif non trouvé</p></div>;

  const { comparison, lines, summary } = data;
  const isActive = comparison.status === 'active';

  return (
    <div>
      <div className="mb-5"><Link href="/quotes" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue">← Retour</Link></div>

      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">{comparison.subject}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-brand-blue-soft text-brand-blue' : 'bg-brand-green-soft text-brand-green'}`}>
                {isActive ? '🔄 Actif' : '✅ Terminé'}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">📅 {formatDate(comparison.dateCreated)}</span>
              <span className="text-sm text-[var(--text-secondary)]">{lines.length} offre(s)</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isActive && <button onClick={() => setAddLineModal(true)} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-600">+ Ajouter offre</button>}
            <button onClick={exportCSV} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">📤 Exporter CSV</button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {lines.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <SummaryCard label="Meilleur prix unitaire" value={formatCurrency(summary.bestPrice)} />
          <SummaryCard label="Meilleur TCO" value={formatCurrency(summary.bestTco)} accent />
          <SummaryCard label="Meilleur délai" value={summary.bestLead > 0 ? summary.bestLead + ' jours' : '—'} />
          <SummaryCard label="TCO moyen" value={formatCurrency(summary.avgTco)} />
        </div>
      )}

      {/* TCO Comparison Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-3 text-left font-semibold">Fournisseur</th>
                <th className="px-3 py-3 text-center font-semibold">Score</th>
                <th className="px-3 py-3 text-right font-semibold">Prix unitaire</th>
                <th className="px-3 py-3 text-right font-semibold">Fret</th>
                <th className="px-3 py-3 text-right font-semibold">TCO</th>
                <th className="px-3 py-3 text-center font-semibold">MOQ</th>
                <th className="px-3 py-3 text-center font-semibold">Délai</th>
                <th className="px-3 py-3 text-center font-semibold">Incoterm</th>
                <th className="px-3 py-3 text-left font-semibold">Paiement</th>
                <th className="px-3 py-3 text-left font-semibold">Certifications</th>
                <th className="px-3 py-3 text-left font-semibold">Reco.</th>
                <th className="px-3 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any, i: number) => (
                <tr key={l.id} className={`border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] ${i === 0 && l.isBestTco ? 'bg-green-50/50 dark:bg-green-900/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {i === 0 && l.isBestTco && <span className="text-sm">🏆</span>}
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{l.supplierName}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{l.supplierCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center"><ScoreBadge score={l.supplierScore || l.score} size="sm" /></td>
                  <td className="px-3 py-3 text-right">
                    <span className={`table-amount ${l.isBestPrice ? 'text-brand-green' : ''}`}>{formatCurrency(l.unitPrice)}</span>
                    {l.isBestPrice && <span className="block text-[9px] text-brand-green">Meilleur</span>}
                  </td>
                  <td className="px-3 py-3 text-right table-amount">{formatCurrency(l.freightCost)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`table-amount font-bold ${l.isBestTco ? 'text-brand-green' : ''}`}>{formatCurrency(l.tco)}</span>
                    {l.isBestTco && <span className="block text-[9px] text-brand-green font-bold">✅ Best TCO</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-mono">{l.moq || '—'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-mono text-xs font-bold ${l.isBestLead ? 'text-brand-green' : ''}`}>{l.leadTime > 0 ? l.leadTime + 'j' : '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-mono">{l.incoterm || '—'}</td>
                  <td className="px-3 py-3 text-xs">{l.paymentTerms || '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(l.supplierCerts || l.certifications || []).map((c: string) => (
                        <span key={c} className="px-1.5 py-0.5 bg-brand-green-soft text-brand-green text-[9px] font-medium rounded">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{l.reco || '—'}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      {isActive && (
                        <>
                          <button onClick={() => setSelectModal(l)} className="px-2 py-1 text-[10px] bg-brand-green-soft text-brand-green rounded hover:bg-brand-green hover:text-white">Sélectionner</button>
                          <button onClick={() => openNego(l)} className="px-2 py-1 text-[10px] bg-brand-blue-soft text-brand-blue rounded hover:bg-brand-blue hover:text-white">Négocier</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && <tr><td colSpan={12} className="text-center py-12 text-sm text-[var(--text-tertiary)]">Aucune offre. Ajoutez des lignes pour comparer.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Select modal */}
      {selectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Valider le fournisseur sélectionné</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Confirmer la sélection de <strong>{selectModal.supplierName}</strong> avec un TCO de <strong>{formatCurrency(selectModal.tco)}</strong> ?</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Cette action clôture le comparatif. La commande devra être créée dans Sage X3.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
              <button onClick={() => selectSupplier(selectModal)} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg">✅ Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Line Modal */}
      {addLineModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAddLineModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Ajouter une offre fournisseur</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Fournisseur *</label>
                <select value={form.supplierId || ''} onChange={e => {
                  const s = suppliers.find((s: any) => s.id === e.target.value);
                  setForm({ ...form, supplierId: e.target.value, supplierName: s?.name || '', score: s?.scoreGlobal || 50 });
                }} className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
                  <option value="">— Sélectionner —</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.scoreGlobal}/100)</option>)}
                </select></div>
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Score /100</label>
                <input type="number" value={form.score || ''} onChange={e => setForm({ ...form, score: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Prix unitaire *</label>
                <input type="number" value={form.unitPrice || ''} onChange={e => setForm({ ...form, unitPrice: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Fret</label>
                <input type="number" value={form.freightCost || ''} onChange={e => setForm({ ...form, freightCost: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Délai (jours)</label>
                <input type="number" value={form.leadTime || ''} onChange={e => setForm({ ...form, leadTime: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">MOQ</label>
                <input type="text" value={form.moq || ''} onChange={e => setForm({ ...form, moq: e.target.value })} placeholder="5 000 kg"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" /></div>
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Incoterm</label>
                <select value={form.incoterm || ''} onChange={e => setForm({ ...form, incoterm: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
                  <option value="">—</option>{INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                </select></div>
              <div><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Paiement</label>
                <select value={form.paymentTerms || ''} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
                  <option value="">—</option>{PAYMENT_TERMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAddLineModal(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
              <button onClick={addLine} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg">✅ Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${accent ? 'text-brand-green' : 'text-[var(--text-primary)]'}`}>{value}</div>
    </div>
  );
}
