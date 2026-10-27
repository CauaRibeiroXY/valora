import { GoogleGenerativeAI } from '@google/generative-ai';
import { Asset, AssetAnalysis, RecommendationAction } from './types';

export function runDeterministicHeuristicAnalysis(asset: Asset, rulesMarkdown: string): AssetAnalysis {
  const current = asset.currentPrice;
  const avg = asset.averagePrice;
  const target = asset.targetPrice;
  const stopLoss = asset.stopLossPrice;
  const pl = asset.pl;
  const pvp = asset.pvp;
  const dy = asset.dividendYield;
  const pnlPercent = avg > 0 ? ((current - avg) / avg) * 100 : 0;

  let action: RecommendationAction = 'MANTER';
  let confidence = 75;
  const reasons: string[] = [];
  let thesisAlignment = 'O ativo opera dentro das expectativas e critérios do Guia de Indicadores.';
  let suggestedActionDetail = 'Manter a posição e monitorar os próximos resultados trimestrais.';

  // 1. Verificação de Stop Loss
  if (stopLoss && current <= stopLoss) {
    action = 'VENDER';
    confidence = 90;
    reasons.push(`Preço atual (R$ ${current.toFixed(2)}) atingiu ou rompeu o nível de Stop de Segurança (R$ ${stopLoss.toFixed(2)}).`);
    reasons.push('Critério de preservação de capital ativado conforme diretrizes do guia.');
    thesisAlignment = 'Gatilho de risco e saída ativado.';
    suggestedActionDetail = 'Executar venda para estancar perdas e reavaliar a alocação.';
  }
  // 2. Verificação de Preço-Alvo / Múltiplos Esticados (Realização de lucro)
  else if (target && current >= target) {
    action = 'VENDER';
    confidence = 85;
    reasons.push(`Cotação atual (R$ ${current.toFixed(2)}) atingiu ou superou o Preço-Alvo de realização (R$ ${target.toFixed(2)}).`);
    if (pl && pl > 25) {
      reasons.push(`Múltiplo P/L esticado (${pl.toFixed(1)}x), indicando que o mercado já precificou forte crescimento.`);
    }
    reasons.push(`Rentabilidade acumulada de ${pnlPercent.toFixed(1)}%.`);
    thesisAlignment = 'Objetivo de valorização cumprido conforme o guia de múltiplos.';
    suggestedActionDetail = 'Realizar venda parcial ou total para travar lucro e realocar em oportunidades descontadas.';
  }
  // 3. Critérios de COMPRAR MAIS (Baseados no Guia: P/VP < 1 ou desconto > 15%, DY consistente e P/L atrativo)
  else if ((target && current < target * 0.85) || (pvp !== undefined && pvp > 0 && pvp < 1.0 && pl !== undefined && pl > 0 && pl < 12)) {
    action = 'COMPRAR_MAIS';
    confidence = 85;
    if (target && current < target * 0.85) {
      const discount = ((target - current) / target) * 100;
      reasons.push(`Margem de segurança atrativa: ativo com ${discount.toFixed(1)}% de desconto em relação ao Preço-Alvo (R$ ${target.toFixed(2)}).`);
    }
    if (pvp !== undefined && pvp > 0 && pvp < 1.0) {
      reasons.push(`P/VP abaixo de 1.0 (${pvp.toFixed(2)}x): ação sendo negociada com desconto sobre o Valor Patrimonial real.`);
    }
    if (pl !== undefined && pl > 0 && pl < 12) {
      reasons.push(`P/L atrativo (${pl.toFixed(1)}x): retorno de investimento acelerado via geração de lucros.`);
    }
    if (dy && dy >= 6) {
      reasons.push(`Dividend Yield robusto de ${dy.toFixed(1)}% a.a., remunerando o capital investido.`);
    }
    thesisAlignment = 'Ativo em zona de compra e subavaliação com fundamentos alinhados ao guia.';
    suggestedActionDetail = 'Aportar capital adicional respeitando o gerenciamento de risco da carteira.';
  } else {
    // 4. Critério MANTER
    action = 'MANTER';
    confidence = 80;
    reasons.push(`Cotação atual de R$ ${current.toFixed(2)} está equilibrada na faixa de consolidação.`);
    if (pvp !== undefined) {
      reasons.push(`P/VP em ${pvp.toFixed(2)}x, indicando precificação justa de mercado.`);
    }
    if (dy) {
      reasons.push(`Dividend Yield atual de ${dy.toFixed(1)}% a.a.`);
    }
    reasons.push('Fundamentos e múltiplos permanecem estáveis sem gatilhos extremos de liquidação ou compra agressiva.');
    thesisAlignment = 'Ativo cumprindo seu papel na carteira sem distorções de valuation.';
    suggestedActionDetail = 'Manter em carteira e reinvestir os proventos recebidos.';
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
    return runDeterministicHeuristicAnalysis(asset, rulesMarkdown);
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Você é um estrategista sênior de investimentos e analista CNPI.
Avalie o ativo financeiro abaixo confrontando seus dados rigorosamente contra as regras e fórmulas do "Guia de Análise de Empresas e Ações" fornecido.

Sua deliberação final DEVE ser estritamente uma destas três ações:
- "COMPRAR_MAIS": Se houver margem de segurança atrativa (desconto > 15%, P/VP < 1, P/L e EV/EBITDA baixos, ROE forte >= 15%, DY sustentável).
- "MANTER": Se a empresa tiver múltiplos equilibrados, boa rentabilidade e sem distorções agudas de preço.
- "VENDER": Se houver quebra de fundamentos (prejuízo/LPA negativo, margem em queda, ROE fraco), múltiplos muito caros ou atingimento de preço-alvo / stop.

---
DADOS DO ATIVO DO INVESTIDOR:
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
- Preço Alvo/Teto: ${asset.targetPrice ? 'R$ ' + asset.targetPrice.toFixed(2) : 'Não definido'}
- Preço Stop Loss: ${asset.stopLossPrice ? 'R$ ' + asset.stopLossPrice.toFixed(2) : 'Não definido'}
- Setor: ${asset.sector || 'Geral'}
- Observações: ${asset.notes || 'Nenhuma'}

---
GUIA DE ANÁLISE E INDICADORES DO INVESTIDOR (MARKDOWN):
${rulesMarkdown}

---
RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (sem blocos de código markdown adicionais):
{
  "action": "COMPRAR_MAIS" ou "MANTER" ou "VENDER",
  "confidenceScore": número de 0 a 100,
  "summary": "resumo conciso da decisão para o ativo",
  "thesisAlignment": "análise detalhada relacionando os múltiplos do ativo (ROE, P/L, P/VP, DY, margem) com os critérios do Guia",
  "reasons": ["motivo 1 baseado no guia", "motivo 2 baseado no guia", "motivo 3 baseado no guia"],
  "suggestedActionDetail": "orientação prática de execução (ex: comprar mais X%, manter e reinvestir proventos, realizar parcial de 30% para lucro)"
}
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

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
      thesisAlignment: parsed.thesisAlignment || 'Conforme os critérios do guia de indicadores.',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Critérios confrontados com o guia.'],
      suggestedActionDetail: parsed.suggestedActionDetail || 'Manter observação ativa.',
      analyzedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`Gemini API error for ${asset.ticker}, fallback to heuristic:`, err);
    return runDeterministicHeuristicAnalysis(asset, rulesMarkdown);
  }
}
