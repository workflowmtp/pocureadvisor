'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate, ageDays } from '@/lib/format';
import { SeverityBadge, PriorityTag } from '@/components/shared/Badges';
import { ANOMALY_CATEGORY_ICONS, SEVERITY_CONFIG } from '@/lib/constants';

const SEVERITY_ICON_BG: Record<string, string> = {
  critical: 'bg-brand-red-soft border border-red-300 dark:border-red-800/30',
  high: 'bg-brand-orange-soft border border-orange-300 dark:border-orange-800/30',
  medium: 'bg-yellow-50 border border-yellow-300 dark:border-yellow-800/30',
  low: 'bg-brand-blue-soft border border-blue-300 dark:border-blue-800/30',
};

const WORKFLOW_STEPS = [
  { id: 'open', label: '🔍 Détectée' },
  { id: 'investigating', label: '🔎 Investigation' },
  { id: 'resolved', label: '✅ Résolue' },
];

export default function AnomalyDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  const catIcon = ANOMALY_CATEGORY_ICONS[a.category] || '📋';
  const currentStepIdx = WORKFLOW_STEPS.findIndex(s => s.id === a.status);
  const sevConf = SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;

  return (
    <div>
      {/* Back */}
      <div className="mb-4"><Link href="/audit" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue transition-colors">← Retour aux anomalies</Link></div>

      {/* Header panel */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl mb-5 overflow-hidden">
        <div className="flex items-start gap-4 p-5 border-b border-[var(--border-secondary)]">
          {/* Severity icon */}
          <div className={`w-12 h-12 min-w-[48px] rounded-lg flex items-center justify-center text-[22px] ${SEVERITY_ICON_BG[a.severity] || SEVERITY_ICON_BG.medium}`}>
            {catIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">{a.title}</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              <SeverityBadge severity={a.severity} />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue-soft text-brand-blue">{a.category}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-input)] text-[var(--text-tertiary)] font-mono">{a.id.substring(0, 8).toUpperCase()}</span>
              {a.detectionMethod === 'auto_rule' && a.ruleId && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-green-soft text-brand-green">Règle {a.ruleId}</span>
              )}
              {a.detectionMethod === 'ai_detection' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-purple-soft text-brand-purple">🤖 Détection IA</span>
              )}
            </div>
            {a.description && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a.description}</p>}
          </div>
          {a.financialImpact > 0 && (
            <div className="text-center min-w-[120px] flex-shrink-0">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase mb-1">Impact financier</div>
              <div className="font-mono text-xl font-bold text-brand-red">{formatCurrency(a.financialImpact)}</div>
            </div>
          )}
        </div>

        {/* Workflow steps */}
        <div className="flex items-center gap-0 px-5 py-3 bg-[var(--bg-secondary)] overflow-x-auto">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              {i > 0 && <span className="mx-1.5 text-xs text-[var(--text-tertiary)]">→</span>}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                i < currentStepIdx
                  ? 'bg-brand-green-soft text-brand-green border-green-300 dark:border-green-800/30'
                  : i === currentStepIdx
                    ? 'bg-brand-blue-soft text-brand-blue border-blue-300 dark:border-blue-800/30'
                    : 'bg-[var(--bg-input)] text-[var(--text-tertiary)] border-[var(--border-secondary)]'
              }`}>
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Détails</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          <InfoRow label="Fournisseur" value={a.supplier?.name || '—'} link={a.supplier ? `/suppliers/${a.supplier.id}` : undefined} />
          <InfoRow label="Utilisateur concerné" value={a.user?.fullName || '—'} />
          <InfoRow label="Pôle" value={a.poleId || '—'} />
          <InfoRow label="Date détection" value={formatDate(a.dateDetected)} />
          <InfoRow label="Méthode détection" value={
            a.detectionMethod === 'auto_rule' ? `🤖 Règle automatique (${a.ruleId || ''})` :
            a.detectionMethod === 'ai_detection' ? '🧠 Détection IA' : '👤 Manuelle'
          } />
          <InfoRow label="Priorité" value={`P${a.priority || 3}`} highlight={a.priority === 1 ? 'red' : a.priority === 2 ? 'orange' : 'default'} />
          {a.orderId && <InfoRow label="Commande liée" value={a.orderId} link={`/orders/${a.orderId}`} />}
          <InfoRow label="Statut" value={
            a.status === 'open' ? 'Ouvert' : a.status === 'investigating' ? 'Investigation' : 'Résolu'
          } />
        </div>
      </div>

      {/* Rule triggered */}
      {a.rule && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Règle d&apos;audit déclenchée</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Code" value={a.rule.code} mono />
            <InfoRow label="Règle" value={a.rule.name} />
            <InfoRow label="Catégorie" value={a.rule.category} />
            <InfoRow label="Sévérité par défaut" value={a.rule.severity} />
          </div>
        </div>
      )}

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
            <button onClick={() => handleAction('investigate')} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">🔎 Lancer investigation</button>
            <button onClick={() => setActionModal('resolve')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue transition-colors">✅ Résoudre</button>
          </>
        )}
        {a.status === 'investigating' && (
          <button onClick={() => setActionModal('resolve')} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600 transition-colors">✅ Résoudre</button>
        )}
        <button onClick={() => setActionModal('comment')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue transition-colors">💬 Commenter</button>
        <button onClick={() => {
          const csv = `ID;${a.id}\nTitre;${a.title}\nCatégorie;${a.category}\nSévérité;${a.severity}\nImpact;${a.financialImpact || 0}\nStatut;${a.status}\nDate;${a.dateDetected}`;
          const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob); const el = document.createElement('a'); el.href = url; el.download = 'Anomalie_' + a.id.substring(0, 8) + '.csv'; el.click();
        }} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue transition-colors">📤 Exporter CSV</button>
      </div>

      {/* Modals */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            {actionModal === 'resolve' && (
              <>
                <h3 className="text-lg font-bold mb-4">Résoudre l&apos;anomalie</h3>
                <div className="flex items-center gap-3 mb-4 p-3 bg-[var(--bg-input)] rounded-lg">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${SEVERITY_ICON_BG[a.severity] || ''}`}>{catIcon}</div>
                  <div>
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{a.id.substring(0, 8).toUpperCase()} — {a.category} — <SeverityBadge severity={a.severity} /></div>
                  </div>
                </div>
                {a.financialImpact > 0 && (
                  <div className="text-sm text-[var(--text-secondary)] mb-3">Impact financier: <strong className="text-brand-red">{formatCurrency(a.financialImpact)}</strong></div>
                )}
                <select value={formData.corrective_action || ''} onChange={e => setFormData({ ...formData, corrective_action: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-3 focus:border-brand-blue focus:outline-none">
                  <option value="">— Sélectionner —</option>
                  <option value="corrige">Écart corrigé dans Sage X3</option>
                  <option value="avoir">Avoir émis par le fournisseur</option>
                  <option value="justifie">Écart justifié et accepté</option>
                  <option value="formation">Formation / rappel procédure</option>
                  <option value="action_fournisseur">Action corrective fournisseur</option>
                  <option value="faux_positif">Faux positif</option>
                  <option value="autre">Autre</option>
                </select>
                <textarea placeholder="Commentaire de résolution..." value={formData.comment || ''} onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[80px] focus:border-brand-blue focus:outline-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('resolve', formData)} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600 transition-colors">✅ Résoudre</button>
                </div>
              </>
            )}
            {actionModal === 'comment' && (
              <>
                <h3 className="text-lg font-bold mb-4">Commentaire</h3>
                {a.resolutionNotes && (
                  <div className="mb-3 p-3 bg-[var(--bg-input)] rounded-lg text-xs text-[var(--text-secondary)] max-h-[150px] overflow-y-auto">
                    <strong>Notes existantes :</strong><br />
                    {a.resolutionNotes.split('\n').map((line: string, i: number) => <span key={i}>{line}<br /></span>)}
                  </div>
                )}
                <textarea placeholder="Observations, pistes d'investigation, conclusions..." value={formData.text || ''} onChange={e => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[100px] focus:border-brand-blue focus:outline-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('comment', formData)} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">💬 Ajouter</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, link, highlight }: { label: string; value: string; mono?: boolean; link?: string; highlight?: string }) {
  const colorClass = highlight === 'red' ? 'text-brand-red font-bold' : highlight === 'orange' ? 'text-brand-orange font-bold' : 'text-[var(--text-primary)]';
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-secondary)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      {link ? (
        <Link href={link} className={`text-sm text-brand-blue hover:underline ${mono ? 'font-mono' : ''}`}>{value}</Link>
      ) : (
        <span className={`text-sm ${mono ? 'font-mono' : ''} ${colorClass}`}>{value}</span>
      )}
    </div>
  );
}
