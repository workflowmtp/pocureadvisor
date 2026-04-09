import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string || 'invoice';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || getMimeType(file.name);

    console.log('[OCR] Upload started:', file.name, 'size:', file.size, 'mime:', mimeType);

    // Analyser avec Claude
    let ocrResult = null;
    let ocrError = null;
    try {
      ocrResult = await analyzeDocumentWithClaude(base64Data, mimeType, fileType);
      console.log('[OCR] Claude result:', ocrResult ? 'SUCCESS' : 'NULL');
    } catch (err: any) {
      ocrError = err.message;
      console.error('[OCR] Claude error:', err.message);
    }

    // Sauvegarder en base
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileType: fileType,
        mimeType: mimeType,
        uploadedById: session.user.id!,
        ocrStatus: ocrResult ? 'extracted' : 'pending',
        ocrConfidence: ocrResult?.confidence ? parseFloat(String(ocrResult.confidence)) : null,
        supplierId: ocrResult?.supplierId || null,
        invoiceNumber: ocrResult?.invoiceNumber || null,
        poNumber: ocrResult?.poNumber || null,
        amountHt: ocrResult?.amountHt ? parseFloat(String(ocrResult.amountHt)) : null,
        amountTva: ocrResult?.amountTva ? parseFloat(String(ocrResult.amountTva)) : null,
        amountTtc: ocrResult?.amountTtc ? parseFloat(String(ocrResult.amountTtc)) : null,
        pipelineStage: ocrResult ? 3 : 2,
        reconciliationStatus: 'pending',
        comments: ocrResult ? { ocrData: ocrResult } : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { fullName: true } },
      },
    });

    console.log('[OCR] Document saved:', document.id, 'ocrStatus:', document.ocrStatus);

    await prisma.activityLog.create({
      data: {
        userId: session.user.id!,
        userName: session.user.name!,
        action: 'document_upload',
        module: 'ocr',
        details: `Upload: ${file.name} - OCR: ${ocrResult ? 'OK' : 'FAIL: ' + (ocrError || 'no API key')}`,
        aiInvolved: !!ocrResult,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        ocrData: ocrResult,
        extractedFields: ocrResult?.extractedFields || null,
      },
      ocrResult,
      ocrError,
    });

  } catch (error: any) {
    console.error('[OCR] Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}

async function analyzeDocumentWithClaude(
  base64: string,
  mimeType: string,
  docType: string
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[OCR] ANTHROPIC_API_KEY not set — skipping Claude analysis');
    return null;
  }

  console.log('[OCR] Calling Claude API, model:', CLAUDE_MODEL, 'mimeType:', mimeType);

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  if (!isPdf && !isImage) {
    console.error('[OCR] Unsupported mime type:', mimeType);
    return null;
  }

  const prompt = `Analysez ce document (${docType === 'invoice' ? 'facture' : docType}) et extrayez TOUTES les informations au format JSON strict. Répondez UNIQUEMENT avec le JSON, sans texte avant ni après.

{
  "documentType": "invoice|quote|po|bl|contract|certificate|other",
  "supplier": "Nom du fournisseur",
  "invoiceNumber": "Numéro de facture/document",
  "poNumber": "Numéro de bon de commande ou null",
  "date": "YYYY-MM-DD",
  "amountHt": 0,
  "amountTva": 0,
  "amountTtc": 0,
  "currency": "XAF",
  "items": [{"description": "...", "quantity": 0, "unitPrice": 0, "totalPrice": 0}],
  "paymentTerms": "...",
  "confidence": 0.95,
  "extractedFields": {
    "supplier_confidence": "high",
    "amount_confidence": "high",
    "date_confidence": "high"
  },
  "rawAnalysis": "Résumé du document en une phrase"
}

Règles: montants = nombres sans symboles. null si non trouvé. confidence entre 0 et 1.`;

  // Construire le contenu selon le type de fichier
  let fileContent: any;
  if (isPdf) {
    fileContent = {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    };
  } else {
    fileContent = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: base64,
      },
    };
  }

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          fileContent,
          { type: 'text', text: prompt },
        ],
      },
    ],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OCR] Claude API error:', response.status, errorText);
    throw new Error(`Claude API ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log('[OCR] Claude response received, stop_reason:', data.stop_reason);

  const textContent = data.content?.find((c: any) => c.type === 'text');
  const content = textContent?.text;

  if (!content) {
    console.error('[OCR] No text content in Claude response:', JSON.stringify(data.content?.map((c: any) => c.type)));
    return null;
  }

  console.log('[OCR] Claude raw response (first 300 chars):', content.substring(0, 300));

  // Parser le JSON — chercher le premier objet JSON dans la réponse
  try {
    // D'abord essayer de parser directement
    const direct = JSON.parse(content.trim());
    console.log('[OCR] Direct JSON parse OK');
    return await enrichWithSupplier(direct);
  } catch {
    // Sinon chercher un bloc JSON dans le texte
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        console.log('[OCR] JSON from code block OK');
        return await enrichWithSupplier(parsed);
      } catch (e) {
        console.error('[OCR] Failed to parse JSON from code block');
      }
    }

    // Dernière tentative : trouver { ... }
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        const parsed = JSON.parse(braceMatch[0]);
        console.log('[OCR] JSON from brace match OK');
        return await enrichWithSupplier(parsed);
      } catch (e) {
        console.error('[OCR] Failed to parse JSON from brace match');
      }
    }
  }

  console.warn('[OCR] Could not parse JSON, returning raw text');
  return {
    rawAnalysis: content,
    confidence: 0.3,
    extractedFields: { supplier_confidence: 'low', amount_confidence: 'low', date_confidence: 'low' },
  };
}

async function enrichWithSupplier(parsed: any): Promise<any> {
  if (parsed.supplier) {
    try {
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          OR: [
            { name: { contains: parsed.supplier, mode: 'insensitive' } },
          ],
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (existingSupplier) {
        parsed.supplierId = existingSupplier.id;
        parsed.supplierMatched = existingSupplier.name;
        console.log('[OCR] Supplier matched:', existingSupplier.name);
      }
    } catch (e) {
      console.warn('[OCR] Supplier lookup failed:', e);
    }
  }
  return parsed;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
