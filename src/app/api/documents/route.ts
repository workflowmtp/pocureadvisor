import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const search = p.get('search') || '';
  const type = p.get('type') || '';
  const status = p.get('status') || '';
  const supplier = p.get('supplier') || '';

  const where: Prisma.DocumentWhereInput = { isDeleted: false };
  if (search) {
    where.OR = [
      { fileName: { contains: search, mode: 'insensitive' } },
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { poNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (type) where.fileType = type;
  if (status) where.reconciliationStatus = status as any;
  if (supplier) where.supplierId = supplier;

  const rawDocuments = await prisma.document.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } },
    },
    orderBy: { uploadDate: 'desc' },
    take: 100,
  });

  // Exposer ocrData et extractedFields depuis le champ comments (stocké par l'upload OCR)
  const documents = rawDocuments.map(doc => {
    const commentsData = doc.comments as any;
    let ocrData = null;
    let extractedFields = null;

    if (commentsData && typeof commentsData === 'object' && !Array.isArray(commentsData)) {
      if (commentsData.ocrData) {
        ocrData = commentsData.ocrData;
        extractedFields = commentsData.extractedFields || commentsData.ocrData?.extractedFields || null;
      }
    }

    return {
      ...doc,
      ocrData,
      extractedFields,
    };
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.reconciliationStatus === 'pending').length,
    conforme: documents.filter(d => d.reconciliationStatus === 'conforme' || d.reconciliationStatus === 'validated').length,
    critical: documents.filter(d => d.reconciliationStatus === 'critical' || d.reconciliationStatus === 'ecart_majeur').length,
  };

  return NextResponse.json({ documents, stats });
}
