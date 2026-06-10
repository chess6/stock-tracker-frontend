/**
 * Institutional deep-value conditional formatting for research grids.
 * Thresholds and heatmap modes come from the backend metric registry (P1).
 * @see docs/HEATMAP_AND_SCORING_PHILOSOPHY.md
 */

import { formatMetricCellTooltip } from '../config/tooltipRegistry';
import {
  tierHeatStyle,
  signedHeatStyle,
  marginHeatStyle,
} from './heatMap';

export { marginHeatStyle };

export const COLOR_MODES = ['deep_value', 'historical', 'sector'];

const TIER_LABELS = ['distress', 'weak', 'neutral', 'good', 'strong', 'elite'];

/** UI-only trend metrics not yet in backend registry. */
const LOCAL_TREND_RULES = {
  grossMargin3yrDelta: { category: 'trend', higherIsBetter: true },
  operatingMargin3yrDelta: { category: 'trend', higherIsBetter: true },
  shareDilutionRate: { category: 'trend', higherIsBetter: false, invertTrend: true },
  intensityScore90d: { category: 'trend', higherIsBetter: true },
  buySellRatio: { category: 'trend', higherIsBetter: true },
  yoy: { category: 'trend', higherIsBetter: true },
  cagr: { category: 'trend', higherIsBetter: true },
};

/** Populated from backend registry via applyRegistryRules(); includes LOCAL_TREND_RULES. */
export const METRIC_RULES = { ...LOCAL_TREND_RULES };

/** Fallback when registry has not loaded; prefer METRIC_RULES from applyRegistryRules(). */
const LEGACY_HEATMAP_MAP = {
  margin: 'profitability',
  column: 'valuation',
  piotroski: 'score',
  altman: 'score',
  beneish: 'score',
  survivability: 'score',
  signed: 'trend',
};

const REGISTRY_CATEGORY_MAP = {
  profitability: 'profitability',
  valuation: 'valuation',
  liquidity: 'distress',
  distress: 'distress',
  growth: 'trend',
  deep_value: 'valuation',
  score: 'score',
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

/**
 * Map a value to tier 0–5 using registry danger/excellent thresholds.
 * @param {number} num — normalized numeric value
 * @param {{ higherIsBetter?: boolean, dangerThreshold?: number|null, excellentThreshold?: number|null }} rule
 */
export function tierFromRegistryThresholds(num, rule = {}) {
  if (!isValidNumber(num)) return null;
  const higher = rule.higherIsBetter !== false;
  const danger = rule.dangerThreshold;
  const excellent = rule.excellentThreshold;
  if (danger == null && excellent == null) return null;

  if (higher) {
    const floor = danger ?? -Infinity;
    const ceiling = excellent ?? Infinity;
    if (num >= ceiling) return 5;
    if (num <= floor) return 0;
    const span = ceiling - floor;
    if (span <= 0) return 2;
    const t = (num - floor) / span;
    return Math.min(5, Math.max(1, Math.ceil(t * 5)));
  }

  const ceiling = excellent ?? -Infinity;
  const floor = danger ?? Infinity;
  if (num <= ceiling) return 5;
  if (num >= floor) return 0;
  const span = floor - ceiling;
  if (span <= 0) return 2;
  const t = (floor - num) / span;
  return Math.min(5, Math.max(1, Math.ceil(t * 5)));
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
  const scoreType = rule?.scoreType;
  const num = Number(value);

  switch (scoreType) {
    case 'piotroski': {
      const n = Math.round(num);
      if (n >= 8) return 5;
      if (n >= 6) return 4;
      if (n >= 3) return 2;
      return 0;
    }
    case 'altman':
      if (num > 4) return 5;
      if (num > 2.99) return 4;
      if (num >= 1.81) return 2;
      return 0;
    case 'beneish':
      return num > -1.78 ? 0 : 4;
    case 'survivability':
      if (num >= 80) return 5;
      if (num >= 60) return 4;
      if (num >= 40) return 2;
      if (num >= 20) return 1;
      return 0;
    default:
      return null;
  }
}

function registryEntryToRule(entry) {
  const apiKey = entry.api_key || entry.key;
  const category = REGISTRY_CATEGORY_MAP[entry.category] || entry.category || 'profitability';
  const rule = {
    metricKey: apiKey,
    canonicalKey: entry.key,
    category,
    label: entry.label,
    format: entry.format,
    higherIsBetter: entry.higher_is_better !== false,
    heatmapMode: entry.heatmap_mode,
    dangerThreshold: entry.danger_threshold ?? null,
    excellentThreshold: entry.excellent_threshold ?? null,
    fromRegistry: true,
  };
  if (category === 'score' && entry.score_type) {
    rule.scoreType = entry.score_type;
  }
  if (category === 'valuation' && entry.higher_is_better === false) {
    rule.higherIsBetter = false;
  }
  return rule;
}

/**
 * Apply backend registry entries as the source of truth for heatmap rules.
 * @param {Array<object>} entries — from GET /api/research/metrics/registry
 */
export function applyRegistryRules(entries = []) {
  entries.forEach((entry) => {
    const apiKey = entry.api_key || entry.key;
    if (!apiKey) return;
    METRIC_RULES[apiKey] = registryEntryToRule(entry);
  });
}

/**
 * @deprecated Use applyRegistryRules() — canonical registry merge.
 * @see docs/P5_CLEANUP_FOLLOWUP.md
 */
export function mergeRegistryRules(entries = []) {
  return applyRegistryRules(entries);
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

function deepValueTier(metricKey, value, format) {
  if (!isValidNumber(value)) return null;
  const rule = resolveMetricRule(metricKey);
  if (!rule) return null;

  const num = normalizeRatio(value, rule.format || format) ?? Number(value);
  // Score models (e.g. Beneish M) may be negative when healthy — do not force distress.
  if (num < 0 && rule.category !== 'trend' && rule.category !== 'score') return 0;

  if (rule.category === 'score') {
    return scoreTierForMetric(metricKey, value);
  }

  if (rule.category === 'trend') {
    return deepValueTrendTier(value, rule.higherIsBetter, rule.invertTrend);
  }

  const tier = tierFromRegistryThresholds(num, rule);
  if (tier != null) return tier;

  if (rule.category === 'profitability' || rule.heatmapMode === 'percentile') {
    return tierFromRegistryThresholds(num, {
      higherIsBetter: true,
      dangerThreshold: rule.dangerThreshold ?? 0,
      excellentThreshold: rule.excellentThreshold ?? 0.4,
    });
  }

  return null;
}

/**
 * @returns {number|null} tier 0–5
 */
export function getScoreTier(value, metricKey, context = {}) {
  const rule = resolveMetricRule(metricKey, context.legacyHeatmap);
  if (!rule || !isValidNumber(value)) return null;

  const format = context.format || rule.format;
  const num = normalizeRatio(value, format) ?? Number(value);
  if (num < 0 && rule.category !== 'trend' && rule.category !== 'score') return 0;

  const mode = context.mode || 'deep_value';

  // Score-tier metrics use fixed bands, not row percentiles.
  if (rule.category === 'score' && rule.heatmapMode === 'score_tier') {
    return scoreTierForMetric(metricKey, value);
  }

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

  return {};
}

/**
 * @deprecated Use getMetricBackground(...).color
 * @see docs/P5_CLEANUP_FOLLOWUP.md
 */
export function getMetricTextColor(metricKey, value, context = {}) {
  return getMetricBackground(metricKey, value, context).color;
}

/** @deprecated Use getMetricBackground — alias of getMetricTextColor */
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

/** @deprecated Use getMetricBackground('beneishM', value, { mode: 'deep_value' }) */
export function beneishHeatStyle(value) {
  return getMetricBackground('beneishM', value, { mode: 'deep_value' });
}

/** @deprecated Use getMetricBackground('survivability', value, { mode: 'deep_value' }) */
export function survivabilityHeatStyle(value) {
  return getMetricBackground('survivability', value, { mode: 'deep_value' });
}

/** @deprecated Use getMetricBackground('piotroskiF', value, { mode: 'deep_value' }) */
export function piotroskiHeatStyle(value) {
  return getMetricBackground('piotroskiF', value, { mode: 'deep_value' });
}

/** @deprecated Use getMetricBackground('altmanZ', value, { mode: 'deep_value' }) */
export function altmanZHeatStyle(value) {
  return getMetricBackground('altmanZ', value, { mode: 'deep_value' });
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
      sector: context.sectorByMetric?.[metricKey] ?? context.sector,
      format: row.format,
      legacyHeatmap: row.heatmap,
    };
    styles[`${prefix}${idx}`] = getMetricBackground(metricKey, val, cellContext);
    styles[`${prefix}${idx}Title`] = formatMetricCellTooltip(
      metricKey,
      describeHeat(metricKey, val, cellContext),
    );
  }
  return styles;
}

/**
 * @deprecated Use getMetricBackground(metricKey, value, context) directly.
 * Kept for parity tests during P5 migration.
 */
export function screenerCellHeatStyle(metricKey, value, {
  mode = 'deep_value',
  format,
  historical,
  sectorBreakpoints,
} = {}) {
  return getMetricBackground(metricKey, value, {
    mode,
    format,
    historical,
    sector: sectorBreakpoints,
  });
}

/**
 * Precompute screener heat styles for all ticker columns (sector or cross-sectional modes).
 * @param {object} row — metric row with t0…tN values
 * @param {string[]} tickers
 * @param {object} screenerData
 * @param {object|null} sectorStats
 * @param {string} colorMode
 */
export function precomputeScreenerRowHeatStyles(row, tickers, screenerData, sectorStats, colorMode) {
  const styles = {};
  const metricKey = row.metricKey || row.id;
  if (!metricKey || row._isGroupHeader) return styles;

  const historical = row._historicalStats;
  const mode = colorMode === 'historical' ? 'historical' : colorMode;

  tickers.forEach((ticker, idx) => {
    const colKey = `t${idx}`;
    const val = row[colKey];
    const sector = screenerData[ticker]?.sector;
    const cellContext = {
      mode,
      format: row.format,
      historical,
      sector: colorMode === 'sector'
        ? sectorStats?.bySector?.[sector]?.[metricKey]
        : undefined,
    };
    styles[colKey] = getMetricBackground(metricKey, val, cellContext);
    styles[`${colKey}Title`] = formatMetricCellTooltip(
      metricKey,
      describeHeat(metricKey, val, cellContext),
    );
  });
  return styles;
}
