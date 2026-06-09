import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import HeatLegend from '../components/research/HeatLegend';
import ResearchToolbar from '../components/research/ResearchToolbar';
import FinancialGrid from '../components/research/FinancialGrid';
import MetricSparkline from '../components/research/MetricSparkline';
import ScoreSummaryBar from '../components/research/ScoreSummaryBar';
import InsiderPanel from '../components/research/InsiderPanel';
import ResearchDeepDive from '../components/research/ResearchDeepDive';
import CompareMetricsPanel, { MAX_COMPARE_TICKERS } from '../components/research/CompareMetricsPanel';
import StTooltip, { StTooltipText } from '../components/StTooltip';
import {
  RESEARCH_METRIC_GROUPS,
  SCREENER_METRIC_GROUPS,
  buildGteDate,
  getScreenerMetricValue,
} from '../config/researchMetrics';
import { formatDecimal, formatPercent, formatUsd, formatCompactUsd } from '../utils/formatters';
import {
  buildHistoricalStats,
  describeHeat,
  getMetricBackground,
  getTrendColor,
  precomputeRowHeatStyles,
} from '../utils/scoringColors';
import { computeCAGR, computeYoY, extractPeriodSeries, trendArrow } from '../utils/researchCalculations';
import { copyTextToClipboard } from '../utils/gridExport';
import {
  buildDeepDiveSearchParams,
  buildScreenerSearchParams,
  parseCompareParam,
  parseGroupParam,
  serializeGroupParam,
  sortTickersByMetric,
  useResearchExport,
} from '../utils/researchUrlState';
import { addToPortfolioWithNotification, getPortfolio, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import TickerSubnav from '../components/TickerSubnav';
import './research.css';

function parseTickers(text) {
  return [...new Set(String(text || '').split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean))];
}

function formatCellValue(value, format, { compact = false } = {}) {
  if (value == null || value === '') return '-';
  switch (format) {
    case 'usd':
      return compact ? formatCompactUsd(value) : formatUsd(value, value >= 100 ? 0 : 2);
    case 'percent':
      return formatPercent(typeof value === 'number' && Math.abs(value) <= 1 ? value * 100 : value, 2);
    case 'integer':
      return Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : '-';
    case 'decimal':
      return formatDecimal(value, 2);
    case 'text':
    default:
      return String(value);
  }
}

function rawMetricValue(period, metric, source = 'fundamentals') {
  if (source === 'metrics') return period.metrics?.[metric.key];
  if (source === 'scores') {
    const match = (period.scoreSnapshot || {})[metric.key];
    return match ?? null;
  }
  const fundamentals = period.fundamentals || {};
  if (fundamentals[metric.key] != null) return fundamentals[metric.key];
  if (Array.isArray(metric.alt)) {
    for (const altKey of metric.alt) {
      if (fundamentals[altKey] != null) return fundamentals[altKey];
    }
  }
  return null;
}

function metricRowHasValues(row, periodCount) {
  for (let idx = 0; idx < periodCount; idx += 1) {
    if (row[`p${idx}`] != null) return true;
  }
  return false;
}

export default function ResearchPage() {
  const { ticker: routeTicker } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { exportScreener, copyScreener, exportDetail, copyDetail } = useResearchExport({ showToast });
  const isDeepDive = Boolean(routeTicker);
  const activeTicker = routeTicker?.toUpperCase();

  const [tickersText, setTickersText] = useState(searchParams.get('tickers') || getPortfolio().slice(0, 10).join(','));
  const [dimension, setDimension] = useState(searchParams.get('dim') || 'MRY');
  const [years, setYears] = useState(() => {
    const raw = searchParams.get('years');
    if (raw === 'all') return 'all';
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
  });
  const [hideEmptyRows, setHideEmptyRows] = useState(searchParams.get('hideEmpty') !== '0');
  const [sortMetric, setSortMetric] = useState(searchParams.get('sort') || null);
  const [compareTickers, setCompareTickers] = useState(() => parseCompareParam(searchParams.get('compare')));
  const [screenerData, setScreenerData] = useState({});
  const [detailData, setDetailData] = useState(null);
  const [narrativeData, setNarrativeData] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(
    () => parseGroupParam(searchParams.get('groups'), RESEARCH_METRIC_GROUPS.map((group) => group.id)),
  );
  const [screenerExpandedGroups, setScreenerExpandedGroups] = useState(
    () => parseGroupParam(searchParams.get('groups'), SCREENER_METRIC_GROUPS.map((group) => group.id)),
  );
  const [colorMode, setColorMode] = useState(() => searchParams.get('colorMode') || 'deep_value');
  const [showHeatLegend, setShowHeatLegend] = useState(searchParams.get('heatLegend') !== '0');

  const syncScreenerParams = useCallback((overrides = {}) => {
    const tickers = overrides.tickers ?? parseTickers(tickersText);
    const params = buildScreenerSearchParams({
      tickers,
      dim: overrides.dim ?? dimension,
      compare: overrides.compare ?? compareTickers,
      groups: serializeGroupParam(
        overrides.screenerExpandedGroups ?? screenerExpandedGroups,
        SCREENER_METRIC_GROUPS.map((group) => group.id),
      ),
      sort: overrides.sortMetric ?? sortMetric,
      hideEmpty: overrides.hideEmptyRows ?? hideEmptyRows,
    });
    setSearchParams(params, { replace: true });
  }, [
    compareTickers,
    dimension,
    hideEmptyRows,
    screenerExpandedGroups,
    setSearchParams,
    sortMetric,
    tickersText,
  ]);

  const syncDeepDiveParams = useCallback((overrides = {}) => {
    const params = buildDeepDiveSearchParams({
      dim: overrides.dim ?? dimension,
      years: overrides.years ?? years,
      hideEmpty: overrides.hideEmptyRows ?? hideEmptyRows,
      groups: serializeGroupParam(
        overrides.expandedGroups ?? expandedGroups,
        RESEARCH_METRIC_GROUPS.map((group) => group.id),
      ),
    });
    setSearchParams(params, { replace: true });
  }, [dimension, expandedGroups, hideEmptyRows, setSearchParams, years]);

  const loadScreener = useCallback(async (tickers, dim) => {
    if (!tickers.length) {
      setError('Enter at least one ticker.');
      setScreenerData({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_ENDPOINTS.RESEARCH_SCREENER, {
        params: { tickers: tickers.join(','), dimension: dim },
      });
      setScreenerData(res.data?.results || {});
      syncScreenerParams({ tickers, dim });
    } catch {
      setError('Failed to load research screener data.');
      setScreenerData({});
    } finally {
      setLoading(false);
    }
  }, [syncScreenerParams]);

  const loadDetail = useCallback(async (symbol, dim, yrs) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const params = { dimension: dim };
      const fetchYears = yrs === 'all' ? 'all' : Math.max(Number(yrs) || 5, 10);
      const gte = buildGteDate(fetchYears);
      if (gte) params.gte = gte;
      const res = await axios.get(API_ENDPOINTS.RESEARCH_TICKER(symbol), { params });
      let payload = res.data || {};

      const requestedHistory = yrs === 'all' || (Number(yrs) || 5) > 1;
      const periodCount = Array.isArray(payload.periods) ? payload.periods.length : 0;
      if (dim === 'MRY' && requestedHistory && periodCount < 2) {
        try {
          const fallback = await axios.get(API_ENDPOINTS.RESEARCH_TICKER(symbol), {
            params: { ...(gte ? { gte } : {}), dimension: 'ARY' },
          });
          if (Array.isArray(fallback.data?.periods) && fallback.data.periods.length > periodCount) {
            payload = {
              ...payload,
              periods: fallback.data.periods,
              // ARY score history aligns to annual periods for historical grid columns.
              scoreHistory: Array.isArray(fallback.data?.scoreHistory)
                ? fallback.data.scoreHistory
                : payload.scoreHistory,
            };
          }
        } catch {
          // Keep MRY payload if ARY fallback fails.
        }
      }

      setDetailData(payload);
    } catch {
      setError(`Failed to load research data for ${symbol}.`);
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNarrative = useCallback(async (symbol) => {
    if (!symbol) return;
    setNarrativeLoading(true);
    try {
      const res = await axios.get(API_ENDPOINTS.RESEARCH_NARRATIVE(symbol));
      setNarrativeData(res.data);
    } catch {
      setNarrativeData(null);
    } finally {
      setNarrativeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDeepDive) {
      loadDetail(activeTicker, dimension, years);
      loadNarrative(activeTicker);
      return;
    }
    setNarrativeData(null);
    const tickers = parseTickers(tickersText);
    if (tickers.length) loadScreener(tickers, dimension);
    // Initial load only; toolbar actions refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeepDive, routeTicker, dimension, years]);

  useEffect(() => {
    if (isDeepDive) syncDeepDiveParams();
  }, [isDeepDive, dimension, years, hideEmptyRows, expandedGroups, syncDeepDiveParams]);

  useEffect(() => {
    if (isDeepDive) return;
    syncScreenerParams();
  }, [
    isDeepDive,
    compareTickers,
    sortMetric,
    screenerExpandedGroups,
    hideEmptyRows,
    syncScreenerParams,
  ]);

  const handleLoad = () => {
    const tickers = parseTickers(tickersText);
    loadScreener(tickers, dimension);
  };

  const handleDimensionChange = (nextDim) => {
    setDimension(nextDim);
    if (isDeepDive) return;
    const tickers = parseTickers(tickersText);
    loadScreener(tickers, nextDim);
  };

  const handleAddToPortfolio = () => {
    if (!activeTicker) return;
    const notif = addToPortfolioWithNotification(activeTicker);
    showToast(notif.message, notif.type);
  };

  const handleCopyShareLink = async () => {
    try {
      await copyTextToClipboard(window.location.href);
      showToast('Share link copied.', 'success');
    } catch {
      showToast('Could not copy link.', 'warning');
    }
  };

  const toggleCompareTicker = useCallback((ticker) => {
    setCompareTickers((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((item) => item !== ticker);
      }
      if (prev.length >= MAX_COMPARE_TICKERS) {
        showToast(`Compare supports up to ${MAX_COMPARE_TICKERS} tickers.`, 'warning');
        return prev;
      }
      return [...prev, ticker];
    });
  }, [showToast]);

  const rawScreenerTickers = useMemo(() => parseTickers(tickersText), [tickersText]);

  const screenerTickers = useMemo(
    () => sortTickersByMetric(rawScreenerTickers, screenerData, sortMetric, SCREENER_METRIC_GROUPS),
    [rawScreenerTickers, screenerData, sortMetric],
  );

  const screenerGridRows = useMemo(() => {
    if (!screenerTickers.length) return [];
    const rows = [];
    SCREENER_METRIC_GROUPS.forEach((group) => {
      if (!screenerExpandedGroups.has(group.id)) return;
      rows.push({
        id: `group-${group.id}`,
        _isGroupHeader: true,
        _groupLabel: group.label,
      });
      group.metrics.forEach((metric) => {
        const row = {
          id: metric.id,
          metric: metric.label,
          metricKey: metric.id,
          format: metric.format,
          scoreCategory: metric.scoreCategory,
        };
        screenerTickers.forEach((ticker, idx) => {
          row[`t${idx}`] = getScreenerMetricValue(screenerData[ticker], metric);
        });
        if (metric.scoreCategory) {
          row._historicalStats = buildHistoricalStats(
            screenerTickers.map((_, idx) => row[`t${idx}`]),
          );
          row._heatStyles = precomputeRowHeatStyles(row, screenerTickers.length, {
            mode: colorMode === 'historical' ? 'deep_value' : colorMode,
            sector: colorMode === 'sector' ? row._historicalStats : undefined,
          });
        }
        rows.push(row);
      });
    });
    return rows;
  }, [screenerTickers, screenerData, screenerExpandedGroups, colorMode]);

  const screenerGridColumns = useMemo(() => {
    const cols = [
      {
        id: 'metric',
        accessorKey: 'metric',
        header: 'Metric',
        size: 176,
        cell: ({ row }) => (
          <span style={{ whiteSpace: 'nowrap' }}>{row.original.metric}</span>
        ),
      },
    ];
    screenerTickers.forEach((ticker, idx) => {
      const data = screenerData[ticker];
      cols.push({
        id: `t${idx}`,
        accessorKey: `t${idx}`,
        header: () => (
          <div className="research-ticker-header">
            <label className="research-compare-toggle mb-0">
              <input
                type="checkbox"
                checked={compareTickers.includes(ticker)}
                onChange={() => toggleCompareTicker(ticker)}
                aria-label={`Compare ${ticker}`}
              />
            </label>
            <Link to={`/research/${ticker}?dim=${dimension}`} className="st-ticker">
              {ticker}
            </Link>
            {data?.companyName && (
              <div className="text-muted research-ticker-subtitle" title={data.companyName}>
                {data.companyName}
              </div>
            )}
            {data?.sector && (
              <div className="text-muted research-ticker-subtitle">{data.sector}</div>
            )}
          </div>
        ),
        size: 96,
        meta: { numeric: true, ticker },
        cellStyle: ({ row }) => {
          if (row.original?._isGroupHeader || !row.original?.scoreCategory) return {};
          return row.original._heatStyles?.[`t${idx}`] || {};
        },
        cell: ({ row }) => {
          const val = row.original[`t${idx}`];
          const tip = row.original._heatStyles?.[`t${idx}Title`];
          const formatted = formatCellValue(val, row.original.format);
          if (!tip) return <span>{formatted}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />}>
              <span>{formatted}</span>
            </StTooltip>
          );
        },
      });
    });
    return cols;
  }, [screenerTickers, screenerData, dimension, compareTickers, toggleCompareTicker]);

  const detailPeriods = useMemo(() => {
    if (!detailData?.periods) return [];
    return [...detailData.periods].sort(
      (a, b) => (b.periodEnd || '').localeCompare(a.periodEnd || ''),
    );
  }, [detailData]);

  const columnPeriods = useMemo(() => {
    if (years === 'all') return detailPeriods;
    const count = Number(years) || 5;
    return detailPeriods.slice(0, count);
  }, [detailPeriods, years]);

  const scoreByPeriod = useMemo(() => {
    const map = {};
    (detailData?.scoreHistory || []).forEach((score) => {
      map[score.periodEnd] = score;
    });
    return map;
  }, [detailData]);

  const detailGridRows = useMemo(() => {
    if (!columnPeriods.length) return [];
    const rows = [];
    RESEARCH_METRIC_GROUPS.forEach((group) => {
      if (!expandedGroups.has(group.id)) return;
      rows.push({
        id: `group-${group.id}`,
        _isGroupHeader: true,
        _groupLabel: group.label,
      });
      group.metrics.forEach((metric) => {
        const readValue = (period) => {
          const enriched = {
            ...period,
            scoreSnapshot: scoreByPeriod[period.periodEnd] || null,
          };
          return rawMetricValue(enriched, metric, group.source || 'fundamentals');
        };
        const columnValues = columnPeriods.map(readValue);
        const sparklineValues = detailPeriods.map(readValue);
        const sparkline = extractPeriodSeries(
          detailPeriods.map((period, idx) => ({ periodEnd: period.periodEnd, value: sparklineValues[idx] })),
          'value',
        );
        const yoy = computeYoY(columnValues[0], columnValues[1]);
        const cagrYears = Math.min(5, columnValues.filter((v) => v != null).length - 1);
        const cagr = cagrYears > 0 ? computeCAGR(columnValues[cagrYears], columnValues[0], cagrYears) : null;
        const row = {
          id: `${group.id}-${metric.key}`,
          metric: metric.label,
          metricKey: metric.key,
          format: metric.format,
          scoreCategory: metric.scoreCategory,
          sparkline,
          yoy,
          cagr,
        };
        columnPeriods.forEach((period, idx) => {
          row[`p${idx}`] = columnValues[idx];
        });
        if (metric.scoreCategory) {
          row._historicalStats = buildHistoricalStats(columnValues);
          row._heatStyles = precomputeRowHeatStyles(row, columnPeriods.length, { mode: colorMode });
        }
        if (hideEmptyRows && !metricRowHasValues(row, columnPeriods.length)) return;
        rows.push(row);
      });
    });
    return rows;
  }, [columnPeriods, detailPeriods, scoreByPeriod, expandedGroups, hideEmptyRows, colorMode]);

  const detailColumns = useMemo(() => {
    const fmt = (value, format) => formatCellValue(value, format, { compact: true });
    const cols = [
      {
        id: 'metric',
        accessorKey: 'metric',
        header: 'Metric',
        cell: ({ row }) => (
          <span className="research-metric-cell">
            {row.original.metric}
            <MetricSparkline
              series={row.original.sparkline}
              format={row.original.format}
              height={20}
              width={56}
            />
          </span>
        ),
      },
      ...columnPeriods.map((period, idx) => ({
        id: `p${idx}`,
        accessorKey: `p${idx}`,
        header: (period.periodEnd || '').slice(0, 10),
        meta: { numeric: true },
        cellStyle: ({ row }) => {
          if (row.original?._isGroupHeader || !row.original?.scoreCategory) return {};
          return row.original._heatStyles?.[`p${idx}`] || {};
        },
        cell: ({ row }) => {
          const val = row.original[`p${idx}`];
          const tip = row.original._heatStyles?.[`p${idx}Title`];
          const formatted = fmt(val, row.original.format);
          if (!tip) return <span>{formatted}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />}>
              <span>{formatted}</span>
            </StTooltip>
          );
        },
      })),
    ];
    if (columnPeriods.length >= 2) {
      cols.push({
        id: 'yoy',
        accessorKey: 'yoy',
        header: 'YoY %',
        meta: { numeric: true },
        cellStyle: ({ row }) => getMetricBackground('yoy', row.original.yoy, {
          mode: colorMode,
          format: 'percent',
        }),
        cell: ({ row }) => {
          const val = row.original.yoy;
          const arrow = trendArrow(val);
          const arrowColor = getTrendColor(val, 8);
          const tip = val != null ? describeHeat('yoy', val, { mode: colorMode, format: 'percent' }) : null;
          const body = (
            <>
              {val == null ? '-' : formatPercent(val, 2)}
              {arrow && <span className="research-trend-arrow" style={{ color: arrowColor }}>{arrow.symbol}</span>}
            </>
          );
          if (!tip) return <span>{body}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />}>
              <span>{body}</span>
            </StTooltip>
          );
        },
      });
    }
    if (columnPeriods.length >= 3) {
      cols.push({
        id: 'cagr',
        accessorKey: 'cagr',
        header: 'CAGR %',
        meta: { numeric: true },
        cellStyle: ({ row }) => getMetricBackground('cagr', row.original.cagr, {
          mode: colorMode,
          format: 'percent',
        }),
        cell: ({ row }) => {
          const val = row.original.cagr;
          const arrow = trendArrow(val, 10);
          const arrowColor = getTrendColor(val, 10);
          const tip = val != null ? describeHeat('cagr', val, { mode: colorMode, format: 'percent' }) : null;
          const body = (
            <>
              {val == null ? '-' : formatPercent(val, 2)}
              {arrow && <span className="research-trend-arrow" style={{ color: arrowColor }}>{arrow.symbol}</span>}
            </>
          );
          if (!tip) return <span>{body}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />}>
              <span>{body}</span>
            </StTooltip>
          );
        },
      });
    }
    return cols;
  }, [columnPeriods, colorMode]);

  const scoreBadges = useMemo(() => {
    if (!isDeepDive || !detailData?.scoreHistory?.length) return null;
    const latest = detailData.scoreHistory[0];
    const items = [
      ['Piotroski', latest.piotroskiF],
      ['Altman Z', latest.altmanZ != null ? formatDecimal(latest.altmanZ, 2) : '-'],
      ['Beneish M', latest.beneishM != null ? formatDecimal(latest.beneishM, 2) : '-'],
      ['Survivability', latest.survivability != null ? Math.round(latest.survivability) : '-'],
    ];
    return items;
  }, [isDeepDive, detailData]);

  return (
    <div className="st-page research-page">
      {isDeepDive && activeTicker && <TickerSubnav ticker={activeTicker} />}

      <ResearchToolbar
        tickersText={tickersText}
        onTickersTextChange={setTickersText}
        onLoad={handleLoad}
        dimension={dimension}
        onDimensionChange={handleDimensionChange}
        years={years}
        onYearsChange={setYears}
        hideEmptyRows={hideEmptyRows}
        onHideEmptyRowsChange={setHideEmptyRows}
        loading={loading}
        mode={isDeepDive ? 'deep-dive' : 'screener'}
        sortMetric={sortMetric}
        onSortMetricChange={setSortMetric}
        onExportCsv={isDeepDive
          ? () => exportDetail(detailGridRows, activeTicker, {
            includeYoY: columnPeriods.length >= 2,
            includeCagr: columnPeriods.length >= 3,
          })
          : () => exportScreener(screenerGridRows, screenerTickers)}
        onCopyGrid={isDeepDive
          ? () => copyDetail(detailGridRows, {
            includeYoY: columnPeriods.length >= 2,
            includeCagr: columnPeriods.length >= 3,
          })
          : () => copyScreener(screenerGridRows, screenerTickers)}
        onCopyShareLink={handleCopyShareLink}
        exportDisabled={isDeepDive ? !detailGridRows.length : !screenerGridRows.length}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        showHeatLegend={showHeatLegend}
        onShowHeatLegendChange={setShowHeatLegend}
      />

      {showHeatLegend && <HeatLegend colorMode={colorMode} />}

      {error && <div className="st-alert-warn">{error}</div>}

      {isDeepDive && (
        <ResearchDeepDive
          activeTicker={activeTicker}
          detailData={detailData}
          narrativeData={narrativeData}
          narrativeLoading={narrativeLoading}
          loading={loading}
          scoreBadges={scoreBadges}
          isInPortfolio={isInPortfolio(activeTicker)}
          onAddToPortfolio={handleAddToPortfolio}
          detailGridRows={detailGridRows}
          detailColumns={detailColumns}
          expandedGroups={expandedGroups}
          onToggleGroup={(groupId) => setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
          })}
          detailPeriods={detailPeriods}
          compareLink={`/research?tickers=${encodeURIComponent(activeTicker)}&compare=${encodeURIComponent(activeTicker)}`}
        />
      )}

      {!isDeepDive && (
        <CompareMetricsPanel compareTickers={compareTickers} />
      )}

      {!isDeepDive && screenerTickers.length > 0 && Object.keys(screenerData).length > 0 && (
        <div className="st-panel mb-2">
          <div className="st-panel-header">Score Summary</div>
          <ScoreSummaryBar tickers={screenerTickers} screenerData={screenerData} />
        </div>
      )}

      {!isDeepDive && (
        <div className="st-panel research-screener-card">
          <div className="st-panel-header">
            <span>Financial Screener</span>
            <span className="font-normal text-st-muted">
              {screenerTickers.length} ticker{screenerTickers.length === 1 ? '' : 's'} · metrics × tickers · arrow keys to navigate
            </span>
            <div className="ml-auto flex flex-wrap gap-1">
              {SCREENER_METRIC_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={screenerExpandedGroups.has(group.id) ? 'st-btn-active' : 'st-btn-muted'}
                  onClick={() => setScreenerExpandedGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  })}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
          <div className="st-panel-body p-1">
            {loading && !screenerGridRows.length ? (
              <div className="p-3 text-xs text-st-muted">Loading…</div>
            ) : screenerTickers.length === 0 ? (
              <div className="p-3 text-xs text-st-muted">Enter at least one ticker above.</div>
            ) : (
              <FinancialGrid
                data={screenerGridRows}
                columns={screenerGridColumns}
                stickyColumnIds={['metric']}
                getRowId={(row) => row.id}
              />
            )}
          </div>
        </div>
      )}

      {!isDeepDive && screenerTickers.length > 0 && (
        <InsiderPanel mode="screener" tickers={screenerTickers} />
      )}
    </div>
  );
}
