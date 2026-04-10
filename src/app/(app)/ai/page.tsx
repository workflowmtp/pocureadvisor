'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; href: string }[];
  source?: string;
  timestamp: string;
}

interface StructuredAnalysis {
  resume: string;
  critiques: string[];
  recommandations: string[];
  rawContent: string;
}

const SUGGESTIONS = [
  'Quels sont les risques de rupture de stock ?',
  'Résumé des anomalies critiques',
  'Quels fournisseurs sont à risque ?',
  'Opportunités d\'économies identifiées',
  'État des commandes en retard',
  'Veille matières premières',
  'Négociations en cours',
];

export default function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<StructuredAnalysis | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => { sendMessage('Bonjour, résumé de la situation ?'); }, []);

  function parseAnalysis(content: string): StructuredAnalysis {
    const lines = content.split('\n');
    const resume: string[] = [];
    const critiques: string[] = [];
    const recommandations: string[] = [];
    
    let currentSection = 'resume';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // Detect section headers
      if (lowerLine.includes('résumé') || lowerLine.includes('resume') || lowerLine.includes('synthèse') || lowerLine.includes('synthese')) {
        currentSection = 'resume';
        continue;
      }
      if (lowerLine.includes('critique') || lowerLine.includes('anomalie') || lowerLine.includes('risque') || lowerLine.includes('alerte') || lowerLine.includes('point')) {
        if (lowerLine.includes('point') && (lowerLine.includes('critique') || lowerLine.includes('anomalie'))) {
          currentSection = 'critiques';
          continue;
        }
        if (!lowerLine.includes('recommandation')) {
          currentSection = 'critiques';
          continue;
        }
      }
      if (lowerLine.includes('recommandation') || lowerLine.includes('recommandations') || lowerLine.includes('action') || lowerLine.includes('proposition')) {
        currentSection = 'recommandations';
        continue;
      }
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Add content to current section
      const cleanLine = line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      if (!cleanLine) continue;
      
      if (currentSection === 'resume') {
        resume.push(cleanLine);
      } else if (currentSection === 'critiques') {
        critiques.push(cleanLine);
      } else if (currentSection === 'recommandations') {
        recommandations.push(cleanLine);
      }
    }
    
    // If no structured sections found, treat entire content as resume
    if (resume.length === 0 && critiques.length === 0 && recommandations.length === 0) {
      return {
        resume: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
        critiques: [],
        recommandations: [],
        rawContent: content
      };
    }
    
    return {
      resume: resume.join(' '),
      critiques,
      recommandations,
      rawContent: content
    };
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant', content: data.response || 'Désolé, je n\'ai pas pu traiter votre demande.',
        actions: data.actions || [], source: data.source,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion.', timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
    }
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); sendMessage(input); }

  function openAnalysisModal(content: string) {
    const analysis = parseAnalysis(content);
    setSelectedAnalysis(analysis);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-48px)]">
      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${msg.role === 'user' ? 'bg-brand-blue text-white' : 'bg-brand-purple-soft text-brand-purple'}`}>
                  {msg.role === 'user' ? 'U' : 'IA'}
                </div>
                <div className={`rounded-xl p-4 ${msg.role === 'user' ? 'bg-brand-blue text-white' : 'bg-[var(--bg-card)] border border-[var(--border-primary)]'}`}>
                  {msg.role === 'user' ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <AnalysisCard content={msg.content} onViewDetails={() => openAnalysisModal(msg.content)} />
                  )}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border-secondary)]">
                      {msg.actions.map((a, k) => (
                        <button key={k} onClick={() => router.push(a.href)}
                          className="px-3 py-1.5 bg-brand-blue-soft text-brand-blue text-xs font-medium rounded-full hover:bg-brand-blue hover:text-white transition-colors">
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={`flex items-center gap-2 mt-2 text-[10px] ${msg.role === 'user' ? 'text-white/60 justify-end' : 'text-[var(--text-tertiary)]'}`}>
                    <span>{msg.timestamp}</span>
                    {msg.source && <span className="px-1.5 py-0.5 rounded bg-brand-purple-soft text-brand-purple text-[9px]">{msg.source === 'n8n' ? 'n8n' : 'local'}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-purple-soft text-brand-purple flex items-center justify-center text-sm font-bold">IA</div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-3 border-t border-[var(--border-primary)]">
          <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Suggestions</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-full text-xs text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-colors">{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading}
              placeholder="Posez votre question à ProcureBot..."
              className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-brand-blue focus:outline-none disabled:opacity-50 pr-12" />
            <button type="submit" disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center text-sm disabled:opacity-40 hover:bg-blue-600">+</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">IA ProcureBot - Copilote Achats MULTIPRINT</span>
          <span className="text-[10px] text-brand-purple">*</span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Données temps réel</span>
        </div>
      </form>

      {/* Modal for detailed analysis */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Analyse détaillée"
        size="xl"
      >
        {selectedAnalysis && (
          <div className="space-y-6">
            {/* Résumé */}
            <div className="bg-[var(--bg-input)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">Résumé</span>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Résumé</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{selectedAnalysis.resume}</p>
            </div>

            {/* Points critiques */}
            {selectedAnalysis.critiques.length > 0 && (
              <div className="bg-[var(--accent-red-soft)] rounded-lg p-4 border border-[var(--accent-red)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">!</span>
                  <h3 className="text-sm font-semibold text-[var(--accent-red)]">Points critiques / Anomalies</h3>
                </div>
                <ul className="space-y-2">
                  {selectedAnalysis.critiques.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--accent-red)] mt-0.5">*</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommandations */}
            {selectedAnalysis.recommandations.length > 0 && (
              <div className="bg-[var(--accent-green-soft)] rounded-lg p-4 border border-[var(--accent-green)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">OK</span>
                  <h3 className="text-sm font-semibold text-[var(--accent-green)]">Recommandations</h3>
                </div>
                <ul className="space-y-2">
                  {selectedAnalysis.recommandations.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--accent-green)] mt-0.5">*</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw content if needed */}
            {selectedAnalysis.critiques.length === 0 && selectedAnalysis.recommandations.length === 0 && (
              <div className="bg-[var(--bg-input)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">Doc</span>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contenu complet</h3>
                </div>
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selectedAnalysis.rawContent}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Compact analysis card component
function AnalysisCard({ content, onViewDetails }: { content: string; onViewDetails: () => void }) {
  const analysis = content.split('\n').reduce((acc, line) => {
    const lower = line.toLowerCase().trim();
    if (lower.includes('résumé') || lower.includes('resume')) acc.hasResume = true;
    if (lower.includes('critique') || lower.includes('anomalie') || lower.includes('risque')) acc.hasCritiques = true;
    if (lower.includes('recommandation')) acc.hasRecommandations = true;
    return acc;
  }, { hasResume: false, hasCritiques: false, hasRecommandations: false });

  // Preview: first 150 chars
  const preview = content.substring(0, 150).replace(/\n/g, ' ').trim() + (content.length > 150 ? '...' : '');

  return (
    <div className="space-y-3">
      {/* Quick preview */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{preview}</p>
      
      {/* Structured tags */}
      <div className="flex flex-wrap gap-2">
        {analysis.hasResume && (
          <span className="px-2 py-1 bg-brand-blue-soft text-brand-blue text-[10px] font-medium rounded-full">Résumé</span>
        )}
        {analysis.hasCritiques && (
          <span className="px-2 py-1 bg-[var(--accent-red-soft)] text-[var(--accent-red)] text-[10px] font-medium rounded-full">Critiques</span>
        )}
        {analysis.hasRecommandations && (
          <span className="px-2 py-1 bg-[var(--accent-green-soft)] text-[var(--accent-green)] text-[10px] font-medium rounded-full">Recommandations</span>
        )}
      </div>
      
      {/* View details button */}
      <button
        onClick={onViewDetails}
        className="flex items-center gap-2 px-3 py-1.5 bg-brand-purple-soft text-brand-purple text-xs font-medium rounded-lg hover:bg-brand-purple hover:text-white transition-colors"
      >
        <span>Voir l'analyse détaillée</span>
      </button>
    </div>
  );
}
