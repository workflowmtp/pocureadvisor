import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PERMISSION_CODES } from '@/lib/permissions';

// GET - List all roles with their permissions
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user can manage roles
  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    roles: roles.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      isDefault: r.isDefault,
      userCount: r._count.users,
      permissions: r.permissions.map(p => p.permission.code),
    })),
  });
}

// POST - Create a new role
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { code, name, description, permissionIds } = await req.json();

  if (!code || !name) {
    return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
  }

  // Check if code already exists
  const existing = await prisma.role.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: 'Role code already exists' }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: {
      id: crypto.randomUUID(),
      code,
      name,
      description,
      isSystem: false,
      isDefault: false,
      updatedAt: new Date(),
      rolePermissions: {
        create: permissionIds?.map((pid: string) => ({
          permissionId: pid,
        })) || [],
      },
    },
    include: {
      rolePermissions: { include: { permission: true } },
    },
  });

  // Log action
  await prisma.activityLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      userName: session.user.name,
      action: 'create',
      module: 'roles',
      entityId: role.id,
      details: `Création du rôle: ${role.name}`,
    },
  });

  return NextResponse.json({
    role: {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.permission.code),
    },
  });
}
