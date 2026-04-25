import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

function loadCredentials(): { clientEmail: string; privateKey: string } {
  if (process.env.GOOGLE_DRIVE_PRIVATE_KEY && process.env.GOOGLE_DRIVE_CLIENT_EMAIL) {
    return {
      clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  const credFile = path.join(process.cwd(), '..', 'scan-achat-6c8d20f9c5cc.json');
  if (fs.existsSync(credFile)) {
    const creds = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
    return { clientEmail: creds.client_email, privateKey: creds.private_key };
  }
  throw new Error('Credentials Google Drive introuvables. Définissez GOOGLE_DRIVE_CLIENT_EMAIL et GOOGLE_DRIVE_PRIVATE_KEY dans .env');
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

async function getAccessToken(): Promise<string> {
  const { clientEmail, privateKey } = loadCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimSet = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claimSet}`);
  const signature = signer.sign(privateKey, 'base64url');
  const jwt = `${header}.${claimSet}.${signature}`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Authentification Google échouée: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const GOOGLE_NATIVE_TYPES: Record<string, string> = {
  'application/vnd.google-apps.document': 'application/pdf',
  'application/vnd.google-apps.spreadsheet': 'application/pdf',
  'application/vnd.google-apps.presentation': 'application/pdf',
  'application/vnd.google-apps.drawing': 'image/png',
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const driveFolderId = searchParams.get('driveFolder');
    const searchQuery = searchParams.get('q');
    const foldersOnly = searchParams.get('foldersOnly') === 'true';
    const statsMode = searchParams.get('stats') === 'true';

    const accessToken = await getAccessToken();

    // ── Stats mode: return folder + file counts ──
    if (statsMode) {
      const [foldersRes, filesRes] = await Promise.all([
        fetch(
          `${GOOGLE_DRIVE_FILES_URL}?q=${encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id)&pageSize=1000`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
        fetch(
          `${GOOGLE_DRIVE_FILES_URL}?q=${encodeURIComponent("mimeType!='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id)&pageSize=1000`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
      ]);
      const [fd, fi] = await Promise.all([foldersRes.json(), filesRes.json()]);
      return NextResponse.json({
        totalFolders: (fd.files || []).length,
        totalFiles: (fi.files || []).length,
      });
    }

    // ── Normal list mode ──
    let query: string;
    if (driveFolderId) {
      query = `'${driveFolderId}' in parents and trashed=false`;
    } else if (searchQuery) {
      query = `name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed=false`;
    } else if (foldersOnly) {
      query = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
    } else {
      query = 'trashed=false';
    }

    if (foldersOnly && !driveFolderId) {
      query = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
    }

    const fields = 'files(id,name,mimeType,modifiedTime,size,parents)';
    const url = `${GOOGLE_DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=folder,name`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive API error: ${err}`);
    }

    const data = await res.json();
    let files: any[] = data.files || [];

    if (foldersOnly) {
      files = files.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder');
    }

    return NextResponse.json({ files });
  } catch (err: any) {
    console.error('[Drive] List error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { driveFileId, fileName, mimeType, folderId, fileType } = body;

    if (!driveFileId || !fileName) {
      return NextResponse.json({ error: 'driveFileId et fileName sont requis' }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    let fileBuffer: Buffer;
    let finalMimeType = mimeType || 'application/octet-stream';
    let finalFileName = fileName;

    if (GOOGLE_NATIVE_TYPES[mimeType]) {
      const exportMime = GOOGLE_NATIVE_TYPES[mimeType];
      const exportRes = await fetch(
        `${GOOGLE_DRIVE_FILES_URL}/${driveFileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!exportRes.ok) throw new Error(`Export Drive échoué: ${await exportRes.text()}`);
      fileBuffer = Buffer.from(await exportRes.arrayBuffer());
      finalMimeType = exportMime;
      if (exportMime === 'application/pdf' && !finalFileName.endsWith('.pdf')) {
        finalFileName = finalFileName.replace(/\.[^.]*$/, '') + '.pdf';
      }
    } else {
      const dlRes = await fetch(
        `${GOOGLE_DRIVE_FILES_URL}/${driveFileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!dlRes.ok) throw new Error(`Téléchargement Drive échoué: ${await dlRes.text()}`);
      fileBuffer = Buffer.from(await dlRes.arrayBuffer());
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        fileName: finalFileName,
        fileSize: formatFileSize(fileBuffer.length),
        fileType: fileType || 'invoice',
        mimeType: finalMimeType,
        uploadedById: session.user.id!,
        folderId: folderId || null,
        ocrStatus: 'pending',
        ocrRawText: null,
        ocrFullText: `=== SOURCE: Google Drive (fileId: ${driveFileId}) ===`,
        pipelineStage: 1,
        reconciliationStatus: 'pending',
        updatedAt: new Date(),
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { fullName: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id!,
        userName: session.user.name!,
        action: 'document_drive_import',
        module: 'ocr',
        details: `Import Drive: ${finalFileName} (${driveFileId})${folderId ? ` → dossier: ${folderId}` : ''}`,
        aiInvolved: false,
      } as any,
    });

    return NextResponse.json({ success: true, saved: true, document });
  } catch (err: any) {
    console.error('[Drive] Import error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
