/**
 * Map macro SPDR industry tile ids to portfolio sector labels (sic_to_sector output).
 * @see stock_tracker_backend/app/services/company_enrichment.py
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

export const MACRO_INDUSTRY_LABELS = {
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

export function portfolioRowMatchesMacroIndustry(row, macroId) {
  const sector = (row?.sector || '').trim();
  if (!sector || !macroId) return false;

  const mapped = MACRO_INDUSTRY_SECTORS[macroId];
  if (Array.isArray(mapped) && mapped.length > 0) {
    const normalized = sector.toLowerCase();
    return mapped.some((candidate) => candidate.toLowerCase() === normalized);
  }

  const label = (MACRO_INDUSTRY_LABELS[macroId] || '').replace(/\.$/, '').toLowerCase();
  if (!label) return false;
  const haystack = sector.toLowerCase();
  return haystack.includes(label) || label.includes(haystack);
}

export function filterPortfolioByMacroIndustries(rows, selectedIndustryIds) {
  if (!selectedIndustryIds?.size) return rows ?? [];
  return (rows ?? []).filter((row) => (
    [...selectedIndustryIds].some((macroId) => portfolioRowMatchesMacroIndustry(row, macroId))
  ));
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

export function macroIndustrySelectionLabel(selectedIndustryIds, industryItemsById) {
  if (!selectedIndustryIds?.size) return '';
  return [...selectedIndustryIds]
    .map((id) => industryItemsById[id]?.label || MACRO_INDUSTRY_LABELS[id] || id.toUpperCase())
    .sort((a, b) => a.localeCompare(b))
    .join(', ');
}
