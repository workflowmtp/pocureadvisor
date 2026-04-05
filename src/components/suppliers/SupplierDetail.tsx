'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, truncate } from '@/lib/format';
import { ScoreBadge, SupplierStatusBadge, TrendBadge, X3Badge, SeverityBadge, PriorityTag } from '@/components/shared/Badges';
import ScoreRadar from '@/components/suppliers/ScoreRadar';

interface SupplierDetailProps {
  data: any;
}

const TABS = [
  { id: 'identity', label: '📋 Identité' },
  { id: 'scoring', label: '📊 Scoring' },
  { id: 'orders', label: '📦 Commandes' },
  { id: 'incidents', label: '⚠️ Incidents' },
  { id: 'contracts', label: '📑 Contrats' },
  { id: 'ia', label: '🤖 IA' },
];

export default function SupplierDetail({ data }: SupplierDetailProps) {
  const [tab, setTab] = useState('identity');
  const { supplier, scoring, orders, anomalies, invoices, negotiations, letters, orderStats, anomalyStats, aiAnalysis } = data;

  return (
    <div>
      {/* ─── Back + Header ─── */}
      <div className="flex items-center gap-4 mb-5">
        <Link href="/suppliers" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue transition-colors">
          ← Retour
        </Link>
      </div>

      {/* ─── Supplier Header ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-blue-soft text-brand-blue flex items-center justify-center text-lg font-bold font-mono flex-shrink-0">
              {supplier.code.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{supplier.name}</h2>
                <SupplierStatusBadge status={supplier.status} />
                <X3Badge status={supplier.x3SyncStatus} />
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-[var(--text-secondary)] flex-wrap">
                <span>📍 {supplier.city}, {supplier.country}</span>
                <span>💰 {supplier.currency}</span>
                <span>📦 {supplier.incotermDefault || '—'}</span>
                <span>⏱️ Délai: {supplier.avgLeadTimeDays}j</span>
                <span>📄 {supplier.paymentTerms || '—'}</span>
                {supplier.x3Id && <span className="font-mono text-brand-purple">X3: {supplier.x3Id}</span>}
              </div>
            </div>
          </div>
          <div className="text-center flex-shrink-0">
            <ScoreBadge score={scoring.global} size="lg" />
            <div className="text-[10px] text-[var(--text-tertiary)] mt-1">Score global</div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 mb-5 border-b border-[var(--border-primary)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      {tab === 'identity' && <TabIdentity supplier={supplier} />}
      {tab === 'scoring' && <TabScoring scoring={scoring} />}
      {tab === 'orders' && <TabOrders orders={orders} stats={orderStats} />}
      {tab === 'incidents' && <TabIncidents anomalies={anomalies} stats={anomalyStats} />}
      {tab === 'contracts' && <TabContracts supplier={supplier} invoices={invoices} negotiations={negotiations} />}
      {tab === 'ia' && <TabAI analysis={aiAnalysis} supplier={supplier} />}
    </div>
  );
}

// ═══════ TAB: IDENTITÉ ═══════
function TabIdentity({ supplier }: { supplier: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Informations générales</h3>
        <div className="space-y-3">
          <InfoRow label="Raison sociale" value={supplier.name} />
          <InfoRow label="Code" value={supplier.code} mono />
          <InfoRow label="Pays" value={supplier.country} />
          <InfoRow label="Ville" value={supplier.city || '—'} />
          <InfoRow label="Devise" value={supplier.currency} />
          <InfoRow label="Catégorie" value={supplier.categoryName} />
          <InfoRow label="Incoterm par défaut" value={supplier.incotermDefault || '—'} />
          <InfoRow label="Conditions paiement" value={supplier.paymentTerms || '—'} />
          <InfoRow label="Délai moyen" value={`${supplier.avgLeadTimeDays} jours`} />
        </div>
      </div>
      <div className="space-y-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Contact</h3>
          <div className="space-y-3">
            <InfoRow label="Nom" value={supplier.contactName || '—'} />
            <InfoRow label="Email" value={supplier.contactEmail || '—'} />
            <InfoRow label="Téléphone" value={supplier.contactPhone || '—'} />
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Certifications</h3>
          {supplier.certifications?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {supplier.certifications.map((c: string) => (
                <span key={c} className="px-3 py-1 bg-brand-green-soft text-brand-green border border-green-200 dark:border-green-800/30 rounded-full text-xs font-medium">
                  ✓ {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">Aucune certification enregistrée</p>
          )}
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Indicateurs clés</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Volume YTD" value={formatCurrency(supplier.volumeYtd)} />
            <StatBox label="Dépendance" value={`${supplier.dependencyRatio}%`} color={supplier.dependencyRatio > 60 ? 'red' : supplier.dependencyRatio > 40 ? 'orange' : 'green'} />
            <StatBox label="Incidents" value={String(supplier.incidentsCount)} color={supplier.incidentsCount > 5 ? 'red' : 'default'} />
            <StatBox label="Anomalies" value={String(supplier.anomaliesCount)} color={supplier.anomaliesCount > 3 ? 'orange' : 'default'} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════ TAB: SCORING ═══════
function TabScoring({ scoring }: { scoring: any }) {
  return <ScoreRadar scoring={scoring} />;
}

// ═══════ TAB: COMMANDES ═══════
function TabOrders({ orders, stats }: { orders: any[]; stats: any }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatBox label="Total commandes" value={String(stats.total)} />
        <StatBox label="En retard" value={String(stats.lateCount)} color={stats.lateCount > 0 ? 'red' : 'green'} />
        <StatBox label="Volume total" value={formatCurrency(stats.totalAmount)} />
        <StatBox label="Retard moyen" value={stats.avgDelay > 0 ? `${stats.avgDelay}j` : '—'} color={stats.avgDelay > 7 ? 'red' : 'default'} />
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-4 py-2 text-left font-semibold">N° PO</th>
              <th className="px-3 py-2 text-left font-semibold">Pôle</th>
              <th className="px-3 py-2 text-left font-semibold">Date création</th>
              <th className="px-3 py-2 text-left font-semibold">Date prévue</th>
              <th className="px-3 py-2 text-right font-semibold">Montant</th>
              <th className="px-3 py-2 text-center font-semibold">Statut</th>
              <th className="px-3 py-2 text-center font-semibold">Retard</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)]">
                <td className="px-4 py-3">
                  <Link href={`/orders/${o.id}`} className="font-mono text-sm text-brand-blue hover:underline">{o.poNumber}</Link>
                </td>
                <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{o.poleId}</td>
                <td className="px-3 py-3 text-xs">{formatDate(o.dateCreated)}</td>
                <td className="px-3 py-3 text-xs">{formatDate(o.dateExpected)}</td>
                <td className="px-3 py-3 text-right table-amount">{formatCurrency(o.totalAmount)}</td>
                <td className="px-3 py-3 text-center text-xs">{o.status}</td>
                <td className="px-3 py-3 text-center">
                  {o.isLate && o.delayDays > 0 ? (
                    <span className="font-mono text-xs font-bold text-brand-red">+{o.delayDays}j</span>
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-sm text-[var(--text-tertiary)]">Aucune commande</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════ TAB: INCIDENTS ═══════
function TabIncidents({ anomalies, stats }: { anomalies: any[]; stats: any }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatBox label="Total anomalies" value={String(stats.total)} />
        <StatBox label="Ouvertes" value={String(stats.open)} color={stats.open > 0 ? 'orange' : 'green'} />
        <StatBox label="Critiques" value={String(stats.criticals)} color={stats.criticals > 0 ? 'red' : 'green'} />
        <StatBox label="Impact financier" value={formatCurrency(stats.totalImpact)} color={stats.totalImpact > 10000000 ? 'red' : 'default'} />
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-4 py-2 text-left font-semibold">ID</th>
              <th className="px-3 py-2 text-center font-semibold">P</th>
              <th className="px-3 py-2 text-left font-semibold">Catégorie</th>
              <th className="px-3 py-2 text-center font-semibold">Sévérité</th>
              <th className="px-3 py-2 text-left font-semibold">Titre</th>
              <th className="px-3 py-2 text-right font-semibold">Impact</th>
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-center font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a: any) => (
              <tr key={a.id} className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)]">
                <td className="px-4 py-3"><Link href={`/audit/${a.id}`} className="font-mono text-xs text-brand-blue hover:underline">{a.id.substring(0, 8).toUpperCase()}</Link></td>
                <td className="px-3 py-3 text-center"><PriorityTag priority={a.priority} /></td>
                <td className="px-3 py-3 text-xs">{a.category}</td>
                <td className="px-3 py-3 text-center"><SeverityBadge severity={a.severity} /></td>
                <td className="px-3 py-3 text-xs text-[var(--text-primary)]">{truncate(a.title, 35)}</td>
                <td className="px-3 py-3 text-right table-amount">{a.financialImpact ? formatCurrency(a.financialImpact) : '—'}</td>
                <td className="px-3 py-3 text-xs">{formatDate(a.dateDetected)}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.status === 'open' ? 'bg-brand-orange-soft text-brand-orange' : a.status === 'investigating' ? 'bg-brand-blue-soft text-brand-blue' : 'bg-brand-green-soft text-brand-green'}`}>
                    {a.status === 'open' ? 'Ouvert' : a.status === 'investigating' ? 'Investigation' : 'Résolu'}
                  </span>
                </td>
              </tr>
            ))}
            {anomalies.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-sm text-[var(--text-tertiary)]">Aucune anomalie — Profil propre ✅</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════ TAB: CONTRATS ═══════
function TabContracts({ supplier, invoices, negotiations }: { supplier: any; invoices: any[]; negotiations: any[] }) {
  return (
    <div className="space-y-5">
      {/* Contract info */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Contrat en cours</h3>
        <div className="space-y-3">
          <InfoRow label="Référence contrat" value={supplier.contractRef || 'Aucun contrat cadre enregistré'} />
          <InfoRow label="Échéance" value={supplier.contractExpiry ? formatDate(supplier.contractExpiry) : '—'} />
          <InfoRow label="Conditions paiement" value={supplier.paymentTerms || '—'} />
          <InfoRow label="Incoterm" value={supplier.incotermDefault || '—'} />
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Dernières factures ({invoices.length})</h3>
        {invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-lg">
                <div>
                  <div className="text-sm font-mono font-medium text-[var(--text-primary)]">{inv.invoiceNumber}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{formatDate(inv.dateInvoice)}</div>
                </div>
                <div className="text-right">
                  <div className="table-amount">{formatCurrency(inv.amountTtc)}</div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.status === 'paid' ? 'bg-brand-green-soft text-brand-green' : inv.status === 'disputed' ? 'bg-brand-red-soft text-brand-red' : inv.status === 'blocked' ? 'bg-brand-red-soft text-brand-red' : 'bg-brand-blue-soft text-brand-blue'}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">Aucune facture enregistrée</p>
        )}
      </div>

      {/* Negotiations */}
      {negotiations.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Négociations ({negotiations.length})</h3>
          <div className="space-y-2">
            {negotiations.map((n: any) => (
              <Link key={n.id} href={`/negotiations/${n.id}`} className="flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{truncate(n.subject, 40)}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{formatDate(n.dateStart)} — Enjeu: {formatCurrency(n.financialStake)}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${n.status === 'closed_won' ? 'bg-brand-green-soft text-brand-green' : 'bg-brand-blue-soft text-brand-blue'}`}>{n.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════ TAB: IA ═══════
function TabAI({ analysis, supplier }: { analysis: string; supplier: any }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🤖</span>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Analyse ProcureBot — {supplier.name}</h3>
        <span className="px-2 py-0.5 bg-brand-purple-soft text-brand-purple text-[10px] font-bold rounded-full">IA</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
        {analysis.split('\n').map((line: string, i: number) => {
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={i} className="font-bold text-[var(--text-primary)] mt-3">{line.replace(/\*\*/g, '')}</p>;
          }
          if (line.startsWith('- ')) {
            return <p key={i} className="ml-4 text-sm">• {line.substring(2)}</p>;
          }
          if (line.includes('**')) {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return <p key={i} className="text-sm">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-[var(--text-primary)]">{p}</strong> : p)}</p>;
          }
          return line ? <p key={i} className="text-sm">{line}</p> : <br key={i} />;
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-[var(--border-secondary)]">
        <Link href="/ai" className="px-4 py-2 bg-brand-blue-soft text-brand-blue text-sm font-medium rounded-lg hover:bg-brand-blue hover:text-white transition-colors">
          🤖 Approfondir avec ProcureBot
        </Link>
      </div>
    </div>
  );
}

// ═══════ HELPERS ═══════
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-secondary)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span className={`text-sm text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, color = 'default' }: { label: string; value: string; color?: string }) {
  const colorClass = color === 'red' ? 'text-brand-red' : color === 'orange' ? 'text-brand-orange' : color === 'green' ? 'text-brand-green' : 'text-[var(--text-primary)]';
  return (
    <div className="bg-[var(--bg-input)] rounded-lg p-3 text-center">
      <div className={`font-mono text-lg font-bold ${colorClass}`}>{value}</div>
      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
