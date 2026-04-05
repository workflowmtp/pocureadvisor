'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/lib/permissions';

interface PermissionGuardProps {
  permission?: PermissionCode;
  permissions?: PermissionCode[];
  requireAll?: boolean; // If true, all permissions required; if false, any permission
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Component to conditionally render children based on permissions
export function PermissionGuard({ 
  permission, 
  permissions, 
  requireAll = false,
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Single permission check
  if (permission) {
    if (hasPermission(permission)) {
      return <>{children}</>;
    }
    return <>{fallback}</>;
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions) 
      : hasAnyPermission(permissions);
    
    if (hasAccess) {
      return <>{children}</>;
    }
    return <>{fallback}</>;
  }

  // No permission specified, render children
  return <>{children}</>;
}

// Higher-order component for page-level permission checks
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: PermissionCode,
  FallbackComponent?: React.ComponentType
) {
  return function WithPermissionComponent(props: P) {
    const { hasPermission } = usePermissions();
    
    if (!hasPermission(permission)) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Accès non autorisé</h2>
          <p className="text-[var(--text-secondary)]">Vous n'avez pas la permission d'accéder à cette page.</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}

// Access denied component
export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">🔒</div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Accès non autorisé</h2>
      <p className="text-[var(--text-secondary)]">{message || 'Vous n\'avez pas la permission d\'accéder à cette fonctionnalité.'}</p>
    </div>
  );
}
