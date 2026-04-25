import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const search = p.get('search') || '';
  const trend = p.get('trend') || '';
  const alert = p.get('alert') || '';
  const page = parseInt(p.get('page') || '1');
  const limit = parseInt(p.get('limit') || '20');

  const where: Prisma.RawMaterialWhereInput = { isDeleted: false };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (trend) where.trend = trend as any;
  if (alert) where.alertType = alert as any;

  const [total, materials] = await Promise.all([
    prisma.rawMaterial.count({ where }),
    prisma.rawMaterial.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Stats over all non-deleted materials
  const all = await prisma.rawMaterial.findMany({
    where: { isDeleted: false },
    select: { trend: true, alertType: true, variationPct: true },
  });
  const stats = {
    total: all.length,
    rising: all.filter(m => m.trend === 'rising').length,
    falling: all.filter(m => m.trend === 'declining').length,
    opportunities: all.filter(m => m.alertType === 'opportunity').length,
    risks: all.filter(m => m.alertType === 'risk').length,
  };

  return NextResponse.json({
    materials,
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const material = await prisma.rawMaterial.create({
    data: {
      id: crypto.randomUUID(),
      name: body.name,
      category: body.category,
      unit: body.unit || '$/t',
      currency: body.currency || 'USD',
      currentPrice: body.currentPrice,
      previousPrice: body.currentPrice,
      variationPct: 0,
      trend: body.trend || 'stable',
      impactedPoles: body.impactedPoles || [],
      alertType: body.alertType || 'neutral',
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(material, { status: 201 });
}
