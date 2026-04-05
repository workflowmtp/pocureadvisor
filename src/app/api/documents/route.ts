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

  const documents = await prisma.document.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } },
    },
    orderBy: { uploadDate: 'desc' },
    take: 100,
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.reconciliationStatus === 'pending').length,
    conforme: documents.filter(d => d.reconciliationStatus === 'conforme' || d.reconciliationStatus === 'validated').length,
    critical: documents.filter(d => d.reconciliationStatus === 'critical' || d.reconciliationStatus === 'ecart_majeur').length,
  };

  return NextResponse.json({ documents, stats });
}
