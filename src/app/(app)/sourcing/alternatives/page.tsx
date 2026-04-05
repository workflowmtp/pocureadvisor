'use client';

import { useEffect, useState } from 'react';
import { ALT_SUPPLIER_STATUS_CONFIG } from '@/lib/constants';
import KpiCard from '@/components/dashboard/KpiCard';

const STATUS_ORDER = ['identified', 'to_contact', 'in_discussion', 'qualified', 'in_test', 'rejected'] as const;

export default function AlternativesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [negoModal, setNegoModal] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const fetchData = () => {
    fetch('/api/alternatives').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const alts = (data?.alternatives || []).filter((a: any) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const stats = data?.stats || {};
  const categories = data?.categories || [];

  async function changeStatus(id: string, status: string) {
    await fetch('/api/alternatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'changeStatus', id, status }) });
    setDetailModal(null); fetchData();
  }

  async function createAlt(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.country || !form.categoryId) return;
    await fetch('/api/alternatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setCreateModal(false); setForm({}); fetchData();
  }

  async function createNego(e: React.FormEvent, alt: any) {
    e.preventDefault();
    await fetch('/api/alternatives', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createNegotiation', id: alt.id, subject: form.negoSubject || 'Consultation — ' + alt.name, financialStake: parseInt(form.negoStake) || 0, strategy: form.negoStrategy || '' }) });
    setNegoModal(null); setForm({}); fetchData();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Fournisseurs Alternatifs — Sourcing</h2>
        <button onClick={() => setCreateModal(true)} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600">+ Nouveau fournisseur</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icon="🏭" label="Total identifiés" value={stats.total || 0} color="blue" />
        <KpiCard icon="✅" label="Qualifiés" value={stats.qualified || 0} color="green" />
        <KpiCard icon="🧪" label="En test" value={stats.inTest || 0} color="purple" />
        <KpiCard icon="💬" label="En discussion" value={stats.inDiscussion || 0} color="blue" />
      </div>

      {/* Pipeline chips */}
      <div className="supplier-stats-row flex flex-wrap gap-3 mb-4">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!statusFilter ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
          Tous {stats.total}
        </button>
        {STATUS_ORDER.map(s => {
          const conf = ALT_SUPPLIER_STATUS_CONFIG[s];
          const count = stats[s === 'to_contact' ? 'toContact' : s === 'in_discussion' ? 'inDiscussion' : s === 'in_test' ? 'inTest' : s] || 0;
          if (count === 0 && s !== statusFilter) return null;
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
              {conf.icon} {conf.label} {count}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm focus:border-brand-blue focus:outline-none w-64" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {alts.map((alt: any) => {
          const conf = ALT_SUPPLIER_STATUS_CONFIG[alt.status as keyof typeof ALT_SUPPLIER_STATUS_CONFIG] || ALT_SUPPLIER_STATUS_CONFIG.identified;
          const ev = alt.evaluation || {};
          return (
            <div key={alt.id} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 hover:border-brand-blue/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">{alt.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{alt.country} — {categories.find((c: any) => c.id === alt.categoryId)?.name || '—'}</div>
                </div>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: conf.color + '15', color: conf.color }}>
                  {conf.icon} {conf.label}
                </span>
              </div>

              {/* Pertinence bar */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-[var(--text-tertiary)]">Pertinence:</span>
                <div className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-full">
                  <div className="h-full bg-brand-green rounded-full" style={{ width: alt.relevanceScore + '%' }} />
                </div>
                <span className="font-mono text-sm font-bold text-brand-green">{alt.relevanceScore}</span>
              </div>

              {/* Eval grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[var(--bg-input)] rounded-lg p-2 text-center">
                  <div className="font-mono text-sm font-bold text-brand-blue">{ev.price || '—'}</div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">PRIX</div>
                </div>
                <div className="bg-[var(--bg-input)] rounded-lg p-2 text-center">
                  <div className="font-mono text-sm font-bold text-brand-green">{ev.quality || '—'}</div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">QUALITÉ</div>
                </div>
                <div className="bg-[var(--bg-input)] rounded-lg p-2 text-center">
                  <div className="font-mono text-sm font-bold text-brand-purple">{ev.lead_time ? ev.lead_time + 'j' : '—'}</div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">DÉLAI</div>
                </div>
              </div>

              {/* Notes */}
              {alt.comparisonNotes && <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{alt.comparisonNotes}</p>}

              {/* Certifications */}
              {ev.certifications?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {ev.certifications.map((c: string) => <span key={c} className="px-2 py-0.5 bg-brand-green-soft text-brand-green border border-green-200 dark:border-green-800/30 rounded-full text-[10px] font-medium">{c}</span>)}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-[var(--border-secondary)]">
                {(alt.status === 'identified' || alt.status === 'to_contact') && (
                  <button onClick={() => changeStatus(alt.id, 'in_discussion')} className="px-3 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-lg">📞 Contacter</button>
                )}
                {alt.status === 'qualified' && (
                  <button onClick={() => { setNegoModal(alt); setForm({ negoSubject: 'Consultation — ' + alt.name }); }} className="px-3 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-lg">🤝 Créer négociation</button>
                )}
                {alt.status === 'in_test' && (
                  <button onClick={() => setDetailModal(alt)} className="px-3 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-lg">📊 Suivi test</button>
                )}
                <button onClick={() => setDetailModal(alt)} className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border-primary)] text-xs rounded-lg">📋 Fiche complète</button>
              </div>
            </div>
          );
        })}
        {alts.length === 0 && <div className="col-span-2 text-center py-12 text-sm text-[var(--text-tertiary)]">Aucun fournisseur alternatif trouvé</div>}
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-xl max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{detailModal.name}</h3>
            <div className="text-sm text-[var(--text-secondary)] mb-3">{detailModal.country}{detailModal.city ? ', ' + detailModal.city : ''}</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <InfoRow label="Contact" value={detailModal.contactName || '—'} />
              <InfoRow label="Email" value={detailModal.contactEmail || '—'} />
              <InfoRow label="Devise" value={detailModal.currency} />
              <InfoRow label="Score" value={detailModal.relevanceScore + '/100'} />
            </div>
            {/* Pipeline */}
            <div className="flex items-center gap-0 flex-wrap mb-4">
              {STATUS_ORDER.filter(s => s !== 'rejected').map((s, i) => {
                const idx = STATUS_ORDER.indexOf(detailModal.status);
                const si = STATUS_ORDER.indexOf(s);
                const done = si < idx;
                const current = si === idx;
                return (
                  <div key={s} className="flex items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-brand-green text-white' : current ? 'bg-brand-blue text-white' : 'bg-[var(--bg-input)] text-[var(--text-tertiary)]'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < 4 && <div className={`w-6 h-0.5 ${done ? 'bg-brand-green' : 'bg-[var(--border-primary)]'}`} />}
                  </div>
                );
              })}
            </div>
            {/* Actions in modal */}
            <div className="flex gap-2 pt-3 border-t border-[var(--border-secondary)]">
              {detailModal.status === 'in_discussion' && (
                <>
                  <button onClick={() => changeStatus(detailModal.id, 'qualified')} className="px-3 py-1.5 bg-brand-green text-white text-xs rounded-lg">✅ Qualifier</button>
                  <button onClick={() => changeStatus(detailModal.id, 'rejected')} className="px-3 py-1.5 bg-brand-red text-white text-xs rounded-lg">❌ Rejeter</button>
                </>
              )}
              {detailModal.status === 'qualified' && (
                <button onClick={() => changeStatus(detailModal.id, 'in_test')} className="px-3 py-1.5 bg-brand-purple text-white text-xs rounded-lg">🧪 Lancer test</button>
              )}
              <button onClick={() => setDetailModal(null)} className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border-primary)] text-xs rounded-lg ml-auto">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreateModal(false)}>
          <div className="modal bg-[var(--bg-modal)] border border-[var(--border-primary)] rounded-[var(--radius-xl)] w-full max-w-[600px] max-h-[85vh] overflow-y-auto shadow-[var(--shadow-xl)]" onClick={e => e.stopPropagation()}>
            <div className="modal-header p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="modal-title text-[var(--fs-lg)] font-bold text-[var(--text-primary)]">Nouveau fournisseur alternatif</h3>
              <button onClick={() => setCreateModal(false)} className="modal-close w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-soft)] transition-colors text-lg">✕</button>
            </div>
            <form onSubmit={createAlt} noValidate>
              <div className="modal-body p-6">
                <p className="text-[var(--fs-sm)] text-[var(--text-secondary)] mb-5">Ajoutez un fournisseur identifié au pipeline de sourcing. Il pourra ensuite être contacté, évalué, qualifié puis intégré dans Sage X3.</p>

                {/* Ligne 1: Nom + Pays */}
                <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="alt-name" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Raison sociale *</label>
                    <input id="alt-name" type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: SABIC, MONDI GROUP..." />
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="alt-country" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Pays *</label>
                    <input id="alt-country" type="text" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} required
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: Allemagne, Inde, Chine..." />
                  </div>
                </div>

                {/* Ligne 2: Ville + Devise */}
                <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="alt-city" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Ville</label>
                    <input id="alt-city" type="text" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })}
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: Mumbai, Séoul..." />
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="alt-currency" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Devise</label>
                    <select id="alt-currency" value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="XAF">XAF</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                </div>

                {/* Catégorie */}
                <div className="login-field mb-4">
                  <label htmlFor="alt-category" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Catégorie achat *</label>
                  <select id="alt-category" value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value })} required
                    className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                    <option value="">— Sélectionner —</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Contact */}
                <div className="font-semibold text-[var(--fs-sm)] text-[var(--text-primary)] mb-2 mt-4">Contact</div>
                <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="alt-contact" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Nom du contact</label>
                    <input id="alt-contact" type="text" value={form.contactName || ''} onChange={e => setForm({ ...form, contactName: e.target.value })}
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Prénom Nom" />
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="alt-email" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Email</label>
                    <input id="alt-email" type="email" value={form.contactEmail || ''} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="email@company.com" />
                  </div>
                </div>

                {/* Évaluation initiale */}
                <div className="font-semibold text-[var(--fs-sm)] text-[var(--text-primary)] mb-2 mt-4">Évaluation initiale (estimation)</div>
                <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="alt-moq" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">MOQ estimé</label>
                    <input id="alt-moq" type="text" value={form.moq || ''} onChange={e => setForm({ ...form, moq: e.target.value })}
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: 5 000 kg" />
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="alt-leadtime" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Délai estimé (jours)</label>
                    <input id="alt-leadtime" type="number" value={form.leadTime || ''} onChange={e => setForm({ ...form, leadTime: e.target.value })}
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: 45" />
                  </div>
                </div>

                {/* Certifications */}
                <div className="login-field mb-4">
                  <label htmlFor="alt-certs" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Certifications connues</label>
                  <input id="alt-certs" type="text" value={form.certifications || ''} onChange={e => setForm({ ...form, certifications: e.target.value })}
                    className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                    placeholder="ISO 9001, ISO 14001, BRC... (séparés par virgule)" />
                </div>

                {/* Notes */}
                <div className="login-field">
                  <label htmlFor="alt-notes" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Notes / source d'identification</label>
                  <textarea id="alt-notes" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all resize-y min-h-[60px]"
                    placeholder="Salon, web, recommandation, benchmark concurrent..." />
                </div>
              </div>
              <div className="modal-footer p-4 border-t border-[var(--border-primary)] flex justify-end gap-3">
                <button type="button" onClick={() => setCreateModal(false)} className="btn btn-secondary px-4 py-2 bg-transparent border border-[var(--border-primary)] text-[var(--text-secondary)] text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors">Annuler</button>
                <button type="submit" className="btn btn-primary px-4 py-2 bg-[var(--accent-blue)] text-white text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-blue-hover)] hover:shadow-[var(--shadow-glow-blue)] transition-all">✅ Ajouter au pipeline sourcing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Negotiation Modal */}
      {negoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setNegoModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Créer négociation — {negoModal.name}</h3>
            <form onSubmit={e => createNego(e, negoModal)} noValidate>
              <div className="mb-3">
                <label htmlFor="nego-subject" className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Objet</label>
                <input id="nego-subject" type="text" value={form.negoSubject || ''} onChange={e => setForm({ ...form, negoSubject: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" />
              </div>
              <div className="mb-3">
                <label htmlFor="nego-stake" className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Enjeu financier (FCFA)</label>
                <input id="nego-stake" type="number" value={form.negoStake || ''} onChange={e => setForm({ ...form, negoStake: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setNegoModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg">✅ Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5">
      <div className="text-[10px] text-[var(--text-tertiary)]">{label}</div>
      <div className="text-sm text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
