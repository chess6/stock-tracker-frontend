export const PRICE_CHART_RANGES = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];

export const EXTENDED_HISTORY_RANGES = new Set(['3Y', '5Y', 'MAX']);

const BUY_CODES = new Set(['P', 'A']);

export function normalizePriceHistory(rows = []) {
  const byDate = new Map();
  for (const row of rows) {
    const date = (row?.date || '').slice(0, 10);
    if (!date) continue;
    byDate.set(date, { ...row, date });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergePriceHistories(...lists) {
  return normalizePriceHistory(lists.flat().filter(Boolean));
}

export function getRangeStartDate(range, now = new Date()) {
  if (range === 'MAX') return null;
  const fromDate = new Date(now);
  switch (range) {
    case '1M':
      fromDate.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      fromDate.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      fromDate.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      fromDate.setFullYear(now.getFullYear() - 1);
      break;
    case '3Y':
      fromDate.setFullYear(now.getFullYear() - 3);
      break;
    case '5Y':
      fromDate.setFullYear(now.getFullYear() - 5);
      break;
    default:
      return null;
  }
  return fromDate;
}

export function filterPriceHistoryByRange(history, range, now = new Date()) {
  const ordered = normalizePriceHistory(history);
  if (!ordered.length || range === 'MAX') return ordered;
  const fromDate = getRangeStartDate(range, now);
  if (!fromDate) return ordered;
  return ordered.filter((point) => new Date(point.date) >= fromDate);
}

export function computeRangePerformance(filtered) {
  if (!filtered?.length || filtered.length < 2) return null;
  const start = filtered[0];
  const end = filtered[filtered.length - 1];
  const startClose = Number(start.close);
  const endClose = Number(end.close);
  if (!Number.isFinite(startClose) || !Number.isFinite(endClose) || startClose === 0) {
    return null;
  }
  return {
    startDate: start.date,
    endDate: end.date,
    startClose,
    endClose,
    absReturn: endClose - startClose,
    pctReturn: ((endClose - startClose) / startClose) * 100,
  };
}

export function isLimitedHistory(history, range, now = new Date()) {
  if (range === 'MAX' || !history?.length) return false;
  const filtered = filterPriceHistoryByRange(history, range, now);
  if (filtered.length < 10) return true;
  const requestedStart = getRangeStartDate(range, now);
  if (!requestedStart) return false;
  const actualStart = new Date(filtered[0].date);
  return actualStart.getTime() > requestedStart.getTime() + (30 * 86400000);
}

function isInsiderBuy(txn) {
  if (txn?.isBuy === true) return true;
  return BUY_CODES.has(String(txn?.transactionCode || txn?.transaction_code || '').toUpperCase());
}

function transactionDate(txn) {
  return (txn?.transactionDate || txn?.transaction_date || '').slice(0, 10);
}

export function buildInsiderBuyAnnotations(transactions = [], rangeStart, rangeEnd, limit = 20) {
  const startMs = rangeStart ? new Date(rangeStart).getTime() : null;
  const endMs = rangeEnd ? new Date(rangeEnd).getTime() : null;
  const markers = [];

  for (const txn of transactions) {
    if (!isInsiderBuy(txn)) continue;
    const day = transactionDate(txn);
    if (!day) continue;
    const dayMs = new Date(day).getTime();
    if (startMs != null && dayMs < startMs) continue;
    if (endMs != null && dayMs > endMs) continue;
    markers.push({
      x: day,
      borderColor: '#28a745',
      strokeDashArray: 2,
      label: {
        text: 'Buy',
        orientation: 'vertical',
        borderColor: '#28a745',
        style: {
          background: 'rgba(40, 167, 69, 0.12)',
          color: '#28a745',
          fontSize: '9px',
          padding: { left: 4, right: 4, top: 2, bottom: 2 },
        },
      },
    });
  }

  return markers.slice(0, limit);
}

/** Tight Y-axis bounds so price moves read as meaningful % change, not flat noise. */
export function tightPriceBounds(filteredHistory = [], padRatio = 0.06) {
  const closes = filteredHistory
    .map((point) => Number(point?.close))
    .filter((value) => Number.isFinite(value));
  if (!closes.length) return {};
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = Math.max(max - min, Math.abs(max) * 0.01);
  const pad = span * padRatio;
  return {
    min: min - pad,
    max: max + pad,
  };
}

/** Explicit secondary-axis bounds for raw share volume (millions–billions). */
export function tightVolumeBounds(volumePoints = [], padRatio = 0.08) {
  const values = volumePoints
    .map((point) => Number(point?.y ?? point?.volume))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (!values.length) return {};
  const max = Math.max(...values);
  if (max === 0) return { min: 0, max: 1 };
  return {
    min: 0,
    max: max * (1 + padRatio),
  };
}

/**
 * Responsive plot height from container width — taller when price-only for slope readability.
 * @param {number} containerWidth
 * @param {{ showVolume?: boolean, pointCount?: number }} [options]
 */
export function marketHistoryChartHeight(containerWidth, { showVolume = false, pointCount = 0 } = {}) {
  const width = Math.max(Number(containerWidth) || 0, 320);
  const aspect = showVolume ? 0.34 : 0.4;
  const minHeight = showVolume ? 200 : 220;
  const maxHeight = showVolume ? 320 : 380;
  const pointBoost = (Math.min(Math.max(pointCount, 0), 260) / 260) * 28;
  return Math.round(Math.min(maxHeight, Math.max(minHeight, (width * aspect) + pointBoost)));
}

export function buildPeriodEndAnnotations(periods = [], rangeStart, rangeEnd, limit = 12) {
  const startMs = rangeStart ? new Date(rangeStart).getTime() : null;
  const endMs = rangeEnd ? new Date(rangeEnd).getTime() : null;
  const seen = new Set();
  const markers = [];

  for (const period of periods) {
    const day = (period?.periodEnd || period?.calendardate || '').slice(0, 10);
    if (!day || seen.has(day)) continue;
    const dayMs = new Date(day).getTime();
    if (startMs != null && dayMs < startMs) continue;
    if (endMs != null && dayMs > endMs) continue;
    seen.add(day);
    markers.push({
      x: day,
      borderColor: '#c9a227',
      strokeDashArray: 0,
      label: {
        text: 'FY/Q',
        orientation: 'vertical',
        borderColor: '#c9a227',
        style: {
          background: 'rgba(201, 162, 39, 0.12)',
          color: '#c9a227',
          fontSize: '9px',
          padding: { left: 4, right: 4, top: 2, bottom: 2 },
        },
      },
    });
  }

  return markers.slice(0, limit);
}
