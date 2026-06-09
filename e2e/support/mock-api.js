/** Deterministic API mocks for stable Playwright screenshots. */

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const FRESHNESS = {
  companiesUpdatedAt: hoursAgo(2),
  fundamentalsUpdatedAt: hoursAgo(3),
  feedsLastPolledAt: hoursAgo(1),
  pricesUpdatedAt: hoursAgo(2),
  insidersUpdatedAt: hoursAgo(4),
  companyScoresUpdatedAt: hoursAgo(3),
  insiderClustersUpdatedAt: hoursAgo(4),
  latestArticlePublishedAt: hoursAgo(1),
  latestArticleFetchedAt: hoursAgo(1),
};

const ADMIN_STATUS = {
  counts: {
    companies: 10234,
    feeds: 18,
    articles: 105,
    fundamentals: 2400,
    prices: 50000,
    insider_transactions: 120,
  },
  freshness: FRESHNESS,
  coverage: {
    companiesMissingMetadata: 0,
    articlesWithMarketReactions: 20,
    linkedArticles: 20,
  },
  jobs: { queued: 0, running: 0, failed: 0 },
  feeds: [],
  recentJobRuns: [],
};

const MACRO_ITEMS = [
  { symbol: 'SPY', label: 'S&P 500', group: 'indices', price: 528.4, changePct: 0.42 },
  { symbol: 'QQQ', label: 'Nasdaq 100', group: 'indices', price: 451.2, changePct: -0.18 },
  { symbol: 'GLD', label: 'Gold', group: 'commodities', price: 218.5, changePct: 0.31 },
  { symbol: 'USO', label: 'Oil', group: 'commodities', price: 72.1, changePct: -0.55 },
  { symbol: 'TLT', label: '20Y Treasuries', group: 'rates', price: 91.3, changePct: 0.12 },
  { symbol: 'XLK', label: 'Technology', group: 'industries', price: 198.7, changePct: 0.67 },
];

const NEWS_ARTICLES = [
  {
    id: 1,
    title: 'Markets steady as earnings season continues',
    url: 'https://example.com/a1',
    sourceDomain: 'example.com',
    publishedDate: hoursAgo(2),
    description: 'Major indices were little changed ahead of economic data.',
    tickers: ['JPM'],
    sentimentLabel: 'neutral',
  },
  {
    id: 2,
    title: 'JPMorgan expands consumer banking footprint',
    url: 'https://example.com/a2',
    sourceDomain: 'example.com',
    publishedDate: hoursAgo(3),
    description: 'The bank announced new branch openings in three states.',
    tickers: ['JPM'],
    sentimentLabel: 'positive',
  },
];

const INSIDER_ROWS = [
  { ticker: 'JPM', company: 'JPMorgan Chase', buy6m: 1250000, buy3m: 450000, buy1m: 120000, owners6m: 4 },
  { ticker: 'MCD', company: "McDonald's Corp", buy6m: 320000, buy3m: 80000, buy1m: 0, owners6m: 2 },
];

const DEFAULT_FEEDS = [
  { name: 'BBC Business', feed_url: 'https://example.com/bbc.xml', category: 'finance' },
  { name: 'CNBC', feed_url: 'https://example.com/cnbc.xml', category: 'finance' },
];

const PORTFOLIO_METRICS = {
  JPM: { marketCap: 5.7e11, sp: 2.1, ebitdaEv: 9.2, tbp: 1.4, bp: 1.1, ep: 11.2, cfop: 8.5, sfcfp: 6.1 },
  MCD: { marketCap: 1.9e11, sp: 4.8, ebitdaEv: 14.1, tbp: -2.1, bp: -4.2, ep: 22.5, cfop: 12.3, sfcfp: 9.8 },
};

const TOP_QUOTES = {
  JPM: { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', industry: 'Banks', last: 198.42, tngoLast: 198.42 },
  MCD: { ticker: 'MCD', name: "McDonald's Corp", sector: 'Consumer Cyclical', industry: 'Restaurants', last: 258.11, tngoLast: 258.11 },
};

const RESEARCH_AAPL = {
  ticker: 'AAPL',
  company: { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  dimension: 'MRY',
  periods: [
    {
      periodEnd: '2024-09-28',
      dimension: 'MRY',
      periodType: 'FY',
      fundamentals: { revenue: 391035000000, netinc: 93736000000, assets: 364980000000, liabilities: 308030000000 },
      metrics: { de: 1.87, currentRatio: 0.87, grossMargin: 0.46, netMargin: 0.24, roe: 1.47 },
    },
    {
      periodEnd: '2023-09-30',
      dimension: 'MRY',
      periodType: 'FY',
      fundamentals: { revenue: 383285000000, netinc: 96995000000, assets: 352583000000, liabilities: 290437000000 },
      metrics: { de: 1.79, currentRatio: 0.99, grossMargin: 0.44, netMargin: 0.25, roe: 1.56 },
    },
    {
      periodEnd: '2022-09-24',
      dimension: 'MRY',
      periodType: 'FY',
      fundamentals: { revenue: 394328000000, netinc: 99803000000, assets: 352755000000, liabilities: 302083000000 },
      metrics: { de: 2.37, currentRatio: 0.88, grossMargin: 0.43, netMargin: 0.25, roe: 1.97 },
    },
  ],
  scoreHistory: [
    { periodEnd: '2024-09-28', altmanZ: 4.2, piotroski: 7, beneishM: -2.4 },
    { periodEnd: '2023-09-30', altmanZ: 4.0, piotroski: 8, beneishM: -2.1 },
  ],
  insiders: [],
  insiderAnalysis: { ticker: 'AAPL', companyName: 'Apple Inc.', summary: { buyCount: 2, sellCount: 1 } },
  price: {
    latest: 190.42,
    stats: { change1w: 1.1, change4w: 2.8, change6m: 8.4, pctTo52wHi: -4.2, pctFrom52wLo: 18.5 },
    history: [
      { date: '2026-05-28', close: 186.2 },
      { date: '2026-05-29', close: 187.4 },
      { date: '2026-05-30', close: 188.1 },
      { date: '2026-06-01', close: 190.42 },
    ],
  },
};

function normalizeTickers(tickers) {
  return [...new Set((tickers || []).map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
}

function parseTickersParam(raw) {
  if (!raw) return [];
  return normalizeTickers(raw.split(','));
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ portfolio?: string[], theme?: 'dark' | 'light' }} [options]
 */
async function mockStockTrackerApi(page, options = {}) {
  const state = {
    portfolio: normalizeTickers(options.portfolio ?? []),
    theme: options.theme === 'light' ? 'light' : 'dark',
  };

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/api/preferences') {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() || {};
        if (Array.isArray(body.portfolio)) state.portfolio = normalizeTickers(body.portfolio);
        if (body.theme === 'light' || body.theme === 'dark') state.theme = body.theme;
      }
      return json({ theme: state.theme, portfolio: state.portfolio });
    }

    if (path === '/api/admin/status') return json(ADMIN_STATUS);
    if (path === '/api/admin/default-feeds') return json({ feeds: DEFAULT_FEEDS });
    if (path === '/api/macro/snapshot') return json({ items: MACRO_ITEMS, meta: { source: 'yfinance' } });
    if (path === '/api/news') {
      return json({ articles: NEWS_ARTICLES, total: NEWS_ARTICLES.length, limit: 50, offset: 0 });
    }
    if (path === '/api/insiders/buying-sums') {
      const tickers = parseTickersParam(url.searchParams.get('tickers'));
      const rows = tickers.length
        ? INSIDER_ROWS.filter((row) => tickers.includes(row.ticker))
        : INSIDER_ROWS;
      return json({ rows, meta: { source: 'sqlite' } });
    }
    if (path === '/api/tickers/top') {
      const tickers = parseTickersParam(url.searchParams.get('tickers'));
      const quotes = {};
      tickers.forEach((ticker) => {
        if (TOP_QUOTES[ticker]) quotes[ticker] = TOP_QUOTES[ticker];
      });
      if (!tickers.length) Object.assign(quotes, TOP_QUOTES);
      return json({ quotes });
    }
    if (path === '/api/tickers/daily-change') {
      const tickers = parseTickersParam(url.searchParams.get('tickers'));
      const changes = {};
      tickers.forEach((ticker) => {
        if (ticker === 'JPM') changes.JPM = { prevClose: 197.5, todayClose: 198.42 };
        if (ticker === 'MCD') changes.MCD = { prevClose: 260.0, todayClose: 258.11 };
      });
      if (!tickers.length) {
        changes.JPM = { prevClose: 197.5, todayClose: 198.42 };
        changes.MCD = { prevClose: 260.0, todayClose: 258.11 };
      }
      return json({ changes });
    }
    if (path === '/api/tickers/market-stats') {
      const tickers = parseTickersParam(url.searchParams.get('tickers'));
      const stats = {};
      tickers.forEach((ticker) => {
        stats[ticker] = {
          change1w: 1.2,
          change4w: 3.4,
          change6m: 5.6,
          pctTo52wHi: -8.2,
          pctFrom52wLo: 12.1,
        };
      });
      return json({ stats });
    }
    if (path === '/api/ticker/financials') {
      const tickers = parseTickersParam(url.searchParams.get('ticker'));
      const metrics = {};
      tickers.forEach((ticker) => {
        if (PORTFOLIO_METRICS[ticker]) metrics[ticker] = PORTFOLIO_METRICS[ticker];
      });
      if (!tickers.length) Object.assign(metrics, PORTFOLIO_METRICS);
      return json({ metrics });
    }
    if (path.startsWith('/api/search')) {
      return json([{ ticker: 'JPM', name: 'JPMorgan Chase' }, { ticker: 'MCD', name: "McDonald's Corp" }]);
    }
    if (path === '/api/research/screener') {
      return json({
        results: {
          JPM: { ticker: 'JPM', companyName: 'JPMorgan Chase', sector: 'Financials', scores: { altmanZ: 1.2 } },
          MCD: { ticker: 'MCD', companyName: "McDonald's Corp", sector: 'Consumer Cyclical', scores: { altmanZ: 2.8 } },
        },
      });
    }
    if (path.startsWith('/api/research/ticker/')) {
      const symbol = path.split('/').pop()?.toUpperCase();
      if (symbol === 'AAPL') return json(RESEARCH_AAPL);
      return json({ ticker: symbol, periods: [], scoreHistory: [] });
    }
    if (path.startsWith('/api/research/narrative/')) {
      return json({ summary: 'Stable mock narrative for visual regression.', meta: { source: 'mock' } });
    }

    return json({});
  });
}

module.exports = {
  mockStockTrackerApi,
  FRESHNESS,
  RESEARCH_AAPL,
};
