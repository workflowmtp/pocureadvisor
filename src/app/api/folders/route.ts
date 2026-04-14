import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - List folders with documents
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const recent = searchParams.get('recent') === 'true';

  try {
    if (folderId) {
      // Get specific folder with documents — full detail, report included
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          isDeleted: false,
        },
        include: {
          documents: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            omit: { ocrRawText: true, ocrFullText: true },
            include: {
              supplier: { select: { id: true, name: true } },
              uploadedBy: { select: { fullName: true } },
            },
          },
          children: {
            where: { isDeleted: false },
          },
          _count: { select: { documents: { where: { isDeleted: false } } } },
        },
        // reportReady et reportStatus inclus par défaut (pas de omit ici)
      });
      return NextResponse.json(folder);
    }

    if (recent) {
      // Get recent folders — omit heavy report JSON
      const folders = await prisma.folder.findMany({
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        omit: { report: true },
        include: {
          _count: { select: { documents: { where: { isDeleted: false } } } },
          createdBy: { select: { fullName: true } },
        },
      });
      return NextResponse.json(folders);
    }

    // Get all folders — omit heavy report JSON
    const folders = await prisma.folder.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
      omit: { report: true },
      include: {
        _count: { select: { documents: { where: { isDeleted: false } } } },
      },
    });
    return NextResponse.json(folders);
  } catch (error: any) {
    console.error('[Folders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new folder
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, color, icon, parentId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const folder = await prisma.folder.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        color: color || '#3B82F6',
        icon: icon || 'folder',
        parentId: parentId || null,
        createdById: session.user.id!,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(folder);
  } catch (error: any) {
    console.error('[Folders] Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update folder
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, color, icon } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name,
        description,
        color,
        icon,
      },
    });

    return NextResponse.json(folder);
  } catch (error: any) {
    console.error('[Folders] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Soft delete folder
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.folder.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Folders] Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
