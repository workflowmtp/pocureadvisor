'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, truncate } from '@/lib/format';
import { ANOMALY_CATEGORY_ICONS, SEVERITY_CONFIG } from '@/lib/constants';

type Dimension = 'supplier' | 'user' | 'pole' | 'category';
const CATEGORIES = ['Prix', 'Quantité', 'Procédure', 'Document', 'Fraude', 'Conformité', 'Discipline', 'Qualité', 'Risque'];

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  open: { label: 'Ouvert', cls: 'badge-high' },
  investigating: { label: 'Investigation', cls: 'badge-info' },
  resolved: { label: 'Résolu', cls: 'badge-success' },
};

export default function AuditMatrixPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<Dimension>('supplier');
  const [drillDown, setDrillDown] = useState<any[] | null>(null);
  const [drillLabel, setDrillLabel] = useState('');

  useEffect(() => {
    fetch('/api/anomalies')
      .then(r => r.json())
      .then(d => { setAnomalies(d.anomalies || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  // KPIs
  const total = anomalies.length;
  const openCount = anomalies.filter(a => a.status !== 'resolved').length;
  const totalImpact = anomalies.filter(a => a.status !== 'resolved').reduce((s: number, a: any) => s + (a.financialImpact || 0), 0);

  // Find max supplier
  const supCounts: Record<string, { name: string; count: number }> = {};
  anomalies.forEach(a => {
    if (a.supplier) {
      if (!supCounts[a.supplier.id]) supCounts[a.supplier.id] = { name: a.supplier.name, count: 0 };
      supCounts[a.supplier.id].count++;
    }
  });
  const maxSup = Object.values(supCounts).sort((a, b) => b.count - a.count)[0];

  // Find max category
  const catCounts: Record<string, number> = {};
  anomalies.forEach(a => { catCounts[a.category] = (catCounts[a.category] || 0) + 1; });
  const maxCatEntry = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  // Build heatmap
  const rows: Record<string, { label: string; cats: Record<string, any[]> }> = {};
  const cellStore: Record<string, any[]> = {};
  
  anomalies.forEach(a => {
    let key = '', label = '';
    if (dimension === 'supplier') { if (!a.supplier) return; key = a.supplier.id; label = truncate(a.supplier.name, 25); }
    else if (dimension === 'user') { if (!a.user) return; key = a.user.id; label = truncate(a.user.fullName, 25); }
    else if (dimension === 'pole') { key = a.poleId || 'N/A'; label = a.poleId || 'N/A'; }
    else if (dimension === 'category') { key = a.severity; label = SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG]?.label || a.severity; }
    if (!key) return;
    if (!rows[key]) rows[key] = { label, cats: {} };
    if (!rows[key].cats[a.category]) rows[key].cats[a.category] = [];
    rows[key].cats[a.category].push(a);
    const ck = key + '|' + a.category;
    if (!cellStore[ck]) cellStore[ck] = [];
    cellStore[ck].push(a);
  });

  const rowKeys = Object.keys(rows).sort((a, b) => {
    const tA = Object.values(rows[a].cats).flat().length;
    const tB = Object.values(rows[b].cats).flat().length;
    return tB - tA;
  });

  function heatmapColor(count: number): string {
    if (count >= 5) return '#EF4444';
    if (count >= 3) return '#F59E0B';
    if (count >= 1) return '#3B82F6';
    return '#6A6A88';
  }

  function handleCellClick(cellKey: string, items: any[], label: string) {
    if (items.length === 0) return;
    setDrillDown(items);
    setDrillLabel(label);
  }

  function exportCSV() {
    const rows = anomalies.map(a => [a.id, a.category, a.severity, a.title, a.supplier?.name || '', a.financialImpact || '', a.dateDetected, a.status].join(';'));
    const csv = '\ufeff' + 'ID;Catégorie;Sévérité;Titre;Fournisseur;Impact;Date;Statut\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ProcureAdvisor_Matrix.csv'; a.click();
  }

  const tabs: { id: Dimension; label: string }[] = [
    { id: 'supplier', label: 'Par Fournisseur' },
    { id: 'user', label: 'Par Utilisateur' },
    { id: 'pole', label: 'Par Pôle' },
    { id: 'category', label: 'Par Catégorie' },
  ];

  const dimLabel = dimension === 'supplier' ? 'Fournisseur' : dimension === 'user' ? 'Utilisateur' : dimension === 'pole' ? 'Pôle' : 'Sévérité';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
        <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)' }}>Matrice de concentration des risques</div>
        <button className="btn btn-sm btn-secondary" onClick={exportCSV}>📤 Exporter CSV</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)' }}>📊</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Total anomalies</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-red-soft)', color: 'var(--accent-red)' }}>🔴</div>
          <div className="kpi-value">{openCount}</div>
          <div className="kpi-label">Non résolues</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-orange-soft)', color: 'var(--accent-orange)' }}>💰</div>
          <div className="kpi-value">{formatCurrency(totalImpact)}</div>
          <div className="kpi-label">Impact financier</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-purple-soft)', color: 'var(--accent-purple)' }}>🏭</div>
          <div className="kpi-value">{maxSup ? truncate(maxSup.name, 16) : '—'} ({maxSup?.count || 0})</div>
          <div className="kpi-label">Fourn. + risqué</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-cyan-soft, rgba(6,182,212,0.15))', color: 'var(--accent-cyan, #06B6D4)' }}>📋</div>
          <div className="kpi-value">{maxCatEntry ? maxCatEntry[0] : '—'} ({maxCatEntry?.[1] || 0})</div>
          <div className="kpi-label">Catég. dominante</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--sp-5)' }}>
        {tabs.map(t => (
          <div 
            key={t.id} 
            className={`tab ${dimension === t.id ? 'active' : ''}`}
            onClick={() => setDimension(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="heatmap-container">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th>{dimLabel}</th>
              {CATEGORIES.map(c => <th key={c}>{c}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map(key => {
              const row = rows[key];
              const rowTotal = Object.values(row.cats).flat().length;
              return (
                <tr key={key}>
                  <td>{row.label}</td>
                  {CATEGORIES.map(cat => {
                    const items = row.cats[cat] || [];
                    const count = items.length;
                    const color = heatmapColor(count);
                    const cellKey = key + '|' + cat;
                    return (
                      <td key={cat}>
                        {count > 0 ? (
                          <span 
                            className="heatmap-cell" 
                            style={{ background: color + '30', color, cursor: 'pointer' }}
                            onClick={() => handleCellClick(cellKey, items, cat)}
                            title={`Voir ${count} anomalie(s)`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <span 
                      className="heatmap-cell" 
                      style={{ background: heatmapColor(rowTotal) + '30', color: heatmapColor(rowTotal), fontSize: 'var(--fs-md)' }}
                    >
                      {rowTotal}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rowKeys.length === 0 && (
              <tr><td colSpan={CATEGORIES.length + 2} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--sp-6)' }}>Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginTop: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
        <span>Intensité:</span>
        <span>
          <span className="heatmap-cell" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', width: '24px', height: '24px', fontSize: '10px' }}>1</span>
          {' '}Faible
        </span>
        <span>
          <span className="heatmap-cell" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--accent-orange)', width: '24px', height: '24px', fontSize: '10px' }}>3</span>
          {' '}Moyen
        </span>
        <span>
          <span className="heatmap-cell" style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--accent-red)', width: '24px', height: '24px', fontSize: '10px' }}>5+</span>
          {' '}Élevé
        </span>
        <span style={{ marginLeft: 'var(--sp-4)' }}>💡 Cliquez sur une cellule pour voir le détail</span>
      </div>

      {/* Drill-down modal */}
      {drillDown && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDrillDown(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Détail — {drillLabel} ({drillDown.length})</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Sévérité</th>
                      <th>Titre</th>
                      <th>Impact</th>
                      <th>Date</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDown.map((a: any) => {
                      const sevConf = SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                      const statusConf = STATUS_BADGES[a.status] || STATUS_BADGES.open;
                      return (
                        <tr key={a.id}>
                          <td className="table-mono" style={{ fontSize: 'var(--fs-xs)' }}>{a.id.substring(0, 8).toUpperCase()}</td>
                          <td><span className={`badge ${sevConf.cls}`}>{sevConf.label}</span></td>
                          <td style={{ fontSize: 'var(--fs-xs)', maxWidth: '220px' }}>{truncate(a.title, 40)}</td>
                          <td className="table-amount">{a.financialImpact ? formatCurrency(a.financialImpact) : '—'}</td>
                          <td style={{ fontSize: 'var(--fs-xs)' }}>{a.dateDetected ? new Date(a.dateDetected).toLocaleDateString('fr-FR') : '—'}</td>
                          <td><span className={`badge ${statusConf.cls}`}>{statusConf.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDrillDown(null)} className="btn btn-secondary">Fermer</button>
              <button onClick={() => { setDrillDown(null); window.location.href = '/audit'; }} className="btn btn-primary">Aller à l&apos;audit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
