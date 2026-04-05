'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PERMISSION_CODES, PermissionCode, checkPermission, checkAnyPermission } from '@/lib/permissions';

interface UserSession {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  permissions: string[];
}

// Global state for permissions (to avoid refetching)
let cachedSession: UserSession | null = null;
let sessionFetchPromise: Promise<UserSession | null> | null = null;

export function usePermissions() {
  const [session, setSession] = useState<UserSession | null>(cachedSession);
  const [loading, setLoading] = useState(!cachedSession);

  useEffect(() => {
    if (cachedSession) {
      setSession(cachedSession);
      setLoading(false);
      return;
    }

    // Dedupe fetch requests
    if (!sessionFetchPromise) {
      sessionFetchPromise = fetch('/api/auth/session')
        .then(r => r.json())
        .then(data => {
          if (data?.user) {
            const userSession: UserSession = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              roleCode: (data.user as any).roleCode || '',
              roleName: (data.user as any).roleName || '',
              permissions: (data.user as any).permissions || [],
            };
            cachedSession = userSession;
            return userSession;
          }
          return null;
        })
        .catch(() => null);
    }

    sessionFetchPromise.then(s => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  // Permission check functions
  const hasPermission = useCallback(
    (code: PermissionCode) => checkPermission(session?.permissions, code),
    [session?.permissions]
  );

  const hasAnyPermission = useCallback(
    (codes: PermissionCode[]) => checkAnyPermission(session?.permissions, codes),
    [session?.permissions]
  );

  const hasAllPermissions = useCallback(
    (codes: PermissionCode[]) => {
      if (!session?.permissions) return false;
      return codes.every(code => session.permissions.includes(code));
    },
    [session?.permissions]
  );

  // Convenience checks for common permissions
  const can = useMemo(() => ({
    // Dashboard
    viewDashboard: hasPermission(PERMISSION_CODES.DASHBOARD_VIEW),
    
    // Suppliers
    viewSuppliers: hasPermission(PERMISSION_CODES.SUPPLIERS_VIEW),
    createSuppliers: hasPermission(PERMISSION_CODES.SUPPLIERS_CREATE),
    editSuppliers: hasPermission(PERMISSION_CODES.SUPPLIERS_EDIT),
    deleteSuppliers: hasPermission(PERMISSION_CODES.SUPPLIERS_DELETE),
    exportSuppliers: hasPermission(PERMISSION_CODES.SUPPLIERS_EXPORT),
    
    // Orders
    viewOrders: hasPermission(PERMISSION_CODES.ORDERS_VIEW),
    createOrders: hasPermission(PERMISSION_CODES.ORDERS_CREATE),
    editOrders: hasPermission(PERMISSION_CODES.ORDERS_EDIT),
    deleteOrders: hasPermission(PERMISSION_CODES.ORDERS_DELETE),
    validateOrders: hasPermission(PERMISSION_CODES.ORDERS_VALIDATE),
    
    // Invoices
    viewInvoices: hasPermission(PERMISSION_CODES.INVOICES_VIEW),
    createInvoices: hasPermission(PERMISSION_CODES.INVOICES_CREATE),
    editInvoices: hasPermission(PERMISSION_CODES.INVOICES_EDIT),
    validateInvoices: hasPermission(PERMISSION_CODES.INVOICES_VALIDATE),
    
    // Documents
    viewDocuments: hasPermission(PERMISSION_CODES.DOCUMENTS_VIEW),
    uploadDocuments: hasPermission(PERMISSION_CODES.DOCUMENTS_UPLOAD),
    processDocuments: hasPermission(PERMISSION_CODES.DOCUMENTS_PROCESS),
    
    // Audit
    viewAudit: hasPermission(PERMISSION_CODES.AUDIT_VIEW),
    createAnomalies: hasPermission(PERMISSION_CODES.AUDIT_CREATE),
    resolveAnomalies: hasPermission(PERMISSION_CODES.AUDIT_RESOLVE),
    escalateAnomalies: hasPermission(PERMISSION_CODES.AUDIT_ESCALATE),
    
    // Negotiations
    viewNegotiations: hasPermission(PERMISSION_CODES.NEGOTIATIONS_VIEW),
    createNegotiations: hasPermission(PERMISSION_CODES.NEGOTIATIONS_CREATE),
    editNegotiations: hasPermission(PERMISSION_CODES.NEGOTIATIONS_EDIT),
    
    // Sourcing
    viewSourcing: hasPermission(PERMISSION_CODES.SOURCING_VIEW),
    manageSourcing: hasPermission(PERMISSION_CODES.SOURCING_MANAGE),
    
    // AI
    useAI: hasPermission(PERMISSION_CODES.AI_CHAT),
    
    // Letters
    viewLetters: hasPermission(PERMISSION_CODES.LETTERS_VIEW),
    createLetters: hasPermission(PERMISSION_CODES.LETTERS_CREATE),
    
    // Logs
    viewLogs: hasPermission(PERMISSION_CODES.LOGS_VIEW),
    
    // Admin
    manageUsers: hasPermission(PERMISSION_CODES.ADMIN_USERS),
    manageRoles: hasPermission(PERMISSION_CODES.ADMIN_ROLES),
    manageSettings: hasPermission(PERMISSION_CODES.ADMIN_SETTINGS),
    
    // Admin shortcuts
    isAdmin: hasPermission(PERMISSION_CODES.ADMIN_ROLES),
  }), [hasPermission]);

  return {
    session,
    loading,
    permissions: session?.permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    // Role info
    roleCode: session?.roleCode,
    roleName: session?.roleName,
    // Clear cache on logout
    clearCache: () => {
      cachedSession = null;
      sessionFetchPromise = null;
    },
  };
}

// Clear cache function for logout
export function clearPermissionCache() {
  cachedSession = null;
  sessionFetchPromise = null;
}
