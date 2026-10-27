import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient } from '@/lib/pluggyClient';
import { mapPluggyInvestmentToAsset } from '@/lib/pluggyMapper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const itemId = searchParams.get('itemId');
    const clientId = searchParams.get('clientId') || undefined;
    const clientSecret = searchParams.get('clientSecret') || undefined;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId é obrigatório' }, { status: 400 });
    }

    const pluggyClient = getPluggyClient(clientId, clientSecret);
    const investmentsResponse = await pluggyClient.fetchInvestments(itemId);

    const investments = investmentsResponse.results || [];
    const assets = investments.map(mapPluggyInvestmentToAsset);

    return NextResponse.json({
      success: true,
      total: assets.length,
      assets,
      rawInvestments: investments
    });
  } catch (err: unknown) {
    console.error('Erro ao buscar investimentos da Pluggy:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao buscar investimentos' },
      { status: 500 }
    );
  }
}
