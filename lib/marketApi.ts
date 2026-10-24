export interface MarketQuoteResult {
  ticker: string;
  price: number;
  changePercent?: number;
  currency?: string;
  source: 'brapi' | 'yahoo' | 'fallback';
}

export async function fetchQuote(ticker: string, brapiToken?: string): Promise<MarketQuoteResult | null> {
  const cleanTicker = ticker.trim().toUpperCase();

  // If it's a fixed income asset, return simulated index tracking or null
  if (cleanTicker.startsWith('IPCA') || cleanTicker.startsWith('SELIC') || cleanTicker.startsWith('CDB')) {
    return null;
  }

  // 1. Try Brapi if token is provided or public endpoint
  try {
    const url = brapiToken
      ? `https://brapi.dev/api/quote/${cleanTicker}?token=${brapiToken}`
      : `https://brapi.dev/api/quote/${cleanTicker}`;

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results[0] && typeof data.results[0].regularMarketPrice === 'number') {
        const item = data.results[0];
        return {
          ticker: cleanTicker,
          price: item.regularMarketPrice,
          changePercent: item.regularMarketChangePercent || 0,
          currency: item.currency || 'BRL',
          source: 'brapi'
        };
      }
    }
  } catch (err) {
    console.warn(`Brapi fetch failed for ${cleanTicker}:`, err);
  }

  // 2. Try Yahoo Finance (.SA suffix for Brazilian B3 tickers)
  try {
    const yahooTicker = cleanTicker.includes('.') ? cleanTicker : `${cleanTicker}.SA`;
    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`;
    const res = await fetch(yUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 60 }
    });

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const regularPrice = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || regularPrice;
        const changePercent = prevClose ? ((regularPrice - prevClose) / prevClose) * 100 : 0;
        return {
          ticker: cleanTicker,
          price: regularPrice,
          changePercent: Number(changePercent.toFixed(2)),
          currency: meta.currency || 'BRL',
          source: 'yahoo'
        };
      }
    }
  } catch (err) {
    console.warn(`Yahoo fetch failed for ${cleanTicker}:`, err);
  }

  return null;
}
