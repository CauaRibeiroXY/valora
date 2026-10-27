import { Investment } from 'pluggy-sdk';
import { Asset, AssetType } from './types';

/**
 * Normaliza os investimentos retornados pelo Pluggy para o modelo interno de Asset do InvestAI
 */
export function mapPluggyInvestmentToAsset(inv: Investment): Asset {
  let type: AssetType = 'stock';
  const rawType = (inv.type || '').toUpperCase();
  const rawSubtype = (inv.subtype || '').toUpperCase();

  if (rawType.includes('EQUITY') || rawType.includes('STOCK') || rawSubtype.includes('STOCK')) {
    type = 'stock';
  } else if (rawType.includes('REAL_ESTATE') || rawSubtype.includes('REAL_ESTATE') || (inv.code && inv.code.endsWith('11'))) {
    type = 'fii';
  } else if (
    rawType.includes('FIXED_INCOME') ||
    rawType.includes('TREASURY') ||
    rawSubtype.includes('TREASURY') ||
    rawSubtype.includes('CDB') ||
    rawSubtype.includes('LCI') ||
    rawSubtype.includes('LCA')
  ) {
    type = 'fixed_income';
  }

  // Ticker / Código
  let ticker = inv.code || inv.name || `INV-${inv.id.substring(0, 6)}`;
  // Limpa possíveis espaços ou formatações
  ticker = ticker.trim().toUpperCase();

  // Quantidade
  const quantity = inv.quantity && inv.quantity > 0 ? inv.quantity : 1;

  // Valor atual total ou por cota
  const balance = inv.balance || inv.value || 0;
  const currentPrice = inv.value && inv.quantity ? inv.value : (quantity > 0 && balance > 0 ? balance / quantity : balance);

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
