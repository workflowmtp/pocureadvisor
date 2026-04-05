'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { POLES } from '@/lib/constants';
import KpiCard from '@/components/dashboard/KpiCard';

export default function SourcingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [trendFilter, setTrendFilter] = useState('');
  const [alertFilter, setAlertFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const fetchData = () => {
    fetch('/api/sourcing').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category || !form.currentPrice) return;
    await fetch('/api/sourcing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setCreateModal(false); setForm({}); fetchData();
  }

  const materials = (data?.materials || []).filter((m: any) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (trendFilter && m.trend !== trendFilter) return false;
    if (alertFilter && m.alertType !== alertFilter) return false;
    return true;
  });

  const stats = data?.stats || {};
  const alertConfig: Record<string, { label: string; cls: string }> = {
    risk: { label: '⚠ Risque hausse', cls: 'bg-brand-red-soft text-brand-red border-red-200 dark:border-red-800/30' },
    opportunity: { label: '✅ Opportunité', cls: 'bg-brand-green-soft text-brand-green border-green-200 dark:border-green-800/30' },
    neutral: { label: '→ Stable', cls: 'bg-[var(--bg-input)] text-[var(--text-tertiary)] border-[var(--border-primary)]' },
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Veille Matières Premières</h2>
        <button onClick={() => setCreateModal(true)} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600">+ Nouvelle matière</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <KpiCard icon="📊" label="Matières suivies" value={stats.total || 0} color="blue" />
        <KpiCard icon="📈" label="En hausse" value={stats.rising || 0} color="red" />
        <KpiCard icon="📉" label="En baisse" value={stats.falling || 0} color="green" />
        <KpiCard icon="✅" label="Opportunités" value={stats.opportunities || 0} color="green" />
        <KpiCard icon="⚠️" label="Risques" value={stats.risks || 0} color="orange" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Rechercher une matière..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm focus:border-brand-blue focus:outline-none w-64" />
        <select value={trendFilter} onChange={e => setTrendFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
          <option value="">Toutes tendances</option>
          <option value="rising">En hausse</option><option value="falling">En baisse</option><option value="stable">Stable</option>
        </select>
        <select value={alertFilter} onChange={e => setAlertFilter(e.target.value)} className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm">
          <option value="">Toutes alertes</option>
          <option value="risk">Risque</option><option value="opportunity">Opportunité</option><option value="neutral">Neutre</option>
        </select>
      </div>

      {/* Material cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {materials.map((m: any) => {
          const ac = alertConfig[m.alertType] || alertConfig.neutral;
          const variationColor = m.variationPct > 0 ? 'text-brand-red' : m.variationPct < 0 ? 'text-brand-green' : 'text-[var(--text-tertiary)]';
          const trendBars = generateBars(m.variationPct, m.trend);

          return (
            <div key={m.id} className="matiere-card bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 hover:border-brand-blue transition-colors cursor-pointer">
              <div className="matiere-header flex items-start justify-between mb-3">
                <div>
                  <div className="matiere-name text-base font-semibold text-[var(--text-primary)]">{m.name}</div>
                  <div className="matiere-category text-xs text-[var(--text-tertiary)]">{m.category}</div>
                </div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${ac.cls}`}>{ac.label}</span>
              </div>

              {/* Price */}
              <div className="matiere-price-row flex items-baseline gap-2 mb-3">
                <span className="matiere-price font-mono text-xl font-bold text-[var(--text-primary)]">{m.currentPrice.toLocaleString('fr-FR')}</span>
                <span className="matiere-unit text-xs text-[var(--text-tertiary)]">{m.unit}</span>
                <span className={`matiere-variation font-mono text-sm font-bold ${variationColor}`}>
                  {m.variationPct > 0 ? '+' : ''}{m.variationPct.toFixed(1)}%
                </span>
              </div>

              {/* Sparkline bars */}
              <div className="mini-chart flex items-end gap-0.5 h-8 mb-3">
                {trendBars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm transition-all" style={{
                    height: h + '%',
                    background: i === trendBars.length - 1
                      ? (m.trend === 'rising' ? '#EF4444' : m.trend === 'falling' ? '#10B981' : '#3B82F6')
                      : 'rgba(59,130,246,0.25)',
                  }} />
                ))}
              </div>

              {/* Poles */}
              <div className="matiere-poles flex gap-1">
                {(m.impactedPoles || []).map((p: string) => {
                  const pole = POLES.find(pl => pl.code === p);
                  return (
                    <span key={p} className="badge badge-info px-2 py-0.5 rounded text-[10px] font-bold font-mono" style={{ background: (pole?.color || '#3B82F6') + '20', color: pole?.color || '#3B82F6' }}>
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreateModal(false)}>
          <div className="modal bg-[var(--bg-modal)] border border-[var(--border-primary)] rounded-[var(--radius-xl)] w-full max-w-[600px] max-h-[85vh] overflow-y-auto shadow-[var(--shadow-xl)]" onClick={e => e.stopPropagation()}>
            <div className="modal-header p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="modal-title text-[var(--fs-lg)] font-bold text-[var(--text-primary)]">Nouvelle matière à suivre</h3>
              <button onClick={() => setCreateModal(false)} className="modal-close w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-soft)] transition-colors text-lg">✕</button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="modal-body p-6">
                {/* Ligne 1: Nom + Catégorie */}
                <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="mat-name" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Nom de la matière *</label>
                    <input id="mat-name" type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: Film BOPP 30μ, Encre flexo rouge..." />
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="mat-category" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Catégorie *</label>
                    <select id="mat-category" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} required
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                      <option value="">— Sélectionner —</option>
                      {['Encres','Solvants','Films','Carton','Métal','Résines','Consommables','Additifs','Vernis'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Ligne 2: Prix + Unité + Devise */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="mat-price" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Prix actuel *</label>
                    <input id="mat-price" type="number" step="0.01" value={form.currentPrice || ''} onChange={e => setForm({ ...form, currentPrice: parseFloat(e.target.value) })} required
                      className="login-input w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-base)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                      placeholder="Ex: 2450" />
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="mat-unit" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Unité de prix</label>
                    <select id="mat-unit" value={form.unit || '$/t'} onChange={e => setForm({ ...form, unit: e.target.value })}
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                      <option value="$/t">$/t</option>
                      <option value="€/t">€/t</option>
                      <option value="$/kg">$/kg</option>
                      <option value="€/kg">€/kg</option>
                      <option value="FCFA/kg">FCFA/kg</option>
                    </select>
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="mat-currency" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Devise</label>
                    <select id="mat-currency" value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="XAF">XAF</option>
                    </select>
                  </div>
                </div>

                {/* Ligne 3: Tendance + Alerte */}
                <div className="grid-2 grid grid-cols-2 gap-3 mb-3">
                  <div className="login-field mb-0">
                    <label htmlFor="mat-trend" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Tendance actuelle</label>
                    <select id="mat-trend" value={form.trend || 'stable'} onChange={e => setForm({ ...form, trend: e.target.value })}
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                      <option value="stable">→ Stable</option>
                      <option value="rising">📈 En hausse</option>
                      <option value="falling">📉 En baisse</option>
                    </select>
                  </div>
                  <div className="login-field mb-0">
                    <label htmlFor="mat-alert" className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Type d'alerte</label>
                    <select id="mat-alert" value={form.alertType || 'neutral'} onChange={e => setForm({ ...form, alertType: e.target.value })}
                      className="filter-select w-full py-3 px-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--fs-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-all cursor-pointer">
                      <option value="neutral">— Aucune</option>
                      <option value="risk">⚠️ Risque de hausse</option>
                      <option value="opportunity">✅ Opportunité d'achat</option>
                    </select>
                  </div>
                </div>

                {/* Pôles impactés */}
                <div className="login-field">
                  <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Pôles impactés *</label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {POLES.map(p => (
                      <label key={p.code} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] cursor-pointer hover:border-[var(--accent-blue)] transition-colors">
                        <input type="checkbox" checked={(form.impactedPoles || []).includes(p.code)}
                          onChange={e => {
                            const poles = form.impactedPoles || [];
                            setForm({ ...form, impactedPoles: e.target.checked ? [...poles, p.code] : poles.filter((x: string) => x !== p.code) });
                          }}
                          className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]" />
                        <span className="text-sm font-medium" style={{ color: p.color }}>{p.code}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer p-4 border-t border-[var(--border-primary)] flex justify-end gap-3">
                <button type="button" onClick={() => setCreateModal(false)} className="btn btn-secondary px-4 py-2 bg-transparent border border-[var(--border-primary)] text-[var(--text-secondary)] text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors">Annuler</button>
                <button type="submit" className="btn btn-primary px-4 py-2 bg-[var(--accent-blue)] text-white text-[var(--fs-sm)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-blue-hover)] hover:shadow-[var(--shadow-glow-blue)] transition-all">✅ Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function generateBars(variation: number, trend: string): number[] {
  const bars: number[] = [];
  const base = 40 + Math.random() * 20;
  for (let i = 0; i < 12; i++) {
    const factor = trend === 'rising' ? 1 + (i * 0.03) : trend === 'falling' ? 1 - (i * 0.02) : 1 + (Math.random() - 0.5) * 0.1;
    bars.push(Math.min(100, Math.max(15, base * factor + (Math.random() - 0.5) * 15)));
  }
  return bars;
}
