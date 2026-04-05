import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const countOnly = req.nextUrl.searchParams.get('countOnly');
  const priorities = req.nextUrl.searchParams.get('priorities');

  if (countOnly) {
    const [unreadNotifs, openAnomalies, lateOrders, suppliersAtRisk] = await Promise.all([
      prisma.notification.count({ where: { isRead: false, OR: [{ userId: session.user.id }, { userId: null }] } }),
      prisma.anomaly.count({ where: { status: { in: ['open', 'investigating'] }, isDeleted: false } }),
      prisma.order.count({ where: { isLate: true, status: { notIn: ['received', 'closed'] }, isDeleted: false } }),
      prisma.supplier.count({ where: { riskLevel: { in: ['critical', 'high'] }, isDeleted: false } }),
    ]);
    return NextResponse.json({ unreadNotifs, openAnomalies, lateOrders, suppliersAtRisk });
  }

  // Priority actions
  if (priorities) {
    const [anomalies, orders, suppliers, negotiations] = await Promise.all([
      prisma.anomaly.findMany({ where: { isDeleted: false, status: { in: ['open', 'investigating'] }, severity: 'critical' }, select: { id: true, title: true, financialImpact: true }, take: 5 }),
      prisma.order.findMany({ where: { isDeleted: false, isLate: true, riskOfStockout: true, status: { notIn: ['received', 'closed'] } }, select: { id: true, poNumber: true, delayDays: true, totalAmount: true }, take: 5 }),
      prisma.supplier.findMany({ where: { isDeleted: false, riskLevel: 'critical' }, select: { id: true, name: true, scoreGlobal: true }, take: 3 }),
      prisma.negotiation.findMany({ where: { isDeleted: false, status: 'pending_decision' }, select: { id: true, subject: true, financialStake: true }, take: 3 }),
    ]);

    const actions: any[] = [];

    anomalies.forEach(a => actions.push({
      id: 'anom-' + a.id, label: 'Anomalie critique: ' + a.title.substring(0, 40),
      desc: 'Impact: ' + (a.financialImpact?.toLocaleString('fr-FR') || '?') + ' FCFA — Action immédiate requise',
      priority: 'P1', type: 'anomaly', href: '/audit/' + a.id, impact: a.financialImpact,
    }));

    orders.forEach(o => actions.push({
      id: 'ord-' + o.id, label: 'Rupture stock: ' + o.poNumber + ' (+' + o.delayDays + 'j)',
      desc: 'Commande en retard avec risque de rupture — Relance urgente',
      priority: 'P1', type: 'order', href: '/orders/' + o.id, impact: o.totalAmount,
    }));

    suppliers.forEach(s => actions.push({
      id: 'sup-' + s.id, label: 'Fournisseur critique: ' + s.name + ' (' + s.scoreGlobal + '/100)',
      desc: 'Score critique — Évaluer alternatives et programmer entretien',
      priority: 'P2', type: 'supplier', href: '/suppliers/' + s.id,
    }));

    negotiations.forEach(n => actions.push({
      id: 'nego-' + n.id, label: 'Décision: ' + n.subject.substring(0, 40),
      desc: 'Négociation en attente de décision — Enjeu: ' + Math.round(n.financialStake / 1000000) + 'M FCFA',
      priority: 'P2', type: 'negotiation', href: '/negotiations/' + n.id, impact: n.financialStake,
    }));

    actions.sort((a, b) => (a.priority < b.priority ? -1 : 1));
    return NextResponse.json({ actions });
  }

  // Full notifications list
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, id } = await req.json();

  if (action === 'mark_read' && id) {
    await prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return NextResponse.json({ success: true });
  }

  if (action === 'mark_all_read') {
    await prisma.notification.updateMany({
      where: { isRead: false, OR: [{ userId: session.user.id }, { userId: null }] },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
