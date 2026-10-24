import { NextRequest, NextResponse } from 'next/server';
import { Asset, AssetAnalysis } from '@/lib/types';
import { analyzeAssetWithGemini } from '@/lib/geminiService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asset, assets, rulesMarkdown, geminiApiKey } = body;

    if (!rulesMarkdown) {
      return NextResponse.json({ error: 'Rules markdown document is required' }, { status: 400 });
    }

    // Single asset analysis
    if (asset) {
      const result = await analyzeAssetWithGemini(asset, rulesMarkdown, geminiApiKey);
      return NextResponse.json(result);
    }

    // Batch assets analysis
    if (Array.isArray(assets) && assets.length > 0) {
      const results: AssetAnalysis[] = [];
      for (const item of assets as Asset[]) {
        const res = await analyzeAssetWithGemini(item, rulesMarkdown, geminiApiKey);
        results.push(res);
      }
      return NextResponse.json({ results });
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
