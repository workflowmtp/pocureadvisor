import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { ScoreBadge, TrendBadge, SeverityBadge, PriorityTag } from '@/components/shared/Badges';

// ─── Top Suppliers Table ───
interface TopSupplier {
  id: string;
  code: string;
  name: string;
  score: number;
  volume: number;
  trend: string;
  riskLevel: string;
  dependencyRatio: number;
}

export function SupplierRanking({ suppliers }: { suppliers: TopSupplier[] }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-secondary)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">🏢 Top fournisseurs par volume</h3>
        <Link href="/suppliers" className="text-xs text-brand-blue hover:underline">Voir tous →</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-4 py-2 text-left font-semibold">#</th>
              <th className="px-4 py-2 text-left font-semibold">Fournisseur</th>
              <th className="px-4 py-2 text-center font-semibold">Score</th>
              <th className="px-4 py-2 text-right font-semibold">Volume YTD</th>
              <th className="px-4 py-2 text-center font-semibold">Trend</th>
              <th className="px-4 py-2 text-right font-semibold">Dépendance</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s, i) => (
              <tr key={s.id} className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-tertiary)]">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/suppliers/${s.id}`} className="hover:text-brand-blue transition-colors">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{s.name}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{s.code}</div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-center"><ScoreBadge score={s.score} size="sm" /></td>
                <td className="px-4 py-3 text-right table-amount">{formatCurrency(s.volume)}</td>
                <td className="px-4 py-3 text-center"><TrendBadge trend={s.trend} /></td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-sm font-semibold ${s.dependencyRatio > 60 ? 'text-brand-red' : s.dependencyRatio > 40 ? 'text-brand-orange' : 'text-[var(--text-secondary)]'}`}>
                    {s.dependencyRatio}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Top Anomalies Table ───
interface TopAnomaly {
  id: string;
  title: string;
  category: string;
  severity: string;
  supplier: string;
  impact: number | null;
  priority: number;
}

export function AnomalyRanking({ anomalies }: { anomalies: TopAnomaly[] }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-secondary)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">🛡️ Anomalies prioritaires</h3>
        <Link href="/audit" className="text-xs text-brand-blue hover:underline">Voir toutes →</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-4 py-2 text-left font-semibold">P</th>
              <th className="px-4 py-2 text-left font-semibold">Titre</th>
              <th className="px-4 py-2 text-center font-semibold">Sévérité</th>
              <th className="px-4 py-2 text-left font-semibold">Fournisseur</th>
              <th className="px-4 py-2 text-right font-semibold">Impact</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                <td className="px-4 py-3"><PriorityTag priority={a.priority} /></td>
                <td className="px-4 py-3">
                  <Link href={`/audit/${a.id}`} className="text-sm text-[var(--text-primary)] hover:text-brand-blue transition-colors line-clamp-1">
                    {a.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center"><SeverityBadge severity={a.severity} /></td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{a.supplier}</td>
                <td className="px-4 py-3 text-right table-amount">{a.impact ? formatCurrency(a.impact) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
