'use client';

import React, { useState, useRef, Fragment } from 'react';
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
          const stageClass = count > 0 ? 'active' : 'pending';
          
          return (
            <Fragment key={stage.id}>
              {i > 0 && (
                <div className="ocr-stage-arrow" />
              )}
              <div className={`ocr-stage ${stageClass}`}>
                <div className="ocr-stage-icon">
                  {stage.icon}
                </div>
                <div className="ocr-stage-label">
                  {stage.label}
                  <br />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--fw-bold)', color: 'var(--accent-blue)' }}>
                    {count}
                  </span>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upload Zone améliorée avec upload réel
interface UploadZoneProps {
  onUpload?: () => void;
  onUploadComplete?: (result: any) => void;
  fileType?: string;
}

export function UploadZone({ onUpload, onUploadComplete, fileType = 'invoice' }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    console.log('[UploadZone] Processing file:', file.name, file.type, file.size);

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|gif|webp)$/i)) {
      setError('Format non supporté. Utilisez PDF, JPG, PNG, GIF ou WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux. Maximum 10 MB.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      console.log('[UploadZone] Sending to /api/documents/upload...');

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      console.log('[UploadZone] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || errorData.details || 'Erreur lors de l\'upload');
      }

      setUploadProgress(100);
      const result = await response.json();
      console.log('[UploadZone] Upload success:', result.ocrResult ? 'OCR OK' : 'OCR null', 'error:', result.ocrError);

      if (onUpload) onUpload();
      if (onUploadComplete) onUploadComplete(result);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1500);

    } catch (err: any) {
      console.error('[UploadZone] Upload error:', err);
      setError(err.message || 'Erreur lors de l\'upload');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
      }}
      onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
      style={isUploading ? { cursor: 'wait' } : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
        style={{ display: 'none' }}
      />

      {isUploading ? (
        <>
          <div className="upload-zone-icon" style={{ fontSize: '32px' }}>
            {uploadProgress < 100 ? 'Analyse en cours...' : 'Terminé!'}
          </div>
          <div className="upload-zone-text">
            <div style={{
              width: '200px',
              height: '8px',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              overflow: 'hidden',
              margin: '0 auto',
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'var(--accent-blue)',
                transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: 'var(--fs-sm)' }}>
              {uploadProgress < 50 ? 'Upload du fichier...' :
               uploadProgress < 90 ? 'Analyse OCR avec Claude...' :
               'Sauvegarde...'}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="upload-zone-icon">📤</div>
          <div className="upload-zone-text">Glisser-déposer un document ou cliquer pour sélectionner</div>
          <div className="upload-zone-hint">Formats acceptés: PDF, JPG, PNG - Max 10 MB</div>
          {error && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: 'var(--accent-red-soft)',
              color: 'var(--accent-red)',
              borderRadius: '6px',
              fontSize: 'var(--fs-sm)',
            }}>
              {error}
            </div>
          )}
        </>
      )}
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

  // Résoudre ocrData : directement sur doc, ou dans comments.ocrData
  const ocr: Record<string, any> | null = 
    doc.ocrData || 
    (doc as any).comments?.ocrData || 
    null;

  const fields: Record<string, string> | null = 
    doc.extractedFields || 
    ocr?.extractedFields || 
    null;

  const isExtracted = doc.ocrStatus === 'extracted' || (ocr && Object.keys(ocr).length > 0);

  const ocrBadge = isExtracted ? 
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
        
        {ocr ? (
          <>
            <OcrField label="Type de document" value={ocr.documentType || typeLabel} confidence="high" />
            {(ocr.supplier || ocr.supplierMatched) && (
              <OcrField 
                label="Fournisseur" 
                value={ocr.supplierMatched || ocr.supplier} 
                confidence={(fields?.supplier_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {ocr.date && (
              <OcrField 
                label="Date" 
                value={formatDate(ocr.date)} 
                confidence={(fields?.date_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {(ocr.number || ocr.invoiceNumber) && (
              <OcrField 
                label="Numéro" 
                value={<span className="table-mono">{ocr.number || ocr.invoiceNumber}</span>} 
                confidence="high" 
              />
            )}
            {ocr.poNumber && (
              <OcrField 
                label="N° commande" 
                value={<span className="table-mono">{ocr.poNumber}</span>} 
                confidence="high" 
              />
            )}
            {(ocr.amount_ht != null || ocr.amountHt != null) && (
              <OcrField 
                label="Montant HT" 
                value={formatCurrency(ocr.amount_ht ?? ocr.amountHt)} 
                confidence={(fields?.amount_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {(ocr.amount_tva != null || ocr.amountTva != null) && (
              <OcrField 
                label="TVA" 
                value={formatCurrency(ocr.amount_tva ?? ocr.amountTva)} 
                confidence="high" 
              />
            )}
            {(ocr.amount_ttc != null || ocr.amountTtc != null) && (
              <OcrField 
                label="Montant TTC" 
                value={<strong>{formatCurrency(ocr.amount_ttc ?? ocr.amountTtc)}</strong>} 
                confidence={(fields?.amount_confidence as 'high' | 'medium' | 'low') || 'high'} 
              />
            )}
            {ocr.currency && (
              <OcrField label="Devise" value={ocr.currency} confidence="high" />
            )}
            {ocr.paymentTerms && (
              <OcrField label="Conditions de paiement" value={ocr.paymentTerms} confidence="medium" />
            )}
            {ocr.rawAnalysis && (
              <div style={{ marginTop: 'var(--sp-3)', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)', fontSize: 'var(--fs-xs)' }}>Analyse Claude :</strong>
                {ocr.rawAnalysis}
              </div>
            )}
            {ocr.confidence != null && (
              <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                Confiance globale : <strong>{Math.round(ocr.confidence * 100)}%</strong>
              </div>
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
