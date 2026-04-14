import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const letter = await prisma.letter.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, code: true, contactName: true, contactEmail: true, city: true, country: true } },
      createdBy: { select: { fullName: true } },
    },
  });

  if (!letter || letter.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ letter: { ...letter, supplierName: letter.supplier?.name || '—', createdByName: letter.createdBy?.fullName || '—' } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'mark_ready':
      await prisma.letter.update({ where: { id }, data: { status: 'ready' } });
      break;
    case 'mark_sent':
      await prisma.letter.update({ where: { id }, data: { status: 'sent' } });
      break;
    case 'archive':
      await prisma.letter.update({ where: { id }, data: { status: 'archived' } });
      break;
    case 'delete':
      await prisma.letter.update({ where: { id }, data: { isDeleted: true } });
      break;
    case 'update_body':
      await prisma.letter.update({ where: { id }, data: { body: body.body } });
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  await prisma.activityLog.create({
    data: { id: crypto.randomUUID(), userId: session.user.id!, userName: session.user.name!, action: 'update', module: 'letters', entityId: id, details: 'Courrier ' + action },
  });

  return NextResponse.json({ success: true });
}
