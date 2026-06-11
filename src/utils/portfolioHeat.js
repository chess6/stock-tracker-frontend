import { signedHeatStyle, insiderDollarStyle, columnHeatStyle } from './heatMap';
import { PORTFOLIO_COLUMN_META } from '../config/portfolioColumns';

/** Lower-is-better valuation columns (invert green/red vs column min/max). */
const LOWER_IS_BETTER_COLUMNS = new Set(
  Object.entries(PORTFOLIO_COLUMN_META)
    .filter(([, meta]) => meta.heat === 'column' && meta.higherIsBetter === false)
    .map(([key]) => key),
);

function portfolioColumnHeat(value, key, heatRanges) {
  const range = heatRanges[key];
  if (!range) return {};
  return columnHeatStyle(value, range.min, range.max, {
    invert: LOWER_IS_BETTER_COLUMNS.has(key),
  });
}

/** Metric keys that participate in portfolio column-relative heatmaps. */
export const PORTFOLIO_HEAT_METRIC_KEYS = [
  'sp', 'ebitdaEv', 'tbp', 'bp', 'ep', 'pe', 'cfop', 'sfcfp', 'ncfp', 'cashp',
  'assetp', 'revDebt', 'de', 'mcEv', 'currentRatio', 'grossMargin', 'netMargin',
  'roe', 'roa', 'divYield', 'divergenceScore',
];

/** Precompute per-cell heat styles for portfolio grid rows. */
export function attachPortfolioHeatStyles(rows, heatRanges) {
  return rows.map((row) => ({
    ...row,
    _heatStyles: {
      change: signedHeatStyle(row.change, 5),
      change1w: signedHeatStyle(row.change1w, 8),
      change6m: signedHeatStyle(row.change6m, 20),
      pctTo52wHi: signedHeatStyle(row.pctTo52wHi, 15),
      pctFrom52wLo: signedHeatStyle(row.pctFrom52wLo, 30),
      sp: portfolioColumnHeat(row.sp, 'sp', heatRanges),
      ebitdaEv: portfolioColumnHeat(row.ebitdaEv, 'ebitdaEv', heatRanges),
      tbp: portfolioColumnHeat(row.tbp, 'tbp', heatRanges),
      bp: portfolioColumnHeat(row.bp, 'bp', heatRanges),
      ep: portfolioColumnHeat(row.ep, 'ep', heatRanges),
      pe: portfolioColumnHeat(row.pe, 'pe', heatRanges),
      de: portfolioColumnHeat(row.de, 'de', heatRanges),
      currentRatio: portfolioColumnHeat(row.currentRatio, 'currentRatio', heatRanges),
      grossMargin: portfolioColumnHeat(row.grossMargin, 'grossMargin', heatRanges),
      netMargin: portfolioColumnHeat(row.netMargin, 'netMargin', heatRanges),
      roe: portfolioColumnHeat(row.roe, 'roe', heatRanges),
      roa: portfolioColumnHeat(row.roa, 'roa', heatRanges),
      divYield: portfolioColumnHeat(row.divYield, 'divYield', heatRanges),
      cfop: portfolioColumnHeat(row.cfop, 'cfop', heatRanges),
      sfcfp: portfolioColumnHeat(row.sfcfp, 'sfcfp', heatRanges),
      ncfp: portfolioColumnHeat(row.ncfp, 'ncfp', heatRanges),
      cashp: portfolioColumnHeat(row.cashp, 'cashp', heatRanges),
      assetp: portfolioColumnHeat(row.assetp, 'assetp', heatRanges),
      revDebt: portfolioColumnHeat(row.revDebt, 'revDebt', heatRanges),
      mcEv: portfolioColumnHeat(row.mcEv, 'mcEv', heatRanges),
      divergenceScore: portfolioColumnHeat(row.divergenceScore, 'divergenceScore', heatRanges),
      insiderBuy6m: insiderDollarStyle(row.insiderBuy6m),
      insiderBuy3m: insiderDollarStyle(row.insiderBuy3m),
      insiderBuy1m: insiderDollarStyle(row.insiderBuy1m),
    },
  }));
}
