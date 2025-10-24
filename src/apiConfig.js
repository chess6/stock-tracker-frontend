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
};

export default API_ENDPOINTS;
