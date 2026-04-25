import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_LIST_URL = 'https://bridge.mtb-app.com/webhook/matiere/list';
const BRIDGE_SEARCH_URL = 'https://bridge.mtb-app.com/webhook/matiere/search';
const BRIDGE_AUTH = 'Basic ' + Buffer.from(`${process.env.BRIDGE_USER ?? 'multiprint'}:${process.env.BRIDGE_PASSWORD ?? ''}`).toString('base64');

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const size = parseInt(searchParams.get('size') || '20');
  const search = searchParams.get('search') || '';

  try {
    const url = search ? BRIDGE_SEARCH_URL : BRIDGE_LIST_URL;
    const payload = search ? { page, size, search } : { page, size };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BRIDGE_AUTH,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Bridge error: ${res.status}` }, { status: res.status });
    }

    const raw = await res.json();
    const items: any[] = raw.orders || raw.items || [];
    const total = raw.total ?? items.length;

    const trim = (v: any) => (typeof v === 'string' ? v.trim() : v ?? null);

    const materials = items.map((m: any) => ({
      code:           trim(m.code),
      name:           trim(m.name),
      description:    trim(m.description),
      category:       trim(m.category),
      unit:           trim(m.unit),
      purchaseUnit:   trim(m.purchaseUnit),
      currentPrice:   m.currentPrice ?? 0,
      previousPrice:  m.previousPrice ?? null,
      variationPct:   m.variationPct ?? null,
      currency:       trim(m.currency),
      status:         trim(m.status) || 'active',
      createdAt:      m.createdAt || null,
      updatedAt:      m.updatedAt || null,
    }));

    return NextResponse.json({
      materials,
      pagination: {
        page,
        size,
        total,
        hasMore: items.length === size,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
