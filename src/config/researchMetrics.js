/** Metric groups for deep-dive financial grid (rows). */
export const RESEARCH_METRIC_GROUPS = [
  {
    id: 'income',
    label: 'Income Statement',
    metrics: [
      { key: 'revenue', label: 'Revenue', format: 'usd' },
      { key: 'cor', label: 'Cost of Revenue', format: 'usd', alt: ['costofrevenue'] },
      { key: 'gp', label: 'Gross Profit', format: 'usd', alt: ['grossProfit'] },
      { key: 'opex', label: 'Operating Expenses', format: 'usd', alt: ['operatingexpenses'] },
      { key: 'sgna', label: 'SG&A', format: 'usd' },
      { key: 'rnd', label: 'R&D', format: 'usd', alt: ['researchanddevelopment'] },
      { key: 'opinc', label: 'Operating Income', format: 'usd', alt: ['operatingIncome'] },
      { key: 'ebit', label: 'EBIT', format: 'usd' },
      { key: 'ebitda', label: 'EBITDA', format: 'usd' },
      { key: 'interestexp', label: 'Interest Expense', format: 'usd' },
      { key: 'depamor', label: 'D&A', format: 'usd' },
      { key: 'netinc', label: 'Net Income', format: 'usd', alt: ['netIncome', 'netinccmn'] },
      { key: 'compinc', label: 'Comprehensive Income', format: 'usd' },
      { key: 'eps', label: 'EPS', format: 'decimal' },
      { key: 'taxexp', label: 'Tax Expense', format: 'usd' },
      { key: 'sbcomp', label: 'Stock-Based Comp', format: 'usd' },
    ],
  },
  {
    id: 'balance',
    label: 'Balance Sheet',
    metrics: [
      { key: 'assets', label: 'Total Assets', format: 'usd' },
      { key: 'assetscurrent', label: 'Current Assets', format: 'usd' },
      { key: 'liabilities', label: 'Total Liabilities', format: 'usd' },
      { key: 'liabilitiescurrent', label: 'Current Liabilities', format: 'usd' },
      { key: 'equity', label: 'Equity', format: 'usd' },
      { key: 'retearn', label: 'Retained Earnings', format: 'usd' },
      { key: 'debt', label: 'Total Debt', format: 'usd' },
      { key: 'debtlt', label: 'Long-Term Debt', format: 'usd' },
      { key: 'debtcurrent', label: 'Current Debt', format: 'usd' },
      { key: 'cashneq', label: 'Cash & Equivalents', format: 'usd' },
      { key: 'goodwill', label: 'Goodwill', format: 'usd' },
      { key: 'intangibles', label: 'Intangible Assets', format: 'usd' },
      { key: 'ppnenet', label: 'PP&E, Net', format: 'usd' },
      { key: 'inventory', label: 'Inventory', format: 'usd' },
      { key: 'receivables', label: 'Receivables', format: 'usd' },
      { key: 'payables', label: 'Payables', format: 'usd' },
      { key: 'workingcapital', label: 'Working Capital', format: 'usd' },
      { key: 'sharesbas', label: 'Shares Outstanding', format: 'shares' },
    ],
  },
  {
    id: 'cashflow',
    label: 'Cash Flow',
    metrics: [
      { key: 'ncfo', label: 'Operating CF', format: 'usd', alt: ['operatingCashFlow'] },
      { key: 'capex', label: 'CapEx', format: 'usd' },
      { key: 'fcf', label: 'Free Cash Flow', format: 'usd' },
      { key: 'ncfi', label: 'Investing CF', format: 'usd' },
      { key: 'ncff', label: 'Financing CF', format: 'usd' },
      { key: 'ncfdiv', label: 'Dividends Paid', format: 'usd' },
      { key: 'ncfdebt', label: 'Debt Issued/Repurchased', format: 'usd' },
      { key: 'ncfcommon', label: 'Common Stock Issued/Repurchased', format: 'usd' },
      { key: 'ncf', label: 'Net Cash Flow', format: 'usd' },
    ],
  },
  {
    id: 'ratios',
    label: 'Ratios & Margins',
    source: 'metrics',
    metrics: [
      { key: 'pe', label: 'P/E', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'pb', label: 'P/B', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'earningsYield', label: 'Earnings Yield', format: 'percent', scoreCategory: 'valuation' },
      { key: 'ebitdaEv', label: 'EBITDA/EV', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'evEbitda', label: 'EV/EBITDA', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'evSales', label: 'EV/Sales', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'fcfYield', label: 'FCF Yield', format: 'percent', scoreCategory: 'valuation' },
      { key: 'mcEv', label: 'MC/EV', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'sp', label: 'Sales/Share', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'tangibleBookPerShare', label: 'Tangible B/Share', format: 'decimal', scoreCategory: 'valuation' },
      { key: 'grossMargin', label: 'Gross Margin', format: 'percent', scoreCategory: 'profitability' },
      { key: 'operatingMargin', label: 'Operating Margin', format: 'percent', scoreCategory: 'profitability' },
      { key: 'ebitdaMargin', label: 'EBITDA Margin', format: 'percent', scoreCategory: 'profitability' },
      { key: 'netMargin', label: 'Net Margin', format: 'percent', scoreCategory: 'profitability' },
      { key: 'fcfMargin', label: 'FCF Margin', format: 'percent', scoreCategory: 'profitability' },
      { key: 'cfoMargin', label: 'CFO Margin', format: 'percent', scoreCategory: 'profitability' },
      { key: 'roe', label: 'ROE', format: 'percent', scoreCategory: 'profitability' },
      { key: 'roa', label: 'ROA', format: 'percent', scoreCategory: 'profitability' },
      { key: 'roic', label: 'ROIC', format: 'percent', scoreCategory: 'profitability' },
      { key: 'assetTurnover', label: 'Asset Turnover', format: 'decimal', scoreCategory: 'profitability' },
      { key: 'inventoryTurnover', label: 'Inventory Turnover', format: 'decimal', scoreCategory: 'profitability' },
      { key: 'receivablesDays', label: 'Receivables Days', format: 'decimal', scoreCategory: 'profitability' },
      { key: 'payablesDays', label: 'Payables Days', format: 'decimal', scoreCategory: 'profitability' },
      { key: 'payoutRatio', label: 'Payout Ratio', format: 'percent', scoreCategory: 'profitability' },
      { key: 'de', label: 'Debt/Equity', format: 'decimal', scoreCategory: 'distress' },
      { key: 'debtAssets', label: 'Debt/Assets', format: 'decimal', scoreCategory: 'distress' },
      { key: 'currentRatio', label: 'Current Ratio', format: 'decimal', scoreCategory: 'distress' },
      { key: 'quickRatio', label: 'Quick Ratio', format: 'decimal', scoreCategory: 'distress' },
      { key: 'interestCoverage', label: 'Interest Coverage', format: 'decimal', scoreCategory: 'distress' },
      { key: 'cashToDebt', label: 'Cash/Debt', format: 'decimal', scoreCategory: 'distress' },
      { key: 'netDebt', label: 'Net Debt', format: 'usd', scoreCategory: 'distress' },
      { key: 'divYield', label: 'Div Yield', format: 'percent' },
    ],
  },
  {
    id: 'scores',
    label: 'Scores',
    source: 'scores',
    metrics: [
      { key: 'piotroskiF', label: 'Piotroski F', format: 'integer', scoreCategory: 'score' },
      { key: 'altmanZ', label: 'Altman Z', format: 'decimal', scoreCategory: 'score' },
      { key: 'beneishM', label: 'Beneish M', format: 'decimal', scoreCategory: 'score' },
      { key: 'survivability', label: 'Survivability', format: 'integer', scoreCategory: 'score' },
    ],
  },
];

/** Screener metric groups — metrics as rows, tickers as columns (comparative grid layout). */
export const SCREENER_METRIC_GROUPS = [
  {
    id: 'valuation',
    label: 'Valuation & Margins',
    metrics: [
      { id: 'price', label: 'Price', path: ['price', 'latest'], format: 'usd' },
      { id: 'pe', label: 'P/E', path: ['metrics', 'pe'], format: 'decimal', scoreCategory: 'valuation' },
      { id: 'grossMargin', label: 'Gross Margin', path: ['metrics', 'grossMargin'], format: 'percent', scoreCategory: 'profitability' },
      { id: 'netMargin', label: 'Net Margin', path: ['metrics', 'netMargin'], format: 'percent', scoreCategory: 'profitability' },
      { id: 'roe', label: 'ROE', path: ['metrics', 'roe'], format: 'percent', scoreCategory: 'profitability' },
      { id: 'de', label: 'D/E', path: ['metrics', 'de'], format: 'decimal', scoreCategory: 'distress' },
    ],
  },
  {
    id: 'scores',
    label: 'Scores',
    metrics: [
      { id: 'piotroskiF', label: 'Piotroski F', path: ['scores', 'piotroskiF'], format: 'integer', scoreCategory: 'score' },
      { id: 'altmanZ', label: 'Altman Z', path: ['scores', 'altmanZ'], format: 'decimal', scoreCategory: 'score' },
      { id: 'beneishM', label: 'Beneish M', path: ['scores', 'beneishM'], format: 'decimal', scoreCategory: 'score' },
      { id: 'survivability', label: 'Survivability', path: ['scores', 'survivability'], format: 'integer', scoreCategory: 'score' },
    ],
  },
  {
    id: 'trends',
    label: 'Trends',
    metrics: [
      { id: 'grossMargin3yrDelta', label: 'GM 3Y Δ', path: ['marginTrends', 'grossMargin3yrDelta'], format: 'percent', scoreCategory: 'trend' },
      { id: 'operatingMargin3yrDelta', label: 'Op Margin 3Y Δ', path: ['marginTrends', 'operatingMargin3yrDelta'], format: 'percent', scoreCategory: 'trend' },
      { id: 'shareDilutionRate', label: 'Share Dilution', path: ['shareDilutionRate'], format: 'percent', scoreCategory: 'trend' },
    ],
  },
  {
    id: 'insiders',
    label: 'Insider Activity',
    metrics: [
      { id: 'buyCount90d', label: 'Insider Buys 90d', path: ['insiderSummary', 'buyCount90d'], format: 'integer' },
      { id: 'intensityScore90d', label: 'Buy Intensity', path: ['insiderSummary', 'intensityScore90d'], format: 'decimal', scoreCategory: 'trend' },
      { id: 'buySellRatio', label: 'Buy/Sell Ratio', path: ['insiderSummary', 'buySellRatio'], format: 'decimal', scoreCategory: 'trend' },
    ],
  },
  {
    id: 'narrative',
    label: 'Narrative',
    metrics: [
      {
        id: 'narrativeDivergence',
        label: 'Divergence',
        path: ['narrativeDivergence'],
        format: 'divergence_badge',
      },
    ],
  },
];

export const DIMENSION_OPTIONS = [
  { label: 'Annual (MR)', value: 'MRY' },
  { label: 'Quarterly (MR)', value: 'MRQ' },
  { label: 'TTM', value: 'MRT' },
  { label: 'Annual (AR)', value: 'ARY' },
];

export const YEAR_OPTIONS = [5, 10, 15, 'all'];

export function buildGteDate(years) {
  if (years === 'all' || years == null) return '';
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return '';
  const past = new Date();
  past.setFullYear(past.getFullYear() - n);
  return past.toISOString().slice(0, 10);
}

export function getNestedValue(obj, path) {
  if (!path) return obj?.[path];
  let current = obj;
  for (const key of path) {
    if (current == null) return null;
    current = current[key];
  }
  return current;
}

export function getScreenerMetricValue(rowData, metric) {
  if (!rowData || rowData.error) return null;
  if (metric.format === 'divergence_badge') {
    return getNestedValue(rowData, metric.path || ['narrativeDivergence']);
  }
  if (metric.path) return getNestedValue(rowData, metric.path);
  return rowData[metric.id] ?? null;
}

/** Min/max across ticker columns within one metric row. */
export function rowTickerMinMax(row, tickerCount, prefix = 't') {
  const values = [];
  for (let idx = 0; idx < tickerCount; idx += 1) {
    const value = row[`${prefix}${idx}`];
    if (value != null && !Number.isNaN(Number(value))) values.push(Number(value));
  }
  if (!values.length) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}
