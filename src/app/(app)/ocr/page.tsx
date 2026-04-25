'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import KpiCard from '@/components/dashboard/KpiCard';

// ─── Helpers ───

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIcon(mimeType: string, name: string): string {
  if (mimeType === 'application/vnd.google-apps.folder') return '📂';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType?.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return '📊';
  if (mimeType?.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (mimeType?.includes('presentation') || name.endsWith('.pptx')) return '📽️';
  if (mimeType?.includes('image')) return '🖼️';
  return '📄';
}

// ─── Types ───

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

interface Breadcrumb {
  id: string;
  name: string;
}

interface ReconcileResult {
  status: 'matched' | 'minor' | 'major' | 'critical' | 'pending';
  matchedSupplier: { bpsNum: string; bpnam: string } | null;
  matchedOrder: { pohNum: string; amountTtc: number; status: number } | null;
  matchedInvoice: { pinNum: string; amountTtc: number } | null;
  variances: { field: string; expected: string; actual: string; diff_pct: number; severity: 'low' | 'medium' | 'high' | 'critical' }[];
  recommendations: string[];
}

// ─── Page ───

export default function OcrPage() {
  // Drive tree
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveStats, setDriveStats] = useState<{ totalFolders: number; totalFiles: number } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // null = root
  const [currentFolderName, setCurrentFolderName] = useState<string>('Drive');
  const [searchQuery, setSearchQuery] = useState('');

  // Reconciliation
  const [reconcilingFileId, setReconcilingFileId] = useState<string | null>(null);
  const [reconcileResults, setReconcileResults] = useState<Record<string, ReconcileResult>>({});
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; ts: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // ─── Fetch Drive items ───
  const fetchDriveItems = useCallback(async (folderId: string | null, query?: string) => {
    setDriveLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId) params.set('driveFolder', folderId);
      else if (query) params.set('q', query);
      else params.set('foldersOnly', 'true'); // root = show folders only

      const res = await fetch(`/api/documents/drive?${params}`);
      if (res.ok) {
        const d = await res.json();
        setDriveItems(d.files || []);
      }
    } catch { /* silent */ } finally { setDriveLoading(false); }
  }, []);

  const fetchDriveStats = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/drive?stats=true');
      if (res.ok) setDriveStats(await res.json());
    } catch { /* silent */ }
  }, []);

  // ─── Navigate into folder ───
  const openFolder = useCallback((folder: DriveItem) => {
    const newBreadcrumbs = [...breadcrumbs, { id: currentFolderId || 'root', name: currentFolderName }];
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
    setDriveItems([]);
    setChatMessages([]);
    fetchDriveItems(folder.id);
  }, [breadcrumbs, currentFolderId, currentFolderName, fetchDriveItems]);

  const navigateBack = useCallback((index: number) => {
    if (index === -1) {
      // Back to root
      setBreadcrumbs([]);
      setCurrentFolderId(null);
      setCurrentFolderName('Drive');
      setDriveItems([]);
      setChatMessages([]);
      fetchDriveItems(null);
    } else {
      const target = breadcrumbs[index];
      const newBreadcrumbs = breadcrumbs.slice(0, index);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolderId(target.id === 'root' ? null : target.id);
      setCurrentFolderName(target.name);
      setDriveItems([]);
      setChatMessages([]);
      fetchDriveItems(target.id === 'root' ? null : target.id);
    }
  }, [breadcrumbs, fetchDriveItems]);

  // ─── Reconciliation ───
  const handleReconcile = useCallback(async (file: DriveItem) => {
    setReconcilingFileId(file.id);
    setReconcileLoading(true);
    try {
      // Call n8n webhook for X3 reconciliation
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_X3_RECONCILE_URL || 'https://n8n.mtb-app.com/webhook-test/analyse';
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('multiprint:Admin@1234'),
        },
        body: JSON.stringify({ context: file.id }),
      });

      if (res.ok) {
        const result = await res.json();
        setReconcileResults(prev => ({ ...prev, [file.id]: result }));
      } else {
        // Fallback: simulate result for demo
        setReconcileResults(prev => ({
          ...prev,
          [file.id]: {
            status: 'pending',
            matchedSupplier: null,
            matchedOrder: null,
            matchedInvoice: null,
            variances: [],
            recommendations: ['En attente de la connexion X3 — le webhook n8n doit être configuré.'],
          },
        }));
      }
    } catch {
      // Offline / not configured yet
      setReconcileResults(prev => ({
        ...prev,
        [file.id]: {
          status: 'pending',
          matchedSupplier: null,
          matchedOrder: null,
          matchedInvoice: null,
          variances: [],
          recommendations: ['Webhook X3 non configuré. Configurez NEXT_PUBLIC_N8N_X3_RECONCILE_URL dans .env'],
        },
      }));
    } finally {
      setReconcileLoading(false);
      setReconcilingFileId(null);
    }
  }, []);

  // ─── AI Chat ───
  const sendChat = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { role: 'user', content: text.trim(), ts }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const fileList = driveItems.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').map(f => f.name).join(', ');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Contexte — Dossier Drive: "${currentFolderName}". Fichiers: ${fileList || 'aucun'}. Question: ${text.trim()}`,
        }),
      });
      const d = await res.json();
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: d.response || "Je n'ai pas pu traiter votre question.",
        ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${e.message}`, ts: '' }]);
    } finally { setChatLoading(false); }
  }, [currentFolderName, driveItems]);

  // ─── Effects ───
  useEffect(() => {
    const previousTheme = document.documentElement.getAttribute('data-theme');
    const hadDarkClass = document.documentElement.classList.contains('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    return () => {
      if (previousTheme) document.documentElement.setAttribute('data-theme', previousTheme);
      else document.documentElement.removeAttribute('data-theme');
      if (!hadDarkClass) document.documentElement.classList.remove('dark');
    };
  }, []);

  useEffect(() => {
    fetchDriveItems(null);
    fetchDriveStats();
  }, [fetchDriveItems, fetchDriveStats]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  // ─── Derived ───
  const folders = driveItems.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const files = driveItems.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'matched': return { bg: 'rgba(34,197,94,0.15)', color: '#22C55E', label: '✅ Conforme' };
      case 'minor': return { bg: 'rgba(234,179,8,0.15)', color: '#EAB308', label: '🟡 Écart mineur' };
      case 'major': return { bg: 'rgba(249,115,22,0.15)', color: '#F97316', label: '🟠 Écart majeur' };
      case 'critical': return { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: '⛔ Critique' };
      default: return { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: '⏳ En attente' };
    }
  };

  // ─── Render ───
  return (
    <div>
      {/* ── KPIs ── */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-5)' }}>
        <KpiCard icon="📂" label="Dossiers Drive" value={driveStats?.totalFolders ?? '—'} color="blue" />
        <KpiCard icon="📄" label="Fichiers Drive" value={driveStats?.totalFiles ?? '—'} color="orange" />
        <KpiCard icon="✅" label="Rapprochés" value={Object.values(reconcileResults).filter(r => r.status === 'matched').length} color="green" />
        <KpiCard icon="🟡" label="Écarts" value={Object.values(reconcileResults).filter(r => r.status === 'minor' || r.status === 'major').length} color="orange" />
        <KpiCard icon="⛔" label="Critiques" value={Object.values(reconcileResults).filter(r => r.status === 'critical').length} color="red" />
      </div>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--sp-4)', flexWrap: 'wrap', fontSize: '14px' }}>
        <span
          onClick={() => navigateBack(-1)}
          style={{ cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 600 }}
        >
          ☁️ Drive
        </span>
        {breadcrumbs.map((bc, i) => (
          <span key={bc.id + i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>/</span>
            <span
              onClick={() => navigateBack(i)}
              style={{ cursor: 'pointer', color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--accent-blue)', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }}
            >
              {bc.name}
            </span>
          </span>
        ))}
        {currentFolderId && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>/</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentFolderName}</span>
          </span>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <input
          type="text" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchDriveItems(currentFolderId, searchQuery || undefined); }}
          placeholder="Rechercher dans ce dossier..."
          style={{ flex: 1, maxWidth: '360px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px' }}
        />
        <button className="btn btn-secondary" onClick={() => { fetchDriveItems(currentFolderId); fetchDriveStats(); }}>🔄 Actualiser</button>
      </div>

      {/* ── Main content: 2 columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--sp-5)', alignItems: 'start' }}>

        {/* ── Left: Drive browser ── */}
        <div>
          {driveLoading ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⌛</div>
              Chargement du contenu Drive...
            </div>
          ) : driveItems.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
              Ce dossier est vide.
            </div>
          ) : (
            <>
              {/* ── Folders ── */}
              {folders.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
                  <div className="card-header">
                    <div className="card-title">📂 Dossiers ({folders.length})</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', padding: '14px' }}>
                    {folders.map(f => (
                      <div
                        key={f.id}
                        onClick={() => openFolder(f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.background = 'var(--accent-blue-soft, rgba(59,130,246,0.08))'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                      >
                        <span style={{ fontSize: '24px' }}>📂</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          {f.modifiedTime && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{new Date(f.modifiedTime).toLocaleDateString('fr-FR')}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Files ── */}
              {files.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">📄 Fichiers ({files.length})</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px' }}>
                    {files.map(f => {
                      const icon = fileIcon(f.mimeType, f.name);
                      const result = reconcileResults[f.id];
                      const badge = result ? statusBadge(result.status) : null;
                      const isReconciling = reconcilingFileId === f.id;

                      return (
                        <div key={f.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px 16px', borderRadius: '10px',
                          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                        }}>
                          <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {f.size ? <span>{formatFileSize(Number(f.size))}</span> : <span>Google Doc</span>}
                              {f.modifiedTime && <span>{new Date(f.modifiedTime).toLocaleDateString('fr-FR')}</span>}
                            </div>
                          </div>

                          {/* Status badge if reconciled */}
                          {badge && (
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              background: badge.bg, color: badge.color, whiteSpace: 'nowrap',
                            }}>
                              {badge.label}
                            </span>
                          )}

                          {/* Reconcile button */}
                          <button
                            className="btn btn-primary"
                            disabled={isReconciling}
                            onClick={() => handleReconcile(f)}
                            style={{
                              fontSize: '12px', padding: '7px 14px', whiteSpace: 'nowrap',
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: result ? 'rgba(34,197,94,0.15)' : undefined,
                              color: result ? '#22C55E' : undefined,
                              border: result ? '1px solid rgba(34,197,94,0.3)' : undefined,
                            }}
                          >
                            {isReconciling ? '⏳ Correspondance...' : result ? '🔄 Re-correspondance' : '🔗 Effectuer la correspondance'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Reconciliation detail panel ── */}
              {Object.keys(reconcileResults).length > 0 && (
                <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
                  <div className="card-header">
                    <div className="card-title">📋 Résultats de correspondance X3</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
                    {Object.entries(reconcileResults).map(([fileId, result]) => {
                      const file = files.find(f => f.id === fileId);
                      if (!file) return null;
                      const badge = statusBadge(result.status);

                      return (
                        <div key={fileId} style={{
                          padding: '16px', borderRadius: '10px',
                          background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                        }}>
                          {/* File header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '18px' }}>{fileIcon(file.mimeType, file.name)}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', flex: 1 }}>{file.name}</span>
                            <span style={{ padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          </div>

                          {/* Matched data */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: result.variances.length > 0 ? '12px' : '0' }}>
                            <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '12px' }}>
                              <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Fournisseur</div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{result.matchedSupplier?.bpnam || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '12px' }}>
                              <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Commande X3</div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{result.matchedOrder?.pohNum || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '12px' }}>
                              <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Facture X3</div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{result.matchedInvoice?.pinNum || '—'}</div>
                            </div>
                          </div>

                          {/* Variances */}
                          {result.variances.length > 0 && (
                            <div style={{ marginBottom: result.recommendations.length > 0 ? '10px' : '0' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Écarts détectés</div>
                              {result.variances.map((v, i) => {
                                const sevColor = v.severity === 'critical' ? '#EF4444' : v.severity === 'high' ? '#F97316' : v.severity === 'medium' ? '#EAB308' : '#22C55E';
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '12px', borderBottom: '1px solid var(--border-primary)' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sevColor, flexShrink: 0 }} />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, minWidth: '120px' }}>{v.field}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>Attendu: <strong>{v.expected}</strong></span>
                                    <span style={{ color: 'var(--text-secondary)' }}>Constaté: <strong>{v.actual}</strong></span>
                                    <span style={{ color: sevColor, fontWeight: 600, marginLeft: 'auto' }}>{v.diff_pct > 0 ? '+' : ''}{v.diff_pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Recommendations */}
                          {result.recommendations.length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Recommandations</div>
                              {result.recommendations.map((rec, i) => (
                                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0', paddingLeft: '12px' }}>
                                  • {rec}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: AI Agent ── */}
        <div className="card" style={{ position: 'sticky', top: '80px' }}>
          <div className="card-header">
            <div className="card-title">🤖 Agent IA{currentFolderId ? ` — ${currentFolderName}` : ''}</div>
          </div>
          <div
            ref={chatRef}
            style={{ height: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: 'var(--sp-3)' }}
          >
            {chatMessages.length === 0 && !chatLoading && (
              <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>💬 Assistant ProcureAdvisor</div>
                Posez une question sur les fichiers de ce dossier Drive. Je peux analyser les rapports, identifier des anomalies, ou aider au rapprochement X3.
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.5,
                  background: m.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-input)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-primary)',
                  overflowWrap: 'anywhere',
                }}>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.content) }} />
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>{m.ts}</div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border-primary)' }}>
                L'agent analyse...
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text" value={chatInput} disabled={chatLoading}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Question sur ce dossier..."
              style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={chatLoading || !chatInput.trim()} style={{ padding: '8px 14px', fontSize: '13px' }}>
              {chatLoading ? '...' : '→'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
