import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Endpoint appelé par n8n quand l'analyse du dossier est terminée.
// URL : POST /api/folders/report/callback?folderId=xxx&secret=yyy
// Body : le JSON du rapport (même format que la réponse synchrone du webhook)
export async function POST(request: NextRequest) {
  try {
    const folderId = request.nextUrl.searchParams.get('folderId');
    const secret = request.nextUrl.searchParams.get('secret');

    const expectedSecret = process.env.REPORT_CALLBACK_SECRET || 'procure-report-secret';

    if (!folderId) {
      return NextResponse.json({ error: 'folderId requis' }, { status: 400 });
    }

    if (secret !== expectedSecret) {
      console.warn('[Report Callback] Secret invalide pour folderId:', folderId);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, isDeleted: false },
      select: { id: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const reportData = Array.isArray(body) ? body[0] : body;

    await prisma.folder.update({
      where: { id: folderId },
      data: {
        report: reportData,
        reportReady: true,
        reportStatus: 'ready',
        updatedAt: new Date(),
      },
    });

    console.log('[Report Callback] Rapport sauvegardé pour le dossier:', folderId);

    return NextResponse.json({ success: true, folderId });

  } catch (error: any) {
    console.error('[Report Callback] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 });
  }
}
