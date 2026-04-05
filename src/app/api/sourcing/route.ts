import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const materials = await prisma.rawMaterial.findMany({ where: { isDeleted: false }, orderBy: { name: 'asc' } });

  const stats = {
    total: materials.length,
    rising: materials.filter(m => m.trend === 'rising').length,
    falling: materials.filter(m => m.trend === 'declining').length,
    opportunities: materials.filter(m => m.alertType === 'opportunity').length,
    risks: materials.filter(m => m.alertType === 'risk').length,
  };

  return NextResponse.json({ materials, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const material = await prisma.rawMaterial.create({
    data: {
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
    },
  });

  return NextResponse.json(material, { status: 201 });
}
