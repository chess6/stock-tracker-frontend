import { columnMinMax } from './heatMap';

const columnMinMaxCache = new Map();
const MAX_CACHE_ENTRIES = 48;

/**
 * Stable digest for row sets used in heatmap min/max — avoids JSON.stringify on every render.
 * @param {object[]} rows
 * @param {{ idKey?: string, metricKeys?: string[] }} [options]
 */
export function rowsDatasetKey(rows, { idKey = 'ticker', metricKeys = [] } = {}) {
  if (!rows?.length) return 'empty';
  const parts = [`n${rows.length}`];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    parts.push(String(row[idKey] ?? i));
    for (const key of metricKeys) {
      const val = row[key];
      parts.push(val == null || Number.isNaN(Number(val)) ? '_' : String(val));
    }
  }
  return parts.join('|');
}

/** @param {object[]} rows @param {string[]} metricKeys */
export function buildColumnMinMaxMap(rows, metricKeys) {
  const out = {};
  metricKeys.forEach((key) => {
    out[key] = columnMinMax(rows, key);
  });
  return out;
}

/**
 * Cached column min/max map keyed by rowsDatasetKey.
 * @param {object[]} rows
 * @param {string[]} metricKeys
 * @param {string} datasetKey
 */
export function getCachedColumnMinMaxMap(rows, metricKeys, datasetKey) {
  const cached = columnMinMaxCache.get(datasetKey);
  if (cached) return cached;

  const result = buildColumnMinMaxMap(rows, metricKeys);
  if (columnMinMaxCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = columnMinMaxCache.keys().next().value;
    columnMinMaxCache.delete(oldest);
  }
  columnMinMaxCache.set(datasetKey, result);
  return result;
}

/** Reset in-memory cache (tests). */
export function clearHeatmapCache() {
  columnMinMaxCache.clear();
}
