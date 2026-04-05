import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alts = await prisma.alternativeSupplier.findMany({ where: { isDeleted: false }, orderBy: { relevanceScore: 'desc' } });

  const stats = {
    total: alts.length,
    identified: alts.filter(a => a.status === 'identified').length,
    toContact: alts.filter(a => a.status === 'to_contact').length,
    inDiscussion: alts.filter(a => a.status === 'in_discussion').length,
    qualified: alts.filter(a => a.status === 'qualified').length,
    inTest: alts.filter(a => a.status === 'in_test').length,
    rejected: alts.filter(a => a.status === 'rejected').length,
  };

  // Fetch categories for form
  const categories = await prisma.purchaseCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });

  return NextResponse.json({ alternatives: alts, stats, categories });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Action: change status
  if (body.action === 'changeStatus' && body.id) {
    const updated = await prisma.alternativeSupplier.update({
      where: { id: body.id },
      data: { status: body.status, lastContactDate: new Date() },
    });
    return NextResponse.json(updated);
  }

  // Action: create negotiation from alt supplier
  if (body.action === 'createNegotiation' && body.id) {
    const alt = await prisma.alternativeSupplier.findUnique({ where: { id: body.id } });
    if (!alt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const nego = await prisma.negotiation.create({
      data: {
        subject: body.subject || 'Consultation — ' + alt.name,
        category: '',
        dateStart: new Date(),
        financialStake: body.financialStake || 0,
        targetSavings: Math.round((body.financialStake || 0) * 0.08),
        status: 'preparation',
        strategy: body.strategy || 'Consultation fournisseur alternatif: ' + alt.name + ' (' + alt.country + ')',
        rounds: [],
      },
    });

    await prisma.activityLog.create({
      data: { userId: session.user.id!, userName: session.user.name!, action: 'create', module: 'negotiations', entityId: nego.id, details: 'Négociation créée depuis fournisseur alternatif: ' + alt.name },
    });

    return NextResponse.json({ negotiation: nego }, { status: 201 });
  }

  // Default: create new alternative supplier
  const alt = await prisma.alternativeSupplier.create({
    data: {
      categoryId: body.categoryId,
      name: body.name,
      country: body.country,
      city: body.city || null,
      currency: body.currency || 'USD',
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      status: 'identified',
      evaluation: {
        price: 0, quality: 0, lead_time: body.leadTime || 0,
        moq: body.moq || '', certifications: body.certifications || [], risk_level: 'medium',
      },
      relevanceScore: 50,
      comparisonNotes: body.notes || null,
      discoveryDate: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.user.id!, userName: session.user.name!, action: 'create', module: 'alternatives', entityId: alt.id, details: 'Fournisseur alternatif créé: ' + alt.name },
  });

  return NextResponse.json(alt, { status: 201 });
}
