/** Deterministic API mocks for stable visual regression screenshots. */

const FRESHNESS = {
  companiesUpdatedAt: '2026-06-01T12:00:00Z',
  fundamentalsUpdatedAt: '2026-06-01T12:00:00Z',
  feedsLastPolledAt: '2026-06-01T11:00:00Z',
  pricesUpdatedAt: '2026-06-01T09:30:00Z',
  insidersUpdatedAt: '2026-06-01T08:00:00Z',
  latestArticlePublishedAt: '2026-06-01T10:00:00Z',
  latestArticleFetchedAt: '2026-06-01T10:05:00Z',
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
  jobs: { queued: 0, running: 0, failed: 0 },
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
    source: 'Example Finance',
    source_domain: 'example.com',
    published_at: '2026-06-01T09:00:00Z',
    summary: 'Major indices were little changed ahead of economic data.',
    category: 'finance',
    tickers: ['JPM'],
    sentiment_label: 'neutral',
  },
  {
    id: 2,
    title: 'JPMorgan expands consumer banking footprint',
    url: 'https://example.com/a2',
    source: 'Example Finance',
    source_domain: 'example.com',
    published_at: '2026-06-01T08:30:00Z',
    summary: 'The bank announced new branch openings in three states.',
    category: 'finance',
    tickers: ['JPM'],
    sentiment_label: 'positive',
  },
];

const SCREENER_ROWS = [
  { ticker: 'JPM', company: 'JPMorgan Chase', buy6m: 1250000, buy3m: 450000, buy1m: 120000, owners6m: 4 },
  { ticker: 'MCD', company: "McDonald's Corp", buy6m: 320000, buy3m: 80000, buy1m: 0, owners6m: 2 },
];

const DEFAULT_FEEDS = [
  { name: 'BBC Business', feed_url: 'https://example.com/bbc.xml', category: 'finance' },
  { name: 'CNBC', feed_url: 'https://example.com/cnbc.xml', category: 'finance' },
];

/**
 * @param {import('@playwright/test').Page} page
 */
async function mockStockTrackerApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/api/admin/status') return json(ADMIN_STATUS);
    if (path === '/api/admin/default-feeds') return json({ feeds: DEFAULT_FEEDS });
    if (path === '/api/macro/snapshot') return json({ items: MACRO_ITEMS, meta: { source: 'yfinance' } });
    if (path === '/api/news') {
      return json({ articles: NEWS_ARTICLES, total: NEWS_ARTICLES.length, limit: 50, offset: 0 });
    }
    if (path === '/api/insiders/buying-sums') return json({ rows: SCREENER_ROWS, meta: { source: 'sqlite' } });
    if (path === '/api/tickers/top') {
      return json({
        quotes: {
          JPM: { ticker: 'JPM', name: 'JPMorgan Chase', last: 198.42, tngoLast: 198.42 },
          MCD: { ticker: 'MCD', name: "McDonald's Corp", last: 258.11, tngoLast: 258.11 },
        },
      });
    }
    if (path === '/api/tickers/daily-change') {
      return json({
        changes: {
          JPM: { prevClose: 197.5, todayClose: 198.42 },
          MCD: { prevClose: 260.0, todayClose: 258.11 },
        },
      });
    }
    if (path === '/api/ticker/financials') {
      return json({
        metrics: {
          JPM: { marketCap: 5.7e11, sp: 2.1, ebitdaEv: 9.2, tbp: 1.4, bp: 1.1, ep: 11.2, cfop: 8.5, sfcfp: 6.1 },
          MCD: { marketCap: 1.9e11, sp: 4.8, ebitdaEv: 14.1, tbp: -2.1, bp: -4.2, ep: 22.5, cfop: 12.3, sfcfp: 9.8 },
        },
      });
    }
    if (path.startsWith('/api/search')) {
      return json([{ ticker: 'JPM', name: 'JPMorgan Chase' }, { ticker: 'MCD', name: "McDonald's Corp" }]);
    }

    return json({});
  });
}

module.exports = { mockStockTrackerApi, FRESHNESS };
