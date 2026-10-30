import { NextRequest, NextResponse } from 'next/server';
import { Asset, AssetAnalysis } from '@/lib/types';
import { analyzeAssetWithGemini } from '@/lib/geminiService';
import { fetchQuote } from '@/lib/marketApi';

export const dynamic = 'force-dynamic';

async function enrichAssetWithMarketData(asset: Asset, brapiToken?: string): Promise<Asset> {
  // Renda fixa direta não busca múltiplos de bolsa
  if (asset.type === 'fixed_income') return asset;

  try {
    const quote = await fetchQuote(asset.ticker, brapiToken);
    if (quote) {
      return {
        ...asset,
        name: quote.name || asset.name,
        currentPrice: typeof quote.price === 'number' && quote.price > 0 ? quote.price : asset.currentPrice,
        change24h: quote.changePercent !== undefined ? quote.changePercent : asset.change24h,
        pl: quote.pl !== undefined ? quote.pl : asset.pl,
        pvp: quote.pvp !== undefined ? quote.pvp : asset.pvp,
        lpa: quote.lpa !== undefined ? quote.lpa : asset.lpa,
        roe: quote.roe !== undefined ? quote.roe : asset.roe,
        profitMargins: quote.profitMargins !== undefined ? quote.profitMargins : asset.profitMargins,
        evEbitda: quote.evEbitda !== undefined ? quote.evEbitda : asset.evEbitda,
        dividendYield: quote.dividendYield !== undefined ? quote.dividendYield : asset.dividendYield,
      };
    }
  } catch (err) {
    console.warn(`Enrichment failed for ${asset.ticker}:`, err);
  }
  return asset;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asset, assets, rulesMarkdown, geminiApiKey, brapiToken } = body;

    if (!rulesMarkdown) {
      return NextResponse.json({ error: 'Rules markdown document is required' }, { status: 400 });
    }

    // Single asset analysis
    if (asset) {
      const enriched = await enrichAssetWithMarketData(asset, brapiToken);
      const result = await analyzeAssetWithGemini(enriched, rulesMarkdown, geminiApiKey);
      return NextResponse.json({
        ...result,
        enrichedAsset: enriched,
      });
    }

    // Batch assets analysis
    if (Array.isArray(assets) && assets.length > 0) {
      const results: AssetAnalysis[] = [];
      const enrichedAssets: Asset[] = [];

      for (const item of assets as Asset[]) {
        const enriched = await enrichAssetWithMarketData(item, brapiToken);
        enrichedAssets.push(enriched);
        const res = await analyzeAssetWithGemini(enriched, rulesMarkdown, geminiApiKey);
        results.push(res);
      }

      return NextResponse.json({
        results,
        enrichedAssets,
      });
    }

    return NextResponse.json({ error: 'Either asset or assets array must be provided' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error in analyze route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
