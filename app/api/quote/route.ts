import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/marketApi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get('ticker');
  const token = searchParams.get('token') || process.env.BRAPI_TOKEN;

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  const result = await fetchQuote(ticker, token || undefined);

  if (!result) {
    return NextResponse.json({ error: 'Quote not found or not applicable' }, { status: 404 });
  }

  return NextResponse.json(result);
}
