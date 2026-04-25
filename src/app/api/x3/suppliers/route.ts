import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_LIST_URL = 'https://bridge.mtb-app.com/webhook/fournisseurs/list';
const BRIDGE_SEARCH_URL = 'https://bridge.mtb-app.com/webhook/fournisseurs/search';
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
    const items: any[] = raw.suppliers || (Array.isArray(raw) ? raw : [raw]);
    const total = raw.total ?? items.length;

    // Normalize & clean X3 fields
    const trim = (v: any) => (typeof v === 'string' ? v.trim() : v ?? null);

    let suppliers = items.map((s: any) => ({
      code:          trim(s.BPSNUM),
      name:          trim(s.BPNAM),
      shortName:     trim(s.BPSSHO),
      country:       trim(s.BPACRY),
      city:          trim(s.BPACTY),
      currency:      trim(s.BPACUR),
      paymentTerms:  trim(s.BPAPAYTER),
      vatNumber:     trim(s.BPAVATNUM),
      address1:      trim(s.BPAADDLIG1),
      address2:      trim(s.BPAADDLIG2),
      postalCode:    trim(s.BPAPOSCOD),
      contactName:   trim(s.BPACNTNAM),
      contactEmail:  trim(s.BPAEMA),
      contactPhone:  trim(s.BPATEL),
      type:          s.BPATYP,
      contractRef:   trim(s.PCONUM),
      contractExpiry: s.PCOENDDAT ? trim(s.PCOENDDAT) : null,
      contractActive: s.PCOSTA === 2,
    }));

    return NextResponse.json({
      suppliers,
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
