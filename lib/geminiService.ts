import { GoogleGenerativeAI } from '@google/generative-ai';
import { Asset, AssetAnalysis, RecommendationAction } from './types';

export function runDeterministicHeuristicAnalysis(asset: Asset, rulesMarkdown: string): AssetAnalysis {
  const current = asset.currentPrice;
  const avg = asset.averagePrice;
  const target = asset.targetPrice;
  const stopLoss = asset.stopLossPrice;
  const pnlPercent = avg > 0 ? ((current - avg) / avg) * 100 : 0;

  let action: RecommendationAction = 'MANTER';
  let confidence = 75;
  const reasons: string[] = [];
  let thesisAlignment = 'O ativo opera dentro das expectativas normais estipuladas no documento de teses.';
  let suggestedActionDetail = 'Manter a posição e aguardar os próximos relatórios ou oscilações para rebalancear.';

  // Check Stop Loss
  if (stopLoss && current <= stopLoss) {
    action = 'VENDER';
    confidence = 90;
    reasons.push(`Preço atual (R$ ${current.toFixed(2)}) atingiu ou rompeu o nível de Stop de Segurança (R$ ${stopLoss.toFixed(2)}).`);
    reasons.push('Critério de proteção de capital ativado conforme as diretrizes do documento.');
    thesisAlignment = 'Gatilho de saída ou proteção disparado.';
    suggestedActionDetail = 'Vender a totalidade ou reduzir expressivamente para estancar prejuízo e reavaliar a governança/fundamentos.';
  }
  // Check Target Price (Take profit)
  else if (target && current >= target) {
    action = 'VENDER';
    confidence = 85;
    reasons.push(`Cotação atual (R$ ${current.toFixed(2)}) superou o Preço-Alvo / Teto estipulado (R$ ${target.toFixed(2)}).`);
    reasons.push(`Rentabilidade acumulada de ${pnlPercent.toFixed(1)}%. Múltiplos esticados em relação à tese de entrada.`);
    thesisAlignment = 'Objetivo de preço atingido. Hora de realizar lucros.';
    suggestedActionDetail = 'Realizar venda parcial (30% a 50%) para travar lucros e redirecionar capital para ativos mais descontados ou Renda Fixa.';
  }
  // Check Discount for Buying More
  else if (target && current < target * 0.85) {
    action = 'COMPRAR_MAIS';
    confidence = 85;
    const discount = ((target - current) / target) * 100;
    reasons.push(`Margem de segurança atrativa: ativo com ${discount.toFixed(1)}% de desconto em relação ao Preço-Alvo (R$ ${target.toFixed(2)}).`);
    if (asset.dividendYield && asset.dividendYield >= 7) {
      reasons.push(`Dividend Yield robusto de ${asset.dividendYield.toFixed(1)}% a.a., alinhado à estratégia de proventos.`);
    }
    if (asset.pl && asset.pl < 10) {
      reasons.push(`Múltiplo P/L atrativo (${asset.pl.toFixed(1)}x), indicando subavaliação perante o mercado.`);
    }
    thesisAlignment = 'Ativo em zona de compra prioritária com ampla margem de segurança.';
    suggestedActionDetail = 'Aportar capital adicional respeitando o limite percentual de alocação da carteira.';
  } else {
    // Hold scenario
    action = 'MANTER';
    confidence = 80;
    reasons.push(`Preço atual de R$ ${current.toFixed(2)} está na faixa de consolidação e equilíbrio da tese.`);
    reasons.push('Fundamentos permanecem estáveis sem gatilhos imediatos de compra agressiva ou liquidação.');
    thesisAlignment = 'Ativo cumprindo seu papel na carteira sem distorções de preço.';
    suggestedActionDetail = 'Manter em carteira e reinvestir eventuais proventos recebidos.';
  }

  return {
    assetId: asset.id,
    ticker: asset.ticker,
    action,
    confidenceScore: confidence,
    summary: `${action === 'COMPRAR_MAIS' ? 'Oportunidade de Aporte' : action === 'VENDER' ? 'Ponto de Realização / Saída' : 'Posição Equilibrada'}: ${asset.ticker}`,
    thesisAlignment,
    reasons,
    suggestedActionDetail,
    analyzedAt: new Date().toISOString()
  };
}

export async function analyzeAssetWithGemini(
  asset: Asset,
  rulesMarkdown: string,
  apiKey?: string
): Promise<AssetAnalysis> {
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    // Return high quality heuristic algorithm if no API key is set yet
    return runDeterministicHeuristicAnalysis(asset, rulesMarkdown);
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    // Use gemini-1.5-flash or gemini-2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Você é um estrategista sênior de investimentos e alocação de ativos.
Sua missão é analisar o ativo financeiro abaixo e decidir estritamente entre três ações:
- "COMPRAR_MAIS": se o ativo estiver descontado, com boa margem de segurança e dentro dos critérios de aporte da tese.
- "MANTER": se o ativo estiver com preço justo e fundamentos preservados.
- "VENDER": se o ativo tiver atingido o preço-teto/alvo de realização, quebrado a tese ou acionado o stop loss/risco.

---
DADOS DO ATIVO DO USUÁRIO:
- Ticker: ${asset.ticker}
- Nome: ${asset.name}
- Tipo: ${asset.type}
- Quantidade: ${asset.quantity}
- Preço Médio Pago: R$ ${asset.averagePrice.toFixed(2)}
- Cotação Atual de Mercado: R$ ${asset.currentPrice.toFixed(2)}
- Variação 24h: ${asset.change24h ? asset.change24h + '%' : 'N/D'}
- Dividend Yield: ${asset.dividendYield ? asset.dividendYield + '%' : 'N/D'}
- P/L: ${asset.pl || 'N/D'}
- P/VP: ${asset.pvp || 'N/D'}
- Preço Alvo/Teto Definido: ${asset.targetPrice ? 'R$ ' + asset.targetPrice.toFixed(2) : 'Não definido'}
- Preço Stop Loss: ${asset.stopLossPrice ? 'R$ ' + asset.stopLossPrice.toFixed(2) : 'Não definido'}
- Setor: ${asset.sector || 'Geral'}
- Notas do Investidor: ${asset.notes || 'Nenhuma'}

---
DOCUMENTO DE REGRAS E TESES DO INVESTIDOR (MARKDOWN):
${rulesMarkdown}

---
RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (sem markdown code fences, sem caracteres adicionais antes ou depois) com a seguinte estrutura:
{
  "action": "COMPRAR_MAIS" ou "MANTER" ou "VENDER",
  "confidenceScore": número de 0 a 100,
  "summary": "uma frase curta resumindo a conclusão",
  "thesisAlignment": "explicação concisa de como o ativo se encaixa ou viola as regras escritas no documento",
  "reasons": ["motivo 1", "motivo 2", "motivo 3"],
  "suggestedActionDetail": "instrução prática e acionável para o investidor (ex: comprar mais X%, vender 30% da posição para lucro, etc.)"
}
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

    // Clean any markdown code blocks if returned
    const cleanedText = text
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleanedText);

    return {
      assetId: asset.id,
      ticker: asset.ticker,
      action: parsed.action || 'MANTER',
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 80,
      summary: parsed.summary || `Análise de ${asset.ticker}`,
      thesisAlignment: parsed.thesisAlignment || 'Conforme a tese informada.',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Critérios comparados com a tese.'],
      suggestedActionDetail: parsed.suggestedActionDetail || 'Manter observação ativa.',
      analyzedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`Gemini API error for ${asset.ticker}, falling back to heuristic:`, err);
    return runDeterministicHeuristicAnalysis(asset, rulesMarkdown);
  }
}
