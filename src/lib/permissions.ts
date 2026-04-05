import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Permission codes - must match prisma/permissions.ts
export const PERMISSION_CODES = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',
  SUPPLIERS_EXPORT: 'suppliers.export',
  
  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_VALIDATE: 'orders.validate',
  
  // Invoices
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_VALIDATE: 'invoices.validate',
  
  // Documents
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_PROCESS: 'documents.process',
  
  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_CREATE: 'audit.create',
  AUDIT_RESOLVE: 'audit.resolve',
  AUDIT_ESCALATE: 'audit.escalate',
  
  // Negotiations
  NEGOTIATIONS_VIEW: 'negotiations.view',
  NEGOTIATIONS_CREATE: 'negotiations.create',
  NEGOTIATIONS_EDIT: 'negotiations.edit',
  
  // Sourcing
  SOURCING_VIEW: 'sourcing.view',
  SOURCING_MANAGE: 'sourcing.manage',
  
  // AI
  AI_CHAT: 'ai.chat',
  
  // Letters
  LETTERS_VIEW: 'letters.view',
  LETTERS_CREATE: 'letters.create',
  
  // Logs
  LOGS_VIEW: 'logs.view',
  
  // Admin
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SETTINGS: 'admin.settings',
} as const;

export type PermissionCode = typeof PERMISSION_CODES[keyof typeof PERMISSION_CODES];

// Check if user has a specific permission
export async function hasPermission(permissionCode: PermissionCode): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  
  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions) return false;
  
  return permissions.includes(permissionCode);
}

// Check multiple permissions (any match)
export async function hasAnyPermission(permissionCodes: PermissionCode[]): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  
  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions) return false;
  
  return permissionCodes.some(code => permissions.includes(code));
}

// Check all permissions (all must match)
export async function hasAllPermissions(permissionCodes: PermissionCode[]): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  
  const permissions = (session.user as any).permissions as string[] | undefined;
  if (!permissions) return false;
  
  return permissionCodes.every(code => permissions.includes(code));
}

// Get all user permissions
export async function getUserPermissions(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];
  
  return (session.user as any).permissions as string[] || [];
}

// Check if user is admin (has admin.roles permission)
export async function isAdmin(): Promise<boolean> {
  return hasPermission(PERMISSION_CODES.ADMIN_ROLES);
}

// Server-side permission check for API routes
export async function requirePermission(permissionCode: PermissionCode): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }
  
  const has = await hasPermission(permissionCode);
  if (!has) {
    return { success: false, error: 'Forbidden: Insufficient permissions' };
  }
  
  return { success: true };
}

// Get user's role info
export async function getUserRole(): Promise<{ code: string; name: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  
  return {
    code: (session.user as any).roleCode || '',
    name: (session.user as any).roleName || '',
  };
}

// Client-side permission check hook
export function checkPermission(permissions: string[] | undefined, code: PermissionCode): boolean {
  if (!permissions) return false;
  return permissions.includes(code);
}

export function checkAnyPermission(permissions: string[] | undefined, codes: PermissionCode[]): boolean {
  if (!permissions) return false;
  return codes.some(code => permissions.includes(code));
}
