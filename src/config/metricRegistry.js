import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { applyRegistryRules, METRIC_RULES } from '../utils/scoringColors';

let cachedRegistry = null;
let loadPromise = null;

/**
 * Fetch canonical metric registry from backend (cached).
 * @returns {Promise<object[]>}
 */
export async function loadMetricRegistry() {
  if (cachedRegistry) return cachedRegistry;
  if (loadPromise) return loadPromise;
  loadPromise = axios.get(API_ENDPOINTS.RESEARCH_METRICS_REGISTRY)
    .then((res) => {
      cachedRegistry = res.data?.metrics || [];
      applyRegistryRules(cachedRegistry);
      return cachedRegistry;
    })
    .catch((err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[metricRegistry] failed to load registry; using local trend rules only', err?.message);
      }
      cachedRegistry = [];
      return cachedRegistry;
    })
    .finally(() => {
      loadPromise = null;
    });
  return loadPromise;
}

/** @returns {boolean} */
export function isRegistryLoaded() {
  return Array.isArray(cachedRegistry) && cachedRegistry.length > 0;
}

/** @returns {object|null} */
export function getRegistryEntry(apiKey) {
  if (!cachedRegistry) return null;
  return cachedRegistry.find((entry) => entry.api_key === apiKey)
    || cachedRegistry.find((entry) => entry.key === apiKey)
    || null;
}

/** @returns {object|null} resolved rule from METRIC_RULES */
export function getRegistryRule(apiKey) {
  return METRIC_RULES[apiKey] || null;
}

/**
 * Compare live registry entries to snapshot; returns drift messages (warn-only).
 * @param {object[]} live
 * @param {object[]} expected
 */
export function detectRegistryDrift(live = [], expected = []) {
  const drifts = [];
  const liveByKey = Object.fromEntries(live.map((e) => [e.key, e]));
  const expectedByKey = Object.fromEntries(expected.map((e) => [e.key, e]));

  Object.keys(expectedByKey).forEach((key) => {
    if (!liveByKey[key]) {
      drifts.push(`missing metric: ${key}`);
      return;
    }
    const a = expectedByKey[key];
    const b = liveByKey[key];
    ['api_key', 'heatmap_mode', 'higher_is_better', 'danger_threshold', 'excellent_threshold', 'score_type'].forEach((field) => {
      if (a[field] !== b[field]) {
        drifts.push(`${key}.${field}: expected ${JSON.stringify(a[field])} got ${JSON.stringify(b[field])}`);
      }
    });
  });

  live.forEach((entry) => {
    if (!expectedByKey[entry.key]) {
      drifts.push(`unexpected metric: ${entry.key}`);
    }
  });

  return drifts;
}

/** @internal test helper */
export function resetMetricRegistryForTests() {
  cachedRegistry = null;
  loadPromise = null;
  Object.keys(METRIC_RULES).forEach((key) => {
    if (!['grossMargin3yrDelta', 'operatingMargin3yrDelta', 'shareDilutionRate', 'intensityScore90d', 'buySellRatio', 'yoy', 'cagr'].includes(key)) {
      delete METRIC_RULES[key];
    }
  });
}
