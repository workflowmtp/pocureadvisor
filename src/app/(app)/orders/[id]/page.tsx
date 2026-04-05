'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDate, truncate } from '@/lib/format';
import { ScoreBadge, SeverityBadge, PriorityTag } from '@/components/shared/Badges';
import OrderPipeline from '@/components/orders/OrderPipeline';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/orders/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center py-20"><div className="text-4xl mb-3">❓</div><p className="text-[var(--text-secondary)]">Commande non trouvée</p></div>;

  const { order, lines, anomalies, invoices, delayImpact, pipeline } = data;
  const isLateActive = order.isLate && !['received', 'closed'].includes(order.status);

  return (
    <div>
      {/* Back */}
      <div className="mb-5">
        <Link href="/orders" className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue transition-colors">← Retour</Link>
      </div>

      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{order.poNumber}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-green-soft text-brand-green">🔗 Sage X3</span>
              {isLateActive && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-red-soft text-brand-red">⚠ Retard +{order.delayDays} jours</span>
              )}
              {order.riskOfStockout && isLateActive && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-red text-white">🚨 Risque rupture</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)] flex-wrap">
              <Link href={`/suppliers/${order.supplierId}`} className="hover:text-brand-blue transition-colors">🏢 {order.supplierName} ({order.supplierCode})</Link>
              <span>📦 Pôle {order.poleId}</span>
              <span>📅 Créée {formatDate(order.dateCreated)}</span>
              <span>🎯 Prévue {formatDate(order.dateExpected)}</span>
              {order.x3Id && <span className="font-mono text-brand-purple">X3: {order.x3Id}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {isLateActive && (
              <button onClick={() => router.push('/letters')} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
                ✉️ Relancer
              </button>
            )}
            <button onClick={() => router.push('/audit')} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] text-sm rounded-lg hover:border-brand-blue transition-colors">
              ⚠ Signaler
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <OrderPipeline steps={pipeline.steps} currentStep={pipeline.currentStep} isLate={isLateActive} />

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <InfoCard label="Montant total" value={formatCurrency(order.totalAmount)} />
        <InfoCard label="Devise" value={order.currency} />
        <InfoCard label="Lignes articles" value={`${lines.length} ligne(s)`} />
        <InfoCard label="Fournisseur score" value={<ScoreBadge score={order.supplierScore} size="sm" />} />
      </div>

      {/* Delay impact */}
      {isLateActive && delayImpact > 0 && (
        <div className="flex items-start gap-3 p-4 bg-brand-red-soft border border-red-200 dark:border-red-800/30 rounded-xl mb-5">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-sm font-semibold text-brand-red">Impact financier du retard</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              Retard de {order.delayDays} jours sur un montant de {formatCurrency(order.totalAmount)}.
              Coût estimé du retard : <strong className="text-brand-red">{formatCurrency(delayImpact)}</strong> (0.1%/jour).
            </div>
          </div>
        </div>
      )}

      {/* Order lines */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-[var(--border-secondary)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lignes de commande ({lines.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-4 py-2 text-left font-semibold">Article</th>
                <th className="px-3 py-2 text-left font-semibold">Désignation</th>
                <th className="px-3 py-2 text-right font-semibold">Quantité</th>
                <th className="px-3 py-2 text-right font-semibold">Prix unitaire</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2 text-center font-semibold">Couverture stock</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => (
                <tr key={l.id} className="border-b border-[var(--border-secondary)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue">{l.articleCode}</td>
                  <td className="px-3 py-3 text-sm">{truncate(l.articleDesignation, 35)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{l.quantity.toLocaleString('fr-FR')} {l.unit}</td>
                  <td className="px-3 py-3 text-right table-amount">{formatCurrency(l.unitPrice)}</td>
                  <td className="px-3 py-3 text-right table-amount">{formatCurrency(l.totalPrice)}</td>
                  <td className="px-3 py-3 text-center">
                    {l.stockCoverage !== null ? (
                      <span className={`font-mono text-xs font-bold ${l.stockCoverage < 10 ? 'text-brand-red' : l.stockCoverage < 20 ? 'text-brand-orange' : 'text-brand-green'}`}>
                        {l.stockCoverage}j
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalies linked */}
      {anomalies.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-[var(--border-secondary)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">🛡️ Anomalies liées ({anomalies.length})</h3>
          </div>
          <div className="divide-y divide-[var(--border-secondary)]">
            {anomalies.map((a: any) => (
              <Link key={a.id} href={`/audit/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-card-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  <PriorityTag priority={a.priority} />
                  <div>
                    <div className="text-sm text-[var(--text-primary)]">{truncate(a.title, 45)}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{a.category} · {formatDate(a.dateDetected)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={a.severity} />
                  {a.financialImpact && <span className="table-amount text-brand-red">{formatCurrency(a.financialImpact)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Invoices linked */}
      {invoices.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-secondary)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">📄 Factures liées ({invoices.length})</h3>
          </div>
          <div className="divide-y divide-[var(--border-secondary)]">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-mono font-medium">{inv.invoiceNumber}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{formatDate(inv.dateInvoice)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="table-amount">{formatCurrency(inv.amountTtc)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.status === 'paid' ? 'bg-brand-green-soft text-brand-green' : inv.status === 'disputed' ? 'bg-brand-red-soft text-brand-red' : 'bg-brand-blue-soft text-brand-blue'}`}>{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
