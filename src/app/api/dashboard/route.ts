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

  // Fetch all data from local DB in parallel
  const [
    supplierStats,
    anomalyStats,
    criticalAnomaliesData,
    topSuppliers,
    topAnomalies,
    categoryVolumeRaw,
    orders,
    lateOrdersData,
    poles,
    suppliersMap,
  ] = await Promise.all([
    // Supplier aggregations
    prisma.supplier.aggregate({
      where: { isDeleted: false },
      _count: { _all: true },
      _sum: { volumeYtd: true },
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
      select: { id: true, title: true, financialImpact: true, supplierId: true },
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
      select: { id: true, title: true, category: true, severity: true, financialImpact: true, dateDetected: true, status: true, priority: true, supplierId: true },
      orderBy: { priority: 'asc' },
      take: 5,
    }),

    // Category distribution using groupBy
    prisma.supplier.groupBy({
      by: ['categoryId'],
      where: { isDeleted: false },
      _sum: { volumeYtd: true },
    }),

    // All orders from DB
    prisma.order.findMany({
      where: { isDeleted: false },
      include: { supplier: { select: { code: true, name: true } } },
    }),

    // Late orders for alerts
    prisma.order.findMany({
      where: { isDeleted: false, isLate: true },
      include: { supplier: { select: { code: true, name: true } } },
      take: 5,
      orderBy: { delayDays: 'desc' },
    }),

    // Poles for volume chart
    prisma.pole.findMany(),

    // Supplier code -> name mapping
    prisma.supplier.findMany({
      where: { isDeleted: false },
      select: { code: true, name: true },
    }),
  ]);

  // Build supplier code->name lookup
  const supplierLookup: Record<string, string> = {};
  suppliersMap.forEach(s => { supplierLookup[s.code] = s.name; });

  // Order stats from local DB
  const totalOrderAmount = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const ruptureRiskCount = orders.filter(o => o.riskOfStockout).length;

  // Volume by pole from local orders
  const poleLookup: Record<string, string> = {};
  poles.forEach(p => { poleLookup[p.id] = p.name; poleLookup[p.code] = p.name; });
  const volumeByPole: Record<string, number> = {};
  orders.forEach(o => {
    const poleName = poleLookup[o.poleId] || o.poleId || 'Autre';
    volumeByPole[poleName] = (volumeByPole[poleName] || 0) + Number(o.totalAmount || 0);
  });

  // Get additional counts
  const [
    activeSupplierCount,
    suppliersAtRiskCount,
    openAnomaliesCount,
    criticalAnomaliesCount,
  ] = await Promise.all([
    prisma.supplier.count({ where: { isDeleted: false, status: { notIn: ['blocked', 'suspended'] } } }),
    prisma.supplier.count({ where: { isDeleted: false, riskLevel: { in: ['critical', 'high'] } } }),
    prisma.anomaly.count({ where: { isDeleted: false, status: { in: ['open', 'investigating'] } } }),
    prisma.anomaly.count({ where: { isDeleted: false, severity: 'critical', status: { not: 'resolved' } } }),
  ]);

  // Build response
  const kpis = {
    activeSuppliers: activeSupplierCount,
    suppliersAtRisk: suppliersAtRiskCount,
    pendingOrders: orders.length,
    lateOrders: lateOrdersData.length,
    ruptureRisk: ruptureRiskCount,
    openAnomalies: openAnomaliesCount,
    criticalAnomalies: criticalAnomaliesCount,
    totalVolumeYtd: Number(supplierStats._sum.volumeYtd || 0),
    totalFinancialImpact: Number(anomalyStats._sum.financialImpact || 0),
    volumeAchats: totalOrderAmount,
    savingsRealized: Math.round(totalOrderAmount * 0.08),
    savingsPotential: Math.round(Number(anomalyStats._sum.financialImpact || 0) * 0.6),
    conformityRate: 87,
    totalOrders: orders.length,
  };

  const alerts = {
    critical: criticalAnomaliesData.map(a => ({
      id: a.id,
      title: a.title,
      supplier: supplierLookup[a.supplierId || ''] || a.supplierId || '—',
      financialImpact: a.financialImpact,
      type: 'critical' as const,
    })),
    warning: lateOrdersData.map(o => ({
      id: o.poNumber || o.id,
      title: `${o.poNumber} — Retard +${o.delayDays}j`,
      supplier: o.supplier?.name || '—',
      amount: o.totalAmount,
      type: 'warning' as const,
      riskOfStockout: o.riskOfStockout,
    })),
    opportunity: [],
  };

  const charts = {
    volumeByPole: Object.entries(volumeByPole).map(([pole, amount]) => ({ pole, amount })),
    categoryDistribution: categoryVolumeRaw
      .filter(c => c._sum.volumeYtd && Number(c._sum.volumeYtd) > 0)
      .sort((a, b) => Number(b._sum.volumeYtd || 0) - Number(a._sum.volumeYtd || 0))
      .slice(0, 6)
      .map(c => ({ name: c.categoryId || 'Autre', value: Number(c._sum.volumeYtd || 0) })),
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
      supplier: supplierLookup[a.supplierId || ''] || a.supplierId || '—', impact: a.financialImpact,
      date: a.dateDetected, status: a.status, priority: a.priority,
    })),
  };

  // Update cache
  dashboardCache = { data, timestamp: Date.now() };

  return NextResponse.json(data);
}
