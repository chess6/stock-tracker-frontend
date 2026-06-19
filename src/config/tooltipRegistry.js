/**
 * Central metric tooltip registry for research / workstation UI.
 * Compact, institutional copy — definition + analytical implication.
 * @see docs/HEATMAP_AND_SCORING_PHILOSOPHY.md
 */

/** @typedef {{ fullName?: string, tooltip: string, formula?: string, source?: string }} TooltipEntry */

/** @type {Record<string, TooltipEntry>} */
export const TOOLTIP_REGISTRY = {
  // —— Income statement ——
  revenue: {
    fullName: 'Revenue',
    tooltip: 'Total sales or service income before any deductions. The top line of the income statement and the starting point for profitability analysis.',
    source: 'SEC CompanyFacts (Revenues)',
  },
  cor: {
    fullName: 'Cost of Revenue',
    tooltip: 'Direct costs attributable to producing goods or delivering services. Subtract from revenue to get gross profit. XBRL mapping varies by industry.',
    formula: 'revenue − gross profit (or reported directly)',
    source: 'SEC CompanyFacts (CostOfRevenue / CostOfGoodsAndServicesSold)',
  },
  gp: {
    fullName: 'Gross Profit',
    tooltip: 'Revenue minus cost of revenue. Measures core product-level profitability before operating expenses, and is the basis for gross margin.',
    formula: 'revenue − cost of revenue',
    source: 'SEC CompanyFacts (GrossProfit)',
  },
  opex: {
    fullName: 'Operating Expenses',
    tooltip: 'Total costs of running the business excluding cost of revenue. Includes SG&A, R&D, and other overhead. Rising opex without revenue growth compresses operating margin.',
    source: 'SEC CompanyFacts (OperatingExpenses)',
  },
  sgna: {
    fullName: 'Selling, General & Administrative',
    tooltip: 'Costs related to sales, marketing, management, and back-office operations. Often the largest operating expense category outside of COGS.',
    source: 'SEC CompanyFacts',
  },
  rnd: {
    fullName: 'Research & Development',
    tooltip: 'Spending on product innovation and development. High R&D relative to revenue is typical in tech and pharma; capitalization differences can affect comparability.',
    source: 'SEC CompanyFacts (ResearchAndDevelopmentExpense)',
  },
  opinc: {
    fullName: 'Operating Income',
    tooltip: 'Profit from core business operations before interest and taxes. A cleaner measure of operational performance than net income.',
    formula: 'gross profit − operating expenses',
    source: 'SEC CompanyFacts (OperatingIncomeLoss)',
  },
  ebit: {
    fullName: 'Earnings Before Interest & Taxes',
    tooltip: 'Operating profit plus non-operating income, before interest and tax deductions. Useful for comparing profitability across different capital structures and tax jurisdictions.',
    source: 'SEC CompanyFacts (derived)',
  },
  ebitda: {
    fullName: 'EBITDA',
    tooltip: 'Earnings before interest, taxes, depreciation, and amortization. Approximates operating cash generation but ignores capital expenditure requirements.',
    formula: 'EBIT + depreciation + amortization',
    source: 'SEC CompanyFacts (derived)',
  },
  netinc: {
    fullName: 'Net Income',
    tooltip: 'Bottom-line profit after all expenses, interest, and taxes. The basis for EPS and retained earnings. One-time items can distort period-to-period comparisons.',
    source: 'SEC CompanyFacts (NetIncomeLoss)',
  },
  eps: {
    fullName: 'Earnings Per Share',
    tooltip: 'Net income allocated to each diluted share outstanding. Negative values indicate net losses. Best compared against prior periods and peer benchmarks.',
    formula: 'net income / diluted shares outstanding',
    source: 'SEC CompanyFacts (EarningsPerShareDiluted)',
  },
  interestexp: {
    fullName: 'Interest Expense',
    tooltip: 'Cost of servicing debt obligations. Rising interest expense relative to operating income can signal deteriorating debt serviceability.',
    source: 'SEC CompanyFacts (InterestExpense)',
  },
  depamor: {
    fullName: 'Depreciation & Amortization',
    tooltip: 'Non-cash charges for the wear of tangible assets and the expiration of intangible assets. Added back to net income when computing EBITDA and operating cash flow.',
    source: 'SEC CompanyFacts (DepreciationDepletionAndAmortization)',
  },
  compinc: {
    fullName: 'Comprehensive Income',
    tooltip: 'Net income plus other comprehensive items such as unrealized gains/losses on securities and foreign currency translation. Can diverge significantly from net income for financial companies.',
    source: 'SEC CompanyFacts (ComprehensiveIncomeNetOfTax)',
  },
  taxexp: {
    fullName: 'Tax Expense',
    tooltip: 'Income tax provision for the period. Unusually low effective tax rates may reflect credits, deferrals, or jurisdictional benefits that could reverse.',
    source: 'SEC CompanyFacts (IncomeTaxExpenseBenefit)',
  },
  sbcomp: {
    fullName: 'Stock-Based Compensation',
    tooltip: 'Non-cash expense for equity awards to employees. Dilutes shareholders over time and can represent a significant portion of total compensation at tech companies.',
    source: 'SEC CompanyFacts (ShareBasedCompensation)',
  },

  // —— Balance sheet ——
  assets: {
    fullName: 'Total Assets',
    tooltip: 'Everything the company owns or controls. Compare against liabilities to assess net worth and against revenue to gauge asset intensity.',
    source: 'SEC CompanyFacts (Assets)',
  },
  assetscurrent: {
    fullName: 'Current Assets',
    tooltip: 'Assets expected to be converted to cash or consumed within one year. Includes cash, receivables, and inventory. The numerator in the current ratio.',
    source: 'SEC CompanyFacts (AssetsCurrent)',
  },
  liabilities: {
    fullName: 'Total Liabilities',
    tooltip: 'All obligations owed to creditors. Includes both current (due within a year) and long-term liabilities. Compare against assets and equity for solvency assessment.',
    source: 'SEC CompanyFacts (Liabilities)',
  },
  liabilitiescurrent: {
    fullName: 'Current Liabilities',
    tooltip: 'Obligations due within one year including payables, short-term debt, and accrued expenses. The denominator in the current ratio.',
    source: 'SEC CompanyFacts (LiabilitiesCurrent)',
  },
  equity: {
    fullName: 'Shareholders\' Equity',
    tooltip: 'Net assets belonging to shareholders (assets minus liabilities). Negative equity indicates accumulated losses exceed contributed capital and retained earnings.',
    formula: 'total assets − total liabilities',
    source: 'SEC CompanyFacts (StockholdersEquity)',
  },
  retearn: {
    fullName: 'Retained Earnings',
    tooltip: 'Cumulative net income retained in the business rather than distributed as dividends. Negative retained earnings (accumulated deficit) indicate historical net losses.',
    source: 'SEC CompanyFacts (RetainedEarningsAccumulatedDeficit)',
  },
  debt: {
    fullName: 'Total Debt',
    tooltip: 'Combined short-term and long-term borrowings. Excludes non-debt liabilities like accounts payable and deferred revenue.',
    source: 'SEC CompanyFacts (LongTermDebt + ShortTermBorrowings)',
  },
  debtlt: {
    fullName: 'Long-Term Debt',
    tooltip: 'Borrowings due beyond one year. Represents the structural leverage of the business. Compare maturity schedules against cash flow to assess refinancing risk.',
    source: 'SEC CompanyFacts (LongTermDebt)',
  },
  debtcurrent: {
    fullName: 'Current Debt',
    tooltip: 'Debt maturing within one year. High current debt relative to cash and operating cash flow may signal near-term refinancing pressure.',
    source: 'SEC CompanyFacts (ShortTermBorrowings / LongTermDebtCurrent)',
  },
  cashneq: {
    fullName: 'Cash & Equivalents',
    tooltip: 'Liquid assets available for immediate use. Compare against total debt to assess net cash positioning and financial flexibility.',
    source: 'SEC CompanyFacts (CashAndCashEquivalentsAtCarryingValue)',
  },
  goodwill: {
    fullName: 'Goodwill',
    tooltip: 'Premium paid above fair value in acquisitions. Not amortized but tested annually for impairment. Large goodwill relative to assets indicates acquisition-driven growth.',
    source: 'SEC CompanyFacts (Goodwill)',
  },
  intangibles: {
    fullName: 'Intangible Assets',
    tooltip: 'Non-physical assets such as patents, trademarks, and customer relationships. Subject to amortization (unlike goodwill). High intangibles may inflate book value.',
    source: 'SEC CompanyFacts (IntangibleAssetsNetExcludingGoodwill)',
  },
  ppnenet: {
    fullName: 'Property, Plant & Equipment (Net)',
    tooltip: 'Tangible long-lived assets net of accumulated depreciation. High PP&E relative to assets indicates a capital-intensive business model.',
    source: 'SEC CompanyFacts (PropertyPlantAndEquipmentNet)',
  },
  inventory: {
    fullName: 'Inventory',
    tooltip: 'Goods held for sale or in production. Rising inventory relative to revenue may signal slowing demand or overproduction. Not applicable to service or software businesses.',
    source: 'SEC CompanyFacts (InventoryNet)',
  },
  receivables: {
    fullName: 'Receivables',
    tooltip: 'Amounts owed by customers for delivered goods or services. Growing receivables faster than revenue can indicate collection issues or aggressive revenue recognition.',
    source: 'SEC CompanyFacts (AccountsReceivableNetCurrent)',
  },
  payables: {
    fullName: 'Payables',
    tooltip: 'Amounts owed to suppliers and vendors. Extending payables can improve short-term cash flow but may strain supplier relationships.',
    source: 'SEC CompanyFacts (AccountsPayableCurrent)',
  },
  workingcapital: {
    fullName: 'Working Capital',
    tooltip: 'Current assets minus current liabilities. Measures short-term liquidity and operational funding capacity. Negative working capital is common in subscription and prepaid business models.',
    formula: 'current assets − current liabilities',
    source: 'SEC CompanyFacts (derived)',
  },
  sharesbas: {
    fullName: 'Shares Outstanding',
    tooltip: 'Total shares of common stock currently outstanding. Increasing share counts indicate dilution from equity issuance or stock-based compensation.',
    source: 'SEC CompanyFacts (CommonStockSharesOutstanding / WeightedAverageShares)',
  },

  // —— Cash flow ——
  ncfo: {
    fullName: 'Operating Cash Flow',
    tooltip: 'Cash generated from core business operations. Often considered more reliable than net income because it is harder to manipulate through accounting choices.',
    source: 'SEC CompanyFacts (NetCashProvidedByOperatingActivities)',
  },
  capex: {
    fullName: 'Capital Expenditures',
    tooltip: 'Spending on property, equipment, and other long-term assets. Necessary for maintenance and growth but reduces free cash flow available to shareholders.',
    source: 'SEC CompanyFacts (PaymentsToAcquirePropertyPlantAndEquipment)',
  },
  fcf: {
    fullName: 'Free Cash Flow',
    tooltip: 'Cash remaining after operating expenses and capital expenditures. Represents the cash available for debt repayment, dividends, buybacks, or reinvestment.',
    formula: 'operating cash flow − capital expenditures',
    source: 'SEC CompanyFacts (derived)',
  },
  ncfi: {
    fullName: 'Investing Cash Flow',
    tooltip: 'Cash used for or generated from investment activities including acquisitions, asset sales, and securities. Large negative values often reflect growth investment or M&A.',
    source: 'SEC CompanyFacts (NetCashProvidedByInvestingActivities)',
  },
  ncff: {
    fullName: 'Financing Cash Flow',
    tooltip: 'Cash from debt issuance, equity raises, buybacks, and dividends. Persistent positive financing CF may indicate reliance on external funding.',
    source: 'SEC CompanyFacts (NetCashProvidedByFinancingActivities)',
  },
  ncfdiv: {
    fullName: 'Dividends Paid',
    tooltip: 'Cash distributed to shareholders as dividends. Compare against free cash flow to assess whether the dividend is sustainably funded from operations.',
    source: 'SEC CompanyFacts (PaymentsOfDividends)',
  },
  ncfdebt: {
    fullName: 'Debt Issued / Repurchased',
    tooltip: 'Net cash from borrowing or repaying debt. Positive values indicate net borrowing; negative values indicate net repayment or deleveraging.',
    source: 'SEC CompanyFacts (ProceedsFromIssuanceOfDebt − RepaymentsOfDebt)',
  },
  ncfcommon: {
    fullName: 'Common Stock Issued / Repurchased',
    tooltip: 'Net cash from issuing or repurchasing common stock. Negative values typically indicate share buybacks; positive values indicate equity raises.',
    source: 'SEC CompanyFacts (ProceedsFromIssuanceOfCommonStock − PaymentsForRepurchaseOfCommonStock)',
  },
  ncf: {
    fullName: 'Net Cash Flow',
    tooltip: 'Total change in cash position across operating, investing, and financing activities. Persistent negative NCF without offsetting growth may signal structural cash burn.',
    formula: 'operating CF + investing CF + financing CF',
    source: 'SEC CompanyFacts (derived)',
  },

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
  ebitdaEv: {
    fullName: 'EBITDA / Enterprise Value',
    tooltip: 'EBITDA divided by enterprise value (inverse EV/EBITDA). Higher values generally indicate more operating earnings relative to enterprise value, though results can be distorted by cyclical peaks or negative EBITDA.',
    formula: 'EBITDA / (marketCap + debt − cash)',
    source: 'SEC CompanyFacts + prices (derived)',
  },
  evEbitda: {
    fullName: 'EV / EBITDA',
    tooltip: 'Enterprise value relative to EBITDA. Lower multiples often indicate cheaper operating earnings, but cyclical troughs or one-time EBITDA spikes can distort the ratio.',
    formula: '(marketCap + debt − cash) / EBITDA',
    source: 'SEC CompanyFacts + prices (derived)',
  },
  evSales: {
    fullName: 'EV / Sales',
    tooltip: 'Enterprise value per dollar of revenue. Useful for comparing unprofitable or low-margin businesses; high multiples imply growth or quality expectations.',
    formula: '(marketCap + debt − cash) / revenue',
    source: 'SEC CompanyFacts + prices (derived)',
  },
  fcfYield: {
    fullName: 'FCF Yield',
    tooltip: 'Free cash flow relative to enterprise value. Higher yields suggest stronger cash return on the capital base, though capex timing can swing FCF sharply.',
    formula: 'free cash flow / enterprise value',
    source: 'SEC CompanyFacts + prices (derived)',
  },
  earningsYield: {
    fullName: 'Earnings Yield',
    tooltip: 'Inverse of P/E — earnings power relative to price. Higher yields may indicate value, but distressed or cyclical earnings reduce comparability.',
    formula: 'EPS / price (or net income / market cap)',
    source: 'SEC CompanyFacts + prices (derived)',
  },
  roic: {
    fullName: 'Return on Invested Capital',
    tooltip: 'NOPAT on invested capital (debt + equity − cash). Sustained high ROIC often signals durable competitive advantage; leverage and goodwill can inflate or depress readings.',
    formula: 'NOPAT / (debt + equity − cash)',
    source: 'SEC CompanyFacts (derived)',
  },
  netDebt: {
    fullName: 'Net Debt',
    tooltip: 'Total debt minus cash. Positive net debt means the firm owes more than it holds in cash; negative net debt is a net cash position.',
    formula: 'total debt − cash & equivalents',
    source: 'SEC CompanyFacts',
  },
  payoutRatio: {
    fullName: 'Payout Ratio',
    tooltip: 'Dividends paid relative to net income. High ratios may signal generous returns or limited reinvestment capacity; negative earnings make the ratio meaningless.',
    formula: '|dividends paid| / net income',
    source: 'SEC CompanyFacts',
  },
  inventoryTurnover: {
    fullName: 'Inventory Turnover',
    tooltip: 'Cost of revenue relative to inventory. Higher turnover usually means faster inventory cycles; very low turnover may indicate obsolescence or demand issues.',
    formula: 'cost of revenue / inventory',
    source: 'SEC CompanyFacts',
  },
  receivablesDays: {
    fullName: 'Receivables Days (DSO)',
    tooltip: 'Average days to collect receivables. Rising DSO can signal collection pressure or revenue quality concerns; industry norms vary widely.',
    formula: 'receivables / revenue × 365',
    source: 'SEC CompanyFacts',
  },
  payablesDays: {
    fullName: 'Payables Days (DPO)',
    tooltip: 'Average days to pay suppliers. Longer DPO can improve cash flow but may strain vendor relationships if taken to extremes.',
    formula: 'payables / cost of revenue × 365',
    source: 'SEC CompanyFacts',
  },
  tangibleBookPerShare: {
    fullName: 'Tangible Book per Share',
    tooltip: 'Book equity minus goodwill and intangibles, per share. Most meaningful for asset-heavy businesses; many growth firms have little tangible book.',
    formula: '(equity − goodwill − intangibles) / shares outstanding',
    source: 'SEC CompanyFacts',
  },
  quickRatio: {
    fullName: 'Quick Ratio',
    tooltip: 'Liquid assets (excluding inventory) vs current liabilities. Below 1.0 may indicate near-term liquidity stress depending on industry.',
    formula: '(current assets − inventory) / current liabilities',
    source: 'SEC CompanyFacts',
  },
  cfoMargin: {
    fullName: 'CFO Margin',
    tooltip: 'Operating cash flow as % of revenue. Strong CFO margins indicate cash-generative operations independent of accrual accounting.',
    formula: 'operating cash flow / revenue',
    source: 'SEC CompanyFacts',
  },
  assetTurnover: {
    fullName: 'Asset Turnover',
    tooltip: 'Revenue per dollar of assets. Higher turnover reflects asset efficiency; capital-intensive sectors naturally run lower turnover.',
    formula: 'revenue / total assets',
    source: 'SEC CompanyFacts',
  },
  debtAssets: {
    fullName: 'Debt / Assets',
    tooltip: 'Share of assets financed by debt. Rising ratios increase financial risk, especially when combined with weak coverage or margins.',
    formula: 'total debt / total assets',
    source: 'SEC CompanyFacts',
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
  divYield: {
    fullName: 'Dividend Yield',
    tooltip: 'Annual dividend yield based on current share price. High yields may reflect either shareholder returns or concerns about payout sustainability.',
    formula: 'dividends per share / price',
    source: 'SEC CompanyFacts + prices',
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
  revenueYoY: 'yoy',
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
