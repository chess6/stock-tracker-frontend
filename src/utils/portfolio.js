import API_ENDPOINTS from '../apiConfig';

export const PORTFOLIO_UPDATED_EVENT = 'portfolio-updated';

const LEGACY_PORTFOLIO_KEY = 'portfolio';
const LEGACY_THEME_KEY = 'stock-tracker-theme';

let portfolioCache = [];
let loadPromise = null;

function normalizeTickers(tickers) {
  return [...new Set(tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
}

/** Drop stale browser-only keys so portfolio always follows /api/preferences. */
function clearLegacyStorage() {
  try {
    localStorage.removeItem(LEGACY_PORTFOLIO_KEY);
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* ignore */
  }
}

async function savePreferences(body) {
  const res = await fetch(API_ENDPOINTS.PREFERENCES, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Failed to save preferences');
  }
  const data = await res.json();
  applyPreferencesPayload(data);
  return data;
}

export function getPortfolio() {
  return [...portfolioCache];
}

function applyPreferencesPayload(data) {
  portfolioCache = normalizeTickers(data.portfolio || []);
  notifyPortfolioUpdated();
}

export function notifyPortfolioUpdated() {
  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT));
}

export function setPortfolioTickers(tickers) {
  const normalized = normalizeTickers(tickers);
  portfolioCache = normalized;
  notifyPortfolioUpdated();
  savePreferences({ portfolio: normalized }).catch(() => {});
}

export function getPortfolioTickersCsv() {
  return portfolioCache.join(',');
}

export function isInPortfolio(ticker) {
  const symbol = String(ticker).trim().toUpperCase();
  return portfolioCache.includes(symbol);
}

export function addToPortfolioWithNotification(ticker) {
  const symbol = String(ticker).trim().toUpperCase();
  if (portfolioCache.includes(symbol)) {
    return { type: 'info', message: `${symbol} is already in your portfolio.` };
  }
  setPortfolioTickers([...portfolioCache, symbol]);
  return { type: 'success', message: `${symbol} added to portfolio.` };
}

export async function loadUserPreferences() {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const res = await fetch(API_ENDPOINTS.PREFERENCES);
      if (!res.ok) {
        throw new Error('Failed to load preferences');
      }
      const data = await res.json();
      applyPreferencesPayload(data);
      clearLegacyStorage();
      return data;
    } catch {
      portfolioCache = [];
      notifyPortfolioUpdated();
      clearLegacyStorage();
      return { theme: 'dark', portfolio: [] };
    }
  })();

  return loadPromise;
}

/** @internal test helper */
export function resetPortfolioStateForTests() {
  portfolioCache = [];
  loadPromise = null;
}
