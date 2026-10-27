import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    console.log('[Pluggy Webhook Event Received]:', JSON.stringify(event, null, 2));

    // Exemplos de eventos enviados pelo Pluggy:
    // event: "item/created" | "item/updated" | "item/error" | "item/deleted"
    // itemId: string identificando o item
    return NextResponse.json({ received: true, event: event.event, itemId: event.itemId });
  } catch (error) {
    console.error('Erro ao processar webhook da Pluggy:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// Aceita GET para validações ou verificações de integridade
export async function GET() {
  return NextResponse.json({ status: 'Pluggy webhook endpoint active' });
}
