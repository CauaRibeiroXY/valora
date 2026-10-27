import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient } from '@/lib/pluggyClient';
import { ConnectTokenOptions } from 'pluggy-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, clientSecret } = body;

    const pluggyClient = getPluggyClient(clientId, clientSecret);

    // Configuração do Webhook caso informado via variável ou URL do app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const tokenOptions: ConnectTokenOptions = {};

    if (appUrl) {
      const webhookUrl = `${appUrl}/api/pluggy/webhook`;
      if (webhookUrl.startsWith('https://') || process.env.ENABLE_HTTP_WEBHOOK === 'true') {
        tokenOptions.webhookUrl = webhookUrl;
      }
    }

    const connectToken = await pluggyClient.createConnectToken(
      undefined,
      Object.keys(tokenOptions).length > 0 ? tokenOptions : undefined
    );

    return NextResponse.json(connectToken);
  } catch (err: unknown) {
    console.error('Erro ao gerar connect token da Pluggy:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao comunicar com a Pluggy' },
      { status: 500 }
    );
  }
}
