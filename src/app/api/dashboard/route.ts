import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Cache dashboard data for 2 minutes
let dashboardCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Return cached data if valid
  if (dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_TTL) {
    return NextResponse.json(dashboardCache.data);
  }

  // Use optimized queries with select instead of include
  const [
    supplierStats,
    orderStats,
    anomalyStats,
    criticalAnomaliesData,
    lateOrdersData,
    topSuppliers,
    topAnomalies,
    volumeByPoleRaw,
    categoryVolumeRaw,
  ] = await Promise.all([
    // Supplier aggregations
    prisma.supplier.aggregate({
      where: { isDeleted: false },
      _count: { _all: true },
      _sum: { volumeYtd: true },
    }),
    
    // Order aggregations
    prisma.order.aggregate({
      where: { isDeleted: false },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    
    // Anomaly aggregations
    prisma.anomaly.aggregate({
      where: { isDeleted: false },
      _count: { _all: true },
      _sum: { financialImpact: true },
    }),
    
    // Critical anomalies for alerts
    prisma.anomaly.findMany({
      where: { isDeleted: false, severity: 'critical', status: { not: 'resolved' } },
      select: { id: true, title: true, financialImpact: true, supplier: { select: { name: true } } },
      take: 5,
    }),
    
    // Late orders for alerts
    prisma.order.findMany({
      where: { isDeleted: false, isLate: true, status: { notIn: ['received', 'closed'] } },
      select: { id: true, poNumber: true, delayDays: true, totalAmount: true, riskOfStockout: true, supplier: { select: { name: true } } },
      take: 5,
    }),
    
    // Top 5 suppliers by volume
    prisma.supplier.findMany({
      where: { isDeleted: false },
      select: { id: true, code: true, name: true, scoreGlobal: true, volumeYtd: true, trend: true, riskLevel: true, dependencyRatio: true },
      orderBy: { volumeYtd: 'desc' },
      take: 5,
    }),
    
    // Top 5 anomalies by priority
    prisma.anomaly.findMany({
      where: { isDeleted: false, status: { not: 'resolved' } },
      select: { id: true, title: true, category: true, severity: true, financialImpact: true, dateDetected: true, status: true, priority: true, supplier: { select: { name: true } } },
      orderBy: { priority: 'asc' },
      take: 5,
    }),
    
    // Volume by pole using groupBy
    prisma.order.groupBy({
      by: ['poleId'],
      where: { isDeleted: false },
      _sum: { totalAmount: true },
    }),
    
    // Category distribution using groupBy
    prisma.supplier.groupBy({
      by: ['categoryId'],
      where: { isDeleted: false },
      _sum: { volumeYtd: true },
    }),
  ]);

  // Get additional counts in parallel
  const [
    activeSupplierCount,
    suppliersAtRiskCount,
    pendingOrdersCount,
    lateOrdersCount,
    ruptureRiskCount,
    openAnomaliesCount,
    criticalAnomaliesCount,
  ] = await Promise.all([
    prisma.supplier.count({ where: { isDeleted: false, status: { notIn: ['blocked', 'suspended'] } } }),
    prisma.supplier.count({ where: { isDeleted: false, riskLevel: { in: ['critical', 'high'] } } }),
    prisma.order.count({ where: { isDeleted: false, status: { notIn: ['received', 'closed'] } } }),
    prisma.order.count({ where: { isDeleted: false, isLate: true, status: { notIn: ['received', 'closed'] } } }),
    prisma.order.count({ where: { isDeleted: false, riskOfStockout: true, status: { notIn: ['received', 'closed'] } } }),
    prisma.anomaly.count({ where: { isDeleted: false, status: { in: ['open', 'investigating'] } } }),
    prisma.anomaly.count({ where: { isDeleted: false, severity: 'critical', status: { not: 'resolved' } } }),
  ]);

  // Build response
  const kpis = {
    activeSuppliers: activeSupplierCount,
    suppliersAtRisk: suppliersAtRiskCount,
    pendingOrders: pendingOrdersCount,
    lateOrders: lateOrdersCount,
    ruptureRisk: ruptureRiskCount,
    openAnomalies: openAnomaliesCount,
    criticalAnomalies: criticalAnomaliesCount,
    totalVolumeYtd: supplierStats._sum.volumeYtd || 0,
    totalFinancialImpact: anomalyStats._sum.financialImpact || 0,
    volumeAchats: orderStats._sum.totalAmount || 0,
    savingsRealized: Math.round((orderStats._sum.totalAmount || 0) * 0.08),
    savingsPotential: Math.round((anomalyStats._sum.financialImpact || 0) * 0.6),
    conformityRate: 87,
    totalOrders: orderStats._count._all,
  };

  const alerts = {
    critical: criticalAnomaliesData.map(a => ({
      id: a.id,
      title: a.title,
      supplier: a.supplier?.name || '—',
      financialImpact: a.financialImpact,
      type: 'critical' as const,
    })),
    warning: lateOrdersData.map(o => ({
      id: o.id,
      title: `${o.poNumber} — Retard +${o.delayDays}j`,
      supplier: o.supplier?.name || '—',
      amount: o.totalAmount,
      type: 'warning' as const,
      riskOfStockout: o.riskOfStockout,
    })),
    opportunity: [],
  };

  // Map pole IDs to names
  const poleNames: Record<string, string> = { OE: 'Opérations', HF: 'Hors FAB', OC: 'Occasionnel', BC: 'Bureau' };
  const charts = {
    volumeByPole: volumeByPoleRaw.map(p => ({ pole: poleNames[p.poleId] || p.poleId, amount: p._sum.totalAmount || 0 })),
    categoryDistribution: categoryVolumeRaw
      .filter(c => c._sum.volumeYtd && c._sum.volumeYtd > 0)
      .sort((a, b) => (b._sum.volumeYtd || 0) - (a._sum.volumeYtd || 0))
      .slice(0, 6)
      .map(c => ({ name: c.categoryId || 'Autre', value: c._sum.volumeYtd || 0 })),
  };

  const data = {
    kpis,
    alerts,
    charts,
    topSuppliers: topSuppliers.map(s => ({
      id: s.id, code: s.code, name: s.name, score: s.scoreGlobal,
      volume: s.volumeYtd, trend: s.trend, riskLevel: s.riskLevel, dependencyRatio: s.dependencyRatio,
    })),
    topAnomalies: topAnomalies.map(a => ({
      id: a.id, title: a.title, category: a.category, severity: a.severity,
      supplier: a.supplier?.name || '—', impact: a.financialImpact,
      date: a.dateDetected, status: a.status, priority: a.priority,
    })),
  };

  // Update cache
  dashboardCache = { data, timestamp: Date.now() };

  return NextResponse.json(data);
}
