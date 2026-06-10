import { formatDecimal, formatPercent, formatUsd } from './formatters';

export const COMPARE_SNAPSHOT_METRICS = [
  { key: 'price', label: 'Price', format: 'usd' },
  { key: 'pe', label: 'P/E', format: 'decimal' },
  { key: 'bp', label: 'BP', format: 'decimal' },
  { key: 'ep', label: 'EP', format: 'decimal' },
  { key: 'grossMargin', label: 'Gross Margin', format: 'percentFraction' },
  { key: 'netMargin', label: 'Net Margin', format: 'percentFraction' },
  { key: 'de', label: 'D/E', format: 'decimal' },
  { key: 'sfcfp', label: 'SFCFP', format: 'decimal' },
  { key: 'insiderBuy6m', label: 'Insider Buy 6M', format: 'usd0' },
];

export function formatCompareSnapshotValue(value, format) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  switch (format) {
    case 'usd':
      return formatUsd(value);
    case 'usd0':
      return formatUsd(value, 0);
    case 'percentFraction':
      return formatPercent(Number(value) * 100);
    case 'decimal':
      return formatDecimal(value, 2);
    default:
      return String(value);
  }
}

export function buildRowsByTicker(rows = []) {
  const map = {};
  rows.forEach((row) => {
    const ticker = String(row?.ticker || '').trim().toUpperCase();
    if (ticker) map[ticker] = row;
  });
  return map;
}

/**
 * Percentile rank (0–100) of each ticker's metric within the universe.
 * Higher value => higher percentile. Null when fewer than two valid values.
 */
export function buildPortfolioPercentileRanks(universeRows, metricKeys, tickers) {
  const ranks = {};
  tickers.forEach((ticker) => {
    ranks[ticker] = {};
  });

  metricKeys.forEach((key) => {
    const values = universeRows
      .map((row) => ({ ticker: String(row.ticker || '').toUpperCase(), value: row[key] }))
      .filter((entry) => entry.value != null && !Number.isNaN(Number(entry.value)));
    if (values.length < 2) return;

    const sorted = [...values].sort((a, b) => Number(a.value) - Number(b.value));
    const n = sorted.length;

    tickers.forEach((ticker) => {
      const match = values.find((entry) => entry.ticker === ticker);
      if (!match) {
        ranks[ticker][key] = null;
        return;
      }
      const below = sorted.filter((entry) => Number(entry.value) < Number(match.value)).length;
      ranks[ticker][key] = Math.round((below / (n - 1)) * 100);
    });
  });

  return ranks;
}
