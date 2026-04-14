import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const search = p.get('search') || '';
  const type = p.get('type') || '';
  const status = p.get('status') || '';

  const where: any = { isDeleted: false };
  if (search) where.OR = [{ subject: { contains: search, mode: 'insensitive' } }, { body: { contains: search, mode: 'insensitive' } }];
  if (type) where.type = type;
  if (status) where.status = status;

  const rawLetters = await prisma.letter.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      createdBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Truncate body for list view — full body loaded only in detail (/api/letters/[id])
  const letters = rawLetters.map(({ body, ...rest }) => ({
    ...rest,
    body: body.length > 200 ? body.slice(0, 200) + '…' : body,
  }));

  // Count by type
  const allLetters = await prisma.letter.findMany({ where: { isDeleted: false }, select: { type: true, status: true } });
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  allLetters.forEach(l => {
    typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  return NextResponse.json({ letters, typeCounts, statusCounts, total: allLetters.length });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Generate AI body if requested
  let letterBody = body.body || '';
  if (body.generateAI && !letterBody) {
    letterBody = generateLetterBody(body.type, body.subject, body.supplierName || '', body.tone || 'diplomatic');
  }

  const letter = await prisma.letter.create({
    data: {
      id: crypto.randomUUID(),
      type: body.type,
      supplierId: body.supplierId || null,
      subject: body.subject,
      tone: body.tone || 'diplomatic',
      status: 'draft',
      generatedBy: body.generateAI ? 'ia' : 'manual',
      body: letterBody,
      createdById: session.user.id!,
      updatedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id!, userName: session.user.name!, action: 'create', module: 'letters',
      entityId: letter.id, details: 'Courrier créé: ' + body.subject, aiInvolved: !!body.generateAI,
    },
  });

  return NextResponse.json(letter, { status: 201 });
}

function generateLetterBody(type: string, subject: string, supplierName: string, tone: string): string {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const header = `MULTIPRINT S.A.\nZone Industrielle de Bonabéri\nB.P. 4036 Douala, Cameroun\n\nDouala, le ${date}\n\n`;
  const dest = supplierName ? `À l'attention de la Direction\n${supplierName}\n\n` : '';

  const templates: Record<string, string> = {
    price_dispute: `Objet : ${subject}\n\nMadame, Monsieur,\n\nNous avons constaté un écart significatif entre les prix facturés et les conditions contractuelles en vigueur. Après analyse détaillée de nos services comptabilité et achats, nous vous demandons de bien vouloir procéder à la régularisation de cette situation dans les meilleurs délais.\n\nNous restons à votre disposition pour organiser une réunion de clarification.\n\nDans l'attente de votre retour rapide, veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
    credit_request: `Objet : ${subject}\n\nMadame, Monsieur,\n\nSuite aux écarts constatés sur nos dernières transactions, nous vous prions de bien vouloir émettre un avoir correspondant au montant en litige.\n\nVeuillez trouver ci-joint les pièces justificatives nécessaires au traitement de cette demande.\n\nCordialement,\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
    delivery_reminder: `Objet : ${subject}\n\nMadame, Monsieur,\n\nNous nous permettons de vous relancer concernant la commande référencée ci-dessus, dont la date de livraison prévue est désormais dépassée.\n\nCe retard impacte directement notre chaîne de production. Nous vous demandons de nous communiquer dans les 48 heures un calendrier de livraison ferme.\n\nSans réponse de votre part sous 5 jours ouvrables, nous nous réservons le droit d'appliquer les pénalités contractuelles.\n\nCordialement,\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
    rfq: `Objet : ${subject}\n\nMadame, Monsieur,\n\nDans le cadre de notre processus d'approvisionnement, nous sollicitons votre meilleure offre pour les articles décrits ci-après.\n\nMerci de nous transmettre votre proposition incluant : prix unitaires, conditions de paiement, délais de livraison, quantités minimales de commande, et certifications disponibles.\n\nDate limite de réponse : [À COMPLÉTER]\n\nCordialement,\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
    certificate_request: `Objet : ${subject}\n\nMadame, Monsieur,\n\nConformément à nos exigences qualité et aux normes en vigueur, nous vous demandons de nous transmettre les certificats suivants pour vos produits actuellement référencés chez nous :\n\n— Certificat d'analyse (CoA) des derniers lots livrés\n— Certificat de conformité aux normes applicables\n— Fiches de données de sécurité (FDS) à jour\n\nCordialement,\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
    formal_notice: `Objet : ${subject} — MISE EN DEMEURE\n\nMadame, Monsieur,\n\nPar la présente, nous vous mettons en demeure de [MOTIF] dans un délai de quinze (15) jours calendaires à compter de la réception du présent courrier.\n\nÀ défaut de régularisation dans ce délai, nous nous réserverons le droit d'engager toutes les mesures contractuelles et juridiques prévues.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n\nLa Direction Générale\nMULTIPRINT S.A.`,
    contract_reminder: `Objet : ${subject}\n\nMadame, Monsieur,\n\nNous vous rappelons que le contrat cadre qui nous lie arrive à échéance prochainement. Nous souhaiterions engager les discussions en vue de son renouvellement.\n\nMerci de nous indiquer vos disponibilités pour une réunion de travail.\n\nCordialement,\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
    clarification: `Objet : ${subject}\n\nMadame, Monsieur,\n\nNous souhaitons obtenir des clarifications concernant les points suivants :\n\n[POINTS À CLARIFIER]\n\nMerci de nous transmettre votre réponse dans les meilleurs délais.\n\nCordialement,\n\nLa Direction des Achats\nMULTIPRINT S.A.`,
  };

  return header + dest + (templates[type] || templates.clarification);
}
