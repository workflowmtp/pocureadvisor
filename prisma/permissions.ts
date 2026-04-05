// Liste des permissions disponibles dans l'application
// Chaque permission représente une fonctionnalité

export const PERMISSIONS = [
  // ─── Dashboard ───
  { code: 'dashboard.view', name: 'Voir le tableau de bord', category: 'dashboard', isSystem: true },
  
  // ─── Fournisseurs ───
  { code: 'suppliers.view', name: 'Voir les fournisseurs', category: 'suppliers', isSystem: true },
  { code: 'suppliers.create', name: 'Créer un fournisseur', category: 'suppliers', isSystem: true },
  { code: 'suppliers.edit', name: 'Modifier un fournisseur', category: 'suppliers', isSystem: true },
  { code: 'suppliers.delete', name: 'Supprimer un fournisseur', category: 'suppliers', isSystem: true },
  { code: 'suppliers.export', name: 'Exporter les fournisseurs', category: 'suppliers', isSystem: true },
  
  // ─── Commandes ───
  { code: 'orders.view', name: 'Voir les commandes', category: 'orders', isSystem: true },
  { code: 'orders.create', name: 'Créer une commande', category: 'orders', isSystem: true },
  { code: 'orders.edit', name: 'Modifier une commande', category: 'orders', isSystem: true },
  { code: 'orders.delete', name: 'Supprimer une commande', category: 'orders', isSystem: true },
  { code: 'orders.validate', name: 'Valider une commande', category: 'orders', isSystem: true },
  
  // ─── Factures ───
  { code: 'invoices.view', name: 'Voir les factures', category: 'invoices', isSystem: true },
  { code: 'invoices.create', name: 'Créer une facture', category: 'invoices', isSystem: true },
  { code: 'invoices.edit', name: 'Modifier une facture', category: 'invoices', isSystem: true },
  { code: 'invoices.validate', name: 'Valider une facture', category: 'invoices', isSystem: true },
  
  // ─── Documents ───
  { code: 'documents.view', name: 'Voir les documents', category: 'documents', isSystem: true },
  { code: 'documents.upload', name: 'Uploader des documents', category: 'documents', isSystem: true },
  { code: 'documents.process', name: 'Traiter les documents OCR', category: 'documents', isSystem: true },
  
  // ─── Anomalies / Audit ───
  { code: 'audit.view', name: 'Voir les anomalies', category: 'audit', isSystem: true },
  { code: 'audit.create', name: 'Créer une anomalie', category: 'audit', isSystem: true },
  { code: 'audit.resolve', name: 'Résoudre une anomalie', category: 'audit', isSystem: true },
  { code: 'audit.escalate', name: 'Escalader une anomalie', category: 'audit', isSystem: true },
  
  // ─── Négociations ───
  { code: 'negotiations.view', name: 'Voir les négociations', category: 'negotiations', isSystem: true },
  { code: 'negotiations.create', name: 'Créer une négociation', category: 'negotiations', isSystem: true },
  { code: 'negotiations.edit', name: 'Modifier une négociation', category: 'negotiations', isSystem: true },
  
  // ─── Sourcing ───
  { code: 'sourcing.view', name: 'Voir le sourcing', category: 'sourcing', isSystem: true },
  { code: 'sourcing.manage', name: 'Gérer le sourcing', category: 'sourcing', isSystem: true },
  
  // ─── IA (ProcureBot) ───
  { code: 'ai.chat', name: 'Utiliser ProcureBot', category: 'ai', isSystem: true },
  
  // ─── Lettres ───
  { code: 'letters.view', name: 'Voir les lettres', category: 'letters', isSystem: true },
  { code: 'letters.create', name: 'Créer une lettre', category: 'letters', isSystem: true },
  
  // ─── Logs ───
  { code: 'logs.view', name: 'Voir les logs d\'activité', category: 'logs', isSystem: true },
  
  // ─── Administration ───
  { code: 'admin.users', name: 'Gérer les utilisateurs', category: 'admin', isSystem: true },
  { code: 'admin.roles', name: 'Gérer les rôles et permissions', category: 'admin', isSystem: true },
  { code: 'admin.settings', name: 'Gérer les paramètres', category: 'admin', isSystem: true },
] as const;

// Rôles par défaut avec leurs permissions
export const DEFAULT_ROLES = [
  {
    code: 'admin',
    name: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités',
    isSystem: true,
    isDefault: false,
    permissions: '*', // Toutes les permissions
  },
  {
    code: 'dir_achat',
    name: 'Directeur Achats',
    description: 'Accès complet aux fonctions achats, validation et rapports',
    isSystem: true,
    isDefault: false,
    permissions: [
      'dashboard.view',
      'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.export',
      'orders.view', 'orders.create', 'orders.edit', 'orders.validate',
      'invoices.view', 'invoices.validate',
      'documents.view', 'documents.upload', 'documents.process',
      'audit.view', 'audit.create', 'audit.resolve', 'audit.escalate',
      'negotiations.view', 'negotiations.create', 'negotiations.edit',
      'sourcing.view', 'sourcing.manage',
      'ai.chat',
      'letters.view', 'letters.create',
      'logs.view',
    ],
  },
  {
    code: 'acheteur',
    name: 'Acheteur',
    description: 'Gestion des fournisseurs et commandes',
    isSystem: true,
    isDefault: true,
    permissions: [
      'dashboard.view',
      'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.export',
      'orders.view', 'orders.create', 'orders.edit',
      'documents.view', 'documents.upload',
      'audit.view',
      'negotiations.view', 'negotiations.create',
      'sourcing.view',
      'ai.chat',
      'letters.view', 'letters.create',
    ],
  },
  {
    code: 'comptable',
    name: 'Comptable',
    description: 'Gestion des factures et documents financiers',
    isSystem: true,
    isDefault: false,
    permissions: [
      'dashboard.view',
      'suppliers.view',
      'orders.view',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.validate',
      'documents.view', 'documents.upload', 'documents.process',
      'audit.view',
    ],
  },
  {
    code: 'magasin',
    name: 'Magasinier',
    description: 'Suivi des réceptions et stocks',
    isSystem: true,
    isDefault: false,
    permissions: [
      'dashboard.view',
      'orders.view',
      'documents.view',
      'audit.view',
    ],
  },
  {
    code: 'audit',
    name: 'Auditeur',
    description: 'Consultation et gestion des anomalies',
    isSystem: true,
    isDefault: false,
    permissions: [
      'dashboard.view',
      'suppliers.view',
      'orders.view',
      'invoices.view',
      'documents.view',
      'audit.view', 'audit.create', 'audit.resolve', 'audit.escalate',
      'logs.view',
    ],
  },
  {
    code: 'dg',
    name: 'Direction Générale',
    description: 'Consultation et validation stratégique',
    isSystem: true,
    isDefault: false,
    permissions: [
      'dashboard.view',
      'suppliers.view', 'suppliers.export',
      'orders.view', 'orders.validate',
      'invoices.view',
      'audit.view',
      'negotiations.view',
      'sourcing.view',
      'logs.view',
    ],
  },
  {
    code: 'consult',
    name: 'Consultant',
    description: 'Accès en lecture seule',
    isSystem: true,
    isDefault: false,
    permissions: [
      'dashboard.view',
      'suppliers.view',
      'orders.view',
      'audit.view',
      'sourcing.view',
    ],
  },
] as const;

export type PermissionCode = typeof PERMISSIONS[number]['code'];
export type RoleCode = typeof DEFAULT_ROLES[number]['code'];
