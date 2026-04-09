'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, truncate } from '@/lib/format';
import { 
  UploadZone, 
  OcrPipeline, 
  DocumentCard, 
  SplitAnalysis, 
  VerdictBox, 
  ReconciliationResults 
} from '@/components/ocr/OcrComponents';
import KpiCard from '@/components/dashboard/KpiCard';

export default function OcrPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [stageCounts, setStageCounts] = useState<Record<number, number>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showJustificationInput, setShowJustificationInput] = useState(false);
  const [justificationText, setJustificationText] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/documents')
      .then(r => r.json())
      .then(d => { 
        setData(d); 
        setLoading(false);
        if (d.documents) {
          const counts: Record<number, number> = {};
          d.documents.forEach((doc: any) => {
            const stage = doc.pipelineStage || 1;
            counts[stage] = (counts[stage] || 0) + 1;
          });
          setStageCounts(counts);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadComplete = useCallback((result: any) => {
    console.log('Upload terminé:', result);
    fetchData();
  }, [fetchData]);

  const getActionSuccessMessage = (action: string) => {
    switch (action) {
      case 'validate': return 'Document validé et archivé avec succès';
      case 'validate_with_justification': return 'Document validé avec justification';
      case 'block': return 'Document bloqué';
      case 'escalate': return 'Document escaladé au Dir. Achats';
      case 'comment': return 'Commentaire ajouté';
      default: return 'Action effectuée';
    }
  };

  const executeAction = useCallback(async (docId: string, action: string, extraData?: any) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Action échouée');
      }
      setActionMessage({ type: 'success', text: getActionSuccessMessage(action) });
      fetchData();
      if (action === 'validate' || action === 'validate_with_justification') {
        setTimeout(() => { setCurrentDocId(null); setActionMessage(null); }, 1500);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  const docs = data?.documents || [];
  const stats = data?.stats || { total: 0, pending: 0, conforme: 0, critical: 0 };

  // Si un document est sélectionné, afficher la vue d'analyse
  if (currentDocId) {
    const doc = docs.find((d: any) => d.id === currentDocId);
    if (doc) {
      const supplier = doc.supplier || { name: 'Inconnu' };
      
      // Calculer le verdict
      const computeVerdict = () => {
        if (doc.reconciliationStatus === 'validated' || doc.reconciliationStatus === 'matched') {
          return { class: 'conforme', icon: '✅', label: 'CONFORME', desc: 'Document rapproché et validé. Aucun écart significatif détecté.' };
        }
        if (doc.reconciliationStatus === 'critical') {
          return { class: 'bloquant', icon: '⛔', label: 'ANOMALIE BLOQUANTE', desc: 'Écart critique détecté. Document bloqué en attente de résolution. Escalade requise.' };
        }
        const hasHighVariance = (doc.variances || []).some((v: any) => v.severity === 'high');
        if (hasHighVariance) {
          return { class: 'ecart-majeur', icon: '🔴', label: 'ÉCART MAJEUR', desc: 'Écarts significatifs détectés. Validation par le Directeur Achats requise.' };
        }
        const hasMinorVariance = (doc.variances || []).some((v: any) => v.severity === 'medium' || v.severity === 'low');
        if (hasMinorVariance) {
          return { class: 'ecart-mineur', icon: '🟡', label: 'ÉCART MINEUR', desc: 'Écarts mineurs détectés. Validation avec justification possible.' };
        }
        return { class: 'conforme', icon: '⏳', label: 'EN COURS', desc: 'Document en cours de traitement dans le pipeline.' };
      };

      const verdict = computeVerdict();

      return (
        <div>
          {/* Bouton retour */}
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentDocId(null)}
            >
              ← Retour
            </button>
          </div>

          {/* Pipeline du document */}
          <div className="ocr-pipeline-container">
            <div className="ocr-pipeline-title">Progression — {doc.fileName}</div>
            <div className="ocr-pipeline">
              {[
                { id: 1, label: 'Réception', icon: '📥' },
                { id: 2, label: 'Scan/Upload', icon: '📷' },
                { id: 3, label: 'OCR Extraction', icon: '🔍' },
                { id: 4, label: 'Rapproch. X3', icon: '🔗' },
                { id: 5, label: 'Vérif. contrat', icon: '📑' },
                { id: 6, label: 'Conformité', icon: '✅' },
                { id: 7, label: 'Archivé', icon: '📁' }
              ].map((stage, i) => {
                const currentStage = doc.pipelineStage || 1;
                const stageClass = stage.id < currentStage ? 'done' : 
                                 stage.id === currentStage ? 
                                 (doc.reconciliationStatus === 'critical' ? 'error' : 'active') : 'pending';
                
                return (
                  <Fragment key={stage.id}>
                    {i > 0 && (
                      <div className={`ocr-stage-arrow${stage.id <= currentStage ? ' done' : ''}`} />
                    )}
                    <div className={`ocr-stage ${stageClass}`}>
                      <div className="ocr-stage-icon">
                        {stageClass === 'done' ? '✓' : stage.icon}
                      </div>
                      <div className="ocr-stage-label">{stage.label}</div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Vue split analyse */}
          <SplitAnalysis doc={doc} />

          {/* Résultats du rapprochement */}
          <ReconciliationResults 
            variances={doc.variances} 
            reconciliationStatus={doc.reconciliationStatus} 
          />

          {/* Verdict */}
          <VerdictBox verdict={verdict} />

          {/* Informations du document */}
          <div className="card" style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="card-header"><div className="card-title">Informations du document</div></div>
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Nom du fichier</div><div className="info-value">{doc.fileName}</div></div>
              <div className="info-item"><div className="info-label">Taille</div><div className="info-value">{doc.fileSize || '—'}</div></div>
              <div className="info-item"><div className="info-label">Date d&apos;upload</div><div className="info-value">{formatDate(doc.uploadDate)}</div></div>
              <div className="info-item"><div className="info-label">Uploadé par</div><div className="info-value">{doc.uploadedBy?.fullName || '—'}</div></div>
              <div className="info-item"><div className="info-label">Assigné à</div><div className="info-value">{doc.assignedTo?.fullName || 'Non assigné'}</div></div>
              <div className="info-item"><div className="info-label">Fournisseur</div><div className="info-value">{supplier.name}</div></div>
              <div className="info-item"><div className="info-label">Statut OCR</div><div className="info-value">{doc.ocrStatus === 'extracted' ? '✅ Extrait' : doc.ocrStatus === 'processing' ? '⏳ En cours' : '⏸️ En attente'}</div></div>
              <div className="info-item"><div className="info-label">Étape pipeline</div><div className="info-value">{[null, 'Réception', 'Scan/Upload', 'OCR Extraction', 'Rapproch. X3', 'Vérif. contrat', 'Conformité', 'Archivé'][doc.pipelineStage] || '—'}</div></div>
            </div>
          </div>

          {/* Message de feedback */}
          {actionMessage && (
            <div style={{
              marginTop: 'var(--sp-4)',
              padding: '12px 16px',
              borderRadius: '8px',
              background: actionMessage.type === 'success' ? 'var(--accent-green-soft, #dcfce7)' : 'var(--accent-red-soft, #fef2f2)',
              color: actionMessage.type === 'success' ? 'var(--accent-green, #16a34a)' : 'var(--accent-red, #dc2626)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 500,
            }}>
              {actionMessage.text}
            </div>
          )}

          {/* Actions selon verdict */}
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-5)', flexWrap: 'wrap' }}>
            {verdict.class === 'conforme' ? (
              <button 
                className="btn btn-primary" 
                disabled={actionLoading}
                onClick={() => executeAction(doc.id, 'validate')}
              >
                {actionLoading ? '...' : '✅ Valider et archiver'}
              </button>
            ) : verdict.class === 'ecart-mineur' ? (
              <>
                <button 
                  className="btn btn-primary" 
                  disabled={actionLoading}
                  onClick={() => setShowJustificationInput(true)}
                >
                  {actionLoading ? '...' : '✅ Valider avec justification'}
                </button>
                <button 
                  className="btn btn-secondary"
                  disabled={actionLoading}
                  onClick={() => executeAction(doc.id, 'escalate')}
                >
                  ↗️ Escalader
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn btn-danger"
                  disabled={actionLoading}
                  onClick={() => executeAction(doc.id, 'block', { reason: 'Bloqué manuellement' })}
                >
                  {actionLoading ? '...' : '⛔ Bloquer'}
                </button>
                <button 
                  className="btn btn-secondary"
                  disabled={actionLoading}
                  onClick={() => executeAction(doc.id, 'escalate')}
                >
                  ↗️ Escalader au Dir. Achats
                </button>
              </>
            )}
            <button 
              className="btn btn-secondary"
              disabled={actionLoading}
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              💬 Commenter
            </button>
          </div>

          {/* Input justification */}
          {showJustificationInput && (
            <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                type="text"
                placeholder="Justification de l'écart..."
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-primary)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: 'var(--fs-sm)',
                }}
              />
              <button
                className="btn btn-primary"
                disabled={actionLoading || !justificationText.trim()}
                onClick={() => {
                  executeAction(doc.id, 'validate_with_justification', { justification: justificationText });
                  setShowJustificationInput(false);
                  setJustificationText('');
                }}
              >
                Valider
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowJustificationInput(false); setJustificationText(''); }}>
                Annuler
              </button>
            </div>
          )}

          {/* Input commentaire */}
          {showCommentInput && (
            <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                type="text"
                placeholder="Écrire un commentaire..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    executeAction(doc.id, 'comment', { text: commentText });
                    setCommentText('');
                    setShowCommentInput(false);
                  }
                }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-primary)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: 'var(--fs-sm)',
                }}
              />
              <button
                className="btn btn-primary"
                disabled={actionLoading || !commentText.trim()}
                onClick={() => {
                  executeAction(doc.id, 'comment', { text: commentText });
                  setCommentText('');
                  setShowCommentInput(false);
                }}
              >
                Envoyer
              </button>
            </div>
          )}
        </div>
      );
    }
  }

  // Vue principale
  return (
    <div>
      {/* Zone d'upload */}
      <UploadZone onUploadComplete={handleUploadComplete} />

      {/* Pipeline global avec compteurs */}
      <OcrPipeline currentStage={3} stageCounts={stageCounts} />

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-5)' }}>
        <KpiCard icon="📄" label="Total documents" value={stats.total} color="blue" />
        <KpiCard icon="⏳" label="En attente" value={stats.pending} color="orange" />
        <KpiCard icon="⚠️" label="Écarts détectés" value={stats.variance || 0} color="orange" />
        <KpiCard icon="🔴" label="Critiques" value={stats.critical} color="red" />
        <KpiCard icon="✅" label="Validés" value={stats.conforme} color="green" />
      </div>

      {/* Documents récents */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)' }}>Documents récents</div>
        <button className="btn btn-sm btn-secondary" onClick={() => router.push('/documents')}>
          Voir bibliothèque complète
        </button>
      </div>

      <div className="ocr-docs-grid">
        {docs.filter((d: any) => (d.pipelineStage || 1) < 7).slice(0, 8).map((doc: any) => (
          <DocumentCard 
            key={doc.id} 
            doc={doc} 
            onClick={(id) => setCurrentDocId(id)} 
          />
        ))}
      </div>

      {docs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--sp-12)', fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>
          Aucun document trouvé
        </div>
      )}
    </div>
  );
}
