'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate, ageDays } from '@/lib/format';
import { SeverityBadge, PriorityTag } from '@/components/shared/Badges';
import { ANOMALY_CATEGORY_ICONS } from '@/lib/constants';

export default function AnomalyDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const fetchData = () => {
    fetch(`/api/anomalies/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (params.id) fetchData(); }, [params.id]);

  async function handleAction(action: string, payload: Record<string, string> = {}) {
    await fetch(`/api/anomalies/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    setActionModal(null); setFormData({}); fetchData();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center py-20"><div className="text-4xl mb-3">❓</div><p className="text-[var(--text-secondary)]">Anomalie non trouvée</p></div>;

  const a = data.anomaly;
  const age = ageDays(a.dateDetected);

  return (
    <div>
      <div className="mb-5"><Link href="/audit" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue">← Retour</Link></div>

      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-2xl">{ANOMALY_CATEGORY_ICONS[a.category] || '📋'}</span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{a.title}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <PriorityTag priority={a.priority} />
              <SeverityBadge severity={a.severity} />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue-soft text-brand-blue">{a.category}</span>
              {a.status !== 'resolved' && age > 7 && (
                <span className={`font-mono text-xs font-bold ${age > 14 ? 'text-brand-red' : 'text-brand-orange'}`}>
                  {age}j {age > 14 ? '🔥' : '⚠'}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${a.status === 'open' ? 'bg-brand-orange-soft text-brand-orange' : a.status === 'investigating' ? 'bg-brand-blue-soft text-brand-blue' : 'bg-brand-green-soft text-brand-green'}`}>
                {a.status === 'open' ? 'Ouvert' : a.status === 'investigating' ? 'Investigation' : 'Résolu'}
              </span>
            </div>
          </div>
          {a.financialImpact && (
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-[var(--text-tertiary)]">Impact financier</div>
              <div className="font-mono text-xl font-bold text-brand-red">{formatCurrency(a.financialImpact)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Détails de l'anomalie</h3>
          <div className="space-y-2">
            <InfoRow label="ID" value={a.id.substring(0, 12).toUpperCase()} mono />
            <InfoRow label="Catégorie" value={a.category} />
            <InfoRow label="Sous-catégorie" value={a.subCategory || '—'} />
            <InfoRow label="Méthode détection" value={a.detectionMethod === 'auto_rule' ? '🤖 Automatique' : '👤 Manuelle'} />
            {a.ruleId && <InfoRow label="Règle" value={a.ruleId} mono />}
            <InfoRow label="Date détection" value={formatDate(a.dateDetected)} />
            {a.dateResolved && <InfoRow label="Date résolution" value={formatDate(a.dateResolved)} />}
            {a.resolvedBy && <InfoRow label="Résolu par" value={a.resolvedBy.fullName} />}
            <InfoRow label="Pôle" value={a.poleId || '—'} />
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Entités liées</h3>
          <div className="space-y-2">
            <InfoRow label="Fournisseur" value={a.supplier ? a.supplier.name : '—'} link={a.supplier ? `/suppliers/${a.supplier.id}` : undefined} />
            <InfoRow label="Utilisateur" value={a.user ? a.user.fullName + ' (' + a.user.roleLabel + ')' : '—'} />
            {a.order && <InfoRow label="Commande" value={a.order.poNumber} link={`/orders/${a.order.id}`} mono />}
          </div>
          {a.description && (
            <div className="mt-4 p-4 bg-[var(--bg-input)] rounded-lg">
              <div className="text-xs font-semibold text-[var(--text-tertiary)] mb-1">Description</div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Resolution notes */}
      {a.resolutionNotes && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">📝 Notes & Commentaires</h3>
          <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed bg-[var(--bg-input)] rounded-lg p-4">{a.resolutionNotes}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {a.status === 'open' && (
          <>
            <button onClick={() => handleAction('investigate')} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-600">🔎 Lancer investigation</button>
            <button onClick={() => setActionModal('resolve')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">✅ Résoudre</button>
          </>
        )}
        {a.status === 'investigating' && (
          <button onClick={() => setActionModal('resolve')} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600">✅ Résoudre</button>
        )}
        <button onClick={() => setActionModal('comment')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">💬 Commenter</button>
        <button onClick={() => {
          const csv = `ID;${a.id}\nTitre;${a.title}\nCatégorie;${a.category}\nSévérité;${a.severity}\nImpact;${a.financialImpact || 0}\nStatut;${a.status}\nDate;${a.dateDetected}`;
          const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob); const el = document.createElement('a'); el.href = url; el.download = 'Anomalie_' + a.id.substring(0, 8) + '.csv'; el.click();
        }} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">📤 Exporter CSV</button>
      </div>

      {/* Modals */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            {actionModal === 'resolve' && (
              <>
                <h3 className="text-lg font-bold mb-4">Résoudre l'anomalie</h3>
                <select value={formData.corrective_action || ''} onChange={e => setFormData({ ...formData, corrective_action: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-3">
                  <option value="">— Action corrective —</option>
                  <option value="Corrigé dans Sage X3">Corrigé dans Sage X3</option>
                  <option value="Avoir fournisseur">Avoir émis par fournisseur</option>
                  <option value="Écart justifié">Écart justifié et accepté</option>
                  <option value="Formation">Formation / rappel procédure</option>
                  <option value="Action fournisseur">Action corrective fournisseur</option>
                  <option value="Faux positif">Faux positif</option>
                </select>
                <textarea placeholder="Commentaire..." value={formData.comment || ''} onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[80px]" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('resolve', formData)} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg">✅ Résoudre</button>
                </div>
              </>
            )}
            {actionModal === 'comment' && (
              <>
                <h3 className="text-lg font-bold mb-4">Ajouter un commentaire</h3>
                <textarea placeholder="Votre commentaire..." value={formData.text || ''} onChange={e => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[100px]" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('comment', formData)} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg">💬 Ajouter</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-secondary)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      {link ? (
        <Link href={link} className={`text-sm text-brand-blue hover:underline ${mono ? 'font-mono' : ''}`}>{value}</Link>
      ) : (
        <span className={`text-sm text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  );
}
