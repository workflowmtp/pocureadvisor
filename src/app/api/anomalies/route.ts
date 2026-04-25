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

  const [anomalies, all, auditRules] = await Promise.all([
    prisma.anomaly.findMany({
      where,
      orderBy: [{ status: 'asc' }, { severity: 'asc' }, { dateDetected: 'desc' }],
      take: 100,
    }),
    prisma.anomaly.findMany({ where: { isDeleted: false }, select: { status: true, severity: true, financialImpact: true, category: true } }),
    prisma.auditRule.findMany({ orderBy: { code: 'asc' } }),
  ]);

  // Resolve supplier names and user names (supplierId is a code, userId is a user id)
  const supplierIds = [...new Set(anomalies.map(a => a.supplierId).filter(Boolean))] as string[];
  const userIds = [...new Set(anomalies.map(a => a.userId).filter(Boolean))] as string[];

  const [suppliers, users] = await Promise.all([
    supplierIds.length > 0
      ? prisma.supplier.findMany({ where: { code: { in: supplierIds } }, select: { id: true, code: true, name: true } })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
      : Promise.resolve([]),
  ]);

  const supplierMap = new Map(suppliers.map(s => [s.code, s.name]));
  const userMap = new Map(users.map(u => [u.id, u.fullName]));

  // Enrich anomalies with supplier/user names
  const enriched = anomalies.map(a => ({
    ...a,
    financialImpact: Number(a.financialImpact || 0),
    supplier: a.supplierId ? { name: supplierMap.get(a.supplierId) || '—' } : null,
    user: a.userId ? { fullName: userMap.get(a.userId) || '—' } : null,
  }));

  // Stats
  const stats = {
    total: all.length,
    open: all.filter(a => a.status === 'open').length,
    investigating: all.filter(a => a.status === 'investigating').length,
    resolved: all.filter(a => a.status === 'resolved').length,
    criticals: all.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
    totalImpact: all.filter(a => a.status !== 'resolved').reduce((s, a) => s + Number(a.financialImpact || 0), 0),
  };

  // Categories list for filter
  const categories = [...new Set(all.map(a => a.category || ''))].filter(Boolean).sort();

  return NextResponse.json({
    anomalies: enriched,
    stats,
    categories,
    auditRules: auditRules.map(r => ({ ...r, active: r.isActive })),
  });
}
