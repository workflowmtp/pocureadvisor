import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Cache categories for 5 minutes (they rarely change)
let categoriesCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const search = params.get('search') || '';
  const status = params.get('status') || '';
  const risk = params.get('risk') || '';
  const category = params.get('category') || '';
  const pole = params.get('pole') || '';
  const sortBy = params.get('sortBy') || 'volumeYtd';
  const sortOrder = (params.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '20');

  // Build where clause
  const where: Prisma.SupplierWhereInput = { isDeleted: false };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) where.status = status as any;
  if (risk) where.riskLevel = risk as any;
  if (category) where.categoryId = category;

  // Run count and data fetch in parallel
  const validSortFields = ['name', 'code', 'scoreGlobal', 'volumeYtd', 'dependencyRatio', 'incidentsCount', 'country'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'volumeYtd';
  const orderBy: Prisma.SupplierOrderByWithRelationInput = { [orderField]: sortOrder };

  // Use cached categories or fetch fresh
  let categories: any[];
  if (categoriesCache && Date.now() - categoriesCache.timestamp < CACHE_TTL) {
    categories = categoriesCache.data;
  } else {
    categories = await prisma.purchaseCategory.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    categoriesCache = { data: categories, timestamp: Date.now() };
  }

  // Run all independent queries in parallel
  const [total, suppliers, statsAgg] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      select: {
        id: true, code: true, name: true, country: true, scoreGlobal: true,
        trend: true, status: true, riskLevel: true, volumeYtd: true,
        dependencyRatio: true, incidentsCount: true, x3SyncStatus: true,
        category: { select: { name: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    // Use aggregation for stats instead of fetching all records
    prisma.supplier.aggregate({
      where: { isDeleted: false },
      _count: { _all: true },
    }),
  ]);

  // Get status counts in a single query using groupBy
  const statusCounts = await prisma.supplier.groupBy({
    by: ['status'],
    where: { isDeleted: false },
    _count: { _all: true },
  });

  // Get risk counts
  const riskCounts = await prisma.supplier.groupBy({
    by: ['riskLevel'],
    where: { isDeleted: false },
    _count: { _all: true },
  });

  // Build stats from aggregated data
  const stats = {
    total: statsAgg._count._all,
    strategic: statusCounts.find(s => s.status === 'strategic')?._count._all || 0,
    active: statusCounts.find(s => s.status === 'active')?._count._all || 0,
    probation: statusCounts.find(s => s.status === 'probation')?._count._all || 0,
    atRisk: (riskCounts.find(r => r.riskLevel === 'critical')?._count._all || 0) +
            (riskCounts.find(r => r.riskLevel === 'high')?._count._all || 0),
  };

  return NextResponse.json({
    suppliers: suppliers.map(s => ({
      ...s,
      categoryName: s.category?.name || '—',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    categories,
    stats,
  });
}
