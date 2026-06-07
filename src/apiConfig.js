// Centralized API endpoints — all reads are SQLite-backed after admin bootstrap.
// Data sources: SEC EDGAR (fundamentals, insiders), Stooq/yfinance (prices), RSS (news).
// NASDAQ_API_KEY on the backend is optional fallback only when cache is empty.
const API_BASE = '/api';

export const API_ENDPOINTS = {
  SEARCH: `${API_BASE}/search`,
  PREFERENCES: `${API_BASE}/preferences`,
  SUMMARY: ticker => `${API_BASE}/ticker/${ticker}/summary`,
  NEWS: ticker => `${API_BASE}/ticker/${ticker}/news`,
  NEWS_FEED: `${API_BASE}/news`,
  MACRO_SNAPSHOT: `${API_BASE}/macro/snapshot`,
  FINANCIALS: `${API_BASE}/ticker/financials`,
  INTRADAY: ticker => `${API_BASE}/ticker/${ticker}/intraday`,
  TOP_OF_BOOK: `${API_BASE}/tickers/top`,
  DAILY_CHANGE: `${API_BASE}/tickers/daily-change`,
  MARKET_STATS: `${API_BASE}/tickers/market-stats`,
  MOVERS: `${API_BASE}/tickers/movers`,
  INDUSTRIES: `${API_BASE}/companies/industries`,
  INDUSTRY_PEERS: `${API_BASE}/companies/peers`,
  WATCHLISTS: `${API_BASE}/watchlists`,
  WATCHLIST: name => `${API_BASE}/watchlists/${encodeURIComponent(name)}`,
  WATCHLIST_TICKERS: name => `${API_BASE}/watchlists/${encodeURIComponent(name)}/tickers`,
  WATCHLIST_TICKER: (name, ticker) => `${API_BASE}/watchlists/${encodeURIComponent(name)}/tickers/${encodeURIComponent(ticker)}`,
  INSIDER_BUYING_SUMS: `${API_BASE}/insiders/buying-sums`,
  /** SEC Form 4 insider transactions (SQLite; response keeps SF2-compatible datatable shape). */
  INSIDER_TRANSACTIONS: ticker => `${API_BASE}/ticker/${ticker}/sf2`,
  // legacy: SHARADAR-era client name — same URL as INSIDER_TRANSACTIONS
  // SF2: ticker => `${API_BASE}/ticker/${ticker}/sf2`,
  ADMIN_STATUS: `${API_BASE}/admin/status`,
  ADMIN_DEFAULT_FEEDS: `${API_BASE}/admin/default-feeds`,
  ADMIN_SYNC_COMPANIES: `${API_BASE}/admin/sync-companies`,
  ADMIN_REFRESH_FUNDAMENTALS: `${API_BASE}/admin/refresh-fundamentals`,
  ADMIN_INGEST_DEFAULT_FEEDS: `${API_BASE}/admin/ingest-default-feeds`,
  ADMIN_REFRESH_PRICES: `${API_BASE}/admin/refresh-prices`,
  ADMIN_REFRESH_INSIDERS: `${API_BASE}/admin/refresh-insiders`,
  ADMIN_ENQUEUE_JOB: `${API_BASE}/admin/enqueue-job`,
  ADMIN_DEDUP_ARTICLES: `${API_BASE}/admin/dedup-articles`,
  ADMIN_BOOTSTRAP: `${API_BASE}/admin/bootstrap`,
  ADMIN_REFRESH_MACRO: `${API_BASE}/admin/refresh-macro`,
  ADMIN_ENRICH_METADATA: `${API_BASE}/admin/enrich-metadata`,
};

export default API_ENDPOINTS;
