/**
 * Map macro snapshot tile ids to portfolio row matchers.
 * Industry sectors follow sic_to_sector output — see company_enrichment.py.
 */
export const MACRO_INDUSTRY_SECTORS = {
  xlk: ['Technology & Services'],
  xlf: ['Financials'],
  xle: ['Energy'],
  xlv: ['Technology & Services'],
  xli: ['Industrials', 'Transportation', 'Construction', 'Wholesale Trade'],
  xlp: [],
  xly: ['Consumer Discretionary'],
  xlu: ['Transportation', 'Energy'],
  xlre: ['Financials'],
  xlc: ['Technology & Services'],
};

export const MACRO_TILE_LABELS = {
  spy: 'S&P 500',
  qqq: 'NASDAQ 100',
  dia: 'Dow',
  iwm: 'Russell 2000',
  eem: 'Emerging Mkts',
  gld: 'Gold',
  slv: 'Silver',
  uso: 'Oil',
  tlt: '20Y Treasuries',
  hyg: 'High Yield',
  vix: 'VIX',
  xlk: 'Technology',
  xlf: 'Financials',
  xle: 'Energy',
  xlv: 'Health Care',
  xli: 'Industrials',
  xlp: 'Consumer Staples',
  xly: 'Consumer Disc.',
  xlu: 'Utilities',
  xlre: 'Real Estate',
  xlc: 'Communication',
};

/** @deprecated use MACRO_TILE_LABELS */
export const MACRO_INDUSTRY_LABELS = MACRO_TILE_LABELS;

const industryRules = Object.fromEntries(
  Object.entries(MACRO_INDUSTRY_SECTORS).map(([id, sectors]) => [id, { sectors }]),
);

export const MACRO_TILE_RULES = {
  spy: { matchAll: true },
  qqq: { symbols: ['QQQ'], sectors: ['Technology & Services'] },
  dia: { matchAll: true },
  iwm: { matchAll: true },
  eem: { symbols: ['EEM'] },
  gld: { symbols: ['GLD', 'GOLD'] },
  slv: { symbols: ['SLV'] },
  uso: { sectors: ['Energy'], symbols: ['USO'] },
  tlt: { symbols: ['TLT'], sectors: ['Financials'] },
  hyg: { symbols: ['HYG'], sectors: ['Financials'] },
  vix: { symbols: [] },
  ...industryRules,
};

function sectorMatches(rowSector, candidates = []) {
  const normalized = (rowSector || '').trim().toLowerCase();
  if (!normalized || !candidates.length) return false;
  return candidates.some((candidate) => candidate.toLowerCase() === normalized);
}

function labelFallbackMatches(rowSector, macroId) {
  const label = (MACRO_TILE_LABELS[macroId] || '').replace(/\.$/, '').toLowerCase();
  if (!label) return false;
  const haystack = (rowSector || '').trim().toLowerCase();
  if (!haystack) return false;
  return haystack.includes(label) || label.includes(haystack);
}

export function portfolioRowMatchesMacroTile(row, macroId) {
  if (!macroId) return false;

  const rules = MACRO_TILE_RULES[macroId];
  if (rules?.matchAll) return true;

  const ticker = (row?.ticker || '').trim().toUpperCase();
  if (ticker && rules?.symbols?.some((symbol) => symbol.toUpperCase() === ticker)) {
    return true;
  }

  if (sectorMatches(row?.sector, rules?.sectors)) {
    return true;
  }

  return labelFallbackMatches(row?.sector, macroId);
}

/** @deprecated use portfolioRowMatchesMacroTile */
export function portfolioRowMatchesMacroIndustry(row, macroId) {
  return portfolioRowMatchesMacroTile(row, macroId);
}

export function filterPortfolioByMacroTiles(rows, selectedTileIds) {
  if (!selectedTileIds?.size) return rows ?? [];
  return (rows ?? []).filter((row) => (
    [...selectedTileIds].some((macroId) => portfolioRowMatchesMacroTile(row, macroId))
  ));
}

/** @deprecated use filterPortfolioByMacroTiles */
export function filterPortfolioByMacroIndustries(rows, selectedIndustryIds) {
  return filterPortfolioByMacroTiles(rows, selectedIndustryIds);
}

export function groupPortfolioRowsBySector(rows) {
  const buckets = new Map();
  (rows ?? []).forEach((row) => {
    const key = row.sector?.trim() || 'Unknown sector';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  });
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([sector, sectorRows]) => ({
      sector,
      rows: [...sectorRows].sort((a, b) => a.ticker.localeCompare(b.ticker)),
    }));
}

export function macroTileSelectionLabel(selectedTileIds, macroItemsById = {}) {
  if (!selectedTileIds?.size) return '';
  return [...selectedTileIds]
    .map((id) => macroItemsById[id]?.label || MACRO_TILE_LABELS[id] || id.toUpperCase())
    .sort((a, b) => a.localeCompare(b))
    .join(', ');
}

/** @deprecated use macroTileSelectionLabel */
export function macroIndustrySelectionLabel(selectedIndustryIds, industryItemsById) {
  return macroTileSelectionLabel(selectedIndustryIds, industryItemsById);
}
