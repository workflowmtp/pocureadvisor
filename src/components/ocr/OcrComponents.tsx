'use client';

import React, { useState, Fragment } from 'react';
import { formatDate, formatCurrency } from '@/lib/format';

// ─── Pipeline OCR avec 5 étapes (Import Drive remplace Réception+Scan+OCR) ───
const PIPELINE_STAGES = [
  { id: 1, label: 'Import Drive', icon: '☁️' },
  { id: 2, label: 'Rapproch. X3', icon: '🔗' },
  { id: 3, label: 'Vérif. contrat', icon: '📑' },
  { id: 4, label: 'Conformité', icon: '✅' },
  { id: 5, label: 'Archivé', icon: '📁' },
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
  const remapped: Record<number, number> = {};
  for (const [k, v] of Object.entries(stageCounts)) {
    const old = parseInt(k);
    const neo = old <= 3 ? 1 : old - 2;
    remapped[neo] = (remapped[neo] || 0) + v;
  }

  return (
    <div className="ocr-pipeline-container">
      <div className="ocr-pipeline-title">Pipeline de traitement documentaire</div>
      <div className="ocr-pipeline">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = remapped[stage.id] || 0;
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

// ─── Drive Picker Zone ───
interface DbFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  _count?: { documents: number };
}

interface DrivePickerZoneProps {
  onUpload?: () => void;
  onUploadComplete?: (result: any) => void;
  fileType?: string;
  folderId?: string | null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

const DRIVE_ICONS: Record<string, string> = {
  [DRIVE_FOLDER_MIME]: '📁',
  'application/pdf': '📄',
  'application/vnd.google-apps.document': '📝',
  'application/vnd.google-apps.spreadsheet': '📊',
  'application/vnd.google-apps.presentation': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
};

const DRIVE_DOC_TYPES = [
  { value: 'invoice', label: 'Facture' },
  { value: 'bl', label: 'Bon de livraison' },
  { value: 'quote', label: 'Devis' },
  { value: 'po', label: 'Bon de commande' },
  { value: 'contract', label: 'Contrat' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'quality_doc', label: 'Doc. qualité' },
  { value: 'other', label: 'Autre' },
];

export function DrivePickerZone({
  onUpload,
  onUploadComplete,
  fileType: initialFileType = 'invoice',
  folderId,
}: DrivePickerZoneProps) {
  const [mode, setMode] = useState<'idle' | 'open' | 'success'>('idle');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [navStack, setNavStack] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Mon Drive' },
  ]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedFileType, setSelectedFileType] = useState(initialFileType);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkedFileName, setLinkedFileName] = useState('');
  const [dbFolders, setDbFolders] = useState<DbFolder[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<string>(folderId || '');

  const currentFolder = navStack[navStack.length - 1];

  const fetchFiles = async (driveFolderId?: string | null, query?: string) => {
    setLoadingFiles(true);
    setFilesError(null);
    try {
      const params = new URLSearchParams();
      if (driveFolderId) params.set('driveFolder', driveFolderId);
      if (query) params.set('q', query);
      const res = await fetch(`/api/documents/drive?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || 'Erreur de chargement');
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setFilesError(err.message);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadDbFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      if (res.ok) {
        const data = await res.json();
        setDbFolders(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
  };

  const openBrowser = () => {
    setMode('open');
    setNavStack([{ id: null, name: 'Mon Drive' }]);
    setSelectedFile(null);
    setSearchQuery('');
    setLinkError(null);
    setTargetFolderId(folderId || '');
    fetchFiles(null);
    loadDbFolders();
  };

  const navigateToFolder = (folder: DriveFile) => {
    setNavStack(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFile(null);
    setSearchQuery('');
    fetchFiles(folder.id);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newStack = navStack.slice(0, index + 1);
    setNavStack(newStack);
    setSelectedFile(null);
    setSearchQuery('');
    fetchFiles(newStack[newStack.length - 1].id);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchFiles(undefined, searchQuery.trim());
    } else {
      fetchFiles(currentFolder.id);
    }
  };

  const handleLinkFile = async () => {
    if (!selectedFile) return;
    setLinking(true);
    setLinkError(null);
    try {
      const res = await fetch('/api/documents/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFileId: selectedFile.id,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
          folderId: targetFolderId || null,
          fileType: selectedFileType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || 'Erreur lors de la liaison');
      }
      const result = await res.json();
      setLinkedFileName(selectedFile.name);
      setMode('success');
      if (onUpload) onUpload();
      if (onUploadComplete) onUploadComplete(result);
    } catch (err: any) {
      setLinkError(err.message);
    } finally {
      setLinking(false);
    }
  };

  if (mode === 'success') {
    return (
      <div style={{
        padding: '24px',
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid #22C55E',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
        <div style={{ fontWeight: 600, color: '#22C55E', fontSize: '16px', marginBottom: '6px' }}>
          Fichier lié avec succès
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
          {linkedFileName}
        </div>
        <button
          onClick={() => { setMode('idle'); setLinkedFileName(''); }}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid var(--border-primary)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Lier un autre fichier
        </button>
      </div>
    );
  }

  if (mode === 'idle') {
    return (
      <div style={{
        padding: '28px',
        border: '2px dashed var(--border-primary)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>☁️</div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>
          Lier un fichier depuis Google Drive
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Parcourez les fichiers partagés avec le compte de service
        </div>
        <button
          onClick={openBrowser}
          style={{
            padding: '10px 28px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent-blue)',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '15px',
          }}
        >
          ☁️ Parcourir Google Drive
        </button>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Compte: achats-drive-reader@scan-achat.iam.gserviceaccount.com
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border-primary)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{
        padding: '14px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>☁️</span> Google Drive
        </div>
        <button
          onClick={() => setMode('idle')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '8px 16px',
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
        fontSize: '13px',
      }}>
        {navStack.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <span style={{ color: 'var(--text-tertiary)' }}>›</span>}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              style={{
                background: 'none',
                border: 'none',
                color: index === navStack.length - 1 ? 'var(--text-primary)' : 'var(--accent-blue)',
                cursor: index === navStack.length - 1 ? 'default' : 'pointer',
                padding: '2px 4px',
                fontWeight: index === navStack.length - 1 ? 600 : 400,
              }}
            >
              {item.name}
            </button>
          </Fragment>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Rechercher un fichier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent-blue)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            🔍
          </button>
        </form>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {loadingFiles ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            Chargement depuis Google Drive...
          </div>
        ) : filesError ? (
          <div style={{ padding: '20px', color: 'var(--accent-red, #EF4444)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Erreur de connexion</div>
            <div style={{ fontSize: '13px', marginBottom: '12px' }}>{filesError}</div>
            <button
              onClick={() => fetchFiles(currentFolder.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid var(--accent-red, #EF4444)',
                background: 'transparent',
                color: 'var(--accent-red, #EF4444)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Réessayer
            </button>
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
            <div style={{ marginBottom: '6px' }}>Aucun fichier accessible</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Partagez des fichiers avec:<br />
              achats-drive-reader@scan-achat.iam.gserviceaccount.com
            </div>
          </div>
        ) : (
          files.map((file) => {
            const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
            const icon = DRIVE_ICONS[file.mimeType] || '📎';
            const isSelected = selectedFile?.id === file.id;

            return (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.12)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
                  transition: 'background 0.12s',
                }}
                onClick={() => {
                  if (isFolder) {
                    navigateToFolder(file);
                  } else {
                    setSelectedFile(isSelected ? null : file);
                    setLinkError(null);
                  }
                }}
              >
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {isFolder ? 'Dossier' : file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : ''}
                    {file.modifiedTime && ` · ${new Date(file.modifiedTime).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
                {isFolder ? (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '18px' }}>›</span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(isSelected ? null : file); setLinkError(null); }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                      background: isSelected ? 'var(--accent-blue)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? '✓ Sélectionné' : 'Sélectionner'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedFile && (
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', fontSize: '14px' }}>
            📎 <span style={{ color: 'var(--accent-blue)' }}>{selectedFile.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                📂 Dossier:
              </label>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value=''>— Sans dossier —</option>
                {dbFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Type:
              </label>
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                {DRIVE_DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleLinkFile}
              disabled={linking}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent-blue)',
                color: 'white',
                fontWeight: 600,
                cursor: linking ? 'wait' : 'pointer',
                fontSize: '14px',
                opacity: linking ? 0.7 : 1,
              }}
            >
              {linking ? '⏳ Liaison...' : '🔗 Lier au dossier'}
            </button>
          </div>
          {linkError && (
            <div style={{ marginTop: '8px', color: 'var(--accent-red, #EF4444)', fontSize: '13px' }}>
              ⚠️ {linkError}
            </div>
          )}
        </div>
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
