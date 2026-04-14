import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const REPORT_WEBHOOK_URL = 'https://n8n.mtb-app.com/webhook/614746dc-8b99-4cc2-af3b-9ac6ed5a5849';
const WEBHOOK_AUTH = 'Basic ' + Buffer.from('multiprint:Admin@1234').toString('base64');

// ─── POST : lance l'analyse de façon asynchrone ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { folderId } = await request.json();
    if (!folderId) {
      return NextResponse.json({ error: 'folderId requis' }, { status: 400 });
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, isDeleted: false },
      select: { id: true, name: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });
    }

    // 1. Marquer immédiatement comme "en cours"
    await prisma.folder.update({
      where: { id: folderId },
      data: { reportReady: false, reportStatus: 'processing', updatedAt: new Date() },
    });

    // 2. URL de callback que n8n peut appeler quand l'analyse est prête
    const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
    const callbackSecret = process.env.REPORT_CALLBACK_SECRET || 'procure-report-secret';
    const callbackUrl = `${appUrl}/api/folders/report/callback?folderId=${folderId}&secret=${callbackSecret}`;

    // 3. Envoyer la requête webhook de façon asynchrone (fire-and-forget)
    //    On gère aussi la réponse synchrone si n8n répond directement
    fetch(REPORT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': WEBHOOK_AUTH },
      body: JSON.stringify({
        query: 'generer le rapport du dossier',
        context: folderId,
        callbackUrl,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error('[Report] Webhook HTTP error:', res.status);
          await prisma.folder.update({
            where: { id: folderId },
            data: { reportStatus: 'error', updatedAt: new Date() },
          });
          return;
        }
        // Si n8n répond directement avec les données (mode synchrone)
        const result = await res.json().catch(() => null);
        if (result) {
          const reportData = Array.isArray(result) ? result[0] : result;
          await prisma.folder.update({
            where: { id: folderId },
            data: { report: reportData, reportReady: true, reportStatus: 'ready', updatedAt: new Date() },
          });
          console.log('[Report] Saved via sync response for folder:', folderId);
        }
      })
      .catch(async (err) => {
        console.error('[Report] Webhook fetch error:', err.message);
        await prisma.folder.update({
          where: { id: folderId },
          data: { reportStatus: 'error', updatedAt: new Date() },
        });
      });

    // 4. Répondre immédiatement — le frontend va poller le statut
    return NextResponse.json({ status: 'processing', reportStatus: 'processing', folderId });

  } catch (error: any) {
    console.error('[Report POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 });
  }
}

// ─── GET : récupère le rapport complet (téléchargement) ───────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const folderId = request.nextUrl.searchParams.get('folderId');
    if (!folderId) {
      return NextResponse.json({ error: 'folderId requis' }, { status: 400 });
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, isDeleted: false },
      select: { id: true, name: true, report: true, reportReady: true, reportStatus: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      report: folder.report,
      reportReady: folder.reportReady,
      reportStatus: folder.reportStatus,
      folderName: folder.name,
    });

  } catch (error: any) {
    console.error('[Report GET] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 });
  }
}
