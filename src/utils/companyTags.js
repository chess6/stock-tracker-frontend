export const COMPANY_TAGS_STORAGE_KEY = 'portfolio-company-tags';
export const ALL_TAGS_FILTER = 'all';
export const MAX_TAGS_PER_TICKER = 12;
export const MAX_TAG_LENGTH = 40;

function normalizeTicker(ticker) {
  return String(ticker || '').trim().toUpperCase();
}

export function normalizeTagLabel(tag) {
  const trimmed = String(tag || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.slice(0, MAX_TAG_LENGTH);
}

function tagKey(tag) {
  return normalizeTagLabel(tag).toLowerCase();
}

function dedupeTags(tags) {
  const seen = new Set();
  const out = [];
  tags.forEach((tag) => {
    const label = normalizeTagLabel(tag);
    const key = tagKey(label);
    if (!label || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return out.slice(0, MAX_TAGS_PER_TICKER);
}

function sanitizeTickerTags(map) {
  if (!map || typeof map !== 'object') return {};
  const out = {};
  Object.entries(map).forEach(([ticker, tags]) => {
    const normalizedTicker = normalizeTicker(ticker);
    if (!normalizedTicker) return;
    const normalizedTags = dedupeTags(Array.isArray(tags) ? tags : []);
    if (normalizedTags.length) {
      out[normalizedTicker] = normalizedTags;
    }
  });
  return out;
}

function readStore() {
  try {
    const raw = localStorage.getItem(COMPANY_TAGS_STORAGE_KEY);
    if (!raw) {
      return { tickerTags: {}, activeFilter: ALL_TAGS_FILTER };
    }
    const parsed = JSON.parse(raw);
    return {
      tickerTags: sanitizeTickerTags(parsed?.tickerTags),
      activeFilter: parsed?.activeFilter || ALL_TAGS_FILTER,
    };
  } catch {
    return { tickerTags: {}, activeFilter: ALL_TAGS_FILTER };
  }
}

function writeStore(store) {
  localStorage.setItem(
    COMPANY_TAGS_STORAGE_KEY,
    JSON.stringify({
      tickerTags: store.tickerTags,
      activeFilter: store.activeFilter || ALL_TAGS_FILTER,
    }),
  );
}

export function getCompanyTagsMap() {
  return readStore().tickerTags;
}

export function getActiveTagFilter() {
  const store = readStore();
  const filter = store.activeFilter || ALL_TAGS_FILTER;
  if (filter === ALL_TAGS_FILTER) return filter;
  const tags = getAllUniqueTags(store.tickerTags);
  if (tags.some((tag) => tagKey(tag) === tagKey(filter))) {
    return filter;
  }
  return ALL_TAGS_FILTER;
}

export function setActiveTagFilter(filter) {
  const store = readStore();
  if (!filter || filter === ALL_TAGS_FILTER) {
    store.activeFilter = ALL_TAGS_FILTER;
  } else {
    const label = normalizeTagLabel(filter);
    store.activeFilter = label || ALL_TAGS_FILTER;
  }
  writeStore(store);
  return store.activeFilter;
}

export function getAllUniqueTags(tickerTags = getCompanyTagsMap()) {
  const seen = new Map();
  Object.values(tickerTags).forEach((tags) => {
    tags.forEach((tag) => {
      const key = tagKey(tag);
      if (!seen.has(key)) seen.set(key, tag);
    });
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function getTagsForTicker(ticker) {
  const map = getCompanyTagsMap();
  return [...(map[normalizeTicker(ticker)] || [])];
}

export function addTagToTicker(ticker, tag) {
  const normalizedTicker = normalizeTicker(ticker);
  const label = normalizeTagLabel(tag);
  if (!normalizedTicker || !label) {
    throw new Error('Ticker and tag are required.');
  }

  const store = readStore();
  const existing = store.tickerTags[normalizedTicker] || [];
  const next = dedupeTags([...existing, label]);
  if (next.length === existing.length) {
    return next;
  }
  if (next.length > MAX_TAGS_PER_TICKER) {
    throw new Error(`Maximum ${MAX_TAGS_PER_TICKER} tags per ticker.`);
  }

  store.tickerTags[normalizedTicker] = next;
  writeStore(store);
  return next;
}

export function removeTagFromTicker(ticker, tag) {
  const normalizedTicker = normalizeTicker(ticker);
  const key = tagKey(tag);
  const store = readStore();
  const existing = store.tickerTags[normalizedTicker];
  if (!existing) return [];

  const next = existing.filter((item) => tagKey(item) !== key);
  if (next.length) {
    store.tickerTags[normalizedTicker] = next;
  } else {
    delete store.tickerTags[normalizedTicker];
  }
  writeStore(store);
  return next;
}

export function filterRowsByTag(rows, tagFilter, tickerTags = getCompanyTagsMap()) {
  if (!Array.isArray(rows)) return [];
  if (!tagFilter || tagFilter === ALL_TAGS_FILTER) return rows;

  const filterKey = tagKey(tagFilter);
  return rows.filter((row) => {
    const ticker = normalizeTicker(row?.ticker);
    const tags = tickerTags[ticker] || [];
    return tags.some((tag) => tagKey(tag) === filterKey);
  });
}

/** @internal test helper */
export function resetCompanyTagsForTests() {
  localStorage.removeItem(COMPANY_TAGS_STORAGE_KEY);
}
