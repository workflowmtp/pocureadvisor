import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const comp = await prisma.quoteComparison.findUnique({
    where: { id },
    include: {
      lines: {
        include: { supplier: { select: { id: true, name: true, code: true, scoreGlobal: true, certifications: true } } },
        orderBy: { tco: 'asc' },
      },
    },
  });

  if (!comp || comp.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Compute best per criteria
  const lines = comp.lines;
  const bestPrice = lines.length > 0 ? Math.min(...lines.map(l => l.unitPrice)) : 0;
  const bestTco = lines.length > 0 ? Math.min(...lines.map(l => l.tco)) : 0;
  const bestLead = lines.length > 0 ? Math.min(...lines.filter(l => l.leadTime > 0).map(l => l.leadTime)) : 0;
  const bestScore = lines.length > 0 ? Math.max(...lines.map(l => l.score)) : 0;

  return NextResponse.json({
    comparison: comp,
    lines: lines.map(l => ({
      ...l,
      supplierName: l.supplier?.name || l.supplierName,
      supplierCode: l.supplier?.code || '—',
      supplierScore: l.supplier?.scoreGlobal || l.score,
      supplierCerts: l.supplier?.certifications || l.certifications,
      isBestPrice: l.unitPrice === bestPrice,
      isBestTco: l.tco === bestTco,
      isBestLead: l.leadTime > 0 && l.leadTime === bestLead,
      isBestScore: l.score === bestScore,
    })),
    summary: {
      lineCount: lines.length,
      bestPrice, bestTco, bestLead, bestScore,
      avgTco: lines.length > 0 ? Math.round(lines.reduce((s, l) => s + l.tco, 0) / lines.length) : 0,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const userName = session.user.name || '—';

  switch (action) {
    case 'add_line': {
      const tco = (body.unitPrice || 0) + (body.freightCost || 0);
      await prisma.quoteLine.create({
        data: {
          comparisonId: id,
          supplierId: body.supplierId || null,
          supplierName: body.supplierName,
          unitPrice: body.unitPrice || 0,
          landedCost: body.landedCost || body.unitPrice || 0,
          freightCost: body.freightCost || 0,
          moq: body.moq || '',
          leadTime: body.leadTime || 0,
          incoterm: body.incoterm || '',
          paymentTerms: body.paymentTerms || '',
          certifications: body.certifications || [],
          tco,
          score: body.score || 50,
          reco: body.reco || '',
        },
      });
      await log(session.user.id!, userName, 'create', 'quotes', id, 'Ligne ajoutée: ' + body.supplierName);
      break;
    }

    case 'select_supplier': {
      await prisma.quoteComparison.update({ where: { id }, data: { status: 'completed' } });
      await log(session.user.id!, userName, 'update', 'quotes', id, 'Fournisseur sélectionné: ' + (body.supplierName || ''));
      break;
    }

    case 'open_negotiation': {
      const comp = await prisma.quoteComparison.findUnique({ where: { id } });
      const nego = await prisma.negotiation.create({
        data: {
          supplierId: body.supplierId || null,
          subject: 'Négociation suite comparatif — ' + (comp?.subject || ''),
          category: '',
          dateStart: new Date(),
          financialStake: body.financialStake || 0,
          targetSavings: Math.round((body.financialStake || 0) * 0.05),
          status: 'preparation',
          strategy: 'Négociation lancée depuis le comparatif de devis. Fournisseur: ' + (body.supplierName || ''),
          rounds: [],
        },
      });
      await log(session.user.id!, userName, 'create', 'negotiations', nego.id, 'Négociation créée depuis comparatif');
      return NextResponse.json({ negotiation: nego });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

async function log(userId: string, userName: string, action: string, module: string, entityId: string, details: string) {
  await prisma.activityLog.create({ data: { userId, userName, action, module, entityId, details } });
}
