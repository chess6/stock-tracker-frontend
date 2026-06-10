import { signedHeatStyle, insiderDollarStyle, columnHeatStyle } from './heatMap';

/** Metric keys that participate in portfolio column-relative heatmaps. */
export const PORTFOLIO_HEAT_METRIC_KEYS = [
  'sp', 'ebitdaEv', 'tbp', 'bp', 'ep', 'pe', 'cfop', 'sfcfp', 'ncfp', 'cashp',
  'assetp', 'revDebt', 'de', 'mcEv', 'currentRatio', 'grossMargin', 'netMargin',
  'roe', 'roa', 'divYield',
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
      sp: columnHeatStyle(row.sp, heatRanges.sp.min, heatRanges.sp.max),
      ebitdaEv: columnHeatStyle(row.ebitdaEv, heatRanges.ebitdaEv.min, heatRanges.ebitdaEv.max),
      tbp: columnHeatStyle(row.tbp, heatRanges.tbp.min, heatRanges.tbp.max),
      bp: columnHeatStyle(row.bp, heatRanges.bp.min, heatRanges.bp.max),
      ep: columnHeatStyle(row.ep, heatRanges.ep.min, heatRanges.ep.max),
      pe: columnHeatStyle(row.pe, heatRanges.pe.min, heatRanges.pe.max),
      de: columnHeatStyle(row.de, heatRanges.de.min, heatRanges.de.max),
      currentRatio: columnHeatStyle(row.currentRatio, heatRanges.currentRatio.min, heatRanges.currentRatio.max),
      grossMargin: columnHeatStyle(row.grossMargin, heatRanges.grossMargin.min, heatRanges.grossMargin.max),
      netMargin: columnHeatStyle(row.netMargin, heatRanges.netMargin.min, heatRanges.netMargin.max),
      roe: columnHeatStyle(row.roe, heatRanges.roe.min, heatRanges.roe.max),
      roa: columnHeatStyle(row.roa, heatRanges.roa.min, heatRanges.roa.max),
      divYield: columnHeatStyle(row.divYield, heatRanges.divYield.min, heatRanges.divYield.max),
      cfop: columnHeatStyle(row.cfop, heatRanges.cfop.min, heatRanges.cfop.max),
      sfcfp: columnHeatStyle(row.sfcfp, heatRanges.sfcfp.min, heatRanges.sfcfp.max),
      ncfp: columnHeatStyle(row.ncfp, heatRanges.ncfp.min, heatRanges.ncfp.max),
      cashp: columnHeatStyle(row.cashp, heatRanges.cashp.min, heatRanges.cashp.max),
      assetp: columnHeatStyle(row.assetp, heatRanges.assetp.min, heatRanges.assetp.max),
      revDebt: columnHeatStyle(row.revDebt, heatRanges.revDebt.min, heatRanges.revDebt.max),
      mcEv: columnHeatStyle(row.mcEv, heatRanges.mcEv.min, heatRanges.mcEv.max),
      insiderBuy6m: insiderDollarStyle(row.insiderBuy6m),
      insiderBuy3m: insiderDollarStyle(row.insiderBuy3m),
      insiderBuy1m: insiderDollarStyle(row.insiderBuy1m),
    },
  }));
}
