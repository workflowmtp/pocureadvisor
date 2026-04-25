import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_LIST_URL = 'https://bridge.mtb-app.com/webhook/commande/list';
const BRIDGE_SEARCH_URL = 'https://bridge.mtb-app.com/webhook/commande/search';
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
    const items: any[] = raw.orders || [];
    const total = raw.total ?? items.length;

    const trim = (v: any) => (typeof v === 'string' ? v.trim() : v ?? null);

    const orders = items.map((o: any) => ({
      poNumber:      trim(o.poNumber),
      supplierCode:  trim(o.supplierCode),
      supplierName:  trim(o.supplierName),
      orderDate:     o.orderDate || null,
      dateExpected:  o.dateExpected || null,
      deliveryDate:  o.deliveryDate || null,
      totalAmount:   o.totalAmount ?? 0,
      amountHt:      o.amountHt ?? 0,
      currency:      trim(o.currency),
      paymentTerms:  trim(o.paymentTerms),
      poleId:        trim(o.poleId),
      status:        o.status ?? 1,
      isLate:        o.isLate === 1 || o.isLate === true,
    }));

    // Stats
    const stats = {
      total,
      late: orders.filter(o => o.isLate).length,
      totalAmount: orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0),
      ruptureRisk: 0, // not available from X3 directly
    };

    return NextResponse.json({
      orders,
      stats,
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
