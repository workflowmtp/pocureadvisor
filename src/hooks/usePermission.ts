'use client';

import { useSession } from 'next-auth/react';
import { getPermission, hasAccess, canCreate, canEdit, isFullAccess, type Module, type PermissionLevel } from '@/lib/permissions';
import type { Role } from '@prisma/client';

export function usePermission(module: Module) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as Role | undefined;

  if (!role) {
    return {
      level: 'none' as PermissionLevel,
      hasAccess: false,
      canCreate: false,
      canEdit: false,
      isFull: false,
    };
  }

  return {
    level: getPermission(role, module),
    hasAccess: hasAccess(role, module),
    canCreate: canCreate(role, module),
    canEdit: canEdit(role, module),
    isFull: isFullAccess(role, module),
  };
}
