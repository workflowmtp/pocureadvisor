'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DOMPurify from 'dompurify';
import { UploadZone } from '@/components/ocr/OcrComponents';

interface Document {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  ocrStatus: string;
  ocrRawText?: string;
  createdAt: string;
  supplier?: { name: string };
  uploadedBy?: { fullName: string };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function FolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [reportReady, setReportReady] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (folderId) loadFolder();
  }, [folderId]);

  // Polling du statut d'analyse
  useEffect(() => {
    if (reportStatus === 'processing') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/folders/report/status?folderId=${folderId}`);
          if (res.ok) {
            const data = await res.json();
            setReportStatus(data.reportStatus);
            setReportReady(data.reportReady);
            if (data.reportStatus !== 'processing') {
              clearInterval(pollIntervalRef.current!);
            }
          }
        } catch {}
      }, 5000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [reportStatus, folderId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadFolder = async () => {
    try {
      const res = await fetch(`/api/folders?folderId=${folderId}`);
      if (res.ok) {
        const data = await res.json();
        setFolder(data);
        setReportStatus(data.reportStatus || 'idle');
        setReportReady(data.reportReady || false);
      }
    } catch (e) {
      console.error('Load folder error:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || !folder) return;

    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = { role: 'user', content: text.trim(), timestamp };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          folderId: folderId,
        }),
      });

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || 'Désolé, je n\'ai pas pu analyser les documents.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      console.error('Chat error:', e);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Erreur lors de la communication avec l\'agent.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDocumentClick = (docId: string) => {
    router.push(`/ocr?doc=${docId}`);
  };

  const analyzeReport = async () => {
    if (!folderId || analyzeLoading || reportStatus === 'processing') return;
    setAnalyzeLoading(true);
    try {
      const res = await fetch('/api/folders/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        setReportStatus('processing');
        setReportReady(false);
      }
    } catch (e) {
      console.error('Analyze error:', e);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const downloadReport = async () => {
    // Téléchargement uniquement si le rapport est prêt
    if (!folderId || !reportReady || reportStatus !== 'ready') return;

    setDownloadLoading(true);

    try {
      // Récupérer le rapport sauvegardé en base — pas de génération ici
      const savedResponse = await fetch(`/api/folders/report?folderId=${folderId}`);
      let workbookData: any = null;

      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        if (savedData.report) {
          workbookData = savedData.report;
        }
      }

      if (!workbookData) {
        throw new Error('Rapport introuvable. Lancez d\'abord une analyse.');
      }

      // Normalize: handle { workbook: { sheets: [...] } } or { report: { workbook: { ... } } } wrappers
      let sheetsSource = workbookData;
      if (workbookData.workbook) sheetsSource = workbookData.workbook;
      else if (workbookData.report?.workbook) sheetsSource = workbookData.report.workbook;

      // Create Excel workbook (dynamic import to avoid heavy bundle)
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Procure Advisor';
      workbook.created = new Date();
      if (sheetsSource.title) workbook.title = sheetsSource.title;

      const styleHeader = (worksheet: any) => {
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 22;
      };

      // ── Case 1: structured format with sheets array ──
      if (sheetsSource.sheets && Array.isArray(sheetsSource.sheets)) {
        for (const sheetData of sheetsSource.sheets) {
          const worksheet = workbook.addWorksheet(sheetData.name || 'Feuille');

          if (sheetData.columns && Array.isArray(sheetData.columns)) {
            worksheet.columns = sheetData.columns.map((col: any) => ({
              header: col.header || col,
              width: col.width || 18,
              key: String(col.header || col).toLowerCase().replace(/\s+/g, '_'),
            }));
            styleHeader(worksheet);
          }

          if (sheetData.rows && Array.isArray(sheetData.rows)) {
            for (const rowData of sheetData.rows) {
              const row = worksheet.addRow(rowData);
              row.height = 18;
              if (sheetData.columns) {
                row.eachCell((cell: any, colNumber: number) => {
                  const colSpec = sheetData.columns[colNumber - 1];
                  if (colSpec?.format === 'currency' && typeof cell.value === 'number') {
                    cell.numFmt = '#,##0 "XAF"';
                  } else if (colSpec?.format === 'number' && typeof cell.value === 'number') {
                    cell.numFmt = '#,##0';
                  }
                });
              }
            }
          }
        }
      }
      // ── Case 2: flat object — one sheet with key/value pairs ──
      else {
        const worksheet = workbook.addWorksheet('Rapport');
        worksheet.columns = [
          { header: 'Champ', key: 'key', width: 30 },
          { header: 'Valeur', key: 'value', width: 50 },
        ];
        styleHeader(worksheet);

        const flatten = (obj: any, prefix = ''): { key: string; value: string }[] => {
          return Object.entries(obj).flatMap(([k, v]) => {
            const fullKey = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              return flatten(v, fullKey);
            }
            return [{ key: fullKey, value: Array.isArray(v) ? JSON.stringify(v) : String(v ?? '') }];
          });
        };

        for (const row of flatten(sheetsSource)) {
          worksheet.addRow(row).height = 18;
        }
      }

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_${folder?.name || 'dossier'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('[Folder Report] Error:', err);
      alert('Erreur lors de la génération du rapport: ' + err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Chargement du dossier...
      </div>
    );
  }

  if (!folder) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Dossier non trouvé
        <br />
        <button
          onClick={() => router.push('/folders')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Retour aux dossiers
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => router.push('/folders')}
          style={{
            padding: '10px 16px',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Retour aux dossiers
        </button>
        <div style={{
          width: '48px',
          height: '48px',
          background: (folder.color || '#3B82F6') + '20',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          D
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{folder.name}</h1>
          {folder.description && (
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {folder.description}
            </div>
          )}
        </div>
        <div style={{
          padding: '8px 18px',
          background: 'var(--bg-tertiary)',
          borderRadius: '24px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}>
          {folder.documents?.length || 0} documents
        </div>
        {/* Badge statut analyse */}
        {reportStatus !== 'idle' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 500,
            background: reportStatus === 'processing' ? 'rgba(245,158,11,0.12)' :
                        reportStatus === 'ready'      ? 'rgba(34,197,94,0.12)' :
                        'rgba(239,68,68,0.12)',
            color: reportStatus === 'processing' ? '#F59E0B' :
                   reportStatus === 'ready'      ? '#22C55E' :
                   '#EF4444',
            border: '1px solid currentColor',
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: 'currentColor',
              animation: reportStatus === 'processing' ? 'pulse 1.4s ease-in-out infinite' : 'none',
            }} />
            {reportStatus === 'processing' && 'Analyse en cours...'}
            {reportStatus === 'ready'      && 'Rapport disponible'}
            {reportStatus === 'error'      && 'Échec de l\'analyse'}
          </div>
        )}

        {/* Bouton Lancer l'analyse */}
        <button
          onClick={analyzeReport}
          disabled={analyzeLoading || reportStatus === 'processing'}
          style={{
            padding: '10px 20px',
            background: reportStatus === 'processing' ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
            color: reportStatus === 'processing' ? 'var(--text-secondary)' : 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (analyzeLoading || reportStatus === 'processing') ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {analyzeLoading ? '...' : reportStatus === 'processing' ? '⏳ Analyse...' : '🔍 Lancer l\'analyse'}
        </button>

        {/* Bouton Télécharger — actif seulement si rapport prêt */}
        <button
          onClick={downloadReport}
          disabled={downloadLoading || !reportReady}
          title={!reportReady ? 'Lancez d\'abord une analyse' : ''}
          style={{
            padding: '10px 20px',
            background: reportReady ? 'var(--accent-green)' : 'var(--bg-tertiary)',
            color: reportReady ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px',
            cursor: (downloadLoading || !reportReady) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: reportReady ? 1 : 0.5,
          }}
        >
          {downloadLoading ? '⟳ Export...' : '⬇ Télécharger Rapport'}
        </button>
      </div>

      {/* Two columns layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px' }}>
        {/* Left: Documents list */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
            Documents du dossier
          </h2>

          {folder.documents?.length === 0 ? (
            <div style={{
              padding: '80px 40px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '2px dashed var(--border-primary)',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>D</div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>Aucun document dans ce dossier</div>
              <div style={{ fontSize: '14px' }}>Uploadez des documents pour les organiser ici</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {folder.documents?.map((doc: Document) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc.id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: doc.fileType === 'invoice' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: doc.fileType === 'invoice' ? '#3B82F6' : 'var(--text-secondary)',
                  }}>
                    {doc.fileType === 'invoice' ? 'F' : 'D'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', fontSize: '15px' }}>
                      {doc.fileName}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '20px' }}>
                      <span>{doc.fileSize}</span>
                      <span>{doc.supplier?.name || 'Fournisseur inconnu'}</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: doc.ocrStatus === 'extracted' ? 'rgba(34, 197, 94, 0.15)' :
                               doc.ocrStatus === 'partial' ? 'rgba(245, 158, 11, 0.15)' :
                               'var(--bg-tertiary)',
                    color: doc.ocrStatus === 'extracted' ? '#22C55E' :
                           doc.ocrStatus === 'partial' ? '#F59E0B' :
                           'var(--text-secondary)',
                  }}>
                    {doc.ocrStatus === 'extracted' ? 'OCR OK' :
                     doc.ocrStatus === 'partial' ? 'OCR partiel' :
                     doc.ocrStatus === 'pending' ? 'En attente' : doc.ocrStatus}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload section */}
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
              Ajouter des documents
            </h2>
            <UploadZone
              folderId={folderId}
              onUploadComplete={() => loadFolder()}
            />
          </div>
        </div>

        {/* Right: AI Agent Chat */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: '24px',
          maxHeight: 'calc(100vh - 48px)',
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}>
              AI
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px' }}>Agent IA</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Posez des questions sur ce dossier
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div
            ref={chatContainerRef}
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              maxHeight: '450px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {chatMessages.length === 0 && (
              <div style={{
                padding: '24px',
                borderRadius: '14px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: '12px', fontWeight: 500 }}>Exemples de questions :</div>
                <div style={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.8 }}>
                  "Résume les documents de ce dossier"<br/>
                  "Quels sont les montants totaux ?"<br/>
                  "Y a-t-il des anomalies ?"<br/>
                  "Compare les factures"
                </div>
              </div>
            )}

            {chatMessages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                    color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                }}>
                  Analyse en cours...
                </div>
              </div>
            )}
          </div>

          {/* Chat input */}
          <div style={{ padding: '20px', borderTop: '1px solid var(--border-primary)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage(chatInput);
              }}
              style={{ display: 'flex', gap: '10px' }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                placeholder="Posez une question..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '12px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '12px 22px',
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {chatLoading ? '...' : 'Envoyer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
