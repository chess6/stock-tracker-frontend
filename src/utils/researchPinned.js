import API_ENDPOINTS from '../apiConfig';

export const RESEARCH_PINNED_STORAGE_KEY = 'research-pinned-tickers';
export const MAX_PINNED_TICKERS = 24;

function normalizeTicker(ticker) {
  return String(ticker || '').trim().toUpperCase();
}

function readStore() {
  try {
    const raw = localStorage.getItem(RESEARCH_PINNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTicker).filter(Boolean);
  } catch {
    return [];
  }
}

function dedupeTickers(tickers) {
  const deduped = [];
  const seen = new Set();
  tickers.forEach((ticker) => {
    const normalized = normalizeTicker(ticker);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(normalized);
  });
  return deduped.slice(0, MAX_PINNED_TICKERS);
}

function writeStore(tickers) {
  const deduped = dedupeTickers(tickers);
  localStorage.setItem(RESEARCH_PINNED_STORAGE_KEY, JSON.stringify(deduped));
  persistPinnedTickersToApi(deduped);
  return deduped;
}

export function persistPinnedTickersToApi(tickers) {
  try {
    const request = fetch(API_ENDPOINTS.PREFERENCES, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ researchPinnedTickers: dedupeTickers(tickers) }),
    });
    if (request?.catch) {
      request.catch(() => {});
    }
  } catch {
    // Offline or test env — localStorage remains fallback.
  }
}

export async function hydratePinnedTickersFromApi(shouldApply = () => true) {
  try {
    const res = await fetch(API_ENDPOINTS.PREFERENCES);
    if (!res.ok) throw new Error('preferences fetch failed');
    const data = await res.json();
    const tickers = dedupeTickers(data.researchPinnedTickers || []);
    if (!shouldApply()) return loadPinnedTickers();
    localStorage.setItem(RESEARCH_PINNED_STORAGE_KEY, JSON.stringify(tickers));
    return tickers;
  } catch {
    return loadPinnedTickers();
  }
}

export function loadPinnedTickers() {
  return readStore();
}

export function isPinnedTicker(ticker, pinned = readStore()) {
  const normalized = normalizeTicker(ticker);
  return normalized ? pinned.includes(normalized) : false;
}

export function pinTicker(ticker, pinned = readStore()) {
  const normalized = normalizeTicker(ticker);
  if (!normalized) return pinned;
  if (pinned.includes(normalized)) return pinned;
  return writeStore([normalized, ...pinned]);
}

export function unpinTicker(ticker, pinned = readStore()) {
  const normalized = normalizeTicker(ticker);
  if (!normalized) return pinned;
  return writeStore(pinned.filter((item) => item !== normalized));
}

export function togglePinnedTicker(ticker, pinned = readStore()) {
  return isPinnedTicker(ticker, pinned)
    ? unpinTicker(ticker, pinned)
    : pinTicker(ticker, pinned);
}
