import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Endpoint léger pour le polling du statut — ne retourne PAS le rapport JSON
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
      select: { id: true, reportReady: true, reportStatus: true, updatedAt: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      reportReady: folder.reportReady,
      reportStatus: folder.reportStatus,
      updatedAt: folder.updatedAt,
    });

  } catch (error: any) {
    console.error('[Report Status] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
