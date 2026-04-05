import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!supplier || supplier.isDeleted) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  }

  // Fetch related data in parallel
  const [orders, anomalies, invoices, negotiations, letters] = await Promise.all([
    prisma.order.findMany({
      where: { supplierId: id, isDeleted: false },
      orderBy: { dateCreated: 'desc' },
      take: 20,
    }),
    prisma.anomaly.findMany({
      where: { supplierId: id, isDeleted: false },
      orderBy: { dateDetected: 'desc' },
      include: { user: { select: { fullName: true } } },
      take: 20,
    }),
    prisma.invoice.findMany({
      where: { supplierId: id, isDeleted: false },
      orderBy: { dateInvoice: 'desc' },
      take: 10,
    }),
    prisma.negotiation.findMany({
      where: { supplierId: id, isDeleted: false },
      orderBy: { dateStart: 'desc' },
      take: 5,
    }),
    prisma.letter.findMany({
      where: { supplierId: id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Compute stats
  const orderStats = {
    total: orders.length,
    lateCount: orders.filter(o => o.isLate && !['received', 'closed'].includes(o.status)).length,
    totalAmount: orders.reduce((s, o) => s + o.totalAmount, 0),
    avgDelay: orders.filter(o => o.delayDays > 0).length > 0
      ? Math.round(orders.filter(o => o.delayDays > 0).reduce((s, o) => s + o.delayDays, 0) / orders.filter(o => o.delayDays > 0).length)
      : 0,
  };

  const anomalyStats = {
    total: anomalies.length,
    open: anomalies.filter(a => a.status === 'open' || a.status === 'investigating').length,
    criticals: anomalies.filter(a => a.severity === 'critical').length,
    totalImpact: anomalies.reduce((s, a) => s + (a.financialImpact || 0), 0),
  };

  // Scoring data for radar chart
  const scoring = {
    quality: supplier.scoreQuality,
    price: supplier.scorePrice,
    delivery: supplier.scoreDelivery,
    docCompliance: supplier.scoreDoc,
    reactivity: supplier.scoreReactivity,
    regularity: supplier.scoreRegularity,
    global: supplier.scoreGlobal,
  };

  // AI analysis text
  const aiAnalysis = generateAIAnalysis(supplier, orderStats, anomalyStats);

  return NextResponse.json({
    supplier: {
      ...supplier,
      categoryName: supplier.category?.name || '—',
    },
    scoring,
    orders,
    anomalies,
    invoices,
    negotiations,
    letters,
    orderStats,
    anomalyStats,
    aiAnalysis,
  });
}

function generateAIAnalysis(supplier: any, orderStats: any, anomalyStats: any): string {
  const parts: string[] = [];

  // Performance globale
  if (supplier.scoreGlobal >= 80) {
    parts.push(`**${supplier.name}** présente un profil de performance solide avec un score global de **${supplier.scoreGlobal}/100**. Ce fournisseur est fiable et mérite le statut stratégique.`);
  } else if (supplier.scoreGlobal >= 60) {
    parts.push(`**${supplier.name}** a un score de **${supplier.scoreGlobal}/100**, niveau acceptable mais avec des axes d'amélioration identifiés.`);
  } else {
    parts.push(`⚠️ **${supplier.name}** présente un score préoccupant de **${supplier.scoreGlobal}/100**. Une revue approfondie et la recherche d'alternatives sont recommandées.`);
  }

  // Tendance
  if (supplier.trend === 'declining') {
    parts.push(`📉 **Tendance en baisse** — La performance se dégrade. ${supplier.incidentsCount} incidents enregistrés.`);
  } else if (supplier.trend === 'rising') {
    parts.push(`📈 **Tendance positive** — Performance en amélioration continue.`);
  }

  // Risques
  if (supplier.dependencyRatio > 50) {
    parts.push(`🔴 **Concentration élevée** (${supplier.dependencyRatio}%) — Risque de dépendance. Diversifier les sources d'approvisionnement.`);
  }

  // Anomalies
  if (anomalyStats.open > 0) {
    parts.push(`🛡️ **${anomalyStats.open} anomalie(s) ouverte(s)** dont ${anomalyStats.criticals} critique(s). Impact financier: ${anomalyStats.totalImpact.toLocaleString('fr-FR')} FCFA.`);
  }

  // Commandes
  if (orderStats.lateCount > 0) {
    parts.push(`📦 **${orderStats.lateCount} commande(s) en retard**. Délai moyen de retard: ${orderStats.avgDelay} jours.`);
  }

  // Recommandations
  parts.push('\n**Recommandations :**');
  if (supplier.scoreGlobal < 50) {
    parts.push('- 🚨 Programmer un entretien urgent avec le fournisseur');
    parts.push('- Identifier et qualifier un fournisseur alternatif');
    parts.push('- Envisager un transfert progressif des volumes');
  } else if (supplier.scoreGlobal < 70) {
    parts.push('- Planifier une revue fournisseur trimestrielle');
    parts.push('- Négocier des améliorations sur les axes faibles');
  } else {
    parts.push('- Maintenir la relation et explorer les opportunités de partenariat');
    parts.push('- Envisager un contrat cadre pluriannuel');
  }

  return parts.join('\n');
}
