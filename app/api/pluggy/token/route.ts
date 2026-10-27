import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient } from '@/lib/pluggyClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, clientSecret } = body;

    const pluggyClient = getPluggyClient(clientId, clientSecret);
    const connectToken = await pluggyClient.createConnectToken();

    return NextResponse.json(connectToken);
  } catch (err: unknown) {
    console.error('Erro ao gerar connect token da Pluggy:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao comunicar com a Pluggy' },
      { status: 500 }
    );
  }
}
