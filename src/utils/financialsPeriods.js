/** Core statement lines that must stay visible even when "hide empty rows" is on. */
export const CORE_ALWAYS_SHOW_METRIC_KEYS = new Set(['revenue', 'netinc', 'ncfo', 'assets']);

export function isAnnualHistoryDimension(dimension) {
  const code = String(dimension || '').toUpperCase();
  return code === 'MRY' || code === 'ARY';
}

/**
 * Limit visible grid columns by year range.
 * Annual modes dedupe to one column per fiscal year (matches Financials page).
 */
export function sliceColumnPeriods(periodSeries, { years, dimension, period }) {
  if (!periodSeries?.length) return [];
  if (years === 'all') return periodSeries;
  const count = Number(years) || 5;
  const annual = period ? period === 'annual' : isAnnualHistoryDimension(dimension);
  if (annual) {
    const seenYears = new Set();
    return periodSeries.filter((periodRow) => {
      const yr = (periodRow.periodEnd || '').slice(0, 4);
      if (!yr || seenYears.has(yr)) return false;
      seenYears.add(yr);
      return true;
    }).slice(0, count);
  }
  return periodSeries.slice(0, count);
}
