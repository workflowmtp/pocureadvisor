import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: { include: { article: true } },
      anomalies: { where: { isDeleted: false }, include: { user: { select: { fullName: true } } } },
      invoices: { where: { isDeleted: false } },
    },
  });

  if (!order || order.isDeleted) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Compute delay financial impact estimation
  const delayImpact = order.isLate && order.delayDays > 0
    ? Math.round(order.totalAmount * 0.001 * order.delayDays) // 0.1% per day of delay
    : 0;

  // Pipeline steps
  const pipelineSteps = [
    { id: 'created', label: 'Créée', step: 1 },
    { id: 'validated', label: 'Validée', step: 2 },
    { id: 'confirmed', label: 'Confirmée', step: 3 },
    { id: 'in_transit', label: 'En transit', step: 4 },
    { id: 'partially_received', label: 'Réception partielle', step: 5 },
    { id: 'received', label: 'Réceptionnée', step: 6 },
    { id: 'closed', label: 'Clôturée', step: 7 },
  ];

  const currentStepIdx = pipelineSteps.findIndex(s => s.id === order.status);

  return NextResponse.json({
    order: {
      ...order,
      supplierName: order.supplier?.name || '—',
      supplierCode: order.supplier?.code || '—',
      supplierScore: order.supplier?.scoreGlobal || 0,
    },
    lines: order.lines.map(l => ({
      ...l,
      articleCode: l.article?.code || '—',
      articleDesignation: l.article?.designation || l.description,
      stockCoverage: l.article ? Math.floor(l.article.currentStock / (l.article.avgMonthlyConsumption / 30)) : null,
    })),
    anomalies: order.anomalies,
    invoices: order.invoices,
    delayImpact,
    pipeline: { steps: pipelineSteps, currentStep: currentStepIdx },
  });
}
