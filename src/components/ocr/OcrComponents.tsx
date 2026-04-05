'use client';

import { formatDate, formatCurrency } from '@/lib/format';

// ─── Pipeline OCR avec 7 étapes comme l'original ───
const PIPELINE_STAGES = [
  { id: 1, label: 'Réception', icon: '📥' },
  { id: 2, label: 'Scan/Upload', icon: '📷' },
  { id: 3, label: 'OCR Extraction', icon: '🔍' },
  { id: 4, label: 'Rapproch. X3', icon: '🔗' },
  { id: 5, label: 'Vérif. contrat', icon: '📑' },
  { id: 6, label: 'Conformité', icon: '✅' },
  { id: 7, label: 'Archivé', icon: '📁' }
];

interface PipelineStage {
  id: number;
  label: string;
  icon: string;
}

interface OcrPipelineProps {
  currentStage: number;
  stageCounts?: Record<number, number>;
}

export function OcrPipeline({ currentStage, stageCounts = {} }: OcrPipelineProps) {
  return (
    <div className="ocr-pipeline-container">
      <div className="ocr-pipeline-title">Pipeline de traitement documentaire</div>
      <div className="ocr-pipeline">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = stageCounts[stage.id] || 0;
          const stageClass = stage.id < currentStage ? 'done' : 
                           stage.id === currentStage ? 'active' : 'pending';
          
          return (
            <div key={stage.id}>
              {i > 0 && (
                <div className={`ocr-stage-arrow ${stage.id <= currentStage ? 'done' : ''}`} />
              )}
              <div className={`ocr-stage ${stageClass} ${count > 0 ? 'active' : ''}`}>
                <div className="ocr-stage-icon">
                  {stageClass === 'done' ? '✓' : stage.icon}
                </div>
                <div className="ocr-stage-label">
                  {stage.label}
                  <br />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--fw-bold)', color: 'var(--accent-blue)' }}>
                    {count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upload Zone améliorée ───
export function UploadZone({ onUpload }: { onUpload?: () => void }) {
  return (
    <div className="upload-zone" onClick={onUpload}>
      <div className="upload-zone-icon">📤</div>
      <div className="upload-zone-text">Glisser-déposer un document ou cliquer pour sélectionner</div>
      <div className="upload-zone-hint">Formats acceptés: PDF, JPG, PNG — Max 10 MB</div>
    </div>
  );
}

// ─── Triangle de Contrôle ───
export function TriangleControle() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">🔺 Triangle de Contrôle</h3>
      <div className="flex items-center justify-center gap-12 py-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-[var(--accent-blue-soft)] flex items-center justify-center text-xl">📄</div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">Document réel</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">Scan / OCR</div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-[var(--accent-red-soft)] flex items-center justify-center text-2xl">🔺</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-[var(--accent-purple-soft)] flex items-center justify-center text-xl">💻</div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">Saisie Sage X3</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">ERP</div>
        </div>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-[var(--accent-cyan-soft)] flex items-center justify-center text-xl">📋</div>
        <div className="text-xs font-semibold text-[var(--text-primary)]">Contrat / Règles</div>
        <div className="text-[10px] text-[var(--text-tertiary)]">Référentiel</div>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">Tout écart entre ces trois sommets génère une alerte potentielle</p>
    </div>
  );
}

// ─── Carte Document ───
interface DocumentCardProps {
  doc: {
    id: string;
    fileName: string;
    fileType: string;
    uploadDate: string;
    reconciliationStatus: string;
    supplier?: { name: string };
  };
  onClick: (id: string) => void;
}

const DOC_TYPE_ICONS: Record<string, string> = {
  invoice: '🧾',
  bl: '📦',
  quote: '📋',
  certificate: '🏅',
  contract: '📑',
  po: '🛒',
  quality_doc: '🔬',
  other: '📄'
};

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Facture',
  bl: 'Bon de livraison',
  quote: 'Devis',
  certificate: 'Certificat',
  contract: 'Contrat',
  po: 'Bon de commande',
  quality_doc: 'Doc. qualité',
  other: 'Autre'
};

export function DocumentCard({ doc, onClick }: DocumentCardProps) {
  const icon = DOC_TYPE_ICONS[doc.fileType] || '📄';
  const typeLabel = DOC_TYPE_LABELS[doc.fileType] || doc.fileType;
  const supplierName = doc.supplier?.name ? doc.supplier.name.substring(0, 18) : '—';
  
  const statusColors: Record<string, string> = {
    pending: '#6B7280',
    conforme: '#10B981',
    ecart_mineur: '#F59E0B',
    ecart_majeur: '#F97316',
    critical: '#EF4444',
    validated: '#10B981'
  };

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    conforme: 'Conforme',
    ecart_mineur: 'Écart mineur',
    ecart_majeur: 'Écart majeur',
    critical: 'Bloquant',
    validated: 'Validé'
  };

  const statusColor = statusColors[doc.reconciliationStatus] || '#6B7280';
  const statusLabel = statusLabels[doc.reconciliationStatus] || 'Inconnu';

  return (
    <div className="ocr-doc-card" onClick={() => onClick(doc.id)}>
      <div className="ocr-doc-preview">{icon}</div>
      <div className="ocr-doc-info">
        <div className="ocr-doc-name">{doc.fileName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {typeLabel} — {supplierName}
        </div>
        <div className="ocr-doc-meta">
          <span>{formatDate(doc.uploadDate)}</span>
          <span className="badge" style={{ background: statusColor + '20', color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Vue Analyse Split ───
interface OcrFieldProps {
  label: string;
  value: string | React.ReactNode;
  confidence: 'high' | 'medium' | 'low';
}

export function OcrField({ label, value, confidence }: OcrFieldProps) {
  const confClass = confidence === 'high' ? 'confidence-high' : 
                   confidence === 'medium' ? 'confidence-medium' : 'confidence-low';
  const confLabel = confidence === 'high' ? 'Haute' : 
                   confidence === 'medium' ? 'Moyenne' : 'Basse';

  return (
    <div className="ocr-field">
      <div className="ocr-field-label">{label}</div>
      <div className="ocr-field-value">{value}</div>
      <span className={`ocr-field-confidence ${confClass}`}>{confLabel}</span>
    </div>
  );
}

interface SplitAnalysisProps {
  doc: {
    fileName: string;
    fileType: string;
    ocrStatus: string;
    ocrData?: Record<string, any>;
    extractedFields?: Record<string, string>;
  };
}

export function SplitAnalysis({ doc }: SplitAnalysisProps) {
  const icon = DOC_TYPE_ICONS[doc.fileType] || '📄';
  const typeLabel = DOC_TYPE_LABELS[doc.fileType] || doc.fileType;

  const ocrBadge = doc.ocrStatus === 'extracted' ? 
    '<span class="badge badge-success">OCR terminé</span>' :
    doc.ocrStatus === 'processing' ? 
    '<span class="badge badge-info">En cours...</span>' :
    '<span class="badge badge-neutral">En attente</span>';

  return (
    <div className="ocr-split-view">
      <div className="ocr-doc-image">{icon}</div>
      <div className="ocr-extracted-data">
        <div style={{ fontWeight: 'var(--fw-semibold)', marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Données extraites</span>
          <span dangerouslySetInnerHTML={{ __html: ocrBadge }} />
        </div>
        
        {doc.ocrData && Object.keys(doc.ocrData).length > 0 ? (
          <>
            <OcrField label="Type de document" value={typeLabel} confidence="high" />
            {doc.ocrData.supplier && (
              <OcrField 
                label="Fournisseur" 
                value={doc.ocrData.supplier} 
                confidence={(doc.extractedFields?.supplier_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {doc.ocrData.date && (
              <OcrField 
                label="Date" 
                value={formatDate(doc.ocrData.date)} 
                confidence={(doc.extractedFields?.date_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {doc.ocrData.number && (
              <OcrField 
                label="Numéro" 
                value={<span className="table-mono">{doc.ocrData.number}</span>} 
                confidence="high" 
              />
            )}
            {doc.ocrData.amount_ht && (
              <OcrField 
                label="Montant HT" 
                value={formatCurrency(doc.ocrData.amount_ht)} 
                confidence={(doc.extractedFields?.amount_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {doc.ocrData.amount_ttc && (
              <OcrField 
                label="Montant TTC" 
                value={<strong>{formatCurrency(doc.ocrData.amount_ttc)}</strong>} 
                confidence={(doc.extractedFields?.amount_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--sp-2)' }}>⏳</div>
            <div>Extraction en attente ou en cours...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Verdict Box ───
interface VerdictBoxProps {
  verdict: {
    class: string;
    icon: string;
    label: string;
    desc: string;
  };
}

export function VerdictBox({ verdict }: VerdictBoxProps) {
  return (
    <div className={`verdict-box ${verdict.class}`}>
      <div className="verdict-label">{verdict.icon} {verdict.label}</div>
      <div className="verdict-desc">{verdict.desc}</div>
    </div>
  );
}

// ─── Rapprochement Results ───
interface Variance {
  field: string;
  expected: string;
  actual: string;
  diff_pct?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ReconciliationResultsProps {
  variances?: Variance[];
  reconciliationStatus: string;
}

export function ReconciliationResults({ variances, reconciliationStatus }: ReconciliationResultsProps) {
  if (variances && variances.length > 0) {
    return (
      <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-md)', marginBottom: 'var(--sp-3)' }}>
        Résultats du rapprochement
        {variances.map((variance, i) => {
          const reconClass = variance.severity === 'critical' ? 'blocking' : 
                           variance.severity === 'high' ? 'major' : 'minor';
          const reconIcon = reconClass === 'blocking' ? '⛔' : 
                           reconClass === 'major' ? '🔴' : '🟡';

          return (
            <div key={i} className={`reconciliation-result ${reconClass}`}>
              <div className="recon-icon">{reconIcon}</div>
              <div className="recon-content">
                <div className="recon-title">{variance.field}</div>
                <div className="recon-detail">
                  Attendu: <strong>{variance.expected}</strong> — Constaté: <strong>{variance.actual}</strong>
                  {variance.diff_pct && (
                    <span> — Écart: <span style={{ color: 'var(--accent-red)', fontWeight: 'var(--fw-bold)' }}>
                      {variance.diff_pct > 0 ? '+' : ''}{variance.diff_pct}%
                    </span></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (reconciliationStatus === 'matched' || reconciliationStatus === 'validated') {
    return (
      <div className="reconciliation-result match">
        <div className="recon-icon">✅</div>
        <div className="recon-content">
          <div className="recon-title">Conforme</div>
          <div className="recon-detail">Document rapproché sans écart significatif</div>
        </div>
      </div>
    );
  }

  return null;
}
