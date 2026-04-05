import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PERMISSION_CODES } from '@/lib/permissions';

// GET - List all permissions grouped by category
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allPermissions = await prisma.permission.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Group by category
  const grouped = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push({
      id: perm.id,
      code: perm.code,
      name: perm.name,
      description: perm.description,
      isSystem: perm.isSystem,
    });
    return acc;
  }, {} as Record<string, any[]>);

  return NextResponse.json({ permissions: grouped });
}
