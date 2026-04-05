'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, truncate } from '@/lib/format';
import { LETTER_TYPES } from '@/lib/constants';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'badge-high' },
  ready: { label: 'Prêt', cls: 'badge-info' },
  sent: { label: 'Envoyé', cls: 'badge-success' },
  archived: { label: 'Archivé', cls: 'badge-neutral' },
};

const TONE_LABELS: Record<string, string> = {
  diplomatic: 'Diplomatique',
  firm: 'Ferme',
  urgent: 'Urgent',
  formal: 'Formel',
};

export default function LettersPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ tone: 'diplomatic', generateAI: true });
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fetchData = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    Promise.all([
      fetch(`/api/letters?${params}`).then(r => r.json()),
      fetch('/api/suppliers?limit=500').then(r => r.json()),
    ]).then(([lData, sData]) => {
      setData(lData); setSuppliers(sData.suppliers || []); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [search, typeFilter, statusFilter]);

  async function handleCreate() {
    if (!form.type || !form.subject) return;
    const sup = suppliers.find((s: any) => s.id === form.supplierId);
    const res = await fetch('/api/letters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, supplierName: sup?.name || '' }),
    });
    const letter = await res.json();
    setCreateModal(false); setForm({ tone: 'diplomatic', generateAI: true });
    router.push(`/letters/${letter.id}`);
  }

  async function quickAction(id: string, action: string) {
    await fetch(`/api/letters/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    fetchData();
  }

  function exportCSV() {
    const letters = data?.letters || [];
    if (!letters.length) return;
    const rows = letters.map((l: any) => [l.type, l.subject, l.supplier?.name || '', l.status, l.tone, l.generatedBy, l.createdAt].join(';'));
    const csv = '\ufeff' + 'Type;Objet;Fournisseur;Statut;Ton;Généré par;Date\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ProcureAdvisor_Courriers.csv'; a.click();
  }

  const letters = data?.letters || [];
  const typeCounts = data?.typeCounts || {};
  
  const drafts = letters.filter((l: any) => l.status === 'draft').length;
  const ready = letters.filter((l: any) => l.status === 'ready').length;
  const sent = letters.filter((l: any) => l.status === 'sent').length;

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Nouveau courrier - Type selection */}
      <div className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="card-header">
          <div className="card-title">✉️ Nouveau courrier</div>
          <span className="reco-section-badge">IA</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--sp-3)' }}>
          {LETTER_TYPES.map(lt => {
            const count = typeCounts[lt.id] || 0;
            return (
              <div 
                key={lt.id} 
                className="letter-type-card"
                onClick={() => { setForm({ ...form, type: lt.id }); setCreateModal(true); }}
              >
                <div className="letter-type-icon">{lt.icon}</div>
                <div className="letter-type-label">{lt.label}</div>
                {count > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {count} existant(s)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="suppliers-stats" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-blue)' }}>{letters.length}</div>
          <div className="supplier-stat-label">Total</div>
        </div>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-orange)' }}>{drafts}</div>
          <div className="supplier-stat-label">Brouillons</div>
        </div>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-purple)' }}>{ready}</div>
          <div className="supplier-stat-label">Prêts</div>
        </div>
        <div className="supplier-stat-card">
          <div className="supplier-stat-value" style={{ color: 'var(--accent-green)' }}>{sent}</div>
          <div className="supplier-stat-label">Envoyés</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <input 
          type="text" 
          className="filter-search"
          placeholder="Rechercher un courrier..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
        <select 
          className="filter-select"
          value={typeFilter} 
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">Tous les types</option>
          {LETTER_TYPES.map(lt => <option key={lt.id} value={lt.id}>{lt.label}</option>)}
        </select>
        <select 
          className="filter-select"
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="ready">Prêt</option>
          <option value="sent">Envoyé</option>
        </select>
        <button className="btn btn-sm btn-secondary" onClick={exportCSV} style={{ marginLeft: 'auto' }}>📤 Exporter CSV</button>
      </div>

      {/* Tableau */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Objet</th>
              <th>Fournisseur</th>
              <th>Ton</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {letters.map((l: any) => {
              const lt = LETTER_TYPES.find(t => t.id === l.type);
              const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.draft;
              const toneLabel = TONE_LABELS[l.tone] || l.tone;
              return (
                <tr key={l.id} className="letter-row">
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{lt?.icon} {lt?.label || l.type}</td>
                  <td 
                    style={{ maxWidth: '230px', cursor: 'pointer', color: 'var(--accent-blue)' }}
                    onClick={() => router.push(`/letters/${l.id}`)}
                  >
                    {truncate(l.subject, 35)}
                  </td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{l.supplier ? truncate(l.supplier.name, 18) : '— Tous —'}</td>
                  <td><span className="badge badge-neutral">{toneLabel}</span></td>
                  <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{formatDate(l.createdAt)}</td>
                  <td>
                    {l.generatedBy === 'ia' 
                      ? <span className="badge badge-info">🤖 IA</span> 
                      : <span className="badge badge-neutral">👤</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button 
                        className="btn-icon" 
                        style={{ width: '28px', height: '28px' }} 
                        onClick={() => router.push(`/letters/${l.id}`)} 
                        title="Voir"
                      >👁</button>
                      {l.status === 'draft' && (
                        <>
                          <button 
                            className="btn-icon" 
                            style={{ width: '28px', height: '28px' }} 
                            onClick={() => quickAction(l.id, 'mark_ready')} 
                            title="Marquer prêt"
                          >✓</button>
                          <button 
                            className="btn-icon" 
                            style={{ width: '28px', height: '28px', color: 'var(--accent-red)' }} 
                            onClick={() => quickAction(l.id, 'delete')} 
                            title="Supprimer"
                          >�</button>
                        </>
                      )}
                      {l.status === 'ready' && (
                        <button 
                          className="btn-icon" 
                          style={{ width: '28px', height: '28px' }} 
                          onClick={() => quickAction(l.id, 'mark_sent')} 
                          title="Marquer envoyé"
                        >�</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {letters.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-[var(--text-tertiary)]">Aucun courrier</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCreateModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nouveau courrier</h3>
            <div className="mb-3">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Type de courrier *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-2)' }}>
                {LETTER_TYPES.map(lt => (
                  <button 
                    key={lt.id} 
                    onClick={() => setForm({ ...form, type: lt.id })}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${form.type === lt.id ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-input)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}
                  >
                    <span className="mr-1">{lt.icon}</span> {lt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Objet *</label>
              <input 
                type="text" 
                value={form.subject || ''} 
                onChange={e => setForm({ ...form, subject: e.target.value })} 
                placeholder="Contestation prix facture FAC-2025-0847..."
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Fournisseur</label>
                <select 
                  value={form.supplierId || ''} 
                  onChange={e => setForm({ ...form, supplierId: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm"
                >
                  <option value="">— Optionnel —</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Ton</label>
                <select 
                  value={form.tone || 'diplomatic'} 
                  onChange={e => setForm({ ...form, tone: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm"
                >
                  <option value="diplomatic">Diplomatique</option>
                  <option value="firm">Ferme</option>
                  <option value="urgent">Urgent</option>
                  <option value="formal">Formel</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={form.generateAI !== false} onChange={e => setForm({ ...form, generateAI: e.target.checked })} />
              <span className="text-sm text-[var(--text-secondary)]">🤖 Générer le contenu via IA</span>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg">✅ Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
