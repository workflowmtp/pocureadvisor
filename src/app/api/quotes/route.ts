import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comparisons = await prisma.quoteComparison.findMany({
      include: { quoteLines: true },
      orderBy: { dateCreated: 'desc' },
    });

    const stats = {
      total: comparisons.length,
      active: comparisons.filter(c => c.status === 'active').length,
      completed: comparisons.filter(c => c.status === 'completed').length,
    };

    return NextResponse.json({ comparisons, stats });
  } catch (err: any) {
    console.error('[GET /api/quotes] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const lines: { supplierName: string; unitPrice: number; supplierId?: string | null }[] = body.lines || [];

    const comp = await prisma.quoteComparison.create({
      data: {
        id: crypto.randomUUID(),
        subject: body.subject,
        createdById: session.user.id,
        status: 'active',
        updatedAt: new Date(),
        quoteLines: {
          create: lines.map(l => ({
            id: crypto.randomUUID(),
            supplierId: l.supplierId || undefined,
            supplierName: l.supplierName || '—',
            unitPrice: l.unitPrice || 0,
            landedCost: l.unitPrice || 0,
            tco: l.unitPrice || 0,
          })),
        },
      },
      include: { quoteLines: true },
    });

    await prisma.activityLog.create({
      data: { id: crypto.randomUUID(), userId: session.user.id!, userName: session.user.name!, action: 'create', module: 'quotes', entityId: comp.id, details: 'Comparatif créé: ' + body.subject } as any,
    });

    return NextResponse.json(comp, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/quotes] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
