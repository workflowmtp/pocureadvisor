import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PERMISSION_CODES } from '@/lib/permissions';

// GET - List all users with their roles
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_USERS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      role: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      avatar: u.avatar,
      poleIds: u.poleIds,
      isActive: u.isActive,
      loginCount: u.loginCount,
      lastLoginAt: u.lastLoginAt,
      roleId: u.roleId,
      role: u.role,
    })),
  });
}

// POST - Create new user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = (session.user as any).permissions as string[];
  if (!permissions?.includes(PERMISSION_CODES.ADMIN_USERS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { username, fullName, email, password, roleId, poleIds } = await req.json();

  if (!username || !fullName || !email || !password || !roleId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check if username or email already exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 });
  }

  // Hash password
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      username,
      fullName,
      email,
      passwordHash,
      roleId,
      poleIds: poleIds || [],
      avatar: fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      updatedAt: new Date(),
    },
    include: { role: true },
  });

  // Log action
  await prisma.activityLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      userName: session.user.name,
      action: 'create',
      module: 'users',
      entityId: user.id,
      details: `Création de l'utilisateur: ${user.fullName}`,
    },
  });

  return NextResponse.json({ success: true, user });
}
