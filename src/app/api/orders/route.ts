import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const search = p.get('search') || '';
  const status = p.get('status') || '';
  const pole = p.get('pole') || '';
  const lateOnly = p.get('lateOnly') === 'true';
  const ruptureOnly = p.get('ruptureOnly') === 'true';
  const page = parseInt(p.get('page') || '1');
  const limit = parseInt(p.get('limit') || '20');

  const where: Prisma.OrderWhereInput = { isDeleted: false };
  if (search) {
    where.OR = [
      { poNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (status) where.status = status as any;
  if (pole) where.poleId = pole;
  if (lateOnly) where.isLate = true;
  if (ruptureOnly) where.riskOfStockout = true;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { supplier: { select: { id: true, name: true, code: true, scoreGlobal: true } } },
      orderBy: [{ isLate: 'desc' }, { delayDays: 'desc' }, { dateCreated: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Stats
  const allOrders = await prisma.order.findMany({ where: { isDeleted: false }, select: { status: true, isLate: true, riskOfStockout: true, totalAmount: true } });
  const stats = {
    total: allOrders.length,
    pending: allOrders.filter(o => !['received', 'closed'].includes(o.status)).length,
    late: allOrders.filter(o => o.isLate && !['received', 'closed'].includes(o.status)).length,
    ruptureRisk: allOrders.filter(o => o.riskOfStockout && !['received', 'closed'].includes(o.status)).length,
    totalAmount: allOrders.reduce((s, o) => s + o.totalAmount, 0),
  };

  return NextResponse.json({
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats,
  });
}
