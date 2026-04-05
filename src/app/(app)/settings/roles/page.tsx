'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PERMISSION_CODES, checkPermission } from '@/lib/permissions';

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
  userCount: number;
  permissions: string[];
}

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  suppliers: 'Fournisseurs',
  orders: 'Commandes',
  invoices: 'Factures',
  documents: 'Documents',
  audit: 'Anomalies',
  negotiations: 'Négociations',
  sourcing: 'Sourcing',
  ai: 'Intelligence Artificielle',
  letters: 'Lettres',
  logs: 'Journal d\'activité',
  admin: 'Administration',
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Fetch current user permissions
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data?.user) {
          setUserPermissions((data.user as any).permissions || []);
        }
      });
  }, []);

  // Check if user can manage roles
  const canManageRoles = useMemo(() => 
    checkPermission(userPermissions, PERMISSION_CODES.ADMIN_ROLES), 
    [userPermissions]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/permissions'),
      ]);
      
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles);
      }
      
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        setPermissions(permsData.permissions);
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManageRoles) {
      fetchData();
    }
  }, [canManageRoles, fetchData]);

  if (!canManageRoles) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-[var(--text-secondary)]">Vous n'avez pas accès à cette page</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Gestion des rôles</h2>
          <p className="text-sm text-[var(--text-secondary)]">Créez et configurez les rôles avec leurs permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue/90 transition-colors"
        >
          + Nouveau rôle
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{role.name}</h3>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">{role.code}</p>
              </div>
              <div className="flex items-center gap-2">
                {role.isSystem && (
                  <span className="px-2 py-0.5 bg-brand-purple-soft text-brand-purple text-[10px] font-semibold rounded-full">
                    Système
                  </span>
                )}
                {role.isDefault && (
                  <span className="px-2 py-0.5 bg-brand-green-soft text-brand-green text-[10px] font-semibold rounded-full">
                    Par défaut
                  </span>
                )}
              </div>
            </div>
            
            {role.description && (
              <p className="text-sm text-[var(--text-secondary)] mb-3">{role.description}</p>
            )}
            
            <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-3">
              <span>{role.permissions.length} permissions</span>
              <span>{role.userCount} utilisateur{role.userCount > 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-4">
              {role.permissions.slice(0, 5).map(perm => (
                <span key={perm} className="px-2 py-0.5 bg-[var(--bg-input)] text-[var(--text-secondary)] text-[10px] rounded">
                  {perm.split('.')[1]}
                </span>
              ))}
              {role.permissions.length > 5 && (
                <span className="px-2 py-0.5 text-[var(--text-tertiary)] text-[10px]">
                  +{role.permissions.length - 5}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setEditingRole(role)}
              className="w-full py-2 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-brand-blue hover:text-brand-blue transition-colors"
            >
              Modifier
            </button>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      {(editingRole || showCreateModal) && (
        <RoleModal
          role={editingRole}
          permissions={permissions}
          onClose={() => {
            setEditingRole(null);
            setShowCreateModal(false);
          }}
          onSave={fetchData}
        />
      )}
    </div>
  );
}

// Role Modal Component
function RoleModal({ 
  role, 
  permissions, 
  onClose, 
  onSave 
}: { 
  role: Role | null; 
  permissions: Record<string, Permission[]>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [code, setCode] = useState(role?.code || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set(role?.permissions || []));
  const [saving, setSaving] = useState(false);

  const handleTogglePerm = (permCode: string) => {
    const newSet = new Set(selectedPerms);
    if (newSet.has(permCode)) {
      newSet.delete(permCode);
    } else {
      newSet.add(permCode);
    }
    setSelectedPerms(newSet);
  };

  const handleToggleCategory = (category: string, perms: Permission[]) => {
    const categoryCodes = perms.map(p => p.code);
    const allSelected = categoryCodes.every(c => selectedPerms.has(c));
    
    const newSet = new Set(selectedPerms);
    if (allSelected) {
      categoryCodes.forEach(c => newSet.delete(c));
    } else {
      categoryCodes.forEach(c => newSet.add(c));
    }
    setSelectedPerms(newSet);
  };

  const handleSave = async () => {
    if (!name || !code) return;
    
    setSaving(true);
    try {
      const url = role ? `/api/roles/${role.id}` : '/api/roles';
      const method = role ? 'PUT' : 'POST';
      
      // Get permission IDs from codes
      const allPerms = Object.values(permissions).flat();
      const permIds = Array.from(selectedPerms).map(code => 
        allPerms.find(p => p.code === code)?.id
      ).filter(Boolean);
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code: role ? undefined : code,
          description,
          permissionIds: permIds,
        }),
      });
      
      if (res.ok) {
        onSave();
        onClose();
      }
    } catch (e) {
      console.error('Failed to save role', e);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-secondary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {role ? `Modifier: ${role.name}` : 'Nouveau rôle'}
          </h3>
        </div>
        
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nom *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm"
                placeholder="Ex: Acheteur Senior"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Code *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toLowerCase().replace(/[^a-z_]/g, '_'))}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm font-mono"
                placeholder="Ex: acheteur_senior"
                disabled={!!role}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm"
              placeholder="Description du rôle..."
            />
          </div>
          
          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Permissions</label>
            <div className="space-y-4">
              {Object.entries(permissions).map(([category, perms]) => (
                <div key={category} className="border border-[var(--border-secondary)] rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between px-4 py-2 bg-[var(--bg-input)] cursor-pointer"
                    onClick={() => handleToggleCategory(category, perms)}
                  >
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {perms.filter(p => selectedPerms.has(p.code)).length}/{perms.length}
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <label 
                        key={perm.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-[var(--bg-input)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPerms.has(perm.code)}
                          onChange={() => handleTogglePerm(perm.code)}
                          className="w-4 h-4 rounded border-[var(--border-primary)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--text-primary)]">{perm.name}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)] font-mono">{perm.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-5 border-t border-[var(--border-secondary)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !code}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
