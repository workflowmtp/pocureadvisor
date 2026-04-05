'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; href: string }[];
  source?: string;
  timestamp: string;
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
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => { sendMessage('Bonjour, résumé de la situation ?'); }, []);

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
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erreur de connexion.', timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
    }
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); sendMessage(input); }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-48px)]">
      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%]">
              <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${msg.role === 'user' ? 'bg-brand-blue text-white' : 'bg-brand-purple-soft text-brand-purple'}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`rounded-xl p-4 ${msg.role === 'user' ? 'bg-brand-blue text-white' : 'bg-[var(--bg-card)] border border-[var(--border-primary)]'}`}>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? '' : 'text-[var(--text-secondary)]'}`}>
                    {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                  </div>
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
              <div className="w-8 h-8 rounded-lg bg-brand-purple-soft text-brand-purple flex items-center justify-center text-sm">🤖</div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-purple animate-typing" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-purple animate-typing" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-purple animate-typing" style={{ animationDelay: '400ms' }} />
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
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center text-sm disabled:opacity-40 hover:bg-blue-600">↑</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">🤖 ProcureBot — Copilote Achats MULTIPRINT</span>
          <span className="text-[10px] text-brand-purple">•</span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Données temps réel</span>
        </div>
      </form>
    </div>
  );
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, j) => {
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <p key={j}>{parts.map((p, k) => k % 2 === 1 ? <strong key={k} className="text-[var(--text-primary)]">{p}</strong> : p)}</p>;
    }
    if (line.startsWith('• ') || line.startsWith('- ')) return <p key={j} className="ml-2">{line}</p>;
    return line ? <p key={j}>{line}</p> : <br key={j} />;
  });
}
