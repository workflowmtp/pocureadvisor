'use client';

import { useSession } from 'next-auth/react';
import { checkPermission, type PermissionCode } from '@/lib/permissions';

export function usePermission() {
  const { data: session } = useSession();
  const permissions = (session?.user as any)?.permissions as string[] | undefined;

  const hasPermission = (code: PermissionCode) => checkPermission(permissions, code);

  return {
    permissions,
    hasPermission,
    can: hasPermission,
  };
}
