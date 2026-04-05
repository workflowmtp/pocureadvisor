import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PERMISSION_CODES } from '@/lib/permissions';

// GET - Get single role details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  return NextResponse.json({
    role: {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      userCount: role._count.users,
      permissions: role.permissions.map(p => ({
        id: p.permission.id,
        code: p.permission.code,
        name: p.permission.name,
        category: p.permission.category,
      })),
    },
  });
}

// PUT - Update role
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { name, description, permissionIds } = await req.json();

  const existingRole = await prisma.role.findUnique({ where: { id } });
  if (!existingRole) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  // Update role
  const role = await prisma.role.update({
    where: { id },
    data: {
      name,
      description,
    },
  });

  // Update permissions - delete existing and create new
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  
  if (permissionIds && permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permId: string) => ({
        roleId: id,
        permissionId: permId,
      })),
    });
  }

  // Log action
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      userName: session.user.name,
      action: 'update',
      module: 'roles',
      entityId: role.id,
      details: `Modification du rôle: ${role.name}`,
    },
  });

  return NextResponse.json({ success: true, role });
}

// DELETE - Delete role
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  if (role.isSystem) {
    return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 });
  }

  if (role._count.users > 0) {
    return NextResponse.json({ error: 'Cannot delete role with assigned users' }, { status: 400 });
  }

  await prisma.role.delete({ where: { id } });

  // Log action
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      userName: session.user.name,
      action: 'delete',
      module: 'roles',
      details: `Suppression du rôle: ${role.name}`,
    },
  });

  return NextResponse.json({ success: true });
}
