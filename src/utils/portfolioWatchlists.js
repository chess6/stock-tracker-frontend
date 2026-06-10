const STORAGE_KEY = 'stock-tracker-portfolio-watchlists';
const MAX_WATCHLISTS = 20;

function normalizeTickers(tickers) {
  return [...new Set(tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { watchlists: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.watchlists)) return { watchlists: [] };
    return {
      watchlists: parsed.watchlists.map((wl) => ({
        id: String(wl.id || ''),
        name: String(wl.name || 'Untitled').trim() || 'Untitled',
        tickers: normalizeTickers(wl.tickers || []),
        savedAt: wl.savedAt || null,
      })).filter((wl) => wl.id && wl.tickers.length > 0),
    };
  } catch {
    return { watchlists: [] };
  }
}

function writeStore(watchlists) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ watchlists }));
}

export function getPortfolioWatchlists() {
  return readStore().watchlists;
}

export function savePortfolioWatchlist(name, tickers) {
  const normalized = normalizeTickers(tickers);
  if (!normalized.length) {
    throw new Error('Add at least one ticker before saving a watchlist.');
  }
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Enter a name for this watchlist.');
  }

  const store = readStore();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    name: trimmedName,
    tickers: normalized,
    savedAt: new Date().toISOString(),
  };

  const next = [entry, ...store.watchlists.filter((wl) => wl.name.toLowerCase() !== trimmedName.toLowerCase())];
  writeStore(next.slice(0, MAX_WATCHLISTS));
  return entry;
}

export function deletePortfolioWatchlist(id) {
  const store = readStore();
  const next = store.watchlists.filter((wl) => wl.id !== id);
  writeStore(next);
  return next;
}

export function getPortfolioWatchlistTickers(id) {
  const match = readStore().watchlists.find((wl) => wl.id === id);
  return match ? [...match.tickers] : null;
}

/** @internal test helper */
export function resetPortfolioWatchlistsForTests() {
  localStorage.removeItem(STORAGE_KEY);
}
