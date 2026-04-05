// ═══════════════════════════════════════════════════════════════
// ProcureAdvisor — Constants & Configuration
// ═══════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  appName: 'ProcureAdvisor',
  version: '2.0.0',
  company: 'MULTIPRINT S.A.',
  currency: 'FCFA',
  locale: 'fr-FR',
  sessionTimeout: 8 * 60 * 60 * 1000,
} as const;

export const POLES = [
  { id: 'OE', code: 'OE', name: 'Offset Étiquette', color: '#3B82F6' },
  { id: 'HF', code: 'HF', name: 'Héliogravure Flexible', color: '#8B5CF6' },
  { id: 'OC', code: 'OC', name: 'Offset Carton', color: '#06B6D4' },
  { id: 'BC', code: 'BC', name: 'Bouchon Couronne', color: '#F59E0B' },
] as const;

export const SEVERITY_CONFIG = {
  critical: { label: 'Critique', color: '#EF4444', cls: 'badge-critical', bgClass: 'bg-brand-red-soft text-brand-red' },
  high:     { label: 'Élevée',   color: '#F97316', cls: 'badge-high', bgClass: 'bg-brand-orange-soft text-brand-orange' },
  medium:   { label: 'Moyenne',  color: '#F59E0B', cls: 'badge-medium', bgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  low:      { label: 'Basse',    color: '#3B82F6', cls: 'badge-low', bgClass: 'bg-brand-blue-soft text-brand-blue' },
  info:     { label: 'Info',     color: '#6366F1', cls: 'badge-info', bgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
} as const;

export const SUPPLIER_STATUS_CONFIG = {
  active:     { label: 'Actif',       color: '#10B981', bgClass: 'bg-brand-green-soft text-brand-green' },
  probation:  { label: 'Probation',   color: '#F59E0B', bgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  suspended:  { label: 'Suspendu',    color: '#EF4444', bgClass: 'bg-brand-red-soft text-brand-red' },
  blocked:    { label: 'Bloqué',      color: '#EF4444', bgClass: 'bg-brand-red-soft text-brand-red' },
  strategic:  { label: 'Stratégique', color: '#8B5CF6', bgClass: 'bg-brand-purple-soft text-brand-purple' },
  backup:     { label: 'Backup',      color: '#6B7280', bgClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  to_replace: { label: 'À remplacer', color: '#F97316', bgClass: 'bg-brand-orange-soft text-brand-orange' },
} as const;

export const ORDER_STATUS_CONFIG = {
  created:              { label: 'Créée',                step: 1, color: '#6B7280' },
  validated:            { label: 'Validée',              step: 2, color: '#3B82F6' },
  confirmed:            { label: 'Confirmée fournisseur', step: 3, color: '#8B5CF6' },
  in_transit:           { label: 'En transit',           step: 4, color: '#06B6D4' },
  partially_received:   { label: 'Réception partielle',  step: 5, color: '#F59E0B' },
  received:             { label: 'Réceptionnée',         step: 6, color: '#10B981' },
  closed:               { label: 'Clôturée',             step: 7, color: '#6B7280' },
} as const;

export const NEGOTIATION_STATUS_CONFIG = {
  preparation:      { label: 'Préparation',      column: 0, color: '#6B7280' },
  in_progress:      { label: 'En cours',         column: 1, color: '#3B82F6' },
  pending_decision: { label: 'Décision à prendre', column: 2, color: '#F59E0B' },
  closed_won:       { label: 'Gagnée',           column: 3, color: '#10B981' },
  closed_lost:      { label: 'Échouée',          column: 3, color: '#EF4444' },
  cancelled:        { label: 'Annulée',          column: 3, color: '#6B7280' },
} as const;

export const ALT_SUPPLIER_STATUS_CONFIG = {
  identified:    { label: 'Identifié',   icon: '🔍', color: '#6B7280' },
  to_contact:    { label: 'À contacter', icon: '📞', color: '#3B82F6' },
  in_discussion: { label: 'Discussion',  icon: '💬', color: '#8B5CF6' },
  qualified:     { label: 'Qualifié',    icon: '✅', color: '#10B981' },
  in_test:       { label: 'En test',     icon: '🧪', color: '#06B6D4' },
  rejected:      { label: 'Rejeté',      icon: '❌', color: '#EF4444' },
} as const;

export const LETTER_TYPES = [
  { id: 'price_dispute',       label: 'Contestation prix',      icon: '💰', tone: 'firm' },
  { id: 'credit_request',      label: "Demande d'avoir",        icon: '📄', tone: 'diplomatic' },
  { id: 'delivery_reminder',   label: 'Relance livraison',      icon: '📦', tone: 'urgent' },
  { id: 'rfq',                 label: "Appel d'offres",         icon: '📋', tone: 'formal' },
  { id: 'certificate_request', label: 'Demande certificat',     icon: '🏅', tone: 'formal' },
  { id: 'formal_notice',       label: 'Mise en demeure',        icon: '⚖️', tone: 'formal' },
  { id: 'contract_reminder',   label: 'Rappel contrat',         icon: '📑', tone: 'diplomatic' },
  { id: 'clarification',       label: 'Demande clarification',  icon: '❓', tone: 'diplomatic' },
] as const;

export const ANOMALY_CATEGORY_ICONS: Record<string, string> = {
  Prix: '💰', Quantité: '📦', Procédure: '📋', Document: '📄',
  Fraude: '🚨', Conformité: '✅', Discipline: '👤', Qualité: '🔬', Risque: '⚠️',
};

export const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'] as const;
export const PAYMENT_TERMS = ['Comptant','30j net','60j net','90j net','30j fin de mois','60j fin de mois','LC 30j','LC 60j','LC 90j'] as const;
export const CURRENCIES = ['XAF','EUR','USD','GBP','CNY','INR','JPY','KRW','ZAR','NGN','THB'] as const;

export const DEFAULT_SCORING_WEIGHTS = {
  quality: 0.20,
  price: 0.25,
  delivery: 0.20,
  doc_compliance: 0.15,
  reactivity: 0.10,
  regularity: 0.10,
} as const;

export type ScoringAxis = keyof typeof DEFAULT_SCORING_WEIGHTS;

export const SCORING_AXES: { key: ScoringAxis; label: string; color: string }[] = [
  { key: 'quality',        label: 'Qualité',                color: '#10B981' },
  { key: 'price',          label: 'Prix',                   color: '#3B82F6' },
  { key: 'delivery',       label: 'Délais',                 color: '#8B5CF6' },
  { key: 'doc_compliance', label: 'Conformité documentaire', color: '#06B6D4' },
  { key: 'reactivity',     label: 'Réactivité',             color: '#F59E0B' },
  { key: 'regularity',     label: 'Régularité',             color: '#EC4899' },
];

// ─── Navigation sidebar config ───
export interface NavItem {
  id: string;
  icon: string;
  label: string;
  href: string;
  badgeKey?: string;
  roles?: string[];
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    section: 'PILOTAGE',
    items: [
      { id: 'dashboard', icon: '📊', label: 'Tableau de bord', href: '/dashboard' },
    ],
  },
  {
    section: 'ACHATS',
    items: [
      { id: 'sourcing',     icon: '🔍', label: 'Veille Marché',       href: '/sourcing' },
      { id: 'sourcing-alt', icon: '🏭', label: 'Fourn. Alternatifs',  href: '/sourcing/alternatives' },
      { id: 'negotiations', icon: '🤝', label: 'Négociations',        href: '/negotiations' },
      { id: 'quotes',       icon: '📋', label: 'Comparatif Devis',    href: '/quotes' },
    ],
  },
  {
    section: 'DOCUMENTS',
    items: [
      { id: 'ocr',       icon: '📷', label: 'Numérisation / OCR', href: '/ocr' },
      { id: 'documents', icon: '📄', label: 'Documents',          href: '/documents' },
    ],
  },
  {
    section: 'OPÉRATIONS',
    items: [
      { id: 'suppliers', icon: '🏢', label: 'Fournisseurs', href: '/suppliers', badgeKey: 'suppliersAtRisk' },
      { id: 'orders',    icon: '📦', label: 'Commandes',    href: '/orders',    badgeKey: 'lateOrders' },
    ],
  },
  {
    section: 'CONTRÔLE',
    items: [
      { id: 'audit',        icon: '🛡️', label: 'Anomalies',          href: '/audit',        badgeKey: 'openAnomalies' },
      { id: 'audit-users',  icon: '👥', label: 'Profils Utilisateurs', href: '/audit/users' },
      { id: 'audit-matrix', icon: '🎯', label: 'Matrice Risques',     href: '/audit/matrix' },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { id: 'ai',      icon: '🤖', label: 'ProcureBot IA', href: '/ai' },
      { id: 'letters', icon: '✉️', label: 'Courriers',     href: '/letters' },
    ],
  },
];

export const NAV_BOTTOM: NavItem[] = [
  { id: 'notifications', icon: '🔔', label: 'Notifications', href: '/notifications', badgeKey: 'unreadNotifs' },
  { id: 'settings',      icon: '⚙️', label: 'Paramètres',    href: '/settings', roles: ['admin'] },
  { id: 'logs',          icon: '📝', label: 'Logs',           href: '/logs', roles: ['admin', 'audit', 'dg'] },
  { id: 'profil',        icon: '👤', label: 'Mon Profil',     href: '/profile' },
];
