import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), '.env.local');

function readEnvLocal(): Record<string, string> {
  const result: Record<string, string> = {};
  if (fs.existsSync(CONFIG_PATH)) {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...vals] = trimmed.split('=');
      if (key) {
        result[key.trim()] = vals.join('=').trim();
      }
    });
  }
  return result;
}

export async function GET() {
  const env = readEnvLocal();
  return NextResponse.json({
    hasPluggyKeys: Boolean(env.PLUGGY_CLIENT_ID || process.env.PLUGGY_CLIENT_ID) && Boolean(env.PLUGGY_CLIENT_SECRET || process.env.PLUGGY_CLIENT_SECRET),
    pluggyClientId: env.PLUGGY_CLIENT_ID || process.env.PLUGGY_CLIENT_ID || '',
    geminiApiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
    brapiToken: env.BRAPI_TOKEN || process.env.BRAPI_TOKEN || ''
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pluggyClientId, pluggyClientSecret, geminiApiKey, brapiToken } = body;

    const currentEnv = readEnvLocal();
    if (pluggyClientId !== undefined) currentEnv.PLUGGY_CLIENT_ID = pluggyClientId;
    if (pluggyClientSecret !== undefined) currentEnv.PLUGGY_CLIENT_SECRET = pluggyClientSecret;
    if (geminiApiKey !== undefined) currentEnv.GEMINI_API_KEY = geminiApiKey;
    if (brapiToken !== undefined) currentEnv.BRAPI_TOKEN = brapiToken;

    // Atualiza as variáveis em runtime do processo node
    if (pluggyClientId) process.env.PLUGGY_CLIENT_ID = pluggyClientId;
    if (pluggyClientSecret) process.env.PLUGGY_CLIENT_SECRET = pluggyClientSecret;
    if (geminiApiKey) process.env.GEMINI_API_KEY = geminiApiKey;
    if (brapiToken) process.env.BRAPI_TOKEN = brapiToken;

    const fileContent = `# Configurações Automáticas do InvestAI
GEMINI_API_KEY=${currentEnv.GEMINI_API_KEY || ''}
BRAPI_TOKEN=${currentEnv.BRAPI_TOKEN || ''}
PLUGGY_CLIENT_ID=${currentEnv.PLUGGY_CLIENT_ID || ''}
PLUGGY_CLIENT_SECRET=${currentEnv.PLUGGY_CLIENT_SECRET || ''}
`;

    fs.writeFileSync(CONFIG_PATH, fileContent, 'utf-8');

    return NextResponse.json({ success: true, message: 'Configurações salvas no servidor local com sucesso!' });
  } catch (err: unknown) {
    console.error('Erro ao salvar settings:', err);
    return NextResponse.json({ error: 'Falha ao salvar configurações' }, { status: 500 });
  }
}
