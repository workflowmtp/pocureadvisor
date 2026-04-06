'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, truncate } from '@/lib/format';
import { ANOMALY_CATEGORY_ICONS, SEVERITY_CONFIG } from '@/lib/constants';

interface UserProfile {
  id: string; fullName: string; roleName: string; avatar: string; role: string;
  discipline: number; totalAnomalies: number; criticals: number; risk: string;
  topCategories: string[]; recommendation: string; trend: string; avgDelay: number;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  open: { label: 'Ouvert', cls: 'badge-high' },
  investigating: { label: 'Investigation', cls: 'badge-info' },
  resolved: { label: 'Résolu', cls: 'badge-success' },
};

export default function AuditUsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ userId: string; type: string } | null>(null);
  const [anomalyModal, setAnomalyModal] = useState<string | null>(null);
  const [allAnomalies, setAllAnomalies] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/anomalies').then(r => r.json()),
      fetch('/api/suppliers?limit=500').then(r => r.json()),
    ]).then(([anomalyData]) => {
      const anomalies = anomalyData.anomalies || [];
      setAllAnomalies(anomalies);
      
      const userMap: Record<string, any> = {};
      anomalies.forEach((a: any) => {
        if (a.user) {
          const u = a.user;
          if (!userMap[u.id]) userMap[u.id] = { ...u, anomalies: [] };
          userMap[u.id].anomalies.push(a);
        }
      });

      const computed: UserProfile[] = Object.values(userMap).map((u: any) => {
        const total = u.anomalies.length;
        const criticals = u.anomalies.filter((a: any) => a.severity === 'critical').length;
        const highs = u.anomalies.filter((a: any) => a.severity === 'high').length;
        let score = 100 - criticals * 12 - highs * 6 - (total - criticals - highs) * 2;
        score = Math.max(0, Math.min(100, score));

        const catCount: Record<string, number> = {};
        u.anomalies.forEach((a: any) => { catCount[a.category] = (catCount[a.category] || 0) + 1; });
        const topCats = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a]).slice(0, 3);

        const risk = score < 30 || criticals >= 3 ? 'Critique' : score < 50 ? 'Élevé' : score < 70 ? 'Moyen' : 'Bas';
        const reco = risk === 'Critique' ? 'Entretien urgent requis. Risque de fraude ou contournement systémique.' : risk === 'Élevé' ? 'Formation aux procédures recommandée. Surveillance renforcée.' : risk === 'Moyen' ? 'Rappel des procédures. Points d\'attention identifiés.' : 'Profil conforme. Maintenir le suivi standard.';
        const trend = score >= 80 ? 'Stable' : risk === 'Critique' ? 'Dégradation' : 'Attention';

        return { id: u.id, fullName: u.fullName, roleLabel: u.roleLabel || '—', avatar: u.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2),
          role: u.role || '', discipline: score, totalAnomalies: total, criticals, risk, topCategories: topCats, recommendation: reco, trend, avgDelay: total > 3 ? Math.round(total * 1.5) : 0 };
      });

      computed.sort((a, b) => a.discipline - b.discipline);
      setProfiles(computed);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
        <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)' }}>Profils de discipline — Utilisateurs opérationnels</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Rôles audités : Acheteur, Comptable, Magasinier, Dir. Achats</div>
      </div>

      {/* User Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))', gap: 'var(--sp-5)' }}>
        {profiles.map(p => {
          const gaugeColor = p.discipline >= 80 ? 'var(--accent-green)' : p.discipline >= 60 ? 'var(--accent-blue)' : p.discipline >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
          const riskColor = p.risk === 'Critique' ? 'var(--accent-red)' : p.risk === 'Élevé' ? 'var(--accent-orange)' : p.risk === 'Moyen' ? 'var(--accent-orange)' : 'var(--accent-green)';
          const avatarBg = p.discipline >= 70 ? 'var(--accent-blue-soft)' : p.discipline >= 40 ? 'var(--accent-orange-soft)' : 'var(--accent-red-soft)';
          const avatarColor = p.discipline >= 70 ? 'var(--accent-blue)' : p.discipline >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
          const trendIcon = p.discipline >= 80 ? '📈' : p.risk === 'Critique' ? '📉' : '→';
          const trendColor = p.discipline >= 80 ? 'var(--accent-green)' : p.risk === 'Critique' ? 'var(--accent-red)' : 'var(--text-tertiary)';
          const borderLeft = p.risk === 'Critique' ? 'border-left: 3px solid var(--accent-red)' : p.risk === 'Élevé' ? 'border-left: 3px solid var(--accent-orange)' : '';

          return (
            <div 
              key={p.id} 
              className="user-audit-card"
              style={{ cursor: 'pointer', ...(borderLeft ? { borderLeft: '3px solid', borderLeftColor: p.risk === 'Critique' ? 'var(--accent-red)' : 'var(--accent-orange)' } : {}) }}
              onClick={() => setAnomalyModal(p.id)}
            >
              {/* Header */}
              <div className="user-audit-header">
                <div className="user-audit-avatar" style={{ background: avatarBg, color: avatarColor }}>{p.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--fw-semibold)' }}>{p.fullName}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                    {p.roleName} — <span style={{ color: trendColor }}>{trendIcon} {p.trend}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', color: gaugeColor }}>{p.discipline}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>DISCIPLINE</div>
                </div>
              </div>

              {/* Gauge */}
              <div className="discipline-gauge">
                <div className="discipline-gauge-fill" style={{ width: p.discipline + '%', background: gaugeColor }} />
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
                <div className="user-audit-stat">
                  <div className="user-audit-stat-value" style={{ color: 'var(--accent-orange)' }}>{p.totalAnomalies}</div>
                  <div className="user-audit-stat-label">Anomalies</div>
                </div>
                <div className="user-audit-stat">
                  <div className="user-audit-stat-value" style={{ color: 'var(--accent-red)' }}>{p.criticals}</div>
                  <div className="user-audit-stat-label">Critiques</div>
                </div>
                <div className="user-audit-stat">
                  <div className="user-audit-stat-value" style={{ color: riskColor }}>{p.risk}</div>
                  <div className="user-audit-stat-label">Risque</div>
                </div>
                <div className="user-audit-stat">
                  <div className="user-audit-stat-value" style={{ color: p.avgDelay > 5 ? 'var(--accent-red)' : p.avgDelay > 3 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                    {p.avgDelay > 0 ? p.avgDelay + 'j' : '—'}
                  </div>
                  <div className="user-audit-stat-label">Retard moy.</div>
                </div>
              </div>

              {/* Top Categories */}
              {p.topCategories.length > 0 && (
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--sp-1)' }}>Types dominants</div>
                  <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap' }}>
                    {p.topCategories.map(c => (
                      <span key={c} className="badge badge-neutral">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border-secondary)', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                <strong>Recommandation:</strong> {p.recommendation}
              </div>

              {/* Actions */}
              <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                {p.risk === 'Critique' && (
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); setActionModal({ userId: p.id, type: 'entretien' }); }}>
                    🚨 Programmer entretien
                  </button>
                )}
                {(p.risk === 'Élevé' || p.risk === 'Critique') && (
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setActionModal({ userId: p.id, type: 'formation' }); }}>
                    📚 Formation
                  </button>
                )}
                {p.totalAnomalies > 0 && p.risk !== 'Critique' && (
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setActionModal({ userId: p.id, type: 'rappel' }); }}>
                    📋 Rappel procédure
                  </button>
                )}
                <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setAnomalyModal(p.id); }}>
                  👁 Voir anomalies
                </button>
              </div>
            </div>
          );
        })}
        {profiles.length === 0 && (
          <div className="col-span-2 text-center py-12 text-sm text-[var(--text-tertiary)]">Aucun profil à afficher</div>
        )}
      </div>

      {/* Anomaly Modal */}
      {anomalyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAnomalyModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              Anomalies — {profiles.find(p => p.id === anomalyModal)?.fullName} ({profiles.find(p => p.id === anomalyModal)?.roleName})
            </h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {allAnomalies.filter(a => a.user?.id === anomalyModal).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: '32px', marginBottom: 'var(--sp-2)' }}>✅</div>
                  Aucune anomalie pour cet utilisateur
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Catégorie</th>
                        <th>Sévérité</th>
                        <th>Titre</th>
                        <th>Impact</th>
                        <th>Date</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAnomalies
                        .filter(a => a.user?.id === anomalyModal)
                        .sort((a, b) => new Date(b.dateDetected).getTime() - new Date(a.dateDetected).getTime())
                        .map(a => {
                          const sevConf = SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                          const statusConf = STATUS_BADGES[a.status] || STATUS_BADGES.open;
                          return (
                            <tr key={a.id}>
                              <td className="table-mono" style={{ fontSize: 'var(--fs-xs)' }}>{a.id.substring(0, 8).toUpperCase()}</td>
                              <td style={{ fontSize: 'var(--fs-xs)' }}>{ANOMALY_CATEGORY_ICONS[a.category] || ''} {a.category}</td>
                              <td><span className={`badge ${sevConf.cls}`}>{sevConf.label}</span></td>
                              <td style={{ fontSize: 'var(--fs-xs)', maxWidth: '200px' }}>{truncate(a.title, 35)}</td>
                              <td className="table-amount">{a.financialImpact ? formatCurrency(a.financialImpact) : '—'}</td>
                              <td style={{ fontSize: 'var(--fs-xs)' }}>{a.dateDetected ? new Date(a.dateDetected).toLocaleDateString('fr-FR') : '—'}</td>
                              <td><span className={`badge ${statusConf.cls}`}>{statusConf.label}</span></td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setAnomalyModal(null)} className="btn btn-secondary">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              {actionModal.type === 'entretien' ? '🚨 Entretien disciplinaire' : actionModal.type === 'formation' ? '📚 Formation procédures' : '📋 Rappel de procédure'}
            </h3>
            <div className={`alert-card ${actionModal.type === 'entretien' ? 'alert-critical' : 'alert-info'}`} style={{ marginBottom: 'var(--sp-4)' }}>
              <div className="alert-icon">{actionModal.type === 'entretien' ? '🚨' : '📋'}</div>
              <div className="alert-content">
                <div className="alert-title">
                  {actionModal.type === 'entretien' ? 'Entretien disciplinaire' : actionModal.type === 'formation' ? 'Formation procédures' : 'Rappel de procédure'}
                </div>
                <div className="alert-desc">
                  {actionModal.type === 'entretien' 
                    ? `Programmer un entretien disciplinaire avec ${profiles.find(p => p.id === actionModal?.userId)?.fullName} suite aux anomalies critiques détectées.`
                    : actionModal.type === 'formation'
                    ? `Inscrire ${profiles.find(p => p.id === actionModal?.userId)?.fullName} à une session de formation sur les procédures achats.`
                    : `Envoyer un rappel des procédures à ${profiles.find(p => p.id === actionModal?.userId)?.fullName}.`
                  }
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Date prévue</label>
              <input type="date" className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm" />
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Commentaire</label>
              <textarea placeholder="Notes complémentaires..." className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm resize-y min-h-[80px]" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionModal(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={() => { setActionModal(null); alert('Action programmée ✅'); }} className="btn btn-primary">✅ Programmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
