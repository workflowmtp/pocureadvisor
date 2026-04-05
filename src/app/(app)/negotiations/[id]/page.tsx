'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/format';
import { NEGOTIATION_STATUS_CONFIG } from '@/lib/constants';

export default function NegotiationDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchData = () => {
    fetch(`/api/negotiations/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { if (params.id) fetchData(); }, [params.id]);

  async function handleAction(action: string, payload: Record<string, any> = {}) {
    await fetch(`/api/negotiations/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    setActionModal(null); setForm({}); fetchData();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center py-20"><div className="text-4xl mb-3">❓</div><p className="text-[var(--text-secondary)]">Négociation non trouvée</p></div>;

  const { negotiation: n, rounds, deadlineInfo } = data;
  const sc = NEGOTIATION_STATUS_CONFIG[n.status as keyof typeof NEGOTIATION_STATUS_CONFIG];
  const isActive = !['closed_won', 'closed_lost', 'cancelled'].includes(n.status);

  return (
    <div>
      <div className="mb-5"><Link href="/negotiations" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue">← Retour</Link></div>

      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{n.subject}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: (sc?.color || '#6B7280') + '15', color: sc?.color }}>
                {sc?.label || n.status}
              </span>
              {n.supplier && (
                <Link href={`/suppliers/${n.supplierId}`} className="text-sm text-brand-blue hover:underline">🏢 {n.supplierName}</Link>
              )}
              <span className="text-sm text-[var(--text-secondary)]">📅 Démarrée {formatDate(n.dateStart)}</span>
              {deadlineInfo && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  deadlineInfo.isOverdue ? 'bg-brand-red text-white' : deadlineInfo.daysLeft <= 7 ? 'bg-brand-orange-soft text-brand-orange' : 'bg-brand-blue-soft text-brand-blue'
                }`}>
                  ⏰ {deadlineInfo.label} {deadlineInfo.isOverdue ? '— ' + deadlineInfo.priority : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-[var(--text-tertiary)]">Enjeu financier</div>
            <div className="font-mono text-xl font-bold text-brand-purple">{formatCurrency(n.financialStake)}</div>
            {n.targetSavings > 0 && <div className="text-xs text-[var(--text-tertiary)]">Cible: {formatCurrency(n.targetSavings)}</div>}
            {n.achievedSavings && <div className="text-xs text-brand-green font-bold">✅ Réalisé: {formatCurrency(n.achievedSavings)}</div>}
          </div>
        </div>
      </div>

      {/* Info + Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Informations</h3>
          <div className="space-y-2">
            <InfoRow label="Catégorie" value={n.category || '—'} />
            <InfoRow label="Statut" value={sc?.label || n.status} />
            <InfoRow label="Date début" value={formatDate(n.dateStart)} />
            <InfoRow label="Date limite" value={deadlineInfo ? formatDate(deadlineInfo.date) : '—'} />
            {n.dateClosed && <InfoRow label="Date clôture" value={formatDate(n.dateClosed)} />}
            <InfoRow label="Enjeu" value={formatCurrency(n.financialStake)} />
            <InfoRow label="Objectif économies" value={formatCurrency(n.targetSavings)} />
            <InfoRow label="Rounds" value={String(rounds.length)} />
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Stratégie</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {n.strategy || 'Aucune stratégie définie. Ajoutez une stratégie pour guider les rounds de négociation.'}
          </p>
        </div>
      </div>

      {/* Rounds Timeline */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">📋 Historique des rounds ({rounds.length})</h3>
          {isActive && (
            <button onClick={() => setActionModal('add_round')} className="px-3 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-lg hover:bg-blue-600">+ Ajouter un round</button>
          )}
        </div>

        {rounds.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">Aucun round enregistré. Démarrez la négociation et ajoutez des rounds.</div>
        ) : (
          <div className="space-y-0">
            {rounds.map((r: any, i: number) => (
              <div key={i} className="flex gap-4">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-brand-blue border-2 border-brand-blue flex-shrink-0 mt-1.5" />
                  {i < rounds.length - 1 && <div className="w-0.5 flex-1 bg-brand-blue/20 my-1" />}
                </div>
                {/* Content */}
                <div className="flex-1 pb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[var(--text-tertiary)]">{r.date}</span>
                    <span className="px-2 py-0.5 bg-brand-blue-soft text-brand-blue text-[10px] font-semibold rounded-full">{r.type}</span>
                  </div>
                  <div className="text-sm text-[var(--text-primary)] mb-1">{r.summary}</div>
                  {r.outcome && (
                    <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-input)] rounded-lg p-2 mt-1">
                      <strong>Résultat:</strong> {r.outcome}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {n.status === 'preparation' && (
          <button onClick={() => handleAction('start')} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-600">▶ Démarrer</button>
        )}
        {isActive && (
          <>
            <button onClick={() => setActionModal('add_round')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">+ Ajouter round</button>
            {n.status !== 'pending_decision' && (
              <button onClick={() => handleAction('pending_decision')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">⏳ Décision en attente</button>
            )}
            <button onClick={() => setActionModal('close_won')} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600">✅ Clôturer — Gagnée</button>
            <button onClick={() => handleAction('close_lost')} className="px-4 py-2 bg-brand-red text-white text-sm rounded-lg hover:bg-red-600">❌ Clôturer — Échouée</button>
            <button onClick={() => handleAction('generate_letter')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">✉️ Générer courrier</button>
          </>
        )}
      </div>

      {/* Modals */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            {actionModal === 'add_round' && (
              <>
                <h3 className="text-lg font-bold mb-4">Ajouter un round</h3>
                <div className="mb-3"><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Type</label>
                  <select value={form.roundType || ''} onChange={e => setForm({ ...form, roundType: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
                    <option value="">— Type de round —</option>
                    <option value="Ouverture">Ouverture</option><option value="Benchmark">Benchmark</option>
                    <option value="Discussion">Discussion</option><option value="Contre-proposition">Contre-proposition</option>
                    <option value="Dernière offre">Dernière offre</option><option value="Réunion">Réunion</option>
                    <option value="Visite site">Visite site</option><option value="Clôture">Clôture</option>
                  </select></div>
                <div className="mb-3"><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Résumé *</label>
                  <textarea value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Résumé du round..."
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm resize-y min-h-[80px]" /></div>
                <div className="mb-3"><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Résultat</label>
                  <textarea value={form.outcome || ''} onChange={e => setForm({ ...form, outcome: e.target.value })} placeholder="Résultat / décision..."
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm resize-y min-h-[60px]" /></div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('add_round', form)} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg">✅ Ajouter</button>
                </div>
              </>
            )}
            {actionModal === 'close_won' && (
              <>
                <h3 className="text-lg font-bold mb-4">Clôturer — Négociation gagnée</h3>
                <div className="mb-3"><label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Économies réalisées (FCFA)</label>
                  <input type="number" value={form.achievedSavings || ''} onChange={e => setForm({ ...form, achievedSavings: e.target.value })} placeholder="Montant des économies obtenues"
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" /></div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('close_won', { achievedSavings: parseInt(form.achievedSavings) || 0 })} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg">✅ Clôturer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-secondary)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
