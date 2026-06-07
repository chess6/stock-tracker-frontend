/**
 * terminal-style conditional cell shading.
 * Maps numeric values to graduated green/red (or blue) backgrounds by magnitude.
 */

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

/** 5-step terminal-style palette: faint → intense */
const GREEN_STEPS_LIGHT = [
  { bg: 'rgba(40, 167, 69, 0.08)', fg: '#1e5631' },
  { bg: 'rgba(40, 167, 69, 0.18)', fg: '#155724' },
  { bg: 'rgba(40, 167, 69, 0.32)', fg: '#0f4419' },
  { bg: 'rgba(40, 167, 69, 0.48)', fg: '#0a3312' },
  { bg: 'rgba(40, 167, 69, 0.65)', fg: '#05200b' },
];

const RED_STEPS_LIGHT = [
  { bg: 'rgba(220, 53, 69, 0.08)', fg: '#842029' },
  { bg: 'rgba(220, 53, 69, 0.18)', fg: '#721c24' },
  { bg: 'rgba(220, 53, 69, 0.32)', fg: '#5c151c' },
  { bg: 'rgba(220, 53, 69, 0.48)', fg: '#450f15' },
  { bg: 'rgba(220, 53, 69, 0.65)', fg: '#2e0a0e' },
];

const GREEN_STEPS_DARK = [
  { bg: 'rgba(40, 167, 69, 0.12)', fg: '#b8f0cb' },
  { bg: 'rgba(40, 167, 69, 0.22)', fg: '#c8f5d8' },
  { bg: 'rgba(40, 167, 69, 0.34)', fg: '#d4f8e0' },
  { bg: 'rgba(40, 167, 69, 0.46)', fg: '#e0fbe8' },
  { bg: 'rgba(40, 167, 69, 0.58)', fg: '#ecfff2' },
];

const RED_STEPS_DARK = [
  { bg: 'rgba(220, 53, 69, 0.12)', fg: '#f8c2c8' },
  { bg: 'rgba(220, 53, 69, 0.22)', fg: '#facdd2' },
  { bg: 'rgba(220, 53, 69, 0.34)', fg: '#fcd8dc' },
  { bg: 'rgba(220, 53, 69, 0.46)', fg: '#fee3e6' },
  { bg: 'rgba(220, 53, 69, 0.58)', fg: '#ffeef0' },
];

function greenSteps() {
  return isDarkTheme() ? GREEN_STEPS_DARK : GREEN_STEPS_LIGHT;
}

function redSteps() {
  return isDarkTheme() ? RED_STEPS_DARK : RED_STEPS_LIGHT;
}

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
  const step = num > 0 ? pickStep(greenSteps(), intensity) : pickStep(redSteps(), intensity);
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
  const dark = isDarkTheme();
  const bg = dark
    ? `rgba(${Math.round(60 + t * 40)}, ${Math.round(120 + t * 60)}, ${Math.round(200 - t * 40)}, ${0.18 + t * 0.32})`
    : `rgba(${Math.round(30 + (1 - t) * 40)}, ${Math.round(100 + t * 80)}, ${Math.round(180 - t * 60)}, ${0.12 + t * 0.35})`;
  return {
    backgroundColor: bg,
    color: dark ? '#e8f4ff' : undefined,
    fontVariantNumeric: 'tabular-nums',
  };
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
  if (num === 0) {
    return { fontVariantNumeric: 'tabular-nums', color: isDarkTheme() ? '#adb5bd' : '#6c757d' };
  }
  const logScale = Math.log10(Math.max(Math.abs(num), 1));
  const intensity = clamp01(logScale / 7);
  const step = num > 0 ? pickStep(greenSteps(), intensity) : pickStep(redSteps(), intensity);
  return { backgroundColor: step.bg, color: step.fg, fontVariantNumeric: 'tabular-nums' };
}
