import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const REPORT_WEBHOOK_URL = 'https://n8n.mtb-app.com/webhook/614746dc-8b99-4cc2-af3b-9ac6ed5a5849';

// Generate report for a folder (async, fire and forget)
async function generateFolderReport(folderId: string): Promise<void> {
  try {
    console.log('[Report] Generating report for folder:', folderId);

    const response = await fetch(REPORT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('multiprint:Admin@1234').toString('base64'),
      },
      body: JSON.stringify({
        query: 'generer le rapport du dossier',
        context: folderId,
      }),
    });

    if (!response.ok) {
      console.error('[Report] Webhook failed:', response.status);
      return;
    }

    const result = await response.json();
    // Save the full webhook response as-is
    const reportData = Array.isArray(result) ? result[0] : result;

    // Save to database
    await prisma.folder.update({
      where: { id: folderId },
      data: {
        report: reportData,
        updatedAt: new Date(),
      },
    });

    console.log('[Report] Report saved for folder:', folderId);
  } catch (error: any) {
    console.error('[Report] Generation failed:', error.message);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string || 'invoice';
    const folderId = formData.get('folderId') as string || null;

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

    // Get Tesseract text from client-side (already extracted in browser)
    const tesseractText = formData.get('tesseractText') as string || '';
    const tesseractConfidence = tesseractText ? 0.8 : 0; // Default confidence for client-side OCR
    
    if (tesseractText) {
      console.log('[OCR] Received Tesseract text from client. Length:', tesseractText.length);
    }

    // Check if this is a preview request (don't save yet)
    const isPreview = formData.get('preview') === 'true';
    
    if (isPreview) {
      // Return Tesseract text for preview - NO Claude analysis yet
      return NextResponse.json({
        success: true,
        preview: true,
        file: {
          name: file.name,
          size: formatFileSize(file.size),
          type: fileType,
          mimeType,
        },
        tesseract: tesseractText ? {
          text: tesseractText,
          fullLength: tesseractText.length,
          confidence: tesseractConfidence,
        } : null,
        // No extractedData from Claude - user will request analysis if needed
      });
    }

    // Parse edited data from user validation (if any)
    let editedData = null;
    const editedDataStr = formData.get('editedData') as string;
    if (editedDataStr) {
      try {
        editedData = JSON.parse(editedDataStr);
        console.log('[OCR] Using edited data from user validation');
      } catch (e) {
        console.warn('[OCR] Failed to parse editedData:', e);
      }
    }

    // Use edited data if available (user manually entered data)
    const finalData = editedData;

    // Build full OCR text (Tesseract only - no Claude analysis)
    const ocrFullText = [
      '=== TEXTE TESSERACT ===',
      tesseractText || '(non disponible)',
    ].join('\n');

    // Sauvegarder en base (after user validation) - NO base64, only OCR text
    const document = await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileType: fileType,
        mimeType: mimeType,
        // fileBase64 removed - we store OCR text instead
        uploadedById: session.user.id!,
        folderId: folderId || null,
        ocrStatus: finalData ? 'extracted' : (tesseractText ? 'partial' : 'pending'),
        ocrConfidence: finalData?.confidence ? parseFloat(String(finalData.confidence)) : (tesseractConfidence || null),
        ocrRawText: tesseractText || null,
        ocrFullText: ocrFullText,
        supplierId: finalData?.supplierId || null,
        invoiceNumber: finalData?.invoiceNumber || null,
        poNumber: finalData?.poNumber || null,
        amountHt: finalData?.amountHt ? parseFloat(String(finalData.amountHt)) : null,
        amountTva: finalData?.amountTva ? parseFloat(String(finalData.amountTva)) : null,
        amountTtc: finalData?.amountTtc ? parseFloat(String(finalData.amountTtc)) : null,
        pipelineStage: finalData ? 3 : 2,
        reconciliationStatus: 'pending',
        updatedAt: new Date(),
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { fullName: true } },
      },
    });

    console.log('[OCR] Document saved:', document.id, 'ocrStatus:', document.ocrStatus);

    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id!,
        userName: session.user.name!,
        action: 'document_upload',
        module: 'ocr',
        details: `Upload: ${file.name} - Tesseract: ${tesseractText ? 'OK (' + tesseractText.length + ' chars)' : 'N/A'}`,
        aiInvolved: !!tesseractText,
      },
    });

    // Trigger report generation asynchronously if folderId exists
    if (folderId) {
      // Fire and forget - don't wait for report generation
      generateFolderReport(folderId).catch(err => {
        console.error('[OCR] Report generation failed:', err);
      });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      document: {
        ...document,
        ocrData: finalData,
        extractedFields: finalData?.extractedFields || null,
      },
      tesseract: tesseractText ? {
        text: tesseractText,
        confidence: tesseractConfidence,
        length: tesseractText.length,
      } : null,
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
  docType: string,
  tesseractText?: string
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

  const tesseractContext = tesseractText 
    ? `\n\nTEXTE EXTRAIT PAR OCR TESSERACT (utilisez-le pour confirmer/corriger les informations):\n"""\n${tesseractText.substring(0, 2000)}\n"""\n` 
    : '';

  const prompt = `Analysez ce document (${docType === 'invoice' ? 'facture' : docType}) et extrayez TOUTES les informations au format JSON strict. Répondez UNIQUEMENT avec le JSON, sans texte avant ni après.${tesseractContext}

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
