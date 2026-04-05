'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(d => { 
        setData(d); 
        setLoading(false);
        // Calculer les compteurs par étape
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
                  <div key={stage.id}>
                    {i > 0 && (
                      <div className={`ocr-stage-arrow${stage.id <= currentStage ? ' done' : ''}`} />
                    )}
                    <div className={`ocr-stage ${stageClass}`}>
                      <div className="ocr-stage-icon">
                        {stageClass === 'done' ? '✓' : stage.icon}
                      </div>
                      <div className="ocr-stage-label">{stage.label}</div>
                    </div>
                  </div>
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

          {/* Actions selon verdict */}
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-5)', flexWrap: 'wrap' }}>
            {verdict.class === 'conforme' ? (
              <button className="btn btn-primary">
                ✅ Valider et archiver
              </button>
            ) : verdict.class === 'ecart-mineur' ? (
              <>
                <button className="btn btn-primary">
                  ✅ Valider avec justification
                </button>
                <button className="btn btn-secondary">
                  ↗️ Escalader
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-danger">
                  ⛔ Bloquer
                </button>
                <button className="btn btn-secondary">
                  ↗️ Escalader au Dir. Achats
                </button>
              </>
            )}
            <button className="btn btn-secondary">
              💬 Commenter
            </button>
          </div>
        </div>
      );
    }
  }

  // Vue principale
  return (
    <div>
      {/* Zone d'upload */}
      <UploadZone onUpload={() => alert('Upload simulé — En production: OCR automatique via API')} />

      {/* Pipeline global avec compteurs */}
      <OcrPipeline currentStage={3} stageCounts={stageCounts} />

      {/* KPIs */}
      <div className="kpi-grid grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <KpiCard icon="📄" label="Total documents" value={stats.total} color="blue" />
        <KpiCard icon="⏳" label="En attente" value={stats.pending} color="orange" />
        <KpiCard icon="⚠️" label="Écarts détectés" value={stats.variance || 0} color="orange" />
        <KpiCard icon="🔴" label="Critiques" value={stats.critical} color="red" />
        <KpiCard icon="✅" label="Validés" value={stats.conforme} color="green" />
      </div>

      {/* Documents récents */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold text-[var(--text-primary)]">Documents récents</div>
        <button className="btn btn-sm btn-secondary px-3 py-1.5 text-xs border border-[var(--border-primary)] rounded-lg text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue" onClick={() => router.push('/documents')}>
          Voir bibliothèque complète
        </button>
      </div>

      <div className="ocr-docs-grid">
        {docs.slice(0, 8).map((doc: any) => (
          <DocumentCard 
            key={doc.id} 
            doc={doc} 
            onClick={(id) => setCurrentDocId(id)} 
          />
        ))}
      </div>

      {docs.length === 0 && (
        <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">
          Aucun document trouvé
        </div>
      )}
    </div>
  );
}
