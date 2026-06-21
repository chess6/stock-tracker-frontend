import { isDarkTheme } from './themeState';

export function apexBaseOptions() {
  const dark = isDarkTheme();
  if (!dark) {
    return {
      theme: { mode: 'light' },
      chart: {
        foreColor: '#373d3f',
        background: 'transparent',
      },
      grid: { borderColor: '#dee2e6' },
      tooltip: { theme: 'light' },
      dataLabels: {
        style: { colors: ['#212529'] },
      },
    };
  }
  return {
    theme: { mode: 'dark' },
    chart: {
      foreColor: '#dee2e6',
      background: 'transparent',
    },
    grid: { borderColor: '#495057' },
    xaxis: {
      labels: { style: { colors: '#b7bdc4' } },
      title: { style: { color: '#dee2e6' } },
    },
    yaxis: {
      labels: { style: { colors: '#b7bdc4' } },
      title: { style: { color: '#dee2e6' } },
    },
    title: { style: { color: '#f8f9fa' } },
    legend: { labels: { colors: '#dee2e6' } },
    tooltip: { theme: 'dark' },
    dataLabels: {
      style: { colors: ['#f8f9fa'] },
    },
  };
}

export function mergeApexOptions(specific = {}) {
  const base = apexBaseOptions();
  return {
    ...base,
    ...specific,
    chart: { ...base.chart, ...specific.chart },
    grid: { ...base.grid, ...specific.grid },
    xaxis: { ...base.xaxis, ...specific.xaxis },
    yaxis: Array.isArray(specific.yaxis)
      ? specific.yaxis
      : { ...base.yaxis, ...specific.yaxis },
    title: { ...base.title, ...specific.title },
    legend: { ...base.legend, ...specific.legend },
    tooltip: { ...base.tooltip, ...specific.tooltip },
    dataLabels: { ...base.dataLabels, ...specific.dataLabels },
    theme: { ...base.theme, ...specific.theme },
  };
}

/** Plot height for deep-dive analytics columns. */
export const ANALYTICS_CHART_HEIGHT = 300;
/** Fixed height for charts in the research deep-dive analytics strip (prevents flex/resize growth). */
export const ANALYTICS_DEEP_DIVE_STRIP_HEIGHT = 220;
/** Compact sparkline under margins (capital leverage trend). */
export const ANALYTICS_CHART_HEIGHT_SHORT = 130;
/** Narrative overlay in the wider analytics column. */
export const ANALYTICS_CHART_HEIGHT_NARRATIVE = 240;
/** Fallback height before container width is measured. */
export const MARKET_HISTORY_CHART_HEIGHT = 240;

/** Tight Y-axis for percent/ratio charts so slopes are visible. */
export function tightPercentBounds(seriesList, padMin = 3, padMax = 2) {
  const values = seriesList
    .flat()
    .filter((value) => value != null && Number.isFinite(Number(value)));
  if (!values.length) return {};
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min: Math.floor(min - padMin),
    max: Math.ceil(max + padMax),
  };
}

/**
 * Width/height for horizontally scrollable time-series charts.
 * Wider canvases per point improve YoY slope readability on dense histories.
 * @param {number} pointCount
 * @param {{ variant?: 'currency' | 'percent' }} [options]
 */
export function scrollChartLayout(pointCount, { variant = 'currency', scale = 1 } = {}) {
  const points = Math.max(Number(pointCount) || 0, 2);
  const pointWidth = (variant === 'percent' ? 80 : 88) * scale;
  const minWidth = (variant === 'percent' ? 720 : 840) * scale;
  const width = Math.max(minWidth, points * pointWidth);
  const aspect = variant === 'percent' ? 0.52 : 0.42;
  const minHeight = (variant === 'percent' ? 320 : 320) * scale;
  const maxHeight = (variant === 'percent' ? 480 : 420) * scale;
  const height = Math.round(Math.min(maxHeight, Math.max(minHeight, width * aspect)));
  return { width: Math.round(width), height };
}

/** Shared compact preset for Research deep-dive chart panels. */
export function analyticsChartOptions(specific = {}) {
  return mergeApexOptions({
    legend: {
      position: 'bottom',
      fontSize: '9px',
      offsetY: 0,
      height: 28,
      itemMargin: { horizontal: 6, vertical: 0 },
    },
    grid: {
      padding: { top: 2, right: 6, bottom: 0, left: 2 },
    },
    xaxis: {
      labels: { style: { fontSize: '9px' } },
    },
    ...specific,
  });
}
