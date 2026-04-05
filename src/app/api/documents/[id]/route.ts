import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      supplier: true,
      uploadedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } },
    },
  });

  if (!doc || doc.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Determine verdict
  const variances = (doc.variances as any[]) || [];
  let verdict = { label: 'En cours', class: 'pending', desc: 'Document en cours de traitement.' };
  if (doc.reconciliationStatus === 'validated') verdict = { label: 'Validé', class: 'conforme', desc: 'Document validé et archivé.' };
  else if (doc.reconciliationStatus === 'conforme') verdict = { label: 'Conforme', class: 'conforme', desc: 'Aucun écart détecté.' };
  else if (doc.reconciliationStatus === 'ecart_mineur') verdict = { label: 'Écart mineur', class: 'ecart-mineur', desc: 'Écarts détectés mais dans les tolérances.' };
  else if (doc.reconciliationStatus === 'ecart_majeur') verdict = { label: 'Écart majeur', class: 'ecart-majeur', desc: 'Écarts significatifs nécessitant une action.' };
  else if (doc.reconciliationStatus === 'critical') verdict = { label: 'Bloquant', class: 'bloquant', desc: 'Anomalie bloquante détectée.' };

  // Pipeline stages
  const stages = [
    { step: 1, label: 'Upload', done: doc.pipelineStage >= 1 },
    { step: 2, label: 'OCR', done: doc.pipelineStage >= 2 },
    { step: 3, label: 'Extraction', done: doc.pipelineStage >= 3 },
    { step: 4, label: 'Vérif. contrat', done: doc.pipelineStage >= 4 },
    { step: 5, label: 'Rapprochement', done: doc.pipelineStage >= 5 },
    { step: 6, label: 'Validation', done: doc.pipelineStage >= 6 },
    { step: 7, label: 'Archivage', done: doc.pipelineStage >= 7 },
  ];

  return NextResponse.json({
    document: {
      ...doc,
      supplierName: doc.supplier?.name || '—',
      uploadedByName: doc.uploadedBy?.fullName || '—',
      assignedToName: doc.assignedTo?.fullName || '—',
    },
    variances,
    verdict,
    stages,
    comments: (doc.comments as any[]) || [],
  });
}

// POST — Actions (validate, block, escalate, comment)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const userName = session.user.name || '—';

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existingComments = (doc.comments as any[]) || [];

  switch (action) {
    case 'validate': {
      await prisma.document.update({
        where: { id },
        data: { reconciliationStatus: 'validated', pipelineStage: 7 },
      });
      await logActivity(session.user.id!, userName, 'update', 'documents', id, 'Document validé et archivé');
      break;
    }

    case 'validate_with_justification': {
      const justification = body.justification || '';
      const comments = [...existingComments, { user: userName, date: new Date().toISOString(), text: 'Justification écart: ' + justification }];
      await prisma.document.update({
        where: { id },
        data: { reconciliationStatus: 'validated', pipelineStage: 7, comments },
      });
      await logActivity(session.user.id!, userName, 'update', 'documents', id, 'Validé avec justification: ' + justification.substring(0, 50));
      break;
    }

    case 'block': {
      const reason = body.reason || '';
      const comment = body.comment || '';
      const comments = [...existingComments, { user: userName, date: new Date().toISOString(), text: 'BLOQUÉ — ' + reason + (comment ? ' — ' + comment : '') }];
      await prisma.document.update({
        where: { id },
        data: { reconciliationStatus: 'critical', comments },
      });
      await logActivity(session.user.id!, userName, 'update', 'documents', id, 'Document bloqué — ' + reason);
      break;
    }

    case 'escalate': {
      const escaladeComment = body.comment || '';
      // Find dir_achat user
      const dirAchat = await prisma.user.findFirst({ where: { role: 'dir_achat' } });
      const comments = [...existingComments, { user: userName, date: new Date().toISOString(), text: 'ESCALADÉ au Dir. Achats' + (escaladeComment ? ' — ' + escaladeComment : '') }];
      await prisma.document.update({
        where: { id },
        data: { assignedToId: dirAchat?.id || null, comments },
      });
      await logActivity(session.user.id!, userName, 'update', 'documents', id, 'Escaladé au Dir. Achats');
      break;
    }

    case 'comment': {
      const text = body.text || '';
      const comments = [...existingComments, { user: userName, date: new Date().toISOString(), text }];
      await prisma.document.update({ where: { id }, data: { comments } });
      await logActivity(session.user.id!, userName, 'update', 'documents', id, 'Commentaire: ' + text.substring(0, 50));
      break;
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

async function logActivity(userId: string, userName: string, action: string, module: string, entityId: string, details: string) {
  await prisma.activityLog.create({ data: { userId, userName, action, module, entityId, details } });
}
