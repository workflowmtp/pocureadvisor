'use client';

import { useEffect, useState } from 'react';
import { SCORING_AXES } from '@/lib/constants';

type SectionId = 'organization' | 'users' | 'roles' | 'categories' | 'scoring' | 'audit_rules' | 'alerts' | 'validation' | 'referential' | 'ai' | 'system';

const SECTIONS: { id: SectionId; icon: string; label: string }[] = [
  { id: 'organization', icon: '🏢', label: 'Organisation' },
  { id: 'users', icon: '👥', label: 'Utilisateurs' },
  { id: 'roles', icon: '🔐', label: 'Rôles & Permissions' },
  { id: 'categories', icon: '📦', label: 'Catégories Achats' },
  { id: 'scoring', icon: '📊', label: 'Scoring Fournisseur' },
  { id: 'audit_rules', icon: '🛡️', label: "Règles d'Audit" },
  { id: 'alerts', icon: '🔔', label: 'Seuils & Alertes' },
  { id: 'validation', icon: '✅', label: 'Chaînes Validation' },
  { id: 'referential', icon: '📋', label: 'Référentiel' },
  { id: 'ai', icon: '🤖', label: 'Agent IA' },
  { id: 'system', icon: '⚙️', label: 'Système' },
];

// Mock data for demonstration
const POLES = [
  { id: 'P01', name: 'Production', color: '#3B82F6' },
  { id: 'P02', name: 'Maintenance', color: '#10B981' },
  { id: 'P03', name: 'Logistique', color: '#F59E0B' },
  { id: 'P04', name: 'Qualité', color: '#8B5CF6' },
];

const USERS = [
  { id: '1', avatar: 'AD', fullName: 'Amadou Diallo', username: 'a.diallo', role: 'admin', roleName: 'Admin', email: 'a.diallo@company.com', poleIds: ['P01', 'P02'], loginCount: 127, isActive: true },
  { id: '2', avatar: 'FM', fullName: 'Fatou Mbaye', username: 'f.mbaye', role: 'acheteur', roleName: 'Acheteur', email: 'f.mbaye@company.com', poleIds: ['P01'], loginCount: 89, isActive: true },
  { id: '3', avatar: 'MS', fullName: 'Moussa Sow', username: 'm.sow', role: 'comptable', roleName: 'Comptable', email: 'm.sow@company.com', poleIds: ['P03'], loginCount: 45, isActive: true },
  { id: '4', avatar: 'AN', fullName: 'Aminata Ndiaye', username: 'a.ndiaye', role: 'magasin', roleName: 'Magasinier', email: 'a.ndiaye@company.com', poleIds: ['P02'], loginCount: 62, isActive: true },
];

const ROLES = [
  { name: 'Admin', code: 'admin' },
  { name: 'Dir. Achats', code: 'dir_achat' },
  { name: 'Acheteur', code: 'acheteur' },
  { name: 'Comptable', code: 'comptable' },
  { name: 'Magasinier', code: 'magasin' },
  { name: 'Audit', code: 'audit' },
  { name: 'DG', code: 'dg' },
  { name: 'Consult.', code: 'consult' },
];

const MODULES = ['Dashboard', 'Sourcing', 'Négociations', 'Devis', 'OCR', 'Documents', 'Fournisseurs', 'Commandes', 'Audit', 'IA', 'Courriers', 'Paramètres', 'Logs'];
const MODULE_KEYS = ['dashboard', 'sourcing', 'negotiations', 'quotes', 'ocr', 'documents', 'suppliers', 'orders', 'audit', 'ai', 'letters', 'settings', 'logs'];

const PERMISSIONS: Record<string, Record<string, string>> = {
  admin: { dashboard: 'full', suppliers: 'full', orders: 'full', audit: 'full', settings: 'full', logs: 'full' },
  dir_achat: { dashboard: 'full', suppliers: 'full', orders: 'full', negotiations: 'full' },
  acheteur: { dashboard: 'read', suppliers: 'read', orders: 'write', quotes: 'write' },
  comptable: { dashboard: 'read', orders: 'read', documents: 'write' },
  magasin: { dashboard: 'read', orders: 'read' },
  audit: { dashboard: 'read', audit: 'full', logs: 'read' },
  dg: { dashboard: 'full', audit: 'read' },
  consult: { dashboard: 'read', suppliers: 'read' },
};

const CATEGORIES = [
  { id: 'MAT', name: 'Matières Premières', families: ['Ciment', 'Granulats', 'Fer'] },
  { id: 'EXP', name: 'Exploitation', families: ['Carburant', 'Lubrifiants', 'Pièces'] },
  { id: 'ADM', name: 'Administratif', families: ['Fournitures', 'Services', 'Impression'] },
];

const AUDIT_RULES = [
  { id: 'R01', name: 'Doublon de commande', category: 'Procédure', severity: 'high', active: true },
  { id: 'R02', name: 'Écart prix > seuil', category: 'Prix', severity: 'critical', active: true },
  { id: 'R03', name: 'Écart quantité > seuil', category: 'Quantité', severity: 'high', active: true },
  { id: 'R04', name: 'Document manquant', category: 'Document', severity: 'medium', active: true },
  { id: 'R05', name: 'Retard livraison', category: 'Procédure', severity: 'medium', active: true },
  { id: 'R06', name: 'Score fournisseur bas', category: 'Risque', severity: 'high', active: true },
  { id: 'R07', name: 'Fractionnement commande', category: 'Fraude', severity: 'critical', active: true },
  { id: 'R08', name: 'Prix anormalement bas', category: 'Fraude', severity: 'critical', active: false },
];

const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Critique', cls: 'badge-critical' },
  high: { label: 'Élevée', cls: 'badge-high' },
  medium: { label: 'Moyenne', cls: 'badge-medium' },
  low: { label: 'Basse', cls: 'badge-low' },
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('organization');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function save(key: string, value: any) {
    setSaving(true);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
    setSaving(false);
    setFeedback('✅ Sauvegardé');
    setTimeout(() => setFeedback(''), 2000);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  const weights = settings?.scoring_weights || { quality: 20, price: 25, delivery: 20, doc_compliance: 15, reactivity: 10, regularity: 10 };
  const total = Object.values(weights).reduce((s: number, v: any) => s + (v as number), 0);

  function updateWeight(key: string, val: number) {
    const updated = { ...weights, [key]: val };
    setSettings({ ...settings, scoring_weights: updated });
  }

  return (
    <div className="settings-layout">
      {/* Navigation */}
      <div className="settings-nav">
        {SECTIONS.map(s => (
          <div 
            key={s.id} 
            className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.icon} {s.label}
          </div>
        ))}
      </div>

      {/* Panel */}
      <div className="settings-panel">
        {activeSection === 'organization' && (
          <>
            <div className="settings-section-title">🏢 Organisation — Pôles de production</div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Nom</th><th>Couleur</th><th>Statut</th></tr></thead>
                <tbody>
                  {POLES.map(p => (
                    <tr key={p.id}>
                      <td className="table-mono">{p.id}</td>
                      <td>{p.name}</td>
                      <td><span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '4px', background: p.color }} /></td>
                      <td><span className="badge badge-success">Actif</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 'var(--sp-4)' }}><button className="btn btn-sm btn-secondary">+ Ajouter un pôle</button></div>
          </>
        )}

        {activeSection === 'users' && (
          <>
            <div className="settings-section-title">👥 Utilisateurs ({USERS.length})</div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Avatar</th><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Email</th><th>Pôles</th><th>Connexions</th><th>Statut</th></tr></thead>
                <tbody>
                  {USERS.map(u => (
                    <tr key={u.id}>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)' }}>{u.avatar}</span></td>
                      <td style={{ fontWeight: 'var(--fw-medium)' }}>{u.fullName}</td>
                      <td className="table-mono">{u.username}</td>
                      <td><span className="badge badge-info">{u.roleName}</span></td>
                      <td style={{ fontSize: 'var(--fs-xs)' }}>{u.email}</td>
                      <td style={{ fontSize: 'var(--fs-xs)' }}>{u.poleIds.join(', ')}</td>
                      <td className="table-mono">{u.loginCount}</td>
                      <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-critical'}`}>{u.isActive ? 'Actif' : 'Inactif'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 'var(--sp-4)' }}><button className="btn btn-sm btn-primary">+ Ajouter un utilisateur</button></div>
          </>
        )}

        {activeSection === 'roles' && (
          <>
            <div className="settings-section-title">🔐 Rôles & Permissions</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
              Gérez les rôles utilisateurs et leurs permissions d&apos;accès aux fonctionnalités.
            </p>
            <a 
              href="/settings/roles" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue/90 transition-colors"
            >
              🔐 Gérer les rôles et permissions
            </a>
            <div style={{ marginTop: 'var(--sp-5)' }} className="table-container">
              <table className="data-table" style={{ fontSize: 'var(--fs-xs)' }}>
                <thead>
                  <tr>
                    <th>Module</th>
                    {ROLES.map(r => <th key={r.code} style={{ textAlign: 'center' }}>{r.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => (
                    <tr key={mod}>
                      <td style={{ fontWeight: 'var(--fw-medium)' }}>{mod}</td>
                      {ROLES.map(r => {
                        const perm = PERMISSIONS[r.code]?.[MODULE_KEYS[i]] || 'none';
                        const badge = perm === 'full' ? <span style={{ color: 'var(--accent-green)' }}>✓ Full</span>
                          : perm === 'none' ? <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                          : <span style={{ color: 'var(--accent-blue)' }}>{perm}</span>;
                        return <td key={r.code} style={{ textAlign: 'center' }}>{badge}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'categories' && (
          <>
            <div className="settings-section-title">📦 Catégories d&apos;Achats</div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Catégorie</th><th>Familles</th><th>Action</th></tr></thead>
                <tbody>
                  {CATEGORIES.map(c => (
                    <tr key={c.id}>
                      <td className="table-mono">{c.id}</td>
                      <td style={{ fontWeight: 'var(--fw-medium)' }}>{c.name}</td>
                      <td style={{ fontSize: 'var(--fs-xs)' }}>{c.families.join(', ')}</td>
                      <td><button className="btn btn-sm btn-secondary">Modifier</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'scoring' && (
          <>
            <div className="settings-section-title">📊 Pondération du Scoring Fournisseur</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-5)' }}>Ajustez les poids relatifs de chaque axe d&apos;évaluation. Le total doit être 100%.</p>
            {SCORING_AXES.map(axis => (
              <div key={axis.key} className="weight-row">
                <div className="weight-label" style={{ color: axis.color }}>{axis.label}</div>
                <input type="range" className="weight-slider scoring-slider" min={0} max={50} value={weights[axis.key] || 0}
                  onChange={e => updateWeight(axis.key, parseInt(e.target.value))}
                  style={{ accentColor: axis.color }} />
                <div className="weight-value" style={{ color: axis.color }}>{weights[axis.key]}%</div>
              </div>
            ))}
            <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--fs-sm)' }}>Total: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-md)', color: total === 100 ? 'var(--accent-green)' : total > 100 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>{total}%</strong></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                {feedback && <span style={{ color: 'var(--accent-green)', fontSize: 'var(--fs-sm)' }}>{feedback}</span>}
                <button disabled={total !== 100 || saving} onClick={() => save('scoring_weights', weights)} className="btn btn-sm btn-primary">💾 Enregistrer</button>
              </div>
            </div>
          </>
        )}

        {activeSection === 'audit_rules' && (
          <>
            <div className="settings-section-title">🛡️ Règles d&apos;Audit ({AUDIT_RULES.length})</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>Activez/désactivez les règles et ajustez les seuils de détection.</p>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Règle</th><th>Catégorie</th><th>Sévérité</th><th>Active</th></tr></thead>
                <tbody>
                  {AUDIT_RULES.map((r, i) => (
                    <tr key={r.id}>
                      <td className="table-mono">{r.id}</td>
                      <td style={{ fontSize: 'var(--fs-xs)' }}>{r.name}</td>
                      <td><span className="badge badge-neutral">{r.category}</span></td>
                      <td><span className={`badge ${SEVERITY_CONFIG[r.severity]?.cls || 'badge-neutral'}`}>{SEVERITY_CONFIG[r.severity]?.label || r.severity}</span></td>
                      <td><div className={`toggle-switch ${r.active ? 'on' : ''}`} onClick={() => { AUDIT_RULES[i].active = !r.active; setSettings({ ...settings }); }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'alerts' && (
          <>
            <div className="settings-section-title">🔔 Seuils d&apos;Alerte</div>
            <div className="setting-group">
              <div className="setting-group-title">Stock & Approvisionnement</div>
              <SettingRow label="Stock couverture critique" desc="Alerte si couverture &lt; X jours" value={10} unit="jours" />
              <SettingRow label="Stock couverture attention" desc="Attention si couverture &lt; X jours" value={20} unit="jours" />
              <SettingRow label="Retard commande alerte" desc="Alerte si retard &gt; X jours" value={7} unit="jours" />
            </div>
            <div className="setting-group">
              <div className="setting-group-title">Contrôle documentaire</div>
              <SettingRow label="Écart prix mineur" desc="Seuil écart prix considéré mineur" value={2} unit="%" />
              <SettingRow label="Écart prix majeur" desc="Seuil écart prix considéré majeur" value={5} unit="%" />
              <SettingRow label="Écart quantité toléré" desc="Écart quantité accepté sans alerte" value={3} unit="%" />
            </div>
            <div className="setting-group">
              <div className="setting-group-title">Fournisseurs</div>
              <SettingRow label="Concentration fournisseur" desc="Alerte si dépendance &gt; X%" value={60} unit="%" />
              <SettingRow label="Score fournisseur critique" desc="Seuil score considéré critique" value={40} unit="pts" />
            </div>
            <div style={{ marginTop: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <button className="btn btn-primary">💾 Enregistrer les seuils</button>
              {feedback && <span style={{ color: 'var(--accent-green)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{feedback}</span>}
            </div>
          </>
        )}

        {activeSection === 'validation' && (
          <>
            <div className="settings-section-title">✅ Chaînes de Validation</div>
            <div className="setting-group">
              <div className="setting-group-title">Validation par montant (commandes)</div>
              <div className="setting-row"><div><div className="setting-label">&lt; 5 000 000 FCFA</div><div className="setting-desc">Validation simple</div></div><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Acheteur seul</span></div>
              <div className="setting-row"><div><div className="setting-label">5M — 20M FCFA</div><div className="setting-desc">Double validation</div></div><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Acheteur + Dir. Achats</span></div>
              <div className="setting-row"><div><div className="setting-label">20M — 50M FCFA</div><div className="setting-desc">Triple validation</div></div><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Acheteur + Dir. Achats + DAF</span></div>
              <div className="setting-row"><div><div className="setting-label">&gt; 50 000 000 FCFA</div><div className="setting-desc">Validation DG</div></div><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Acheteur + Dir. Achats + DAF + DG</span></div>
            </div>
            <div className="setting-group">
              <div className="setting-group-title">Séparation des tâches</div>
              <div className="setting-row"><div><div className="setting-label">Créateur ≠ Validateur</div><div className="setting-desc">Un même utilisateur ne peut pas créer et valider un PO</div></div><div className="toggle-switch on" /></div>
              <div className="setting-row"><div><div className="setting-label">Acheteur ≠ Réceptionnaire</div><div className="setting-desc">L&apos;acheteur ne valide pas la réception de ses propres PO</div></div><div className="toggle-switch on" /></div>
            </div>
          </>
        )}

        {activeSection === 'referential' && (
          <>
            <div className="settings-section-title">📋 Référentiel</div>
            <div className="grid-2">
              <div className="setting-group">
                <div className="setting-group-title">Devises</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>{['FCFA', 'EUR', 'USD', 'GBP'].map(c => <span key={c} className="badge badge-neutral">{c}</span>)}</div>
              </div>
              <div className="setting-group">
                <div className="setting-group-title">Incoterms</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>{['EXW', 'FCA', 'CIF', 'DDP'].map(i => <span key={i} className="badge badge-neutral">{i}</span>)}</div>
              </div>
              <div className="setting-group">
                <div className="setting-group-title">Conditions de paiement</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>{['Net 30', 'Net 60', '50% Avance', 'LC'].map(p => <span key={p} className="badge badge-neutral">{p}</span>)}</div>
              </div>
              <div className="setting-group">
                <div className="setting-group-title">Niveaux de sévérité</div>
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <div key={k} style={{ marginBottom: 'var(--sp-1)' }}><span className={`badge ${v.cls}`}>{v.label}</span></div>)}
              </div>
            </div>
          </>
        )}

        {activeSection === 'ai' && (
          <>
            <div className="settings-section-title">🤖 Agent IA — ProcureBot</div>
            <div className="setting-group">
              <div className="setting-group-title">Configuration</div>
              <div className="setting-row">
                <div><div className="setting-label">Activer l&apos;assistant IA</div><div className="setting-desc">Permet les suggestions automatiques et réponses aux questions</div></div>
                <div className="toggle-switch on" />
              </div>
              <div className="setting-row">
                <div><div className="setting-label">Analyse automatique des documents</div><div className="setting-desc">Extraction des données et détection d&apos;anomalies</div></div>
                <div className="toggle-switch on" />
              </div>
            </div>
          </>
        )}

        {activeSection === 'system' && (
          <>
            <div className="settings-section-title">⚙️ Système</div>
            <div className="setting-group">
              <div className="setting-group-title">Exports serveur</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)' }}>
                {[
                  { type: 'suppliers', label: '🏢 Fournisseurs', desc: 'Tous les fournisseurs actifs' },
                  { type: 'orders', label: '📦 Commandes', desc: 'Historique des commandes' },
                  { type: 'anomalies', label: '🛡️ Anomalies', desc: 'Toutes les anomalies détectées' },
                  { type: 'logs', label: '📝 Logs', desc: 'Journal d&apos;activité complet' },
                ].map(exp => (
                  <button key={exp.type} onClick={() => window.open(`/api/export/${exp.type}`, '_blank')}
                    className="p-4 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-left hover:border-brand-blue transition-colors">
                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{exp.label}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{exp.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-group">
              <div className="setting-group-title">Version</div>
              <div className="setting-row"><div className="setting-label">ProcureAdvisor v2.1.0</div></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, value, unit }: { label: string; desc?: string; value?: number; unit?: string }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      {value !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <input type="number" className="login-input" defaultValue={value} style={{ width: '80px', padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'var(--fw-bold)' }} />
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', minWidth: '35px' }}>{unit}</span>
        </div>
      )}
    </div>
  );
}
