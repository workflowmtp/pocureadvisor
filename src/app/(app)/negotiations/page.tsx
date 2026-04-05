'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, truncate, daysUntil } from '@/lib/format';
import { NEGOTIATION_STATUS_CONFIG } from '@/lib/constants';
import KpiCard from '@/components/dashboard/KpiCard';

const KANBAN_COLS = [
  { id: 'preparation', label: '📋 Préparation', statuses: ['preparation'] },
  { id: 'in_progress', label: '🔄 En cours', statuses: ['in_progress'] },
  { id: 'pending', label: '⏳ Décision', statuses: ['pending_decision'] },
  { id: 'closed', label: '📁 Clôturées', statuses: ['closed_won', 'closed_lost', 'cancelled'] },
];

export default function NegotiationsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fetchData = () => {
    Promise.all([
      fetch('/api/negotiations').then(r => r.json()),
      fetch('/api/suppliers?limit=500').then(r => r.json()),
    ]).then(([negoData, supData]) => {
      setData(negoData);
      setSuppliers(supData.suppliers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  async function handleCreate() {
    if (!form.subject) return;
    await fetch('/api/negotiations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setCreateModal(false); setForm({}); fetchData();
  }

  const stats = data?.stats || {};
  const negotiations = data?.negotiations || [];

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Négociations</h2>
        <button onClick={() => setCreateModal(true)} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600">+ Nouvelle négociation</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icon="🤝" label="Négociations actives" value={(stats.preparation || 0) + (stats.inProgress || 0) + (stats.pendingDecision || 0)} color="blue" />
        <KpiCard icon="💰" label="Enjeu total" value={formatCurrency(stats.totalStake || 0)} color="purple" />
        <KpiCard icon="✅" label="Gagnées" value={stats.won || 0} color="green" />
        <KpiCard icon="💵" label="Économies réalisées" value={formatCurrency(stats.totalSavings || 0)} color="green" />
      </div>

      {/* Kanban */}
      <div className="nego-kanban grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[300px]">
        {KANBAN_COLS.map(col => {
          const colNegos = negotiations.filter((n: any) => col.statuses.includes(n.status));
          return (
            <div key={col.id} className="kanban-column bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
              <div className="kanban-col-header flex items-center justify-between p-3 border-b border-[var(--border-primary)]" style={{ borderLeftWidth: '3px', borderLeftColor: col.id === 'preparation' ? '#6B7280' : col.id === 'in_progress' ? '#3B82F6' : col.id === 'pending' ? '#F59E0B' : '#10B981' }}>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{col.label}</span>
                <span className="kanban-col-count w-6 h-6 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center">{colNegos.length}</span>
              </div>
              <div className="kanban-col-body p-3 space-y-2">
                {colNegos.map((n: any) => {
                  const sc = NEGOTIATION_STATUS_CONFIG[n.status as keyof typeof NEGOTIATION_STATUS_CONFIG];
                  const dl = n.dateDeadline ? daysUntil(n.dateDeadline) : null;
                  const isOverdue = dl !== null && dl < 0;
                  const rounds = (n.rounds as any[]) || [];

                  return (
                    <div key={n.id} onClick={() => router.push(`/negotiations/${n.id}`)}
                      className="kanban-card bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-3 cursor-pointer hover:border-brand-blue/50 transition-all">
                      {/* Subject */}
                      <div className="kanban-card-title text-sm font-medium text-[var(--text-primary)] mb-1 line-clamp-2">{truncate(n.subject, 40)}</div>
                      
                      {/* Supplier */}
                      <div className="kanban-card-supplier text-xs text-[var(--text-tertiary)] mb-2">{truncate(n.supplier?.name || 'Pas de fournisseur', 20)} — {n.category || ''}</div>
                      
                      {/* Footer */}
                      <div className="kanban-card-footer flex items-center justify-between">
                        <span className="kanban-card-amount table-amount text-xs">{formatCurrency(n.financialStake)}</span>
                        {dl !== null && n.status !== 'closed_won' && (
                          <span className={`kanban-card-deadline text-[10px] font-mono font-bold ${isOverdue ? 'text-brand-red' : dl <= 7 ? 'text-brand-red' : dl <= 15 ? 'text-brand-orange' : 'text-[var(--text-tertiary)]'}`}>
                            {isOverdue ? `⚠ Dépassée ${Math.abs(dl)}j` : dl <= 15 ? `⏰ ${dl}j restants` : `⏰ ${formatDate(n.dateDeadline)}`}
                          </span>
                        )}
                        {n.status === 'closed_won' && n.achievedSavings > 0 && (
                          <span className="text-brand-green font-mono text-xs font-bold">+{formatCurrency(n.achievedSavings)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colNegos.length === 0 && <div className="text-center py-6 text-xs text-[var(--text-tertiary)]">Aucune négociation</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreateModal(false)}>
          <div className="modal bg-[var(--bg-modal)] border border-[var(--border-primary)] rounded-[var(--radius-xl)] w-full max-w-[600px] max-h-[85vh] overflow-y-auto shadow-[var(--shadow-xl)]" onClick={e => e.stopPropagation()}>
            <div className="modal-header p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="modal-title text-[var(--fs-lg)] font-bold text-[var(--text-primary)]">Nouvelle négociation</h3>
              <button onClick={() => setCreateModal(false)} className="modal-close w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-soft)] transition-colors text-lg">✕</button>
            </div>
            <div className="modal-body p-6">
              {/* Objet */}
              <div className="login-field mb-4">
                <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Objet de la négociation *</label>
                <input type="text" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                  placeholder="Ex: Contrat cadre films BOPP 2026..." />
              </div>

              {/* Fournisseur + Catégorie */}
              <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                <div className="login-field mb-0">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Fournisseur</label>
                  <select value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                    <option value="">— Optionnel —</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="login-field mb-0">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Catégorie</label>
                  <select value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                    <option value="">— Sélectionner —</option>
                    {['Encres','Solvants','Films','Carton','Métal','Résines','Consommables','Additifs','Vernis'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                <div className="login-field mb-0">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Date de début</label>
                  <input type="date" value={form.dateStart || ''} onChange={e => setForm({ ...form, dateStart: e.target.value })}
                    className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all" />
                </div>
                <div className="login-field mb-0">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Date limite</label>
                  <input type="date" value={form.dateDeadline || ''} onChange={e => setForm({ ...form, dateDeadline: e.target.value })}
                    className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all" />
                </div>
              </div>

              {/* Enjeux financiers */}
              <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                <div className="login-field mb-0">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Enjeu financier (FCFA)</label>
                  <input type="number" value={form.financialStake || ''} onChange={e => setForm({ ...form, financialStake: parseInt(e.target.value) || 0 })}
                    className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                    placeholder="Ex: 150000000" />
                </div>
                <div className="login-field mb-0">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Économies cibles (FCFA)</label>
                  <input type="number" value={form.targetSavings || ''} onChange={e => setForm({ ...form, targetSavings: parseInt(e.target.value) || 0 })}
                    className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                    placeholder="Ex: 22500000" />
                </div>
              </div>

              {/* Stratégie */}
              <div className="login-field">
                <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Stratégie de négociation</label>
                <textarea value={form.strategy || ''} onChange={e => setForm({ ...form, strategy: e.target.value })}
                  className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all resize-y min-h-[80px]"
                  placeholder="Ex: Mise en concurrence, benchmark concurrent, alternative qualifiée..." />
              </div>
            </div>
            <div className="modal-footer p-4 border-t border-[var(--border-primary)] flex justify-end gap-3">
              <button onClick={() => setCreateModal(false)} className="btn btn-secondary px-4 py-2 bg-transparent border border-[var(--border-primary)] text-[var(--text-secondary)] text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors">Annuler</button>
              <button onClick={handleCreate} className="btn btn-primary px-4 py-2 bg-[var(--accent-blue)] text-white text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-blue-hover)] hover:shadow-[var(--shadow-glow-blue)] transition-all">✅ Créer la négociation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
