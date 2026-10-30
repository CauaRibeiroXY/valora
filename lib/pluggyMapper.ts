import { Investment } from 'pluggy-sdk';
import { Asset, AssetType } from './types';

/**
 * Normaliza os investimentos retornados pelo Pluggy para o modelo interno de Asset do InvestAI
 */
export function mapPluggyInvestmentToAsset(inv: Investment): Asset {
  let type: AssetType = 'stock';
  const rawType = (inv.type || '').toUpperCase();
  const rawSubtype = (inv.subtype || '').toUpperCase();
  let ticker = inv.code || inv.name || `INV-${inv.id.substring(0, 6)}`;
  ticker = ticker.trim().toUpperCase();

  if (
    rawType.includes('FIXED_INCOME') ||
    rawType.includes('TREASURY') ||
    rawSubtype.includes('TREASURY') ||
    rawSubtype.includes('CDB') ||
    rawSubtype.includes('LCI') ||
    rawSubtype.includes('LCA') ||
    ticker.startsWith('CDB') ||
    ticker.startsWith('LCI') ||
    ticker.startsWith('LCA') ||
    ticker.startsWith('BRSTN') ||
    ticker.startsWith('TESOURO')
  ) {
    type = 'fixed_income';
  } else if (
    rawType.includes('REAL_ESTATE') ||
    rawSubtype.includes('REAL_ESTATE') ||
    (ticker.length >= 5 && ticker.endsWith('11') && !ticker.startsWith('SMAL') && !ticker.startsWith('DIVO') && !ticker.startsWith('BOVA') && !ticker.startsWith('IVVB'))
  ) {
    type = 'fii';
  } else {
    type = 'stock';
  }

  // Quantidade real (se for 0, mantém 0 para identificar posições já zeradas/residuais)
  const quantity = typeof inv.quantity === 'number' ? inv.quantity : 0;

  // Valor atual total ou por cota
  const balance = inv.balance || inv.value || 0;
  const currentPrice = inv.value && quantity > 0
    ? inv.value
    : (quantity > 0 && balance > 0 ? balance / quantity : (inv.value || 0));

  // Preço médio (ou valor original investido)
  const amountOriginal = inv.amountOriginal || balance;
  const averagePrice = quantity > 0 && amountOriginal > 0 ? amountOriginal / quantity : currentPrice;

  return {
    id: `pluggy-${inv.id}`,
    ticker,
    name: inv.name || ticker,
    type,
    quantity: Number(quantity.toFixed(4)),
    averagePrice: Number(averagePrice.toFixed(2)),
    currentPrice: Number(currentPrice.toFixed(2)),
    sector: inv.institution?.name || inv.issuer || 'B3 / Open Finance',
    notes: `Importado via Pluggy (${inv.institution?.name || 'Open Finance'}). Tipo original: ${inv.type || 'N/D'}`
  };
}
