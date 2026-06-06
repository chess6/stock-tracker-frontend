// Centralized API endpoints for the stock tracker app
const API_BASE = '/api';

export const API_ENDPOINTS = {
  SEARCH: `${API_BASE}/search`,
  PORTFOLIO: `${API_BASE}/portfolio`,
  SUMMARY: ticker => `${API_BASE}/ticker/${ticker}/summary`,
  NEWS: ticker => `${API_BASE}/ticker/${ticker}/news`,
  FINANCIALS: `${API_BASE}/ticker/financials`,
  INTRADAY: ticker => `${API_BASE}/ticker/${ticker}/intraday`,
  TOP_OF_BOOK: `${API_BASE}/tickers/top`,
  DAILY_CHANGE: `${API_BASE}/tickers/daily-change`,
  INSIDER_BUYING_SUMS: `${API_BASE}/insiders/buying-sums`,
  SF2: ticker => `${API_BASE}/ticker/${ticker}/sf2`,
  ADMIN_STATUS: `${API_BASE}/admin/status`,
  ADMIN_DEFAULT_FEEDS: `${API_BASE}/admin/default-feeds`,
  ADMIN_SYNC_COMPANIES: `${API_BASE}/admin/sync-companies`,
  ADMIN_REFRESH_FUNDAMENTALS: `${API_BASE}/admin/refresh-fundamentals`,
  ADMIN_INGEST_DEFAULT_FEEDS: `${API_BASE}/admin/ingest-default-feeds`,
  ADMIN_REFRESH_PRICES: `${API_BASE}/admin/refresh-prices`,
  ADMIN_REFRESH_INSIDERS: `${API_BASE}/admin/refresh-insiders`,
  ADMIN_ENQUEUE_JOB: `${API_BASE}/admin/enqueue-job`,
  ADMIN_BOOTSTRAP: `${API_BASE}/admin/bootstrap`,
};

export default API_ENDPOINTS;
