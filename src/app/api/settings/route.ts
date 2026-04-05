import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

const DEFAULT_SETTINGS: Record<string, any> = {
  scoring_weights: { quality: 20, price: 25, delivery: 20, doc_compliance: 15, reactivity: 10, regularity: 10 },
  thresholds: { late_order_days: 7, critical_score: 40, high_dependency: 60, duplicate_tolerance_pct: 2, price_variance_pct: 5, quantity_variance_pct: 10 },
  audit: { auto_detect_enabled: true, fraud_rules_enabled: true, discipline_scoring_enabled: true },
  notifications: { email_enabled: false, badge_refresh_seconds: 60 },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.setting.findMany();
  const result: Record<string, any> = { ...DEFAULT_SETTINGS };
  settings.forEach(s => { result[s.key] = s.value; });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });

  const body = await req.json();
  const { key, value } = body;
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });

  await prisma.activityLog.create({
    data: { userId: session.user.id!, userName: session.user.name!, action: 'update', module: 'settings', details: 'Paramètre modifié: ' + key },
  });

  return NextResponse.json({ success: true });
}
