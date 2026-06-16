/**
 * Central metric tooltip registry for research / workstation UI.
 * Compact, institutional copy — definition + analytical implication.
 * @see docs/HEATMAP_AND_SCORING_PHILOSOPHY.md
 */

/** @typedef {{ fullName?: string, tooltip: string, formula?: string, source?: string }} TooltipEntry */

/** @type {Record<string, TooltipEntry>} */
export const TOOLTIP_REGISTRY = {
  // —— Scores & survivability ——
  piotroskiF: {
    fullName: 'Piotroski F-Score',
    tooltip: 'Balance-sheet and profitability quality (0–9). Higher scores signal improving fundamentals; ≤2 flags structural weakness.',
    formula: '9 binary signals across profitability, leverage, liquidity, efficiency',
    source: 'SEC annual filings',
  },
  altmanZ: {
    fullName: 'Altman Z-Score',
    tooltip: 'Bankruptcy-risk model from leverage, liquidity, profitability, and turnover. Below 1.8 suggests elevated distress risk.',
    formula: '1.2×WC/TA + 1.4×RE/TA + 3.3×EBIT/TA + 0.6×MVE/TL + 1.0×Sales/TA',
    source: 'SEC annual filings',
  },
  beneishM: {
    fullName: 'Beneish M-Score',
    tooltip: 'Earnings-manipulation probability model. Above −1.78 indicates higher likelihood of aggressive accounting.',
    source: 'SEC annual filings',
  },
  survivability: {
    fullName: 'Survivability Score',
    tooltip: 'Composite distress/survival score (0–100). Higher = stronger liquidity, coverage, and balance-sheet resilience.',
    source: 'Leverage, liquidity, coverage, Altman Z',
  },

  // —— Margins & profitability ——
  grossMargin: {
    fullName: 'Gross Margin',
    tooltip: 'Gross profit ÷ revenue from latest annual SEC filing. High software margins (80%+) are normal; insurers/utilities often mis-map COGS in XBRL so treat those with caution.',
    formula: 'gross profit / revenue',
    source: 'SEC CompanyFacts (GrossProfit or revenue − cost of revenue)',
  },
  operatingMargin: {
    fullName: 'Operating Margin',
    tooltip: 'Operating income as % of revenue. Compression may signal competitive pressure or operating deleverage.',
    formula: 'operating income / revenue',
  },
  ebitdaMargin: {
    fullName: 'EBITDA Margin',
    tooltip: 'EBITDA yield on revenue. Useful for comparing operating cash-earning power across capital structures.',
    formula: 'EBITDA / revenue',
  },
  netMargin: {
    fullName: 'Net Margin',
    tooltip: 'Bottom-line profit retention. Persistent erosion can signal structural margin or tax/interest headwinds.',
    formula: 'net income / revenue',
  },
  fcfMargin: {
    fullName: 'FCF Margin',
    tooltip: 'Free cash flow as % of revenue. Higher values indicate stronger cash conversion and reinvestment flexibility.',
    formula: 'free cash flow / revenue',
  },
  roe: {
    fullName: 'Return on Equity',
    tooltip: 'Net income on shareholder equity. High ROE with low leverage is quality; high ROE with high leverage is riskier.',
    formula: 'net income / equity',
  },
  roa: {
    fullName: 'Return on Assets',
    tooltip: 'Net income on total assets. Measures asset productivity independent of capital structure.',
    formula: 'net income / assets',
  },

  // —— Valuation ——
  pe: {
    fullName: 'P/E Ratio',
    tooltip: 'Price relative to trailing earnings. Very low multiples can signal deep value or earnings risk; context matters.',
    formula: 'price / diluted EPS',
  },
  pb: {
    fullName: 'P/B Ratio',
    tooltip: 'Price vs book equity. Below 1.0 may indicate asset undervaluation or impaired earning power.',
    formula: 'price / book value per share',
  },

  // —— Distress & leverage ——
  de: {
    fullName: 'Debt / Equity',
    tooltip: 'Financial leverage proxy. Rising or elevated D/E increases refinancing and survivability risk in downturns.',
    formula: 'total debt / shareholders equity',
  },
  currentRatio: {
    fullName: 'Current Ratio',
    tooltip: 'Short-term liquidity buffer. Below 1.0 may indicate near-term payment stress; well above 2 can mean idle capital.',
    formula: 'current assets / current liabilities',
  },
  interestCoverage: {
    fullName: 'Interest Coverage',
    tooltip: 'EBIT relative to interest expense. Low coverage limits debt capacity and raises default sensitivity.',
    formula: 'EBIT / interest expense',
  },
  cashToDebt: {
    fullName: 'Cash / Debt',
    tooltip: 'Cash cushion vs total debt. Higher ratios improve runway and reduce forced-equity or asset-sale risk.',
    formula: 'cash & equivalents / total debt',
  },

  // —— Trends ——
  grossMargin3yrDelta: {
    fullName: 'Gross Margin 3Y Δ',
    tooltip: 'Three-year change in gross margin. Expansion supports quality compounders; contraction warrants pricing/cost review.',
  },
  operatingMargin3yrDelta: {
    fullName: 'Operating Margin 3Y Δ',
    tooltip: 'Three-year change in operating margin. Sustained improvement signals operating leverage; declines flag pressure.',
  },
  shareDilutionRate: {
    fullName: 'Share Dilution',
    tooltip: 'Growth in shares outstanding over time. Persistent dilution erodes per-share value and insider alignment.',
  },
  yoy: {
    fullName: 'Year-over-Year',
    tooltip: 'Period-over-period % change. Sharp moves vs history may signal inflection, anomaly, or one-time distortion.',
  },
  cagr: {
    fullName: 'CAGR',
    tooltip: 'Compound annual growth over the selected span. Compare against sector norms and margin trend for quality.',
  },

  // —— Insider activity ——
  intensityScore90d: {
    fullName: 'Buy Intensity',
    tooltip: 'Concentration of open-market insider buying (0–1). Higher = more buys, larger dollars, shorter active window.',
    formula: '(buy_count × ln(buy_value)) / days_active',
    source: 'SEC Form 4 (code P)',
  },
  buySellRatio: {
    fullName: 'Buy/Sell Ratio',
    tooltip: 'Insider buy-to-sell count ratio (90d). Above 1.0 signals net buying; pair with dollar value for conviction.',
    source: 'SEC Form 4',
  },
  buyCount90d: {
    fullName: 'Insider Buys 90d',
    tooltip: 'Count of insider buy transactions in trailing 90 days. Volume alone is weak signal without dollar magnitude.',
    source: 'SEC Form 4',
  },
  uniqueBuyers: {
    fullName: 'Unique Buyers',
    tooltip: 'Distinct insiders with open-market purchases in the window. Clusters require ≥3 unique buyers within 30 days.',
    source: 'SEC Form 4 (code P)',
  },
  totalBuyValue: {
    fullName: 'Buy Value',
    tooltip: 'Sum of open-market insider purchase dollars in the window. Stock grants and $0 awards are excluded.',
    source: 'SEC Form 4 (code P)',
  },
};

/** Keys that resolve to another registry entry. */
const TOOLTIP_ALIASES = {
  intensityScore: 'intensityScore90d',
};

/**
 * @param {string|undefined|null} key
 * @returns {TooltipEntry|null}
 */
export function getMetricTooltip(key) {
  if (!key) return null;
  const resolved = TOOLTIP_ALIASES[key] || key;
  return TOOLTIP_REGISTRY[resolved] || null;
}

/**
 * Metadata shape for ColumnHeader / StTooltipMetricHelp.
 * @param {string} key
 * @param {string} [label]
 */
export function getMetricTooltipMeta(key, label) {
  const entry = getMetricTooltip(key);
  if (!entry) return null;
  return {
    fullName: entry.fullName || label,
    tooltip: entry.tooltip,
    formula: entry.formula,
    source: entry.source,
  };
}

/**
 * Plain-text tooltip for grid cells: metric context + optional heat tier line.
 * @param {string} key
 * @param {string} [heatLine] — from describeHeat()
 */
export function formatMetricCellTooltip(key, heatLine) {
  const entry = getMetricTooltip(key);
  if (!entry?.tooltip && !heatLine) return '';
  if (!heatLine) return entry.tooltip;
  if (!entry?.tooltip) return heatLine;
  return `${entry.tooltip}\n— ${heatLine}`;
}
