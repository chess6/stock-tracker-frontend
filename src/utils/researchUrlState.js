import { useCallback, useMemo } from 'react';
import { getScreenerMetricValue } from '../config/researchMetrics';
import {
  buildDetailExport,
  buildScreenerExport,
  exportGridClipboard,
  exportGridCsv,
} from './gridExport';

function parseGroupParam(raw, allGroupIds) {
  if (!raw) return new Set(allGroupIds);
  const ids = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return ids.length ? new Set(ids) : new Set(allGroupIds);
}

function serializeGroupParam(expandedGroups, allGroupIds) {
  const expanded = [...expandedGroups].filter((id) => allGroupIds.includes(id));
  if (!expanded.length || expanded.length === allGroupIds.length) return undefined;
  return expanded.join(',');
}

function parseCompareParam(raw, max = 5) {
  if (!raw) return [];
  return [...new Set(raw.split(/[,\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))].slice(0, max);
}

function buildScreenerSearchParams({
  tickers,
  dim,
  compare,
  groups,
  sort,
  hideEmpty,
}) {
  const params = {
    tickers: tickers.join(','),
    dim,
  };
  if (compare?.length >= 2) params.compare = compare.join(',');
  if (groups) params.groups = groups;
  if (sort) params.sort = sort;
  if (!hideEmpty) params.hideEmpty = '0';
  return params;
}

function buildDeepDiveSearchParams({ dim, years, hideEmpty, groups }) {
  const params = { dim };
  if (years != null) params.years = String(years);
  if (!hideEmpty) params.hideEmpty = '0';
  if (groups) params.groups = groups;
  return params;
}

function sortTickersByMetric(tickers, screenerData, sortMetricId, metricGroups) {
  if (!sortMetricId || !tickers.length) return tickers;
  let metricDef = null;
  metricGroups.forEach((group) => {
    group.metrics.forEach((metric) => {
      if (metric.id === sortMetricId) metricDef = metric;
    });
  });
  if (!metricDef) return tickers;

  return [...tickers].sort((left, right) => {
    const leftVal = getScreenerMetricValue(screenerData[left], metricDef);
    const rightVal = getScreenerMetricValue(screenerData[right], metricDef);
    if (leftVal == null && rightVal == null) return left.localeCompare(right);
    if (leftVal == null) return 1;
    if (rightVal == null) return -1;
    if (leftVal === rightVal) return left.localeCompare(right);
    return Number(rightVal) - Number(leftVal);
  });
}

export {
  parseGroupParam,
  serializeGroupParam,
  parseCompareParam,
  buildScreenerSearchParams,
  buildDeepDiveSearchParams,
  sortTickersByMetric,
};

export function useResearchExport({ showToast }) {
  const exportScreener = useCallback((screenerGridRows, screenerTickers, filename = 'research-screener.csv') => {
    const { headers, rows } = buildScreenerExport(screenerGridRows, screenerTickers);
    exportGridCsv(filename, headers, rows);
    showToast?.('CSV downloaded.', 'success');
  }, [showToast]);

  const copyScreener = useCallback(async (screenerGridRows, screenerTickers) => {
    const { headers, rows } = buildScreenerExport(screenerGridRows, screenerTickers);
    await exportGridClipboard(headers, rows);
    showToast?.('Copied to clipboard.', 'success');
  }, [showToast]);

  const exportDetail = useCallback((detailGridRows, ticker, options = {}) => {
    const { headers, rows } = buildDetailExport(detailGridRows, options);
    const safeTicker = (ticker || 'research').toUpperCase();
    exportGridCsv(`${safeTicker}-financials.csv`, headers, rows);
    showToast?.('CSV downloaded.', 'success');
  }, [showToast]);

  const copyDetail = useCallback(async (detailGridRows, options = {}) => {
    const { headers, rows } = buildDetailExport(detailGridRows, options);
    await exportGridClipboard(headers, rows);
    showToast?.('Copied to clipboard.', 'success');
  }, [showToast]);

  return useMemo(() => ({
    exportScreener,
    copyScreener,
    exportDetail,
    copyDetail,
  }), [copyDetail, copyScreener, exportDetail, exportScreener]);
}
