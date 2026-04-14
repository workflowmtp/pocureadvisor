import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const negotiations = await prisma.negotiation.findMany({
    where: { isDeleted: false },
    omit: { rounds: true },
    include: { supplier: { select: { id: true, name: true, code: true } } },
    orderBy: { dateStart: 'desc' },
  });

  const stats = {
    total: negotiations.length,
    preparation: negotiations.filter(n => n.status === 'preparation').length,
    inProgress: negotiations.filter(n => n.status === 'in_progress').length,
    pendingDecision: negotiations.filter(n => n.status === 'pending_decision').length,
    won: negotiations.filter(n => n.status === 'closed_won').length,
    lost: negotiations.filter(n => n.status === 'closed_lost').length,
    totalStake: negotiations.filter(n => !['closed_won','closed_lost','cancelled'].includes(n.status)).reduce((s, n) => s + n.financialStake, 0),
    totalSavings: negotiations.filter(n => n.status === 'closed_won').reduce((s, n) => s + (n.achievedSavings || 0), 0),
  };

  return NextResponse.json({ negotiations, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const nego = await prisma.negotiation.create({
    data: {
      id: crypto.randomUUID(),
      supplierId: body.supplierId || null,
      subject: body.subject,
      category: body.category || '',
      dateStart: new Date(),
      dateDeadline: body.dateDeadline ? new Date(body.dateDeadline) : null,
      financialStake: body.financialStake || 0,
      targetSavings: body.targetSavings || 0,
      status: 'preparation',
      strategy: body.strategy || '',
      rounds: [],
      updatedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: { id: crypto.randomUUID(), userId: session.user.id!, userName: session.user.name!, action: 'create', module: 'negotiations', entityId: nego.id, details: 'Négociation créée: ' + body.subject },
  });

  return NextResponse.json(nego, { status: 201 });
}
