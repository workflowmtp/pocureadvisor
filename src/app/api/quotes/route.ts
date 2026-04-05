import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const comparisons = await prisma.quoteComparison.findMany({
    where: { isDeleted: false },
    include: { lines: { include: { supplier: { select: { id: true, name: true, code: true, scoreGlobal: true } } } } },
    orderBy: { dateCreated: 'desc' },
  });

  const stats = {
    total: comparisons.length,
    active: comparisons.filter(c => c.status === 'active').length,
    completed: comparisons.filter(c => c.status === 'completed').length,
  };

  return NextResponse.json({ comparisons, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const comp = await prisma.quoteComparison.create({
    data: {
      subject: body.subject,
      createdById: session.user.id,
      status: 'active',
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.user.id!, userName: session.user.name!, action: 'create', module: 'quotes', entityId: comp.id, details: 'Comparatif créé: ' + body.subject },
  });

  return NextResponse.json(comp, { status: 201 });
}
