/**
 * Institutional deep-value conditional formatting for research grids.
 * @see docs/HEATMAP_AND_SCORING_PHILOSOPHY.md
 */

import {
  tierHeatStyle,
  signedHeatStyle,
  marginHeatStyle,
  piotroskiHeatStyle,
  altmanZHeatStyle,
} from './heatMap';

export { marginHeatStyle, piotroskiHeatStyle, altmanZHeatStyle };

export const COLOR_MODES = ['deep_value', 'historical', 'sector'];

const TIER_LABELS = ['distress', 'weak', 'neutral', 'good', 'strong', 'elite'];

/** Metric scoring rules keyed by API camelCase field names. */
export const METRIC_RULES = {
  grossMargin: { category: 'profitability', higherIsBetter: true },
  netMargin: { category: 'profitability', higherIsBetter: true },
  operatingMargin: { category: 'profitability', higherIsBetter: true },
  ebitdaMargin: { category: 'profitability', higherIsBetter: true },
  fcfMargin: { category: 'profitability', higherIsBetter: true },
  cfoMargin: { category: 'profitability', higherIsBetter: true },
  roe: { category: 'profitability', higherIsBetter: true },
  roa: { category: 'profitability', higherIsBetter: true },
  pe: { category: 'valuation', higherIsBetter: false },
  pb: { category: 'valuation', higherIsBetter: false },
  ebitdaEv: { category: 'valuation', higherIsBetter: true },
  earningsYield: { category: 'profitability', higherIsBetter: true },
  de: { category: 'distress', higherIsBetter: false },
  debtAssets: { category: 'distress', higherIsBetter: false },
  currentRatio: { category: 'distress', higherIsBetter: true },
  quickRatio: { category: 'distress', higherIsBetter: true },
  interestCoverage: { category: 'distress', higherIsBetter: true },
  cashToDebt: { category: 'distress', higherIsBetter: true },
  piotroskiF: { category: 'score', scoreType: 'piotroski' },
  altmanZ: { category: 'score', scoreType: 'altman' },
  beneishM: { category: 'score', scoreType: 'beneish' },
  survivability: { category: 'score', scoreType: 'survivability' },
  grossMargin3yrDelta: { category: 'trend', higherIsBetter: true },
  operatingMargin3yrDelta: { category: 'trend', higherIsBetter: true },
  shareDilutionRate: { category: 'trend', higherIsBetter: false, invertTrend: true },
  intensityScore90d: { category: 'trend', higherIsBetter: true },
  buySellRatio: { category: 'trend', higherIsBetter: true },
  yoy: { category: 'trend', higherIsBetter: true },
  cagr: { category: 'trend', higherIsBetter: true },
};

const LEGACY_HEATMAP_MAP = {
  margin: 'profitability',
  column: 'valuation',
  piotroski: 'score',
  altman: 'score',
  beneish: 'score',
  survivability: 'score',
  signed: 'trend',
};

function isValidNumber(value) {
  return value != null && !Number.isNaN(Number(value));
}

function normalizeRatio(value, format) {
  if (!isValidNumber(value)) return null;
  const num = Number(value);
  if (format === 'percent' && Math.abs(num) > 1) {
    return num / 100;
  }
  return num;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Build historical percentile breakpoints from period values.
 * @param {Array<number|null|undefined>} values
 */
export function buildHistoricalStats(values) {
  const nums = (values || [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (!nums.length) {
    return { min: null, max: null, count: 0 };
  }
  const sorted = [...nums].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p20: percentile(sorted, 0.2),
    p40: percentile(sorted, 0.4),
    p60: percentile(sorted, 0.6),
    p80: percentile(sorted, 0.8),
    p95: percentile(sorted, 0.95),
    count: sorted.length,
  };
}

function historicalTier(value, stats, higherIsBetter) {
  if (!stats || stats.count < 2 || !isValidNumber(value)) return null;
  const num = Number(value);
  if (num < 0) return 0;

  const breakpoints = higherIsBetter
    ? [stats.p20, stats.p40, stats.p60, stats.p80, stats.p95]
    : [stats.p80, stats.p60, stats.p40, stats.p20, stats.min];

  if (!higherIsBetter) {
    if (num <= breakpoints[4]) return 5;
    if (num <= breakpoints[3]) return 4;
    if (num <= breakpoints[2]) return 3;
    if (num <= breakpoints[1]) return 2;
    if (num <= breakpoints[0]) return 1;
    return 0;
  }

  if (num >= breakpoints[4]) return 5;
  if (num >= breakpoints[3]) return 4;
  if (num >= breakpoints[2]) return 3;
  if (num >= breakpoints[1]) return 2;
  if (num >= breakpoints[0]) return 1;
  return 0;
}

function deepValueProfitabilityTier(value) {
  const num = Number(value);
  if (num < 0) return 0;
  if (num >= 0.40) return 5;
  if (num >= 0.25) return 4;
  if (num >= 0.15) return 3;
  if (num >= 0.05) return 2;
  if (num > 0) return 1;
  return 2;
}

function deepValuePeTier(value) {
  const num = Number(value);
  if (num <= 0) return 0;
  if (num < 8) return 5;
  if (num < 12) return 4;
  if (num < 20) return 3;
  if (num < 35) return 2;
  if (num < 50) return 1;
  return 0;
}

function deepValuePbTier(value) {
  const num = Number(value);
  if (num <= 0) return 0;
  if (num < 0.7) return 5;
  if (num < 1.0) return 4;
  if (num < 1.5) return 3;
  if (num < 2.5) return 2;
  if (num < 4.0) return 1;
  return 0;
}

function deepValueDeTier(value) {
  const num = Number(value);
  if (num < 0) return 0;
  if (num < 0.5) return 5;
  if (num < 1.0) return 4;
  if (num < 1.5) return 3;
  if (num < 2.0) return 2;
  if (num < 3.0) return 1;
  return 0;
}

function deepValueCurrentRatioTier(value) {
  const num = Number(value);
  if (num < 1) return 0;
  if (num > 2.5) return 5;
  if (num > 1.5) return 4;
  if (num >= 1.2) return 3;
  if (num >= 1) return 2;
  return 1;
}

function deepValueInterestCoverageTier(value) {
  const num = Number(value);
  if (num < 0) return 0;
  if (num >= 8) return 5;
  if (num >= 3) return 4;
  if (num >= 1.5) return 3;
  if (num >= 1) return 2;
  if (num > 0) return 1;
  return 0;
}

function deepValueTrendTier(value, higherIsBetter, invertTrend = false) {
  if (!isValidNumber(value)) return null;
  const num = Number(value);
  const effective = invertTrend ? -num : num;
  const pct = Math.abs(effective) <= 1 ? effective * 100 : effective;
  if (Math.abs(pct) < 0.5) return 2;
  if (pct > 0) {
    if (pct >= 15) return 5;
    if (pct >= 8) return 4;
    if (pct >= 3) return 3;
    return 2;
  }
  if (pct <= -15) return 0;
  if (pct <= -8) return 1;
  return 2;
}

function scoreTierForMetric(metricKey, value) {
  if (!isValidNumber(value)) return null;
  const rule = METRIC_RULES[metricKey];
  const scoreType = rule?.scoreType
    || (metricKey === 'piotroskiF' ? 'piotroski' : null)
    || (metricKey === 'altmanZ' ? 'altman' : null)
    || (metricKey === 'beneishM' ? 'beneish' : null)
    || (metricKey === 'survivability' ? 'survivability' : null);

  const num = Number(value);
  switch (scoreType) {
    case 'piotroski': {
      const n = Math.round(num);
      if (n >= 8) return 5;
      if (n >= 6) return 4;
      if (n >= 3) return 2;
      return 0;
    }
    case 'altman': {
      if (num > 4) return 5;
      if (num > 2.99) return 4;
      if (num >= 1.81) return 2;
      return 0;
    }
    case 'beneish':
      return num > -1.78 ? 0 : 4;
    case 'survivability': {
      if (num >= 80) return 5;
      if (num >= 60) return 4;
      if (num >= 40) return 2;
      if (num >= 20) return 1;
      return 0;
    }
    default:
      return null;
  }
}

function deepValueTier(metricKey, value, format) {
  if (!isValidNumber(value)) return null;
  const num = normalizeRatio(value, format) ?? Number(value);
  if (num < 0 && METRIC_RULES[metricKey]?.category !== 'trend') return 0;

  const rule = METRIC_RULES[metricKey];
  if (!rule) return null;

  if (rule.category === 'score') {
    return scoreTierForMetric(metricKey, value);
  }

  if (rule.category === 'trend') {
    return deepValueTrendTier(value, rule.higherIsBetter, rule.invertTrend);
  }

  switch (metricKey) {
    case 'pe':
      return deepValuePeTier(num);
    case 'pb':
      return deepValuePbTier(num);
    case 'de':
    case 'debtAssets':
      return deepValueDeTier(num);
    case 'currentRatio':
    case 'quickRatio':
      return deepValueCurrentRatioTier(num);
    case 'interestCoverage':
      return deepValueInterestCoverageTier(num);
    case 'cashToDebt':
      if (num >= 1.5) return 5;
      if (num >= 1.0) return 4;
      if (num >= 0.5) return 3;
      if (num >= 0.25) return 2;
      return 0;
    case 'ebitdaEv':
      if (num >= 0.20) return 5;
      if (num >= 0.12) return 4;
      if (num >= 0.08) return 3;
      if (num >= 0.05) return 2;
      return 0;
    default:
      if (rule.category === 'profitability') {
        return deepValueProfitabilityTier(num);
      }
      return null;
  }
}

export function resolveMetricRule(metricKey, legacyHeatmap) {
  if (METRIC_RULES[metricKey]) {
    return { metricKey, ...METRIC_RULES[metricKey] };
  }
  if (legacyHeatmap && LEGACY_HEATMAP_MAP[legacyHeatmap]) {
    return {
      metricKey,
      category: LEGACY_HEATMAP_MAP[legacyHeatmap],
      higherIsBetter: legacyHeatmap !== 'column' || metricKey === 'ebitdaEv',
      legacyHeatmap,
    };
  }
  return null;
}

/**
 * @returns {number|null} tier 0–5
 */
export function getScoreTier(value, metricKey, context = {}) {
  const rule = resolveMetricRule(metricKey, context.legacyHeatmap);
  if (!rule || !isValidNumber(value)) return null;

  const format = context.format;
  const num = normalizeRatio(value, format) ?? Number(value);
  if (num < 0 && rule.category !== 'trend') return 0;

  const mode = context.mode || 'deep_value';

  if (mode === 'historical' && context.historical) {
    const tier = historicalTier(num, context.historical, rule.higherIsBetter !== false);
    if (tier != null) return tier;
  }

  if (mode === 'sector' && context.sector) {
    const tier = historicalTier(num, context.sector, rule.higherIsBetter !== false);
    if (tier != null) return tier;
  }

  return deepValueTier(metricKey, value, format);
}

export function getMetricBackground(metricKey, value, context = {}) {
  const rule = resolveMetricRule(metricKey, context.legacyHeatmap);
  if (!rule) {
    if (context.legacyHeatmap === 'signed') {
      return signedHeatStyle(value, context.signedScale ?? 8);
    }
    if (context.legacyHeatmap === 'margin') {
      const normalized = normalizeRatio(value, 'percent');
      return marginHeatStyle(normalized, 0.2);
    }
    return {};
  }

  const tier = getScoreTier(value, metricKey, context);
  if (tier != null) {
    return tierHeatStyle(tier);
  }

  if (rule.category === 'score') {
    if (rule.scoreType === 'piotroski' || metricKey === 'piotroskiF') {
      return piotroskiHeatStyle(value);
    }
    if (rule.scoreType === 'altman' || metricKey === 'altmanZ') {
      return altmanZHeatStyle(value);
    }
  }

  return {};
}

export function getMetricTextColor(metricKey, value, context = {}) {
  return getMetricBackground(metricKey, value, context).color;
}

export function getMetricColor(metricKey, value, context = {}) {
  return getMetricTextColor(metricKey, value, context);
}

export function getTrendColor(delta, scale = 8) {
  if (!isValidNumber(delta)) return 'var(--st-text-muted)';
  const num = Number(delta);
  if (Math.abs(num) < 0.05) return 'var(--st-text-muted)';
  const magnitude = Math.min(Math.abs(num) / scale, 1);
  if (num > 0) {
    return `rgba(40, 167, 69, ${0.5 + magnitude * 0.5})`;
  }
  return `rgba(220, 53, 69, ${0.5 + magnitude * 0.5})`;
}

export function describeHeat(metricKey, value, context = {}) {
  const tier = getScoreTier(value, metricKey, context);
  if (tier == null) return '';
  const mode = context.mode || 'deep_value';
  const label = TIER_LABELS[tier] || 'neutral';
  const rule = resolveMetricRule(metricKey, context.legacyHeatmap);
  const category = rule?.category || 'metric';
  return `${category} · ${mode.replace('_', ' ')} · ${label} (tier ${tier}/5)`;
}

/** @deprecated use getMetricBackground with score rules */
export function beneishHeatStyle(value) {
  const tier = scoreTierForMetric('beneishM', value);
  return tier != null ? tierHeatStyle(tier) : {};
}

/** @deprecated use getMetricBackground with score rules */
export function survivabilityHeatStyle(value) {
  const tier = scoreTierForMetric('survivability', value);
  return tier != null ? tierHeatStyle(tier) : {};
}

export function precomputeRowHeatStyles(row, periodCount, context = {}) {
  const styles = {};
  const metricKey = row.metricKey || row.id;
  if (!metricKey || row._isGroupHeader) return styles;

  const historical = row._historicalStats
    || buildHistoricalStats(
      Array.from({ length: periodCount }, (_, idx) => row[`p${idx}`] ?? row[`t${idx}`]),
    );

  const prefix = row.p0 !== undefined ? 'p' : 't';
  for (let idx = 0; idx < periodCount; idx += 1) {
    const val = row[`${prefix}${idx}`];
    const cellContext = {
      ...context,
      historical,
      format: row.format,
      legacyHeatmap: row.heatmap,
    };
    styles[`${prefix}${idx}`] = getMetricBackground(metricKey, val, cellContext);
    styles[`${prefix}${idx}Title`] = describeHeat(metricKey, val, cellContext);
  }
  return styles;
}
