import YahooFinance from 'yahoo-finance2';

export interface MarketQuoteResult {
  ticker: string;
  name?: string;
  price: number;
  changePercent?: number;
  currency?: string;
  // Indicadores do Guia
  pl?: number; // Preço / Lucro
  pvp?: number; // Preço / Valor Patrimonial
  lpa?: number; // Lucro Por Ação (EPS)
  roe?: number; // Retorno Sobre Patrimônio Líquido em %
  dividendYield?: number; // DY em %
  profitMargins?: number; // Margem Líquida em %
  evEbitda?: number; // EV / EBITDA
  source: 'yahoo' | 'brapi' | 'fallback';
}

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function fetchQuote(ticker: string, brapiToken?: string): Promise<MarketQuoteResult | null> {
  const cleanTicker = ticker.trim().toUpperCase();

  // Ativos de renda fixa direta não consultam cotação de ações
  if (
    cleanTicker.startsWith('IPCA') ||
    cleanTicker.startsWith('SELIC') ||
    cleanTicker.startsWith('CDB') ||
    cleanTicker.startsWith('LCI') ||
    cleanTicker.startsWith('LCA')
  ) {
    return null;
  }

  const yahooTicker = cleanTicker.includes('.') ? cleanTicker : `${cleanTicker}.SA`;

  let yahooResult: MarketQuoteResult | null = null;

  // 1. Yahoo Finance gratuito e oficial via yahoo-finance2
  try {
    const [quote, summary] = await Promise.all([
      yf.quoteCombine(yahooTicker).catch(() => null),
      yf.quoteSummary(yahooTicker, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'],
      }).catch(() => null),
    ]);

    if (quote && typeof quote.regularMarketPrice === 'number') {
      const stats = summary?.defaultKeyStatistics;
      const fin = summary?.financialData;
      const sum = summary?.summaryDetail;

      const price = quote.regularMarketPrice;
      const pl = sum?.trailingPE || (quote as any).trailingPE || undefined;
      const pvp = stats?.priceToBook || (quote as any).priceToBook || undefined;
      const lpa = stats?.trailingEps || (quote as any).epsTrailingTwelveMonths || undefined;
      const roe = fin?.returnOnEquity ? Number((fin.returnOnEquity * 100).toFixed(2)) : undefined;
      const profitMargins = fin?.profitMargins ? Number((fin.profitMargins * 100).toFixed(2)) : undefined;
      const evEbitda = stats?.enterpriseToEbitda ? Number(stats.enterpriseToEbitda.toFixed(2)) : undefined;
      const dy = sum?.dividendYield
        ? Number((sum.dividendYield * 100).toFixed(2))
        : (quote as any).trailingAnnualDividendYield
        ? Number(((quote as any).trailingAnnualDividendYield * 100).toFixed(2))
        : undefined;

      yahooResult = {
        ticker: cleanTicker,
        name: quote.longName || quote.shortName || cleanTicker,
        price,
        changePercent: quote.regularMarketChangePercent
          ? Number(quote.regularMarketChangePercent.toFixed(2))
          : 0,
        currency: quote.currency || 'BRL',
        pl: pl ? Number(pl.toFixed(2)) : undefined,
        pvp: pvp ? Number(pvp.toFixed(2)) : undefined,
        lpa: lpa ? Number(lpa.toFixed(2)) : undefined,
        roe,
        profitMargins,
        evEbitda,
        dividendYield: dy,
        source: 'yahoo',
      };
    }
  } catch (err) {
    console.warn(`Yahoo Finance failed for ${yahooTicker}:`, err);
  }

  // Se o Yahoo retornou cotação com múltiplos, já podemos devolver
  if (yahooResult && yahooResult.pl !== undefined && yahooResult.pvp !== undefined) {
    return yahooResult;
  }

  // 2. Complemento / Fallback com Brapi (com ou sem token)
  try {
    const modules = 'defaultKeyStatistics,financialData';
    const url = brapiToken
      ? `https://brapi.dev/api/quote/${cleanTicker}?token=${brapiToken}&modules=${modules}`
      : `https://brapi.dev/api/quote/${cleanTicker}?modules=${modules}`;

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const item = data?.results?.[0];
      if (item && typeof item.regularMarketPrice === 'number') {
        const stats = item.defaultKeyStatistics || {};
        const fin = item.financialData || {};

        const price = item.regularMarketPrice;
        const pl = stats.trailingPE || (stats.earningsPerShare > 0 ? price / stats.earningsPerShare : undefined);
        const pvp = stats.priceToBook || undefined;
        const lpa = stats.earningsPerShare || stats.trailingEps || undefined;
        const roe = fin.returnOnEquity ? Number((fin.returnOnEquity * 100).toFixed(2)) : undefined;
        const profitMargins = fin.profitMargins
          ? Number((fin.profitMargins * 100).toFixed(2))
          : stats.profitMargins
          ? Number((stats.profitMargins * 100).toFixed(2))
          : undefined;
        const evEbitda = stats.enterpriseToEbitda ? Number(stats.enterpriseToEbitda.toFixed(2)) : undefined;
        const dy = stats.dividendYield
          ? Number((stats.dividendYield * 100).toFixed(2))
          : stats.yield
          ? Number((stats.yield * 100).toFixed(2))
          : undefined;

        // Se tínhamos Yahoo para preço mas faltavam indicadores, funde os dados
        if (yahooResult) {
          return {
            ...yahooResult,
            pl: yahooResult.pl ?? (pl ? Number(pl.toFixed(2)) : undefined),
            pvp: yahooResult.pvp ?? (pvp ? Number(pvp.toFixed(2)) : undefined),
            lpa: yahooResult.lpa ?? (lpa ? Number(lpa.toFixed(2)) : undefined),
            roe: yahooResult.roe ?? roe,
            profitMargins: yahooResult.profitMargins ?? profitMargins,
            evEbitda: yahooResult.evEbitda ?? evEbitda,
            dividendYield: yahooResult.dividendYield ?? dy,
          };
        }

        return {
          ticker: cleanTicker,
          name: item.longName || item.shortName || cleanTicker,
          price,
          changePercent: item.regularMarketChangePercent || 0,
          currency: item.currency || 'BRL',
          pl: pl ? Number(pl.toFixed(2)) : undefined,
          pvp: pvp ? Number(pvp.toFixed(2)) : undefined,
          lpa: lpa ? Number(lpa.toFixed(2)) : undefined,
          roe,
          profitMargins,
          evEbitda,
          dividendYield: dy,
          source: 'brapi',
        };
      }
    }
  } catch (err) {
    console.warn(`Brapi fetch failed for ${cleanTicker}:`, err);
  }

  // Se sobrou o resultado do Yahoo, retorna ele
  if (yahooResult) {
    return yahooResult;
  }

  return null;
}
