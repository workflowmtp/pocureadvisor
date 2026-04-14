'use client';

import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { UploadZone } from '@/components/ocr/OcrComponents';

interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: string;
  _count?: { documents: number };
  createdBy?: { fullName: string };
}

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

export function FolderList({ onFolderSelect }: { onFolderSelect?: (folderId: string) => void }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const res = await fetch('/api/folders?recent=true');
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (e) {
      console.error('Load folders error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name: string, description: string, color: string) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color }),
      });
      if (res.ok) {
        loadFolders();
        setShowCreateModal(false);
      }
    } catch (e) {
      console.error('Create folder error:', e);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Chargement...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Dossiers récents
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + Nouveau dossier
        </button>
      </div>

      {folders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Aucun dossier. Créez-en un pour organiser vos documents.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => onFolderSelect?.(folder.id)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = folder.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: folder.color + '20',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {folder.icon === 'folder' ? 'D' : folder.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{folder.name}</div>
                  {folder.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{folder.description}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>{folder._count?.documents || 0} documents</span>
                <span>{new Date(folder.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateFolderModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateFolder}
        />
      )}
    </div>
  );
}

function CreateFolderModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string, color: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        width: '400px',
        maxWidth: '90vw',
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Nouveau dossier</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Nom du dossier
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Factures 2024"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Description (optionnel)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description courte"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Couleur
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: c,
                  border: color === c ? '3px solid white' : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onCreate(name, description, color);
              }
            }}
            disabled={!name.trim()}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: 'var(--accent-blue)',
              color: 'white',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export function FolderDocuments({ folderId, onBack, onDocumentSelect, onUploadComplete }: { folderId: string; onBack: () => void; onDocumentSelect?: (docId: string) => void; onUploadComplete?: (result?: any) => void }) {
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFolder();
  }, [folderId]);

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
      // Build context from all documents in folder
      const docsContext = folder.documents?.map((doc: Document) => ({
        fileName: doc.fileName,
        supplier: doc.supplier?.name || 'Inconnu',
        ocrText: doc.ocrRawText?.substring(0, 500) || 'Non disponible',
        status: doc.ocrStatus,
      })) || [];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Contexte: Dossier "${folder.name}" contenant ${folder.documents?.length || 0} documents.
Documents: ${JSON.stringify(docsContext, null, 2)}

Question de l'utilisateur: ${text}`,
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

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Chargement...</div>;
  }

  if (!folder) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Dossier non trouvé</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Retour aux dossiers
        </button>
        <div style={{
          width: '40px',
          height: '40px',
          background: (folder.color || '#3B82F6') + '20',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}>
          D
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{folder.name}</h2>
          {folder.description && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{folder.description}</div>
          )}
        </div>
        <div style={{
          padding: '6px 14px',
          background: 'var(--bg-tertiary)',
          borderRadius: '20px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          {folder.documents?.length || 0} documents
        </div>
      </div>

      {/* Two columns layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        {/* Left: Documents list */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Documents du dossier
          </h3>

          {folder.documents?.length === 0 ? (
            <div style={{
              padding: '60px 40px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px dashed var(--border-primary)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>D</div>
              <div>Aucun document dans ce dossier</div>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>Uploadez des documents pour les organiser ici</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {folder.documents?.map((doc: Document) => (
                <div
                  key={doc.id}
                  onClick={() => onDocumentSelect?.(doc.id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.background = 'var(--bg-card)';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: doc.fileType === 'invoice' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: doc.fileType === 'invoice' ? '#3B82F6' : 'var(--text-secondary)',
                  }}>
                    {doc.fileType === 'invoice' ? 'F' : 'D'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{doc.fileName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
                      <span>{doc.fileSize}</span>
                      <span>{doc.supplier?.name || 'Fournisseur inconnu'}</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div style={{
                    padding: '5px 12px',
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
        </div>

        {/* Right: AI Agent Chat */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: 'fit-content',
          maxHeight: '600px',
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              AI
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Agent IA</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Posez des questions sur ce dossier</div>
            </div>
          </div>

          {/* Chat messages */}
          <div
            ref={chatContainerRef}
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              maxHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {chatMessages.length === 0 && (
              <div style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: '8px' }}>Exemples de questions :</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                  "Résume les documents de ce dossier"<br/>
                  "Quels sont les montants totaux ?"<br/>
                  "Y a-t-il des anomalies ?"
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
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                    color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                      style={{
                        '& p': { marginBottom: '8px' },
                        '& ul, & ol': { marginLeft: '20px', marginBottom: '8px' },
                        '& li': { marginBottom: '4px' },
                      }}
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
                  padding: '12px 16px',
                  borderRadius: '14px',
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
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage(chatInput);
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                placeholder="Posez une question..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '10px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '10px 18px',
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
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

      {/* Upload section */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Ajouter des documents
        </h3>
        <UploadZone
          folderId={folderId}
          onUploadComplete={(result) => {
            loadFolder();
            onUploadComplete?.(result);
          }}
        />
      </div>
    </div>
  );
}
