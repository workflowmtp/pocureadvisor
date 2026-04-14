'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import Link from 'next/link';
import KpiCard from '@/components/dashboard/KpiCard';
import AlertCard from '@/components/dashboard/AlertCard';
import { VolumeByPoleChart, CategoryDistributionChart } from '@/components/dashboard/Charts';
import { SupplierRanking, AnomalyRanking } from '@/components/dashboard/Rankings';
import { formatCurrency } from '@/lib/format';

interface DashboardData {
  kpis: {
    activeSuppliers: number;
    suppliersAtRisk: number;
    pendingOrders: number;
    lateOrders: number;
    ruptureRisk: number;
    openAnomalies: number;
    criticalAnomalies: number;
    totalVolumeYtd: number;
    totalFinancialImpact: number;
    volumeAchats: number;
    savingsRealized: number;
    savingsPotential: number;
    conformityRate: number;
    totalOrders: number;
  };
  alerts: { critical: any[]; warning: any[]; opportunity: any[] };
  charts: {
    volumeByPole: { pole: string; amount: number }[];
    categoryDistribution: { name: string; value: number }[];
  };
  topSuppliers: any[];
  topAnomalies: any[];
}

// Memoized recommendation item
const RecoItem = memo(function RecoItem({ priority, text, action, href }: { priority: string; text: string; action: string; href: string }) {
  const icons: Record<string, string> = { critical: '🔴', high: '🟠', info: '🔵' };
  return (
    <div className="px-5 py-3 flex items-start gap-3 hover:bg-[var(--bg-card-hover)] transition-colors">
      <span className="text-sm mt-0.5">{icons[priority] || '🔵'}</span>
      <p className="flex-1 text-sm text-[var(--text-secondary)] leading-relaxed">{text}</p>
      <Link href={href} className="flex-shrink-0 px-3 py-1 bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] text-xs font-medium rounded-full hover:bg-[var(--accent-blue)] hover:text-white transition-colors">
        {action}
      </Link>
    </div>
  );
});

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('30j');
  const [poleFilter, setPoleFilter] = useState('all');

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Memoize derived data
  const kpis = useMemo(() => data?.kpis, [data?.kpis]);
  const alerts = useMemo(() => data?.alerts, [data?.alerts]);
  const charts = useMemo(() => data?.charts, [data?.charts]);
  const topSuppliers = useMemo(() => data?.topSuppliers, [data?.topSuppliers]);
  const topAnomalies = useMemo(() => data?.topAnomalies, [data?.topAnomalies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!data || !kpis || !alerts || !charts) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-[var(--text-secondary)]">Erreur de chargement des données</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Filtres ─── */}
      <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">Période</label>
          <select 
            value={periodFilter} 
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs sm:text-sm focus:outline-none"
          >
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
            <option value="year">Année</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">Pôle</label>
          <select 
            value={poleFilter} 
            onChange={(e) => setPoleFilter(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs sm:text-sm focus:outline-none"
          >
            <option value="all">Tous les pôles</option>
            <option value="industrial">Industriel</option>
            <option value="maintenance">Maintenance</option>
            <option value="logistics">Logistique</option>
            <option value="it">Informatique</option>
          </select>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="kpi-grid">
        <KpiCard icon="💰" label="Volume achats" value={formatCurrency(kpis.volumeAchats)} color="blue" trendValue={8.3} trendDir="up" />
        <KpiCard icon="📉" label="Économies réalisées" value={formatCurrency(kpis.savingsRealized)} color="green" trendValue={12.5} trendDir="up" />
        <KpiCard icon="🎯" label="Économies potentielles" value={formatCurrency(kpis.savingsPotential)} color="purple" trendValue={0} trendDir="neutral" />
        <KpiCard icon="⚠️" label="Anomalies ouvertes" value={`${kpis.openAnomalies} (${kpis.criticalAnomalies} critiques)`} color={kpis.openAnomalies > 10 ? 'red' : 'orange'} trendValue={0} trendDir="neutral" />
        <KpiCard icon="📦" label="Commandes en retard" value={`${kpis.lateOrders} / ${kpis.totalOrders}`} color={kpis.lateOrders > 3 ? 'red' : 'orange'} trendValue={-2} trendDir="down" />
        <KpiCard icon="✅" label="Conformité documentaire" value={`${kpis.conformityRate}%`} color={kpis.conformityRate >= 80 ? 'green' : 'orange'} trendValue={3.1} trendDir="up" />
      </div>

      {/* ─── Alertes 3 colonnes ─── */}
      <div className="alerts-grid">
        <div className="alerts-column">
          <div className="alerts-column-header critical">
            🔴 Alertes critiques 
            <span className="badge badge-critical">{alerts.critical.length}</span>
          </div>
          <div className="alerts-column-body">
            {alerts.critical.slice(0, 5).map((alert, i) => (
              <div key={i} className="alert-item critical-item" onClick={() => window.location.href = '/audit'}>
                <div className="alert-item-title">{alert.title}</div>
                <div className="alert-item-desc">{alert.description}</div>
                <div className="alert-item-meta">
                  {alert.financialImpact && <span>{formatCurrency(alert.financialImpact)}</span>}
                  {alert.supplier && <span>• {alert.supplier}</span>}
                </div>
              </div>
            ))}
            {alerts.critical.length === 0 && (
              <div className="text-center p-4 text-xs text-[var(--text-tertiary)]">Aucune alerte critique</div>
            )}
          </div>
        </div>

        <div className="alerts-column">
          <div className="alerts-column-header warning">
            🟡 Points d'attention 
            <span className="badge badge-high">{alerts.warning.length}</span>
          </div>
          <div className="alerts-column-body">
            {alerts.warning.slice(0, 5).map((alert, i) => (
              <div key={i} className="alert-item warning-item" onClick={() => window.location.href = '/orders'}>
                <div className="alert-item-title">{alert.title}</div>
                <div className="alert-item-desc">{alert.description}</div>
                <div className="alert-item-meta">
                  {alert.amount && <span>{formatCurrency(alert.amount)}</span>}
                </div>
              </div>
            ))}
            {alerts.warning.length === 0 && (
              <div className="text-center p-4 text-xs text-[var(--text-tertiary)]">Aucun point d'attention</div>
            )}
          </div>
        </div>

        <div className="alerts-column">
          <div className="alerts-column-header opportunity">
            🟢 Opportunités 
            <span className="badge badge-success">{alerts.opportunity.length}</span>
          </div>
          <div className="alerts-column-body">
            {alerts.opportunity.slice(0, 5).map((alert, i) => (
              <div key={i} className="alert-item opportunity-item">
                <div className="alert-item-title">{alert.title}</div>
                <div className="alert-item-desc">{alert.description}</div>
                <div className="alert-item-meta">
                  {alert.poles && <span>Pôles: {alert.poles.join(', ')}</span>}
                </div>
              </div>
            ))}
            {alerts.opportunity.length === 0 && (
              <div className="text-center p-4 text-xs text-[var(--text-tertiary)]">Aucune opportunité détectée</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Charts ─── */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-title">Volume achats par pôle</div>
          <div className="chart-wrapper">
            <VolumeByPoleChart data={charts.volumeByPole} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card-title">Répartition par catégorie</div>
          <div className="chart-wrapper">
            <CategoryDistributionChart data={charts.categoryDistribution} />
          </div>
        </div>
      </div>

      {/* ─── Top Tables ─── */}
      <div className="top-tables-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top 5 fournisseurs par volume</div>
            <Link href="/suppliers" className="btn btn-sm btn-secondary">Voir tout</Link>
          </div>
          <SupplierRanking suppliers={topSuppliers || []} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top 5 anomalies par impact</div>
            <Link href="/audit" className="btn btn-sm btn-secondary">Voir tout</Link>
          </div>
          <AnomalyRanking anomalies={topAnomalies || []} />
        </div>
      </div>

      {/* ─── ProcureBot Recommendations ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-secondary)] flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recommandations ProcureBot</h3>
          <span className="px-2 py-0.5 bg-[var(--accent-purple-soft)] text-[var(--accent-purple)] text-[10px] font-bold rounded-full">IA</span>
        </div>
        <div className="divide-y divide-[var(--border-secondary)]">
          {kpis.criticalAnomalies > 0 && (
            <RecoItem priority="critical" text={`${kpis.criticalAnomalies} anomalie(s) critique(s) requièrent une action immédiate. Impact total: ${formatCurrency(kpis.totalFinancialImpact)}.`} action="Voir les anomalies" href="/audit" />
          )}
          {kpis.ruptureRisk > 0 && (
            <RecoItem priority="critical" text={`${kpis.ruptureRisk} commande(s) avec risque de rupture de stock. Relance urgente recommandée.`} action="Voir les commandes" href="/orders" />
          )}
          {kpis.suppliersAtRisk > 0 && (
            <RecoItem priority="high" text={`${kpis.suppliersAtRisk} fournisseur(s) à risque élevé ou critique. Évaluation et alternatives à planifier.`} action="Voir les fournisseurs" href="/suppliers" />
          )}
          <RecoItem priority="info" text="Consultez la veille matières premières pour identifier les opportunités d'achat anticipé sur les résines PE en baisse." action="Veille marché" href="/sourcing" />
          <RecoItem priority="info" text="Posez vos questions à ProcureBot pour une analyse approfondie de vos données achats." action="Ouvrir ProcureBot" href="/ai" />
        </div>
      </div>
    </div>
  );
}
