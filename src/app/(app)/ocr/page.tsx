'use client';

import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';
import { formatCurrency, formatDate, truncate } from '@/lib/format';
import {
  OcrPipeline,
  DocumentCard,
  SplitAnalysis,
  VerdictBox,
  ReconciliationResults
} from '@/components/ocr/OcrComponents';
import { FolderList } from '@/components/folders/FolderComponents';
import KpiCard from '@/components/dashboard/KpiCard';
import Modal from '@/components/ui/Modal';

const printSingleMessageAsPdf = (docFileName: string, message: DocumentChatMessage) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour imprimer en PDF');
    return;
  }

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Analyse OCR - ${docFileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
    .message { padding: 16px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; }
    .message-content { font-size: 13px; line-height: 1.6; }
    .message-content h2 { font-size: 15px; margin: 12px 0 8px; color: #111; }
    .message-content h3 { font-size: 14px; margin: 10px 0 6px; color: #111; }
    .message-content p { margin-bottom: 8px; }
    .message-content ul, .message-content ol { margin-left: 20px; margin-bottom: 8px; }
    .message-content li { margin-bottom: 4px; }
    .message-content strong { font-weight: 600; }
    .message-content code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .message-content blockquote { border-left: 3px solid #3b82f6; padding-left: 12px; color: #555; }
    .timestamp { font-size: 10px; color: #999; margin-top: 12px; }
    .footer { margin-top: 32px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Analyse IA - OCR Extraction</h1>
  <div class="subtitle">Document: ${docFileName} | Généré le ${new Date().toLocaleString('fr-FR')}</div>
  <div class="message">
    <div class="message-content">${message.content}</div>
    <div class="timestamp">${message.timestamp}</div>
  </div>
  <div class="footer">ProcureAdvisor - Analyse OCR automatisée</div>
</body>
</html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

const printChatAsPdf = (docFileName: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour imprimer en PDF');
    return;
  }

  const chatContent = document.getElementById('ocr-chat-print-area');
  if (!chatContent) return;

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Analyse OCR - ${docFileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
    .message { margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; page-break-inside: avoid; }
    .message.user { background: #e0e7ff; margin-left: 20%; }
    .message.assistant { background: #f3f4f6; border: 1px solid #e5e7eb; margin-right: 20%; }
    .message-role { font-size: 10px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; color: #666; }
    .message-content { font-size: 13px; line-height: 1.6; }
    .message-content h2 { font-size: 15px; margin: 12px 0 8px; color: #111; }
    .message-content h3 { font-size: 14px; margin: 10px 0 6px; color: #111; }
    .message-content p { margin-bottom: 8px; }
    .message-content ul, .message-content ol { margin-left: 20px; margin-bottom: 8px; }
    .message-content li { margin-bottom: 4px; }
    .message-content strong { font-weight: 600; }
    .message-content code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .message-content blockquote { border-left: 3px solid #3b82f6; padding-left: 12px; color: #555; }
    .timestamp { font-size: 10px; color: #999; margin-top: 6px; }
    .footer { margin-top: 32px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Analyse IA - OCR Extraction</h1>
  <div class="subtitle">Document: ${docFileName} | Généré le ${new Date().toLocaleString('fr-FR')}</div>
  ${chatContent.innerHTML}
  <div class="footer">ProcureAdvisor - Analyse OCR automatisée</div>
</body>
</html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

type DocumentChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

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
  const [aiAnalysis, setAiAnalysis] = useState<{resume: string; critiques: string[]; recommandations: string[]; raw: string} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [docChatMessages, setDocChatMessages] = useState<DocumentChatMessage[]>([]);
  const [docChatInput, setDocChatInput] = useState('');
  const [docChatLoading, setDocChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousTheme = document.documentElement.getAttribute('data-theme');
    const hadDarkClass = document.documentElement.classList.contains('dark');

    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');

    return () => {
      if (previousTheme) {
        document.documentElement.setAttribute('data-theme', previousTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      if (!hadDarkClass) {
        document.documentElement.classList.remove('dark');
      }
    };
  }, []);

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

  useEffect(() => {
    setDocChatMessages([]);
    setDocChatInput('');
  }, [currentDocId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [docChatMessages, docChatLoading]);

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

  // Fonction pour analyser un document avec l'IA
  const analyzeWithAI = useCallback(async (doc: any) => {
    setAiLoading(true);
    setAiAnalysis(null);
    
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyse le document OCR suivant: ${doc.fileName} - Fournisseur: ${doc.supplier?.name || 'Inconnu'} - Montant: ${formatCurrency(doc.totalAmount || 0)} - Statut: ${doc.reconciliationStatus || 'en cours'} - Étapes pipeline: ${doc.pipelineStage}/7. Variances détectées: ${JSON.stringify(doc.variances || [])}. Donne-moi un résumé, les points critiques/anomalies, et des recommandations.`,
        }),
      });
      const data = await res.json();
      
      // Parser la réponse en 3 sections
      const response = data.response || '';
      const lines = response.split('\n');
      const critiques: string[] = [];
      const recommandations: string[] = [];
      let resume = '';
      let currentSection = 'resume';
      
      for (const line of lines) {
        const lower = line.toLowerCase().trim();
        if (lower.includes('résumé') || lower.includes('resume')) { currentSection = 'resume'; continue; }
        if (lower.includes('critique') || lower.includes('anomalie')) { currentSection = 'critiques'; continue; }
        if (lower.includes('recommandation')) { currentSection = 'recommandations'; continue; }
        
        const cleanLine = line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
        if (!cleanLine) continue;
        
        if (currentSection === 'resume') resume += (resume ? ' ' : '') + cleanLine;
        else if (currentSection === 'critiques') critiques.push(cleanLine);
        else if (currentSection === 'recommandations') recommandations.push(cleanLine);
      }
      
      setAiAnalysis({ resume, critiques, recommandations, raw: response });
      setAiModalOpen(true);
    } catch (err) {
      console.error('Erreur analyse IA:', err);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const sendDocumentChatMessage = useCallback(async (docId: string, text: string) => {
    if (!text.trim()) return;

    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMessage: DocumentChatMessage = { role: 'user', content: text.trim(), timestamp };

    setDocChatMessages(prev => [...prev, userMessage]);
    setDocChatInput('');
    setDocChatLoading(true);

    try {
      console.log('[OCR CHAT] Sending message to API...');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text.trim(),
          context: docId,
        }),
      });

      console.log('[OCR CHAT] API response status:', res.status);
      
      // Get raw text first to handle both JSON and plain text responses
      const rawText = await res.text();
      console.log('[OCR CHAT] Raw response:', rawText.substring(0, 500));
      
      // Try to parse as JSON
      let data: any;
      try {
        data = JSON.parse(rawText);
        console.log('[OCR CHAT] Parsed JSON data:', data);
      } catch {
        // Not valid JSON - show raw error
        console.error('[OCR CHAT] Response is not valid JSON');
        setDocChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `<div style="color: #EF4444;"><strong>Erreur serveur:</strong><br/><code style="background: rgba(239,68,68,0.1); padding: 8px; border-radius: 4px; display: block; margin-top: 8px; word-break: break-all;">${rawText}</code></div>`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }]);
        return;
      }

      if (!res.ok) {
        // Handle HTTP error responses
        const errorMsg = data.error || `Erreur HTTP ${res.status}`;
        const errorDetails = data.details ? `\n\nDétails: ${data.details}` : '';
        setDocChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `<div style="color: #EF4444;"><strong>Erreur:</strong> ${errorMsg}${errorDetails}</div>`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }]);
        return;
      }

      const responseContent = data.response || "Je n'ai pas pu traiter votre question sur ce document.";
      console.log('[OCR CHAT] Response content length:', responseContent.length);
      console.log('[OCR CHAT] Response content preview:', responseContent.substring(0, 200));
      
      setDocChatMessages(prev => [...prev, {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error: any) {
      console.error('[OCR CHAT] Fetch error:', error);
      setDocChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `<div style="color: #EF4444;"><strong>Erreur de connexion:</strong> ${error?.message || 'Erreur inconnue'}</div>`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setDocChatLoading(false);
    }
  }, []);

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

          <div className="card" style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Chat IA - OCR Extraction</div>
              {docChatMessages.length > 0 && (
                <button
                  onClick={() => printChatAsPdf(doc.fileName)}
                  className="btn btn-secondary no-print"
                  style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                >
                  📄 Imprimer PDF
                </button>
              )}
            </div>
            <div
              ref={chatContainerRef}
              className="w-full"
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: 'var(--sp-4)',
              }}
            >
              {docChatMessages.length === 0 && !docChatLoading && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
                  Posez une question sur ce document scanné. La requête sera envoyée avec le contexte de ce document uniquement.
                </div>
              )}

              <div id="ocr-chat-print-area">
              {docChatMessages.map((msg, index) => (
                <div key={`${msg.timestamp}-${index}`} className="w-full flex" style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div
                    className="w-full sm:w-auto sm:max-w-[85%]"
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-input)',
                      color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-primary)',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <div 
                          className="ocr-chat-html"
                          style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                        />
                        <button
                          onClick={() => printSingleMessageAsPdf(doc.fileName, msg)}
                          style={{
                            marginTop: '10px',
                            fontSize: '11px',
                            padding: '4px 10px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: '#22C55E',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          📄 Imprimer cette réponse
                        </button>
                      </>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>{msg.content}</div>
                    )}
                    <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.7 }}>{msg.timestamp}</div>
                  </div>
                </div>
              ))}
              </div>

              {docChatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
                    L’agent IA analyse votre question...
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendDocumentChatMessage(doc.id, docChatInput);
              }}
              className="flex flex-col sm:flex-row gap-2 sm:items-center"
            >
              <input
                type="text"
                value={docChatInput}
                disabled={docChatLoading}
                onChange={(e) => setDocChatInput(e.target.value)}
                placeholder="Ex: Quel est le montant TTC de ce document ?"
                className="w-full"
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--fs-sm)',
                }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={docChatLoading || !docChatInput.trim()}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#3B82F6',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                {docChatLoading ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          </div>

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
            <button 
              className="btn btn-secondary"
              disabled={aiLoading}
              onClick={() => analyzeWithAI(doc)}
              style={{ 
                backgroundColor: 'rgba(139, 92, 246, 0.15)', 
                color: '#8B5CF6',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
            >
              {aiLoading ? 'Analyse en cours...' : 'Analyse IA'}
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

          {/* Modal analyse IA */}
          <Modal
            isOpen={aiModalOpen}
            onClose={() => setAiModalOpen(false)}
            title="Analyse IA du document"
            size="xl"
          >
            {aiAnalysis && (
              <div className="space-y-6">
                {/* Résumé */}
                <div className="bg-[var(--bg-input)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Résumé</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{aiAnalysis.resume}</p>
                </div>

                {/* Points critiques */}
                {aiAnalysis.critiques.length > 0 && (
                  <div className="bg-[var(--accent-red-soft)] rounded-lg p-4 border border-[var(--accent-red)]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-[var(--accent-red)]">Points critiques / Anomalies</h3>
                    </div>
                    <ul className="space-y-2">
                      {aiAnalysis.critiques.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <span className="text-[var(--accent-red)] mt-0.5">*</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommandations */}
                {aiAnalysis.recommandations.length > 0 && (
                  <div className="bg-[var(--accent-green-soft)] rounded-lg p-4 border border-[var(--accent-green)]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-[var(--accent-green)]">Recommandations</h3>
                    </div>
                    <ul className="space-y-2">
                      {aiAnalysis.recommandations.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <span className="text-[var(--accent-green)] mt-0.5">*</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contenu brut si pas de structure */}
                {aiAnalysis.critiques.length === 0 && aiAnalysis.recommandations.length === 0 && (
                  <div className="bg-[var(--bg-input)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Analyse complète</h3>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{aiAnalysis.raw}</div>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </div>
      );
    }
  }

  // Vue principale
  return (
    <div>
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

      {/* Dossiers */}
      <FolderList
        onFolderSelect={(id) => router.push(`/folders/${id}`)}
      />
    </div>
  );
}
