import { commitResearchScroll } from './researchScrollState';

export const RESEARCH_SCREENER_TICKERS_KEY = 'research-screener-tickers';

export function readScreenerTickersContext() {
  try {
    return sessionStorage.getItem(RESEARCH_SCREENER_TICKERS_KEY) || '';
  } catch {
    return '';
  }
}

export function saveScreenerContextBeforeLeave(tickersText = '') {
  commitResearchScroll('research-screener');
  if (!tickersText) return;
  try {
    sessionStorage.setItem(RESEARCH_SCREENER_TICKERS_KEY, tickersText);
  } catch {
    // ignore quota / private mode
  }
}

export function saveScreenerScrollBeforeLeave() {
  saveScreenerContextBeforeLeave();
}

export function saveScreenScrollBeforeLeave() {
  commitResearchScroll('research-screen');
}

export function buildResearchTickerPath(ticker, dimension = 'MRY') {
  const symbol = String(ticker || '').trim().toUpperCase();
  const dim = dimension || 'MRY';
  return `/research/${encodeURIComponent(symbol)}?dim=${encodeURIComponent(dim)}`;
}
