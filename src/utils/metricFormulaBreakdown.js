import { resolveFormulaMetricKey } from './formulaContext';
import { formatCompactNumber, formatCompactUsd, formatDecimal, formatPercent, spaceScaleSuffix } from './formatters';

function isValidNumber(value) {
  return value != null && value !== '' && Number.isFinite(Number(value));
}

function getNested(obj, path) {
  if (!path?.length) return obj;
  let current = obj;
  for (const key of path) {
    if (current == null) return null;
    current = current[key];
  }
  return current;
}

function resolveFundamental(fundamentals, keys) {
  if (!fundamentals || !keys?.length) return null;
  for (const key of keys) {
    const val = fundamentals[key];
    if (isValidNumber(val)) return Number(val);
  }
  return null;
}

function resolveDebt(fundamentals) {
  if (!fundamentals) return null;
  if (isValidNumber(fundamentals.debt)) return Number(fundamentals.debt);
  const current = fundamentals.debtcurrent;
  const longTerm = fundamentals.debtlt;
  if (isValidNumber(current) || isValidNumber(longTerm)) {
    return (Number(current) || 0) + (Number(longTerm) || 0);
  }
  return null;
}

function resolveGrossProfit(fundamentals) {
  if (!fundamentals) return null;
  const revenue = resolveFundamental(fundamentals, ['revenue']);
  const gp = resolveFundamental(fundamentals, ['gp']);
  const cor = resolveFundamental(fundamentals, ['cor']);
  if (gp != null && revenue != null && gp >= 0 && gp <= revenue * 1.02) return gp;
  if (revenue != null && cor != null && cor >= 0 && cor <= revenue * 1.02) {
    const derived = revenue - cor;
    if (derived >= 0 && (gp == null || Math.abs(derived - gp) <= Math.max(revenue * 0.05, 1))) {
      return derived;
    }
  }
  if (gp != null && revenue == null) return gp;
  return null;
}

function resolveRevenue(fundamentals) {
  if (!fundamentals) return null;
  const revenue = resolveFundamental(fundamentals, ['revenue']);
  if (revenue != null) return revenue;
  const gp = resolveFundamental(fundamentals, ['gp']);
  const cor = resolveFundamental(fundamentals, ['cor']);
  if (gp != null && cor != null) {
    const derived = gp + cor;
    if (derived > 0) return derived;
  }
  return null;
}

function resolveEnterpriseValue(data) {
  const f = data?.fundamentals;
  const shares = resolveFundamental(f, ['sharesbas']);
  const price = getNested(data, ['price', 'latest']);
  const debt = resolveDebt(f);
  const cash = resolveFundamental(f, ['cashneq']) ?? 0;
  let marketCap = data?.marketCap;
  if (!isValidNumber(marketCap) && isValidNumber(shares) && isValidNumber(price)) {
    marketCap = Number(shares) * Number(price);
  }
  if (!isValidNumber(marketCap)) return null;
  const ev = Number(marketCap) + (debt || 0) - cash;
  return ev > 0 ? ev : null;
}

function resolveMarketCap(data) {
  if (isValidNumber(data?.marketCap)) return Number(data.marketCap);
  const f = data?.fundamentals;
  const shares = resolveFundamental(f, ['sharesbas']);
  const price = getNested(data, ['price', 'latest']);
  if (isValidNumber(shares) && isValidNumber(price)) return Number(shares) * Number(price);
  return null;
}

function sharesDenominator() {
  return { resolve: (data) => resolveFundamental(data?.fundamentals, ['sharesbas']), format: 'shares' };
}

function formatOperandValue(value, format) {
  if (!isValidNumber(value)) return null;
  const num = Number(value);
  let formatted;
  switch (format) {
    case 'usd':
      formatted = formatCompactUsd(num);
      break;
    case 'percent':
      formatted = formatPercent(Math.abs(num) <= 1 ? num * 100 : num, Math.abs(num) >= 0.1 ? 1 : 2);
      break;
    case 'integer':
      formatted = String(Math.round(num));
      break;
    case 'shares':
      formatted = formatCompactNumber(num, 3);
      if (formatted !== '-') formatted = spaceScaleSuffix(formatted);
      break;
    case 'decimal':
    default:
      formatted = formatDecimal(num, Math.abs(num) >= 10 ? 1 : 2);
      break;
  }
  return formatted && formatted !== '-' ? spaceScaleSuffix(formatted) : null;
}

function formatResultValue(value, format) {
  if (!isValidNumber(value)) return null;
  const num = Number(value);
  let formatted;
  switch (format) {
    case 'percent':
      formatted = formatPercent(Math.abs(num) <= 1 ? num * 100 : num, 2);
      break;
    case 'integer':
      formatted = String(Math.round(num));
      break;
    case 'usd':
      formatted = formatCompactUsd(num);
      break;
    case 'decimal':
    default:
      formatted = formatDecimal(num, 2);
      break;
  }
  return formatted && formatted !== '-' ? spaceScaleSuffix(formatted) : null;
}

/** @typedef {{ resolve: (data: object) => number|null, format?: string }} FormulaOperandResolver */

/** @typedef {{ num: FormulaOperandResolver, den: FormulaOperandResolver, resultFormat?: string }} FormulaRatioSpec */

/** @type {Record<string, FormulaRatioSpec>} */
export const METRIC_FORMULA_SPECS = {
  grossMargin: {
    num: { resolve: (data) => resolveGrossProfit(data?.fundamentals), format: 'usd' },
    den: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    resultFormat: 'percent',
  },
  netMargin: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['netinc']), format: 'usd' },
    den: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    resultFormat: 'percent',
  },
  operatingMargin: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        return resolveFundamental(f, ['opinc']) ?? resolveFundamental(f, ['ebit']);
      },
      format: 'usd',
    },
    den: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    resultFormat: 'percent',
  },
  ebitdaMargin: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        return resolveFundamental(f, ['ebitda'])
          ?? resolveFundamental(f, ['opinc'])
          ?? resolveFundamental(f, ['ebit']);
      },
      format: 'usd',
    },
    den: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    resultFormat: 'percent',
  },
  fcfMargin: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        const fcf = resolveFundamental(f, ['fcf']);
        if (fcf != null) return fcf;
        const ncfo = resolveFundamental(f, ['ncfo']);
        const capex = resolveFundamental(f, ['capex']);
        if (ncfo == null) return null;
        return capex != null ? ncfo - capex : ncfo;
      },
      format: 'usd',
    },
    den: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    resultFormat: 'percent',
  },
  cfoMargin: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['ncfo']), format: 'usd' },
    den: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    resultFormat: 'percent',
  },
  roe: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['netinc']), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['equity']), format: 'usd' },
    resultFormat: 'percent',
  },
  roa: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['netinc']), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['assets']), format: 'usd' },
    resultFormat: 'percent',
  },
  de: {
    num: { resolve: (data) => resolveDebt(data?.fundamentals), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['equity']), format: 'usd' },
    resultFormat: 'decimal',
  },
  debtAssets: {
    num: { resolve: (data) => resolveDebt(data?.fundamentals), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['assets']), format: 'usd' },
    resultFormat: 'decimal',
  },
  currentRatio: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['assetscurrent']), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['liabilitiescurrent']), format: 'usd' },
    resultFormat: 'decimal',
  },
  quickRatio: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        const current = resolveFundamental(f, ['assetscurrent']);
        const inventory = resolveFundamental(f, ['inventory']) ?? 0;
        if (current == null) return null;
        return current - inventory;
      },
      format: 'usd',
    },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['liabilitiescurrent']), format: 'usd' },
    resultFormat: 'decimal',
  },
  cashToDebt: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['cashneq']), format: 'usd' },
    den: { resolve: (data) => resolveDebt(data?.fundamentals), format: 'usd' },
    resultFormat: 'decimal',
  },
  interestCoverage: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        return resolveFundamental(f, ['ebit']) ?? resolveFundamental(f, ['opinc']);
      },
      format: 'usd',
    },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['interestexp']), format: 'usd' },
    resultFormat: 'decimal',
  },
  assetTurnover: {
    num: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['assets']), format: 'usd' },
    resultFormat: 'decimal',
  },
  pe: {
    num: { resolve: (data) => getNested(data, ['price', 'latest']), format: 'usd' },
    den: { resolve: (data) => resolveFundamental(data?.fundamentals, ['eps']), format: 'decimal' },
    resultFormat: 'decimal',
  },
  pb: {
    num: { resolve: (data) => getNested(data, ['price', 'latest']), format: 'usd' },
    den: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        const equity = resolveFundamental(f, ['equity']);
        const shares = resolveFundamental(f, ['sharesbas']);
        if (equity == null || shares == null || shares === 0) return null;
        return equity / shares;
      },
      format: 'decimal',
    },
    resultFormat: 'decimal',
  },
  earningsYield: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['eps']), format: 'decimal' },
    den: { resolve: (data) => getNested(data, ['price', 'latest']), format: 'usd' },
    resultFormat: 'percent',
  },
  fcfYield: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        const fcf = resolveFundamental(f, ['fcf']);
        if (fcf != null) return fcf;
        const ncfo = resolveFundamental(f, ['ncfo']);
        const capex = resolveFundamental(f, ['capex']);
        if (ncfo == null) return null;
        return capex != null ? ncfo - capex : ncfo;
      },
      format: 'usd',
    },
    den: {
      resolve: (data) => {
        const f = data?.fundamentals;
        const price = getNested(data, ['price', 'latest']);
        const shares = resolveFundamental(f, ['sharesbas']);
        const debt = resolveDebt(f);
        const cash = resolveFundamental(f, ['cashneq']) ?? 0;
        if (price == null || shares == null) return null;
        const ev = shares * price + (debt || 0) - cash;
        return ev > 0 ? ev : null;
      },
      format: 'usd',
    },
    resultFormat: 'percent',
  },
  salesPerShare: {
    num: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  bookValuePerShare: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['equity']), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  revDebt: {
    num: { resolve: (data) => resolveRevenue(data?.fundamentals), format: 'usd' },
    den: { resolve: (data) => resolveDebt(data?.fundamentals), format: 'usd' },
    resultFormat: 'decimal',
  },
  mcEv: {
    num: { resolve: (data) => resolveMarketCap(data), format: 'usd' },
    den: { resolve: (data) => resolveEnterpriseValue(data), format: 'usd' },
    resultFormat: 'decimal',
  },
  cashflowOpsPerShare: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['ncfo']), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  fcfPerShare: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        const fcf = resolveFundamental(f, ['fcf']);
        if (fcf != null) return fcf;
        const ncfo = resolveFundamental(f, ['ncfo']);
        const capex = resolveFundamental(f, ['capex']);
        if (ncfo == null) return null;
        return capex != null ? ncfo - capex : ncfo;
      },
      format: 'usd',
    },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  ncfPerShare: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['ncf']), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  cashPerShare: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['cashneq']), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  assetPerShare: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['assets']), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  earningsPerShare: {
    num: { resolve: (data) => resolveFundamental(data?.fundamentals, ['netinc']), format: 'usd' },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
  tangibleBookPerShare: {
    num: {
      resolve: (data) => {
        const f = data?.fundamentals;
        if (!f) return null;
        const equity = resolveFundamental(f, ['equity']);
        if (equity == null) return null;
        const goodwill = resolveFundamental(f, ['goodwill']) ?? 0;
        const intangibles = resolveFundamental(f, ['intangibles']) ?? 0;
        return equity - goodwill - intangibles;
      },
      format: 'usd',
    },
    den: sharesDenominator(),
    resultFormat: 'decimal',
  },
};

/**
 * Structured formula operands for tooltip fraction rendering.
 * @param {string} metricKey
 * @param {object|null|undefined} tickerData
 * @param {number|null|undefined} resultValue
 * @returns {{ numerator: string, denominator: string, result: string }|null}
 */
export function getMetricFormulaBreakdown(metricKey, tickerData, resultValue) {
  if (!tickerData || tickerData.error) return null;
  const resolvedKey = resolveFormulaMetricKey(metricKey);
  const spec = METRIC_FORMULA_SPECS[resolvedKey];
  if (!spec) return null;

  const numerator = spec.num.resolve(tickerData);
  const denominator = spec.den.resolve(tickerData);
  if (!isValidNumber(numerator) || !isValidNumber(denominator) || denominator === 0) {
    return null;
  }

  const numStr = formatOperandValue(numerator, spec.num.format);
  const denStr = formatOperandValue(denominator, spec.den.format);
  const resultStr = formatResultValue(resultValue, spec.resultFormat)
    ?? formatResultValue(numerator / denominator, spec.resultFormat);
  if (!numStr || !denStr || !resultStr) return null;

  return { numerator: numStr, denominator: denStr, result: resultStr };
}

/** @deprecated Use getMetricFormulaBreakdown + MetricFormulaFraction */
export function formatMetricFormulaBreakdown(metricKey, tickerData, resultValue) {
  const breakdown = getMetricFormulaBreakdown(metricKey, tickerData, resultValue);
  if (!breakdown) return null;
  return `${breakdown.numerator} ÷ ${breakdown.denominator} = ${breakdown.result}`;
}

export function hasFormulaBreakdown(metricKey, dataContext) {
  return Boolean(getMetricFormulaBreakdown(metricKey, dataContext, 0));
}
