/** Deterministic API mocks for stable Playwright screenshots. */

const path = require('path');
const fs = require('fs');

const METRIC_REGISTRY_FIXTURE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../src/config/__fixtures__/metric_registry.snapshot.json'),
    'utf8',
  ),
);

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

const ADMIN_PIPELINE_STATUS = {
  articles: { pending: 2, processing: 0, complete: 98, error: 0, duplicate: 5 },
  freshness: {
    ...FRESHNESS,
    fundamentalsSourceUpdatedAt: hoursAgo(30),
    pricesFetchedAt: hoursAgo(2),
    scoresComputedAt: hoursAgo(8),
    embeddingsUpdatedAt: hoursAgo(4),
    articlesFetchedAt: hoursAgo(1),
    articlesMaxEnrichmentVersion: 1,
  },
  stale: {
    fundamentalsTickers: 0,
    pricesTickers: 1,
    scoresNeedingRecompute: 0,
    staleAfterDays: { fundamentals: 14, prices: 3 },
  },
  versions: { scoring: 1 },
  lastJobRun: null,
  recentJobRuns: [],
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

function buildLargeTickerList(count) {
  return Array.from({ length: count }, (_, index) => `T${String(index).padStart(3, '0')}`);
}

function buildScreenerResult(ticker, index) {
  const sector = index % 2 === 0 ? 'Technology' : 'Financials';
  return {
    ticker,
    companyName: `Mock ${ticker}`,
    sector,
    scores: {
      altmanZ: 1.4 + (index % 5) * 0.25,
      piotroskiF: 4 + (index % 5),
      beneishM: -2.8 + (index % 3) * 0.1,
      survivability: 55 + (index % 20),
    },
    metrics: {
      de: 0.6 + (index % 10) * 0.04,
      grossMargin: 0.22 + (index % 8) * 0.01,
      currentRatio: 1.0 + (index % 6) * 0.05,
      roe: 0.08 + (index % 7) * 0.01,
    },
  };
}

function buildScreenerResults(tickers) {
  const results = {};
  tickers.forEach((ticker, index) => {
    results[ticker] = buildScreenerResult(ticker, index);
  });
  return results;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ portfolio?: string[], theme?: 'dark' | 'light' }} [options]
 */
async function mockStockTrackerApi(page, options = {}) {
  const state = {
    portfolio: normalizeTickers(options.portfolio ?? []),
    theme: options.theme === 'light' ? 'light' : 'dark',
    researchPinnedTickers: [],
    researchColorMode: 'deep_value',
    researchHeatLegend: true,
    featureFlags: {
      experimental_composite_rank: false,
      experimental_research_composite_rank: false,
      experimental_signal_ranking: false,
      embedding_heavy_retag: false,
    },
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
        if (Array.isArray(body.researchPinnedTickers)) {
          state.researchPinnedTickers = normalizeTickers(body.researchPinnedTickers);
        }
        if (body.researchColorMode) state.researchColorMode = body.researchColorMode;
        if (typeof body.researchHeatLegend === 'boolean') state.researchHeatLegend = body.researchHeatLegend;
      }
      return json({
        theme: state.theme,
        portfolio: state.portfolio,
        researchPinnedTickers: state.researchPinnedTickers,
        researchColorMode: state.researchColorMode,
        researchHeatLegend: state.researchHeatLegend,
      });
    }

    if (path === '/api/admin/status') return json(ADMIN_STATUS);
    if (path === '/api/admin/config') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() || {};
        Object.entries(body).forEach(([key, value]) => {
          if (key in state.featureFlags) state.featureFlags[key] = Boolean(value);
        });
        return json({ updated: Object.keys(body), flags: state.featureFlags });
      }
      return json({
        flags: state.featureFlags,
        defaults: state.featureFlags,
        stored: {},
      });
    }
    if (path === '/api/admin/pipeline-status') return json(ADMIN_PIPELINE_STATUS);
    if (path === '/api/admin/default-feeds') return json({ feeds: DEFAULT_FEEDS });
    if (path === '/api/admin/universes') {
      return json({ universes: [{ id: 'sp500', label: 'S&P 500', count: 503, updatedAt: '2026-06-09' }] });
    }
    if (path === '/api/admin/universes/sp500') {
      return json({ id: 'sp500', label: 'S&P 500', count: 3, tickers: ['AAPL', 'MSFT', 'NVDA'] });
    }
    if (path === '/api/admin/enqueue-universe-insiders') {
      return json({ universe: 'sp500', totalTickers: 503, chunks: 7, jobs: [{ jobId: 1, chunk: 1, tickers: 75 }] });
    }
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
    if (path === '/api/research/metrics/registry') {
      return json(METRIC_REGISTRY_FIXTURE);
    }
    if (path === '/api/research/screen' && route.request().method() === 'POST') {
      const body = route.request().postDataJSON() || {};
      const filters = Array.isArray(body.filters) ? body.filters : [];
      const mockRows = ['JPM', 'MCD'].map((ticker, index) => {
        const base = buildScreenerResult(ticker, index);
        const filterEvidence = filters.map((filter) => ({
          metric: filter.metric,
          op: filter.op,
          value: filter.value,
          actual: filter.metric === 'buy6m' ? 600000 : 0.5,
          passed: true,
        }));
        return {
          ...base,
          periodEnd: '2024-12-31',
          price: ticker === 'JPM' ? 198.42 : 258.11,
          derived: { fcf_yield: 0.09, gross_margin_trend: 0.02 },
          insider: { buy6m: 600000, buy3m: 200000, cluster_count: 2 },
          filterEvidence,
          filtersPassed: filterEvidence.length,
          filtersTotal: filterEvidence.length,
        };
      });
      return json({
        meta: {
          universe: body.universe || 'sp500',
          universeSize: 503,
          evaluated: 503,
          matched: mockRows.length,
          returned: mockRows.length,
          limit: body.limit || 100,
        },
        spec: body,
        results: mockRows,
      });
    }
    if (path === '/api/research/rank') {
      if (!state.featureFlags.experimental_research_composite_rank) {
        return json({
          error: 'Composite ranking is disabled',
          featureFlag: 'experimental_research_composite_rank',
        }, 403);
      }
      const tickers = parseTickersParam(url.searchParams.get('tickers'));
      const composite = url.searchParams.get('composite') || 'deep_value';
      const results = (tickers.length ? tickers : ['JPM', 'MCD']).map((ticker, index) => ({
        ticker,
        compositeScore: 0.82 - index * 0.07,
        rank: index + 1,
        factorsPresent: 3,
        factorsTotal: 5,
        factors: [
          { key: 'valuation_dislocation', weight: 0.25, normalized: 0.8, contribution: 0.2 },
          { key: 'survivability', weight: 0.2, normalized: 0.6, contribution: 0.12 },
          { key: 'insider_conviction', weight: 0.15, normalized: 0.5, contribution: 0.075 },
        ],
      }));
      return json({
        meta: { composite, returned: results.length },
        results,
      });
    }
    if (path.startsWith('/api/research/rank/history/')) {
      if (!state.featureFlags.experimental_research_composite_rank) {
        return json({
          error: 'Composite ranking is disabled',
          featureFlag: 'experimental_research_composite_rank',
        }, 403);
      }
      const ticker = path.split('/').pop()?.toUpperCase();
      return json({
        meta: { ticker, composite: url.searchParams.get('composite') || 'deep_value', returned: 2 },
        history: [
          { snapshot_date: '2026-06-01', composite_score: 0.61, rank_in_universe: 12 },
          { snapshot_date: '2026-06-08', composite_score: 0.68, rank_in_universe: 9 },
        ],
      });
    }
    if (path === '/api/research/screener') {
      const tickers = parseTickersParam(url.searchParams.get('tickers'));
      if (tickers.length) {
        return json({ results: buildScreenerResults(tickers) });
      }
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
  buildLargeTickerList,
  buildScreenerResults,
  FRESHNESS,
  RESEARCH_AAPL,
};
