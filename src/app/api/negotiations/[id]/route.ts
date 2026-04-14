import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const nego = await prisma.negotiation.findUnique({
    where: { id },
    include: { supplier: true },
  });

  if (!nego || nego.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Compute deadline info
  let deadlineInfo = null;
  if (nego.dateDeadline) {
    const daysLeft = Math.ceil((new Date(nego.dateDeadline).getTime() - Date.now()) / 86400000);
    deadlineInfo = {
      date: nego.dateDeadline,
      daysLeft,
      isOverdue: daysLeft < 0,
      label: daysLeft < 0 ? `DÉPASSÉE ${Math.abs(daysLeft)}j` : daysLeft === 0 ? "Aujourd'hui" : `${daysLeft}j restants`,
      priority: daysLeft < 0 ? 'P1' : daysLeft <= 7 ? 'P2' : 'P3',
    };
  }

  return NextResponse.json({
    negotiation: { ...nego, supplierName: nego.supplier?.name || '—' },
    rounds: (nego.rounds as any[]) || [],
    deadlineInfo,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const userName = session.user.name || '—';

  const nego = await prisma.negotiation.findUnique({ where: { id } });
  if (!nego) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rounds = (nego.rounds as any[]) || [];

  switch (action) {
    case 'start': {
      await prisma.negotiation.update({ where: { id }, data: { status: 'in_progress' } });
      await log(session.user.id!, userName, 'update', 'negotiations', id, 'Négociation démarrée');
      break;
    }

    case 'add_round': {
      const newRound = {
        date: new Date().toISOString().substring(0, 10),
        type: body.roundType || 'Discussion',
        summary: body.summary || '',
        outcome: body.outcome || '',
      };
      const updatedRounds = [...rounds, newRound];
      await prisma.negotiation.update({ where: { id }, data: { rounds: updatedRounds, status: nego.status === 'preparation' ? 'in_progress' : nego.status } });
      await log(session.user.id!, userName, 'update', 'negotiations', id, 'Round ajouté: ' + (body.roundType || 'Discussion'));
      break;
    }

    case 'close_won': {
      await prisma.negotiation.update({
        where: { id },
        data: { status: 'closed_won', dateClosed: new Date(), achievedSavings: body.achievedSavings || 0 },
      });
      await log(session.user.id!, userName, 'update', 'negotiations', id, 'Négociation clôturée — Gagnée');
      break;
    }

    case 'close_lost': {
      await prisma.negotiation.update({
        where: { id },
        data: { status: 'closed_lost', dateClosed: new Date() },
      });
      await log(session.user.id!, userName, 'update', 'negotiations', id, 'Négociation clôturée — Échouée');
      break;
    }

    case 'pending_decision': {
      await prisma.negotiation.update({ where: { id }, data: { status: 'pending_decision' } });
      await log(session.user.id!, userName, 'update', 'negotiations', id, 'Négociation en attente de décision');
      break;
    }

    case 'generate_letter': {
      // Create a letter linked to the negotiation
      const letterType = body.letterType || 'rfq';
      await prisma.letter.create({
        data: {
          id: crypto.randomUUID(),
          type: letterType,
          supplierId: nego.supplierId,
          subject: 'Courrier — ' + nego.subject,
          tone: 'diplomatic',
          status: 'draft',
          generatedBy: 'negotiation',
          body: body.letterBody || 'Courrier généré depuis la négociation: ' + nego.subject,
          createdById: session.user.id!,
          updatedAt: new Date(),
        },
      });
      await log(session.user.id!, userName, 'create', 'letters', id, 'Courrier généré depuis négociation');
      break;
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

async function log(userId: string, userName: string, action: string, module: string, entityId: string, details: string) {
  await prisma.activityLog.create({ data: { id: crypto.randomUUID(), userId, userName, action, module, entityId, details } });
}
