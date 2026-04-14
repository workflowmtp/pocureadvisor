'use client';

import React, { useState, useRef, Fragment, useEffect } from 'react';
import { formatDate, formatCurrency } from '@/lib/format';
import Tesseract from 'tesseract.js';

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

// ───// Upload Zone améliorée avec prévisualisation
interface UploadZoneProps {
  onUpload?: () => void;
  onUploadComplete?: (result: any) => void;
  fileType?: string;
  folderId?: string | null;
}

interface PreviewData {
  file: { name: string; size: string; type: string; mimeType: string };
  tesseract: { text: string; fullLength: number; confidence: number } | null;
}

interface InconsistencyResult {
  issues: boolean;
  values: string[] | null;
}

export function UploadZone({ onUpload, onUploadComplete, fileType = 'invoice', folderId }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [inconsistencies, setInconsistencies] = useState<InconsistencyResult | null>(null);
  const [checkingInconsistencies, setCheckingInconsistencies] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<{ file: File; tesseractText: string } | null>(null);

  // Auto-check inconsistencies when preview modal opens with a folder
  useEffect(() => {
    if (previewData && folderId && !checkingInconsistencies && !inconsistencies) {
      checkInconsistencies();
    }
  }, [previewData, folderId]);

  // Preprocess image for better OCR results
  const preprocessImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Scale up for better OCR (max 2000px width)
        const scale = Math.min(2000 / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw original image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Step 1: Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Increase contrast (normalize)
          gray = ((gray - 128) * 1.5) + 128;
          gray = Math.max(0, Math.min(255, gray));
          
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        // Step 2: Adaptive binarization (threshold)
        const threshold = 140;
        for (let i = 0; i < data.length; i += 4) {
          const val = data[i] > threshold ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }

        // Put processed image back
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('[Preprocess] Image preprocessed:', file.size, '->', blob.size);
            resolve(blob);
          } else {
            resolve(file);
          }
        }, 'image/png', 1.0);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

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
    setPreviewData(null);

    // Step 1: Run Tesseract OCR on client-side for images
    let tesseractText = '';
    const isImage = file.type.startsWith('image/');
    
    if (isImage) {
      try {
        setUploadStatus('Préprocessing de l\'image...');
        console.log('[UploadZone] Preprocessing image...');
        
        // Preprocess image
        const processedBlob = await preprocessImage(file);
        const processedFile = new File([processedBlob], file.name, { type: 'image/png' });
        
        setUploadStatus('OCR Tesseract en cours...');
        setUploadProgress(10);
        console.log('[UploadZone] Starting Tesseract OCR...');
        
        const result = await Tesseract.recognize(processedFile, 'fra+eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const progress = 10 + Math.round(m.progress * 40); // 10-50%
              setUploadProgress(progress);
              console.log('[UploadZone] Tesseract progress:', progress + '%');
            }
          },
        });
        
        tesseractText = result.data.text;
        console.log('[UploadZone] Tesseract done. Text length:', tesseractText.length, 'Confidence:', result.data.confidence);
        setUploadStatus('Envoi au serveur...');
      } catch (tessErr: any) {
        console.error('[UploadZone] Tesseract error:', tessErr.message);
        setUploadStatus('Envoi au serveur...');
      }
    }

    // Step 2: Send to server for preview (preview=true)
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      formData.append('preview', 'true');
      if (folderId) {
        formData.append('folderId', folderId);
      }
      if (tesseractText) {
        formData.append('tesseractText', tesseractText);
      }

      console.log('[UploadZone] Sending preview request...');
      setUploadProgress(60);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 2, 95));
      }, 500);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || errorData.details || 'Erreur lors de l\'analyse');
      }

      setUploadProgress(100);
      const result = await response.json();
      console.log('[UploadZone] Preview result:', result);

      if (result.preview) {
        // Store file and tesseract text for later confirmation
        pendingFileRef.current = { file, tesseractText };
        setPreviewData(result);
        // Initialize editedData with empty values for manual entry
        setEditedData({
          supplier: null,
          invoiceNumber: null,
          poNumber: null,
          date: null,
          amountHt: null,
          amountTva: null,
          amountTtc: null,
          confidence: result.tesseract?.confidence || 0,
        });
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      } else {
        // No preview mode, directly saved (fallback)
        if (onUpload) onUpload();
        if (onUploadComplete) onUploadComplete(result);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }

    } catch (err: any) {
      console.error('[UploadZone] Upload error:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  // Check for inconsistencies via n8n webhook
  const checkInconsistencies = async () => {
    if (!folderId) {
      console.log('[UploadZone] No folderId, skipping inconsistency check');
      return;
    }

    setCheckingInconsistencies(true);
    setInconsistencies(null);

    try {
      const response = await fetch('https://n8n.mtb-app.com/webhook/36af7eb1-74ac-4cc1-a446-f2626765bce9', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from('multiprint:Admin@1234').toString('base64'),
        },
        body: JSON.stringify({
          query: 'quelles sont les incoherences dans ce dossier',
          context: folderId,
          text: previewData?.tesseract?.text || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la vérification');
      }

      const result = await response.json();
      console.log('[UploadZone] Inconsistency check result:', result);

      // Handle n8n response structure: [{ output: { issues: "true", values: [...] } }]
      const output = Array.isArray(result) ? result[0]?.output : result.output || result;
      const hasIssues = output?.issues === 'true' || output?.issues === true;

      setInconsistencies({
        issues: hasIssues,
        values: output?.values || null,
      });
    } catch (err: any) {
      console.error('[UploadZone] Inconsistency check error:', err);
      // On error, allow to continue without blocking
      setInconsistencies({ issues: false, values: null });
    } finally {
      setCheckingInconsistencies(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingFileRef.current || !editedData) return;

    setIsUploading(true);
    setUploadStatus('Sauvegarde en cours...');
    setUploadProgress(50);

    try {
      const formData = new FormData();
      formData.append('file', pendingFileRef.current.file);
      formData.append('fileType', fileType);
      formData.append('preview', 'false');
      if (folderId) {
        formData.append('folderId', folderId);
      }
      if (pendingFileRef.current.tesseractText) {
        formData.append('tesseractText', pendingFileRef.current.tesseractText);
      }
      // Send edited data for override
      formData.append('editedData', JSON.stringify(editedData));

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la sauvegarde' }));
        throw new Error(errorData.error || errorData.details || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      console.log('[UploadZone] Saved:', result);

      setPreviewData(null);
      setEditedData(null);
      setInconsistencies(null);
      pendingFileRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');

      if (onUpload) onUpload();
      if (onUploadComplete) onUploadComplete(result);

    } catch (err: any) {
      console.error('[UploadZone] Confirm error:', err);
      setError(err.message);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleCancel = () => {
    setPreviewData(null);
    setEditedData(null);
    pendingFileRef.current = null;
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('');
  };

  // Preview Modal rendered outside upload zone
  if (previewData && editedData) {
    return (
      <div className="preview-modal" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>OUTPUT</span>
          Texte OCR extrait - Saisissez les données
        </h3>

        {/* File info */}
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <strong>{previewData.file.name}</strong> ({previewData.file.size})
          </div>
        </div>

        {/* Tesseract text preview - FULL TEXT */}
        {previewData.tesseract && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
              Texte extrait par Tesseract ({previewData.tesseract.fullLength} caractères)
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              fontSize: '13px',
              maxHeight: '200px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              border: '1px solid var(--border-primary)',
            }}>
              {previewData.tesseract.text}
            </div>
          </div>
        )}

        {/* Manual data entry fields */}
        <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Saisissez les données du document (optionnel)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Fournisseur</label>
              <input
                type="text"
                placeholder="Nom du fournisseur"
                value={editedData.supplier || ''}
                onChange={(e) => setEditedData({ ...editedData, supplier: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>N° Facture</label>
              <input
                type="text"
                placeholder="Numéro de facture"
                value={editedData.invoiceNumber || ''}
                onChange={(e) => setEditedData({ ...editedData, invoiceNumber: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>N° Bon de commande</label>
              <input
                type="text"
                placeholder="Numéro PO"
                value={editedData.poNumber || ''}
                onChange={(e) => setEditedData({ ...editedData, poNumber: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date</label>
              <input
                type="text"
                placeholder="Date du document"
                value={editedData.date || ''}
                onChange={(e) => setEditedData({ ...editedData, date: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Montant HT</label>
              <input
                type="number"
                placeholder="0.00"
                value={editedData.amountHt || ''}
                onChange={(e) => setEditedData({ ...editedData, amountHt: parseFloat(e.target.value) || null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Montant TTC</label>
              <input
                type="number"
                placeholder="0.00"
                value={editedData.amountTtc || ''}
                onChange={(e) => setEditedData({ ...editedData, amountTtc: parseFloat(e.target.value) || null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Inconsistency check section */}
        <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Vérification des incohérences
          </div>

          {!folderId ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Sélectionnez un dossier pour activer la vérification
            </div>
          ) : checkingInconsistencies ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ animation: 'spin 1s linear infinite' }}>â</span>
              Vérification en cours...
            </div>
          ) : null}

          {/* Inconsistency results */}
          {inconsistencies && (
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              background: inconsistencies.issues ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              border: `1px solid ${inconsistencies.issues ? '#EF4444' : '#22C55E'}`,
            }}>
              {inconsistencies.issues ? (
                <div>
                  <div style={{ color: '#EF4444', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>â </span> Incohérences détectées
                  </div>
                  {inconsistencies.values && inconsistencies.values.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '13px' }}>
                      {inconsistencies.values.map((issue, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{issue}</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Vous pouvez corriger les données ou confirmer la sauvegarde.
                  </div>
                </div>
              ) : (
                <div style={{ color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>â</span> Aucune incohérence détectée
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isUploading}
            style={{
              padding: '10px 24px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: isUploading ? 'wait' : 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isUploading}
            style={{
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              background: inconsistencies?.issues ? '#EF4444' : 'var(--accent-blue)',
              color: 'white',
              fontWeight: 600,
              cursor: isUploading ? 'wait' : 'pointer',
            }}
          >
            {isUploading ? 'Sauvegarde...' : inconsistencies?.issues ? 'Confirmer avec incohérences' : 'Sauvegarder le document'}
          </button>
        </div>
      </div>
    );
  }

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
              {uploadStatus || (uploadProgress < 50 ? 'Upload du fichier...' :
               uploadProgress < 90 ? 'Analyse OCR avec Claude...' :
               'Sauvegarde...')}
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
