'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/format';
import { OcrPipeline } from '@/components/ocr/OcrComponents';

export default function OcrDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const fetchData = () => {
    fetch(`/api/documents/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (params.id) fetchData(); }, [params.id]);

  async function handleAction(action: string, payload: Record<string, string> = {}) {
    await fetch(`/api/documents/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    setActionModal(null);
    setFormData({});
    fetchData(); // Refresh
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center py-20"><div className="text-4xl mb-3">❓</div><p className="text-[var(--text-secondary)]">Document non trouvé</p></div>;

  const { document: doc, variances, verdict, stages, comments } = data;

  const verdictColors: Record<string, { bg: string; text: string; border: string }> = {
    conforme: { bg: 'bg-[var(--accent-green-soft)]', text: 'text-[var(--accent-green)]', border: 'border-[var(--accent-green)]' },
    'ecart-mineur': { bg: 'bg-[var(--accent-orange-soft)]', text: 'text-[var(--accent-orange)]', border: 'border-[var(--accent-orange)]' },
    'ecart-majeur': { bg: 'bg-[var(--accent-orange-soft)]', text: 'text-[var(--accent-orange)]', border: 'border-[var(--accent-orange)]' },
    bloquant: { bg: 'bg-[var(--accent-red-soft)]', text: 'text-[var(--accent-red)]', border: 'border-[var(--accent-red)]' },
    pending: { bg: 'bg-[var(--accent-blue-soft)]', text: 'text-[var(--accent-blue)]', border: 'border-[var(--accent-blue)]' },
  };
  const vc = verdictColors[verdict.class] || verdictColors.pending;

  return (
    <div>
      <div className="mb-5">
        <Link href="/ocr" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--accent-blue)]">← Retour</Link>
      </div>

      {/* OCR Pipeline */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Pipeline de traitement</h3>
        <OcrPipeline currentStage={doc.pipelineStage} stageCounts={stages.reduce((acc: Record<number, number>, s: any) => { acc[s.step] = s.count || 0; return acc; }, {})} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Extracted data */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Données extraites</h3>
          <div className="space-y-2">
            <OcrField label="Fournisseur" value={doc.supplierName} confidence="high" />
            <OcrField label="N° Facture" value={doc.invoiceNumber || '—'} confidence="high" />
            <OcrField label="N° PO" value={doc.poNumber || '—'} confidence="medium" />
            <OcrField label="Montant HT" value={doc.amountHt ? formatCurrency(doc.amountHt) : '—'} confidence="high" />
            <OcrField label="TVA" value={doc.amountTva ? formatCurrency(doc.amountTva) : '—'} confidence="high" />
            <OcrField label="Montant TTC" value={doc.amountTtc ? formatCurrency(doc.amountTtc) : '—'} confidence="high" />
          </div>
        </div>

        {/* Document info */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Informations du document</h3>
          <div className="space-y-2">
            <InfoRow label="Nom du fichier" value={doc.fileName} />
            <InfoRow label="Taille" value={doc.fileSize || '—'} />
            <InfoRow label="Date d'upload" value={formatDate(doc.uploadDate)} />
            <InfoRow label="Uploadé par" value={doc.uploadedByName} />
            <InfoRow label="Assigné à" value={doc.assignedToName} />
            <InfoRow label="Fournisseur" value={doc.supplierName} />
            <InfoRow label="Statut OCR" value={doc.ocrStatus === 'extracted' ? '✅ Extrait' : doc.ocrStatus} />
            <InfoRow label="Étape pipeline" value={stages.find((s: any) => s.step === doc.pipelineStage)?.label || '—'} />
          </div>
        </div>
      </div>

      {/* Reconciliation results */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Résultats du rapprochement</h3>
        <VarianceList variances={variances} />
      </div>

      {/* Verdict */}
      <div className={`${vc.bg} border ${vc.border} rounded-xl p-6 text-center mb-5`}>
        <div className={`text-xl font-bold ${vc.text} mb-1`}>
          {verdict.class === 'conforme' ? '✅' : verdict.class === 'pending' ? '⏳' : '⚠️'} {verdict.label.toUpperCase()}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">{verdict.desc}</div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-5">
        {verdict.class === 'conforme' && (
          <button onClick={() => handleAction('validate')} className="px-4 py-2 bg-[var(--accent-green)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-green)]">✅ Valider et archiver</button>
        )}
        {verdict.class === 'ecart-mineur' && (
          <>
            <button onClick={() => setActionModal('justify')} className="px-4 py-2 bg-[var(--accent-blue)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-blue-hover)]">✅ Valider avec justification</button>
            <button onClick={() => setActionModal('escalade')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-[var(--accent-blue)]">↗️ Escalader</button>
          </>
        )}
        {(verdict.class === 'ecart-majeur' || verdict.class === 'bloquant') && (
          <>
            <button onClick={() => setActionModal('block')} className="px-4 py-2 bg-[var(--accent-red)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-red)]">⛔ Bloquer</button>
            <button onClick={() => setActionModal('escalade')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-[var(--accent-blue)]">↗️ Escalader au Dir. Achats</button>
          </>
        )}
        {verdict.class === 'pending' && (
          <button onClick={() => handleAction('validate')} className="px-4 py-2 bg-[var(--accent-green)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-green)]">✅ Valider et archiver</button>
        )}
        <button onClick={() => setActionModal('comment')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-[var(--accent-blue)]">💬 Commenter</button>
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">💬 Commentaires ({comments.length})</h3>
          <div className="space-y-2">
            {comments.map((c: any, i: number) => (
              <div key={i} className="p-3 bg-[var(--bg-input)] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{c.user}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{formatDate(c.date)}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Action Modals ─── */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            {actionModal === 'justify' && (
              <>
                <h3 className="text-lg font-bold mb-4">Valider avec justification</h3>
                <textarea placeholder="Justification de l'écart..." value={formData.justification || ''} onChange={e => setFormData({ ...formData, justification: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[100px] focus:outline-none focus:border-[var(--accent-blue)]" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('validate_with_justification', { justification: formData.justification || '' })} className="px-4 py-2 bg-[var(--accent-blue)] text-white text-sm rounded-lg">✅ Valider</button>
                </div>
              </>
            )}
            {actionModal === 'block' && (
              <>
                <h3 className="text-lg font-bold mb-4">Bloquer le document</h3>
                <select value={formData.reason || ''} onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-3 focus:outline-none">
                  <option value="">— Motif de blocage —</option>
                  <option value="ecart_prix">Écart de prix non justifié</option>
                  <option value="doublon">Doublon suspecté</option>
                  <option value="bl_absent">BL absent</option>
                  <option value="po_absent">PO absent</option>
                  <option value="montant_incorrect">Montant incorrect</option>
                  <option value="autre">Autre</option>
                </select>
                <textarea placeholder="Commentaire..." value={formData.comment || ''} onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[80px] focus:outline-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('block', { reason: formData.reason || '', comment: formData.comment || '' })} className="px-4 py-2 bg-[var(--accent-red)] text-white text-sm rounded-lg">⛔ Bloquer</button>
                </div>
              </>
            )}
            {actionModal === 'escalate' && (
              <>
                <h3 className="text-lg font-bold mb-4">Escalader au Directeur Achats</h3>
                <textarea placeholder="Motif d'escalade..." value={formData.comment || ''} onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[100px] focus:outline-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('escalate', { comment: formData.comment || '' })} className="px-4 py-2 bg-[var(--accent-blue)] text-white text-sm rounded-lg">↗️ Escalader</button>
                </div>
              </>
            )}
            {actionModal === 'comment' && (
              <>
                <h3 className="text-lg font-bold mb-4">Ajouter un commentaire</h3>
                <textarea placeholder="Votre commentaire..." value={formData.text || ''} onChange={e => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm mb-4 resize-y min-h-[100px] focus:outline-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border-primary)]">Annuler</button>
                  <button onClick={() => handleAction('comment', { text: formData.text || '' })} className="px-4 py-2 bg-[var(--accent-blue)] text-white text-sm rounded-lg">💬 Ajouter</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OcrField({ label, value, confidence }: { label: string; value: string; confidence: 'high' | 'medium' | 'low' }) {
  const confColors = { high: 'bg-[var(--accent-green-soft)] text-[var(--accent-green)]', medium: 'bg-[var(--accent-orange-soft)] text-[var(--accent-orange)]', low: 'bg-[var(--accent-red-soft)] text-[var(--accent-red)]' };
  const confLabels = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-secondary)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${confColors[confidence]}`}>{confLabels[confidence]}</span>
      </div>
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

function VarianceList({ variances }: { variances: any[] }) {
  if (!variances || variances.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-tertiary)]">
        <div className="text-3xl mb-2">✅</div>
        <p>Aucun écart détecté</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variances.map((variance, i) => (
        <div key={i} className={`p-4 rounded-lg border ${
          variance.severity === 'high' 
            ? 'bg-[var(--accent-red-soft)] border-[var(--accent-red)]' 
            : variance.severity === 'medium'
            ? 'bg-[var(--accent-orange-soft)] border-[var(--accent-orange)]'
            : 'bg-[var(--accent-green-soft)] border-[var(--accent-green)]'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-[var(--text-primary)] mb-1">{variance.field}</h4>
              <p className="text-xs text-[var(--text-secondary)]">{variance.description}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              variance.severity === 'high'
                ? 'bg-[var(--accent-red)] text-white'
                : variance.severity === 'medium'
                ? 'bg-[var(--accent-orange)] text-white'
                : 'bg-[var(--accent-green)] text-white'
            }`}>
              {variance.severity === 'high' ? 'Élevé' : variance.severity === 'medium' ? 'Moyen' : 'Faible'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[var(--text-tertiary)]">Attendu: <span className="text-[var(--text-primary)] font-medium">{variance.expected}</span></span>
            <span className="text-[var(--text-tertiary)]">Trouvé: <span className="text-[var(--text-primary)] font-medium">{variance.found}</span></span>
            {variance.impact && (
              <span className="text-[var(--text-tertiary)]">Impact: <span className="font-medium">{variance.impact}</span></span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
