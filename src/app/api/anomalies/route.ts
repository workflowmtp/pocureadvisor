import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const search = p.get('search') || '';
  const severity = p.get('severity') || '';
  const category = p.get('category') || '';
  const status = p.get('status') || '';

  const where: Prisma.AnomalyWhereInput = { isDeleted: false };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { id: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (severity) where.severity = severity as any;
  if (category) where.category = category;
  if (status) where.status = status as any;

  const anomalies = await prisma.anomaly.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, fullName: true } },
    },
    orderBy: [{ status: 'asc' }, { severity: 'asc' }, { dateDetected: 'desc' }],
    take: 100,
  });

  // Stats
  const all = await prisma.anomaly.findMany({ where: { isDeleted: false }, select: { status: true, severity: true, financialImpact: true } });
  const stats = {
    total: all.length,
    open: all.filter(a => a.status === 'open').length,
    investigating: all.filter(a => a.status === 'investigating').length,
    resolved: all.filter(a => a.status === 'resolved').length,
    criticals: all.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
    totalImpact: all.filter(a => a.status !== 'resolved').reduce((s, a) => s + (a.financialImpact || 0), 0),
  };

  // Categories list for filter
  const categories = [...new Set(all.map(a => (a as any).category || ''))].filter(Boolean).sort();

  return NextResponse.json({ anomalies, stats, categories });
}
