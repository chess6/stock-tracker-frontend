/**
 * terminal-style conditional cell shading.
 * Maps numeric values to graduated green/red (or blue) backgrounds by magnitude.
 */

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/** 5-step terminal-style palette: faint → intense */
const GREEN_STEPS = [
  { bg: 'rgba(40, 167, 69, 0.08)', fg: '#1e5631' },
  { bg: 'rgba(40, 167, 69, 0.18)', fg: '#155724' },
  { bg: 'rgba(40, 167, 69, 0.32)', fg: '#0f4419' },
  { bg: 'rgba(40, 167, 69, 0.48)', fg: '#0a3312' },
  { bg: 'rgba(40, 167, 69, 0.65)', fg: '#05200b' },
];

const RED_STEPS = [
  { bg: 'rgba(220, 53, 69, 0.08)', fg: '#842029' },
  { bg: 'rgba(220, 53, 69, 0.18)', fg: '#721c24' },
  { bg: 'rgba(220, 53, 69, 0.32)', fg: '#5c151c' },
  { bg: 'rgba(220, 53, 69, 0.48)', fg: '#450f15' },
  { bg: 'rgba(220, 53, 69, 0.65)', fg: '#2e0a0e' },
];

function pickStep(steps, intensity) {
  const idx = Math.min(steps.length - 1, Math.floor(clamp01(intensity) * steps.length));
  return steps[idx];
}

/**
 * Signed value heat (e.g. % change, insider net buy).
 * @param {number|null|undefined} value
 * @param {number} scale — value at which max intensity is reached
 */
export function signedHeatStyle(value, scale = 5) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return {};
  const num = Number(value);
  if (num === 0) return {};
  const intensity = Math.min(Math.abs(num) / scale, 1);
  const step = num > 0 ? pickStep(GREEN_STEPS, intensity) : pickStep(RED_STEPS, intensity);
  return { backgroundColor: step.bg, color: step.fg, fontVariantNumeric: 'tabular-nums' };
}

/**
 * Column-relative heatmap (low → blue, high → green) for valuation ratios.
 */
export function columnHeatStyle(value, min, max) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return {};
  if (min === max || min == null || max == null) return { fontVariantNumeric: 'tabular-nums' };
  const num = Number(value);
  const t = clamp01((num - min) / (max - min));
  const bg = `rgba(${Math.round(30 + (1 - t) * 40)}, ${Math.round(100 + t * 80)}, ${Math.round(180 - t * 60)}, ${0.12 + t * 0.35})`;
  return { backgroundColor: bg, fontVariantNumeric: 'tabular-nums' };
}

export function columnMinMax(rows, key) {
  const values = rows.map((r) => r[key]).filter((v) => v != null && !Number.isNaN(Number(v))).map(Number);
  if (!values.length) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Insider dollar amounts — log-scaled green/red */
export function insiderDollarStyle(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return {};
  const num = Number(value);
  if (num === 0) return { fontVariantNumeric: 'tabular-nums', color: '#6c757d' };
  const logScale = Math.log10(Math.max(Math.abs(num), 1));
  const intensity = clamp01(logScale / 7);
  const step = num > 0 ? pickStep(GREEN_STEPS, intensity) : pickStep(RED_STEPS, intensity);
  return { backgroundColor: step.bg, color: step.fg, fontVariantNumeric: 'tabular-nums' };
}
