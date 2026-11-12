import API_ENDPOINTS from '../apiConfig';

export const PORTFOLIO_UPDATED_EVENT = 'portfolio-updated';
/** Fired with `detail.message` when a portfolio save is rejected or fails. */
export const PORTFOLIO_SAVE_FAILED_EVENT = 'portfolio-save-failed';

const LEGACY_PORTFOLIO_KEY = 'portfolio';
const LEGACY_THEME_KEY = 'stock-tracker-theme';

const NOT_LOADED_MESSAGE = 'Your portfolio has not loaded from the server yet, so nothing was changed. Try again in a moment.';

let portfolioCache = [];
let loadPromise = null;
// 'idle' | 'loading' | 'loaded' | 'error'. Writes are only allowed once 'loaded':
// saving while the server copy is unknown would replace it with a partial list.
let loadState = 'idle';

function normalizeTickers(tickers) {
  return [...new Set(tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
}

function readLegacyPortfolio() {
  try {
    const raw = localStorage.getItem(LEGACY_PORTFOLIO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeTickers(
      parsed
        .map((item) => (typeof item === 'string' ? item : item?.ticker))
        .filter((item) => typeof item === 'string'),
    );
  } catch {
    return [];
  }
}

/** Drop browser-only keys once the server copy is authoritative. */
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
    const error = new Error(res.status === 401 ? 'Sign in to change your portfolio.' : 'Failed to save your portfolio.');
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  applyPreferencesPayload(data);
  return data;
}

export function getPortfolio() {
  return [...portfolioCache];
}

export function isPortfolioLoaded() {
  return loadState === 'loaded';
}

function applyPreferencesPayload(data) {
  portfolioCache = normalizeTickers(data.portfolio || []);
  notifyPortfolioUpdated();
}

export function notifyPortfolioUpdated() {
  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT));
}

function notifySaveFailed(message) {
  window.dispatchEvent(new CustomEvent(PORTFOLIO_SAVE_FAILED_EVENT, { detail: { message } }));
}

/**
 * Replace the portfolio. Optimistic: the cache updates immediately and rolls back
 * (with a PORTFOLIO_SAVE_FAILED_EVENT) if the server rejects the save.
 * Returns false without changing anything while the server copy is not loaded.
 */
export function setPortfolioTickers(tickers) {
  if (loadState !== 'loaded') {
    notifySaveFailed(NOT_LOADED_MESSAGE);
    loadUserPreferences();
    return false;
  }
  const previous = portfolioCache;
  const normalized = normalizeTickers(tickers);
  portfolioCache = normalized;
  notifyPortfolioUpdated();
  savePreferences({ portfolio: normalized }).catch((error) => {
    portfolioCache = previous;
    notifyPortfolioUpdated();
    notifySaveFailed(error.message);
  });
  return true;
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
  if (loadState !== 'loaded') {
    loadUserPreferences();
    return { type: 'warning', message: NOT_LOADED_MESSAGE };
  }
  setPortfolioTickers([...portfolioCache, symbol]);
  return { type: 'success', message: `${symbol} added to portfolio.` };
}

async function migrateLegacyPortfolio(serverTickers) {
  const legacy = readLegacyPortfolio();
  if (!legacy.length) {
    clearLegacyStorage();
    return null;
  }
  if (serverTickers.length) {
    // The server already has a portfolio; it wins.
    clearLegacyStorage();
    return null;
  }
  try {
    const data = await savePreferences({ portfolio: legacy });
    clearLegacyStorage();
    return data;
  } catch {
    // Keep the legacy key so the next load can retry (e.g. after signing in).
    return null;
  }
}

export async function loadUserPreferences() {
  if (loadPromise) {
    return loadPromise;
  }

  loadState = 'loading';
  loadPromise = (async () => {
    try {
      const res = await fetch(API_ENDPOINTS.PREFERENCES);
      if (!res.ok) {
        throw new Error('Failed to load preferences');
      }
      const data = await res.json();
      applyPreferencesPayload(data);
      loadState = 'loaded';
      const migrated = await migrateLegacyPortfolio(normalizeTickers(data.portfolio || []));
      return migrated || data;
    } catch {
      // Don't cache the failure: the next caller retries. Writes stay blocked until then,
      // and legacy browser data is kept rather than deleted.
      loadState = 'error';
      loadPromise = null;
      return { theme: 'dark', portfolio: [] };
    }
  })();

  return loadPromise;
}

/** @internal test helper */
export function resetPortfolioStateForTests() {
  portfolioCache = [];
  loadPromise = null;
  loadState = 'idle';
}
