/** YoY percent change between two numeric values. */
export function computeYoY(current, prior) {
  if (current == null || prior == null) return null;
  const cur = Number(current);
  const prev = Number(prior);
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** CAGR over `years` between start and end values (same-sign non-zero endpoints). */
export function computeCAGR(start, end, years) {
  if (start == null || end == null || years == null) return null;
  const s = Number(start);
  const e = Number(end);
  const n = Number(years);
  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(n) || n <= 0) return null;
  if (s === 0 || e === 0 || s * e < 0) return null;
  const ratio = Math.abs(e) / Math.abs(s);
  if (ratio <= 0) return null;
  return (Math.pow(ratio, 1 / n) - 1) * 100;
}

/**
 * YoY and CAGR from newest-first values aligned to visible grid columns.
 * When 3+ periods are shown, both trends appear together or both are null.
 */
export function computeTrendPair(columnValues) {
  const vals = Array.isArray(columnValues) ? columnValues : [];
  if (vals.length < 2) return { yoy: null, cagr: null };

  let yoy = computeYoY(vals[0], vals[1]);
  let cagr = null;

  if (vals.length >= 3) {
    let startIdx = vals.length - 1;
    while (startIdx > 0 && vals[startIdx] == null) startIdx -= 1;
    if (startIdx > 0 && vals[0] != null && vals[startIdx] != null) {
      cagr = computeCAGR(vals[startIdx], vals[0], startIdx);
    }
    if (yoy == null || cagr == null) {
      yoy = null;
      cagr = null;
    }
  }

  return { yoy, cagr };
}

/**
 * Normalize raw metric values for inline sparklines.
 * Indexing + y-axis padding avoids min-max scaling that makes small swings look spiky.
 */
export function prepareSparklineData(values, format) {
  const nums = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (nums.length < 2) {
    return { data: [], yMin: 0, yMax: 1, trendUp: null };
  }

  const trendUp = nums[nums.length - 1] >= nums[0];

  if (format === 'integer' && nums.every((v) => v >= 0 && v <= 9)) {
    return { data: nums, yMin: 0, yMax: 9, trendUp };
  }

  const first = nums[0];
  const canIndex = first !== 0 && nums.every((v) => Math.sign(v) === Math.sign(first));
  const data = canIndex ? nums.map((v) => (v / first) * 100) : nums;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min;
  const pad = span > 0 ? span * 0.3 : Math.max(Math.abs(max), 1) * 0.15;

  return {
    data,
    yMin: min - pad,
    yMax: max + pad,
    trendUp,
  };
}

/** Extract numeric series from period rows for sparklines (oldest → newest). */
export function extractPeriodSeries(periods, accessor) {
  if (!Array.isArray(periods) || !periods.length) return [];
  const sorted = [...periods].sort(
    (a, b) => (a.periodEnd || '').localeCompare(b.periodEnd || ''),
  );
  return sorted
    .map((period) => {
      const raw = typeof accessor === 'function' ? accessor(period) : period?.[accessor];
      const num = Number(raw);
      return Number.isFinite(num) ? num : null;
    })
    .filter((v) => v != null);
}

export function trendArrow(value, scale = 5) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const num = Number(value);
  if (Math.abs(num) < 0.05) return { symbol: '→', color: 'var(--bs-secondary)' };
  const magnitude = Math.min(Math.abs(num) / scale, 1);
  if (num > 0) {
    return {
      symbol: '▲',
      color: `rgba(40, 167, 69, ${0.5 + magnitude * 0.5})`,
    };
  }
  return {
    symbol: '▼',
    color: `rgba(220, 53, 69, ${0.5 + magnitude * 0.5})`,
  };
}

/** Overall up/down arrow for newest-first visible column values. */
export function metricOverallTrendArrow(columnValues) {
  const vals = Array.isArray(columnValues) ? columnValues : [];
  if (vals.length < 2) return null;

  let oldestIdx = vals.length - 1;
  while (oldestIdx > 0 && vals[oldestIdx] == null) oldestIdx -= 1;
  if (oldestIdx <= 0) return null;

  const newest = vals[0];
  const oldest = vals[oldestIdx];
  if (newest == null || oldest == null) return null;

  const pctChange = computeYoY(newest, oldest);
  if (pctChange != null) return trendArrow(pctChange);

  const delta = Number(newest) - Number(oldest);
  if (!Number.isFinite(delta)) return null;
  return trendArrow(delta, Math.max(Math.abs(delta) * 0.2, 1));
}
