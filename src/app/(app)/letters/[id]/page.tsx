'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { LETTER_TYPES } from '@/lib/constants';

export default function LetterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');

  const fetchData = () => {
    fetch(`/api/letters/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setEditBody(d.letter.body); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { if (params.id) fetchData(); }, [params.id]);

  async function handleAction(action: string, payload: Record<string, any> = {}) {
    await fetch(`/api/letters/${params.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (action === 'delete') { router.push('/letters'); return; }
    setEditing(false); fetchData();
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const l = data.letter;
    printWindow.document.write(`
      <html><head><title>${l.subject}</title>
      <style>body{font-family:'DM Sans',system-ui,sans-serif;padding:40px;max-width:700px;margin:0 auto;color:#1a1a1a;font-size:14px;line-height:1.8;}h1{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:30px;}pre{white-space:pre-wrap;font-family:inherit;font-size:14px;}</style>
      </head><body>
      <h1>MULTIPRINT S.A. — Courrier</h1>
      <pre>${l.body}</pre>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center py-20"><div className="text-4xl mb-3">❓</div><p className="text-[var(--text-secondary)]">Courrier non trouvé</p></div>;

  const l = data.letter;
  const lt = LETTER_TYPES.find(t => t.id === l.type);
  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    ready: { label: 'Prêt à envoyer', cls: 'bg-brand-blue-soft text-brand-blue' },
    sent: { label: 'Envoyé', cls: 'bg-brand-green-soft text-brand-green' },
    archived: { label: 'Archivé', cls: 'bg-[var(--bg-input)] text-[var(--text-tertiary)]' },
  };
  const sc = statusConfig[l.status] || statusConfig.draft;

  return (
    <div>
      <div className="mb-5"><Link href="/letters" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue">← Retour</Link></div>

      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{lt?.icon || '📄'}</span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{l.subject}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.cls}`}>{sc.label}</span>
              <span className="text-xs text-[var(--text-secondary)]">{lt?.label || l.type}</span>
              <span className="text-xs text-[var(--text-secondary)]">Ton: {l.tone}</span>
              {l.supplier && <Link href={`/suppliers/${l.supplier.id}`} className="text-xs text-brand-blue hover:underline">🏢 {l.supplierName}</Link>}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.generatedBy === 'ia' ? 'bg-brand-purple-soft text-brand-purple' : 'bg-[var(--bg-input)] text-[var(--text-tertiary)]'}`}>
                {l.generatedBy === 'ia' ? '🤖 IA' : '✍️ Manuel'}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">Par {l.createdByName} · {formatDate(l.createdAt)}</span>
            </div>
          </div>

          {/* Supplier contact info */}
          {l.supplier && (
            <div className="text-right text-xs text-[var(--text-secondary)]">
              {l.supplier.contactName && <div>{l.supplier.contactName}</div>}
              {l.supplier.contactEmail && <div>{l.supplier.contactEmail}</div>}
              {l.supplier.city && <div>{l.supplier.city}, {l.supplier.country}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Letter preview */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl mb-5">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-secondary)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {editing ? '✏️ Mode édition' : '📄 Aperçu du courrier'}
          </h3>
          <div className="flex gap-2">
            {!editing && l.status === 'draft' && (
              <button onClick={() => setEditing(true)} className="px-3 py-1 text-xs bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg hover:border-brand-blue">✏️ Modifier</button>
            )}
            {editing && (
              <>
                <button onClick={() => { setEditing(false); setEditBody(l.body); }} className="px-3 py-1 text-xs bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg">Annuler</button>
                <button onClick={() => handleAction('update_body', { body: editBody })} className="px-3 py-1 text-xs bg-brand-blue text-white rounded-lg">💾 Sauvegarder</button>
              </>
            )}
          </div>
        </div>

        <div className="p-8">
          {editing ? (
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
              className="w-full min-h-[500px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg p-6 text-sm leading-relaxed resize-y font-sans focus:outline-none focus:border-brand-blue" />
          ) : (
            <div className="max-w-[650px] mx-auto bg-white dark:bg-[#1a1f2e] border border-[var(--border-primary)] rounded-lg p-10 shadow-sm">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {l.body}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handlePrint} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:bg-blue-600">🖨 Imprimer</button>
        {l.status === 'draft' && <button onClick={() => handleAction('mark_ready')} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600">✅ Prêt à envoyer</button>}
        {l.status === 'ready' && <button onClick={() => handleAction('mark_sent')} className="px-4 py-2 bg-brand-green text-white text-sm rounded-lg hover:bg-green-600">📤 Marquer envoyé</button>}
        {l.status === 'sent' && <button onClick={() => handleAction('archive')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg">📁 Archiver</button>}
        <button onClick={() => {
          const blob = new Blob([l.body], { type: 'text/plain;charset=utf-8;' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a');
          a.href = url; a.download = l.subject.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_') + '.txt'; a.click();
        }} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue">📥 Exporter TXT</button>
        {l.status === 'draft' && (
          <button onClick={() => { if (confirm('Supprimer ce brouillon ?')) handleAction('delete'); }}
            className="px-4 py-2 bg-brand-red-soft text-brand-red text-sm rounded-lg hover:bg-brand-red hover:text-white ml-auto">🗑 Supprimer</button>
        )}
      </div>
    </div>
  );
}
