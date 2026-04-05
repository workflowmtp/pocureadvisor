import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const search = p.get('search') || '';
  const module = p.get('module') || '';
  const aiOnly = p.get('aiOnly') === 'true';
  const page = parseInt(p.get('page') || '1');
  const limit = parseInt(p.get('limit') || '50');

  const where: any = {};
  if (search) where.OR = [{ userName: { contains: search, mode: 'insensitive' } }, { details: { contains: search, mode: 'insensitive' } }, { action: { contains: search, mode: 'insensitive' } }];
  if (module) where.module = module;
  if (aiOnly) where.aiInvolved = true;

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);

  const modules = await prisma.activityLog.groupBy({ by: ['module'], _count: true, orderBy: { _count: { module: 'desc' } } });

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    modules: modules.map(m => ({ module: m.module, count: m._count })),
  });
}
