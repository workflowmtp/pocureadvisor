import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const anomaly = await prisma.anomaly.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: { select: { id: true, fullName: true, roleLabel: true } },
      order: { select: { id: true, poNumber: true, totalAmount: true } },
      resolvedBy: { select: { fullName: true } },
    },
  });

  if (!anomaly || anomaly.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ anomaly });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const userName = session.user.name || '—';
  const userId = session.user.id!;

  switch (action) {
    case 'investigate': {
      await prisma.anomaly.update({ where: { id }, data: { status: 'investigating' } });
      await log(userId, userName, 'update', 'anomalies', id, 'Anomalie passée en investigation');
      break;
    }
    case 'resolve': {
      const { corrective_action, comment } = body;
      const notes = corrective_action + ' — ' + (comment || '');
      await prisma.anomaly.update({
        where: { id },
        data: { status: 'resolved', dateResolved: new Date(), resolvedById: userId, resolutionNotes: notes },
      });
      await log(userId, userName, 'update', 'anomalies', id, 'Anomalie résolue: ' + corrective_action);
      break;
    }
    case 'comment': {
      const anomaly = await prisma.anomaly.findUnique({ where: { id } });
      const existing = anomaly?.resolutionNotes || '';
      const timestamp = new Date().toLocaleString('fr-FR');
      const newNotes = existing + (existing ? '\n' : '') + `[${timestamp} — ${userName}] ${body.text}`;
      await prisma.anomaly.update({ where: { id }, data: { resolutionNotes: newNotes } });
      await log(userId, userName, 'update', 'anomalies', id, 'Commentaire: ' + (body.text || '').substring(0, 50));
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

async function log(userId: string, userName: string, action: string, module: string, entityId: string, details: string) {
  await prisma.activityLog.create({ data: { userId, userName, action, module, entityId, details } });
}
