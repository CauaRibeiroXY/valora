export type AssetType = 'stock' | 'fii' | 'fixed_income';

export type RecommendationAction = 'COMPRAR_MAIS' | 'MANTER' | 'VENDER';

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  change24h?: number;
  dividendYield?: number;
  pl?: number; // Preço / Lucro
  pvp?: number; // Preço / Valor Patrimonial
  lpa?: number; // Lucro Por Ação
  roe?: number; // Retorno sobre Patrimônio Líquido em %
  profitMargins?: number; // Margem Líquida em %
  evEbitda?: number; // EV / EBITDA
  targetPrice?: number;
  stopLossPrice?: number;
  sector?: string;
  notes?: string;
}

export interface AssetAnalysis {
  assetId: string;
  ticker: string;
  action: RecommendationAction;
  confidenceScore: number; // 0 to 100
  summary: string;
  thesisAlignment: string;
  reasons: string[];
  suggestedActionDetail: string;
  analyzedAt: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentTotal: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  buyCount: number;
  holdCount: number;
  sellCount: number;
}
