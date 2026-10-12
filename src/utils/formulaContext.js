/**
 * Normalize API / grid payloads into the shape expected by metricFormulaBreakdown.
 */

function isValidNumber(value) {
  return value != null && value !== '' && Number.isFinite(Number(value));
}

/**
 * @param {object|null|undefined} periodRow — financials periodSeries entry
 * @param {{ price?: number|null }} [options]
 */
export function buildFormulaContextFromPeriod(periodRow, { price } = {}) {
  if (!periodRow) return null;
  const fundamentals = periodRow.fundamentals || {};
  const metrics = periodRow.metrics || {};
  let latestPrice = price;
  if (latestPrice == null && isValidNumber(metrics.pe) && isValidNumber(fundamentals.eps) && fundamentals.eps !== 0) {
    latestPrice = Number(metrics.pe) * Number(fundamentals.eps);
  }
  return {
    fundamentals,
    metrics,
    price: latestPrice != null ? { latest: latestPrice } : undefined,
    marketCap: metrics.market_cap ?? metrics.marketCap ?? null,
  };
}

/**
 * @param {object|null|undefined} row — portfolio grid row
 */
export function buildFormulaContextFromPortfolioRow(row) {
  if (!row) return null;
  const fundamentals = row._fundamentals || {};
  return {
    fundamentals,
    metrics: {},
    price: row.price != null ? { latest: row.price } : undefined,
    marketCap: row.marketCap ?? null,
  };
}

/**
 * @param {object|null|undefined} tickerData — research screener result row
 */
export function buildFormulaContextFromScreenerRow(tickerData) {
  if (!tickerData || tickerData.error) return null;
  return {
    fundamentals: tickerData.fundamentals || {},
    metrics: tickerData.metrics || {},
    price: tickerData.price ? { latest: tickerData.price.latest ?? tickerData.price } : undefined,
    marketCap: tickerData.metrics?.marketCap ?? tickerData.metrics?.market_cap ?? null,
  };
}

/** Map portfolio column accessors to canonical formula registry keys. */
export const PORTFOLIO_FORMULA_KEY_ALIASES = {
  tbp: 'tangibleBookPerShare',
  bp: 'bookValuePerShare',
  sp: 'salesPerShare',
  ep: 'earningsPerShare',
  cfop: 'cashflowOpsPerShare',
  sfcfp: 'fcfPerShare',
  ncfp: 'ncfPerShare',
  cashp: 'cashPerShare',
  assetp: 'assetPerShare',
};

export function resolveFormulaMetricKey(key) {
  if (!key) return key;
  return PORTFOLIO_FORMULA_KEY_ALIASES[key] || key;
}
