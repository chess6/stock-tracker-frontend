export const PORTFOLIO_GROUP_BY_STORAGE_KEY = 'portfolio-group-by';
export const PORTFOLIO_GROUP_COLLAPSED_STORAGE_KEY = 'portfolio-group-collapsed';

export const DEFAULT_PORTFOLIO_GROUP_BY = 'none';

export const PORTFOLIO_GROUP_BY_OPTIONS = [
  { id: 'none', label: 'No grouping' },
  { id: 'sector', label: 'Sector' },
  { id: 'industry', label: 'Industry' },
  { id: 'market_cap', label: 'Market cap' },
  { id: 'insider_activity', label: 'Insider activity' },
];

const GROUP_BY_IDS = new Set(PORTFOLIO_GROUP_BY_OPTIONS.map((option) => option.id));

const MARKET_CAP_BUCKETS = [
  { id: 'mega', label: 'Mega cap (≥ $200B)', min: 200_000_000_000 },
  { id: 'large', label: 'Large cap ($10B–$200B)', min: 10_000_000_000 },
  { id: 'mid', label: 'Mid cap ($2B–$10B)', min: 2_000_000_000 },
  { id: 'small', label: 'Small cap ($300M–$2B)', min: 300_000_000 },
  { id: 'micro', label: 'Micro cap (< $300M)', min: 0 },
];

const INSIDER_ACTIVITY_BUCKETS = [
  { id: 'heavy', label: 'Heavy insider buying (≥ $1M)', min: 1_000_000 },
  { id: 'moderate', label: 'Moderate insider buying ($1K–$999K)', min: 1_000 },
  { id: 'light', label: 'Light insider buying (< $1K)', min: 0.01 },
  { id: 'none', label: 'No insider buying', min: null },
];

export function marketCapBucket(marketCap) {
  if (marketCap == null || Number.isNaN(Number(marketCap))) {
    return { id: 'unknown', label: 'Unknown market cap' };
  }
  const value = Number(marketCap);
  for (const bucket of MARKET_CAP_BUCKETS) {
    if (value >= bucket.min) {
      return { id: bucket.id, label: bucket.label };
    }
  }
  return { id: 'micro', label: MARKET_CAP_BUCKETS[MARKET_CAP_BUCKETS.length - 1].label };
}

export function insiderActivityBucket(insiderBuy6m) {
  if (insiderBuy6m == null || Number.isNaN(Number(insiderBuy6m))) {
    return { id: 'unknown', label: 'Unknown insider activity' };
  }
  const value = Number(insiderBuy6m);
  for (const bucket of INSIDER_ACTIVITY_BUCKETS) {
    if (bucket.min == null) {
      if (value <= 0) return { id: bucket.id, label: bucket.label };
      continue;
    }
    if (value >= bucket.min) {
      return { id: bucket.id, label: bucket.label };
    }
  }
  return { id: 'none', label: 'No insider buying' };
}

export function resolvePortfolioGroupKey(row, groupBy) {
  switch (groupBy) {
    case 'sector':
      return row.sector?.trim() || 'Unknown sector';
    case 'industry':
      return row.industry?.trim() || 'Unknown industry';
    case 'market_cap':
      return marketCapBucket(row.marketCap).label;
    case 'insider_activity':
      return insiderActivityBucket(row.insiderBuy6m).label;
    default:
      return 'All';
  }
}

export function comparePortfolioRows(a, b, sortId, desc = false) {
  const av = sortId === 'ticker' ? a.ticker : a[sortId];
  const bv = sortId === 'ticker' ? b.ticker : b[sortId];

  if (av == null && bv == null) {
    return String(a.ticker).localeCompare(String(b.ticker));
  }
  if (av == null) return 1;
  if (bv == null) return -1;

  let cmp;
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv;
  } else {
    cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
  }
  if (cmp === 0) {
    cmp = String(a.ticker).localeCompare(String(b.ticker));
  }
  return desc ? -cmp : cmp;
}

export function sortPortfolioRows(rows, sorting = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!sorting?.length) return [...rows];
  const [{ id, desc }] = sorting;
  if (!id) return [...rows];
  return [...rows].sort((a, b) => comparePortfolioRows(a, b, id, Boolean(desc)));
}

function compareGroupKeys(a, b) {
  const unknownPattern = /^(Unknown|No )/i;
  const aUnknown = unknownPattern.test(a);
  const bUnknown = unknownPattern.test(b);
  if (aUnknown && !bUnknown) return 1;
  if (!aUnknown && bUnknown) return -1;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function buildGroupedDisplayRows(rows, groupBy, collapsedKeys = new Set()) {
  if (!groupBy || groupBy === 'none' || !Array.isArray(rows)) {
    return rows ?? [];
  }

  const buckets = new Map();
  rows.forEach((row) => {
    const key = resolvePortfolioGroupKey(row, groupBy);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  });

  const orderedKeys = [...buckets.keys()].sort(compareGroupKeys);
  const displayRows = [];

  orderedKeys.forEach((groupKey) => {
    const groupRows = buckets.get(groupKey) || [];
    const collapsed = collapsedKeys.has(groupKey);
    displayRows.push({
      id: `group:${groupBy}:${groupKey}`,
      _isGroupHeader: true,
      _groupKey: groupKey,
      _groupLabel: groupKey,
      _groupCount: groupRows.length,
      _collapsed: collapsed,
    });
    if (!collapsed) {
      displayRows.push(...groupRows);
    }
  });

  return displayRows;
}

export function getActivePortfolioGroupBy() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_GROUP_BY_STORAGE_KEY);
    if (!raw) return DEFAULT_PORTFOLIO_GROUP_BY;
    const parsed = JSON.parse(raw);
    const id = parsed?.groupBy;
    return GROUP_BY_IDS.has(id) ? id : DEFAULT_PORTFOLIO_GROUP_BY;
  } catch {
    return DEFAULT_PORTFOLIO_GROUP_BY;
  }
}

export function setActivePortfolioGroupBy(groupBy) {
  const resolved = GROUP_BY_IDS.has(groupBy) ? groupBy : DEFAULT_PORTFOLIO_GROUP_BY;
  localStorage.setItem(
    PORTFOLIO_GROUP_BY_STORAGE_KEY,
    JSON.stringify({ groupBy: resolved }),
  );
  return resolved;
}

export function getCollapsedPortfolioGroups() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_GROUP_COLLAPSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const keys = Array.isArray(parsed?.collapsed) ? parsed.collapsed : [];
    return new Set(keys.filter((key) => typeof key === 'string'));
  } catch {
    return new Set();
  }
}

export function setCollapsedPortfolioGroups(collapsedKeys) {
  const collapsed = [...(collapsedKeys instanceof Set ? collapsedKeys : new Set(collapsedKeys))];
  localStorage.setItem(
    PORTFOLIO_GROUP_COLLAPSED_STORAGE_KEY,
    JSON.stringify({ collapsed }),
  );
}

/** @internal test helper */
export function resetPortfolioGroupStorageForTests() {
  localStorage.removeItem(PORTFOLIO_GROUP_BY_STORAGE_KEY);
  localStorage.removeItem(PORTFOLIO_GROUP_COLLAPSED_STORAGE_KEY);
}
