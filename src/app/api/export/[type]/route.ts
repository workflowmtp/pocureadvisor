import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await params;
  let csv = '';
  let filename = '';

  switch (type) {
    case 'suppliers': {
      const data = await prisma.supplier.findMany({ where: { isDeleted: false }, include: { category: true }, orderBy: { name: 'asc' } });
      const headers = 'Code;Nom;Pays;Catégorie;Score;Statut;Risque;Tendance;Volume YTD;Dépendance %;Incidents;Incoterm;Paiement;Délai moyen';
      const rows = data.map(s => [s.code, s.name, s.country, s.category?.name, s.scoreGlobal, s.status, s.riskLevel, s.trend, s.volumeYtd, s.dependencyRatio, s.incidentsCount, s.incotermDefault, s.paymentTerms, s.avgLeadTimeDays].join(';'));
      csv = headers + '\n' + rows.join('\n');
      filename = 'ProcureAdvisor_Fournisseurs.csv';
      break;
    }
    case 'orders': {
      const data = await prisma.order.findMany({ where: { isDeleted: false }, include: { supplier: { select: { name: true } } }, orderBy: { dateCreated: 'desc' } });
      const headers = 'N° PO;Fournisseur;Pôle;Date création;Date prévue;Montant;Devise;Statut;En retard;Retard (j);Risque rupture';
      const rows = data.map(o => [o.poNumber, o.supplier?.name, o.poleId, o.dateCreated.toISOString().substring(0, 10), o.dateExpected.toISOString().substring(0, 10), o.totalAmount, o.currency, o.status, o.isLate ? 'Oui' : 'Non', o.delayDays, o.riskOfStockout ? 'Oui' : 'Non'].join(';'));
      csv = headers + '\n' + rows.join('\n');
      filename = 'ProcureAdvisor_Commandes.csv';
      break;
    }
    case 'anomalies': {
      const data = await prisma.anomaly.findMany({ where: { isDeleted: false }, include: { supplier: { select: { name: true } }, user: { select: { fullName: true } } }, orderBy: { dateDetected: 'desc' } });
      const headers = 'ID;Catégorie;Sévérité;Priorité;Titre;Fournisseur;Utilisateur;Impact;Date;Statut;Résolution';
      const rows = data.map(a => [a.id, a.category, a.severity, a.priority, '"' + a.title + '"', a.supplier?.name, a.user?.fullName, a.financialImpact, a.dateDetected.toISOString().substring(0, 10), a.status, '"' + (a.resolutionNotes || '') + '"'].join(';'));
      csv = headers + '\n' + rows.join('\n');
      filename = 'ProcureAdvisor_Anomalies.csv';
      break;
    }
    case 'logs': {
      const data = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
      const headers = 'Date;Utilisateur;Action;Module;Détails;IA';
      const rows = data.map(l => [l.createdAt.toISOString(), l.userName, l.action, l.module, '"' + (l.details || '') + '"', l.aiInvolved ? 'Oui' : 'Non'].join(';'));
      csv = headers + '\n' + rows.join('\n');
      filename = 'ProcureAdvisor_Logs.csv';
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
  }

  const bom = '\ufeff';
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
