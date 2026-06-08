import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import ResearchToolbar from '../components/research/ResearchToolbar';
import FinancialGrid from '../components/research/FinancialGrid';
import MetricSparkline from '../components/research/MetricSparkline';
import {
  RESEARCH_METRIC_GROUPS,
  SCREENER_METRIC_GROUPS,
  buildGteDate,
  getScreenerMetricValue,
  rowTickerMinMax,
} from '../config/researchMetrics';
import { formatDecimal, formatPercent, formatUsd, formatCompactUsd } from '../utils/formatters';
import { signedHeatStyle, columnHeatStyle } from '../utils/heatMap';
import {
  beneishHeatStyle,
  marginHeatStyle,
  piotroskiHeatStyle,
  altmanZHeatStyle,
  survivabilityHeatStyle,
} from '../utils/scoringColors';
import { computeCAGR, computeYoY, extractPeriodSeries, trendArrow } from '../utils/researchCalculations';
import { addToPortfolioWithNotification, getPortfolio, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import TickerSubnav from '../components/TickerSubnav';
import './research.css';

function parseTickers(text) {
  return [...new Set(String(text || '').split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean))];
}

function heatmapForType(type, value, rowMinMax) {
  switch (type) {
    case 'column':
      return columnHeatStyle(value, rowMinMax?.min, rowMinMax?.max);
    case 'margin':
      return marginHeatStyle(typeof value === 'number' && Math.abs(value) <= 1 ? value : (value || 0) / 100, 0.2);
    case 'piotroski':
      return piotroskiHeatStyle(value);
    case 'altman':
      return altmanZHeatStyle(value);
    case 'beneish':
      return beneishHeatStyle(value);
    case 'survivability':
      return survivabilityHeatStyle(value);
    case 'signed':
      return signedHeatStyle(value, 8);
    default:
      return {};
  }
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
  const [screenerData, setScreenerData] = useState({});
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(RESEARCH_METRIC_GROUPS.map((g) => g.id)));
  const [screenerExpandedGroups, setScreenerExpandedGroups] = useState(
    () => new Set(SCREENER_METRIC_GROUPS.map((g) => g.id)),
  );

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
      setSearchParams({ tickers: tickers.join(','), dim }, { replace: true });
    } catch {
      setError('Failed to load research screener data.');
      setScreenerData({});
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

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
      setDetailData(res.data);
    } catch {
      setError(`Failed to load research data for ${symbol}.`);
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncDeepDiveParams = useCallback((dim, yrs, hideEmpty) => {
    const next = { dim };
    if (yrs != null) next.years = String(yrs);
    if (!hideEmpty) next.hideEmpty = '0';
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (isDeepDive) {
      loadDetail(activeTicker, dimension, years);
      return;
    }
    const tickers = parseTickers(tickersText);
    if (tickers.length) loadScreener(tickers, dimension);
    // Initial load only; toolbar actions refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeepDive, routeTicker, dimension, years]);

  useEffect(() => {
    if (!isDeepDive) return;
    syncDeepDiveParams(dimension, years, hideEmptyRows);
  }, [isDeepDive, dimension, years, hideEmptyRows, syncDeepDiveParams]);

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

  const screenerTickers = useMemo(() => parseTickers(tickersText), [tickersText]);

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
          format: metric.format,
          heatmap: metric.heatmap,
        };
        screenerTickers.forEach((ticker, idx) => {
          row[`t${idx}`] = getScreenerMetricValue(screenerData[ticker], metric);
        });
        rows.push(row);
      });
    });
    return rows;
  }, [screenerTickers, screenerData, screenerExpandedGroups]);

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
            <Link to={`/research/${ticker}?dim=${dimension}`} className="fw-semibold link-primary">
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
          if (row.original?._isGroupHeader || !row.original?.heatmap) return {};
          const val = row.original[`t${idx}`];
          if (row.original.heatmap === 'column') {
            const range = rowTickerMinMax(row.original, screenerTickers.length);
            return heatmapForType('column', val, range);
          }
          const display = row.original.format === 'percent' && typeof val === 'number' && Math.abs(val) <= 1
            ? val
            : val;
          return heatmapForType(row.original.heatmap, display);
        },
        cell: ({ row }) => formatCellValue(row.original[`t${idx}`], row.original.format),
      });
    });
    return cols;
  }, [screenerTickers, screenerData, dimension]);

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
          heatmap: metric.heatmap,
          sparkline,
          yoy,
          cagr,
        };
        columnPeriods.forEach((period, idx) => {
          row[`p${idx}`] = columnValues[idx];
        });
        if (hideEmptyRows && !metricRowHasValues(row, columnPeriods.length)) return;
        rows.push(row);
      });
    });
    return rows;
  }, [columnPeriods, detailPeriods, scoreByPeriod, expandedGroups, hideEmptyRows]);

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
          if (row.original?.heatmap) {
            const val = row.original[`p${idx}`];
            const display = row.original.format === 'percent' && typeof val === 'number' && Math.abs(val) <= 1
              ? val
              : val;
            return heatmapForType(row.original.heatmap, display);
          }
          return {};
        },
        cell: ({ row }) => fmt(row.original[`p${idx}`], row.original.format),
      })),
    ];
    if (columnPeriods.length >= 2) {
      cols.push({
        id: 'yoy',
        accessorKey: 'yoy',
        header: 'YoY %',
        meta: { numeric: true },
        cellStyle: ({ row }) => signedHeatStyle(row.original.yoy, 8),
        cell: ({ row }) => {
          const val = row.original.yoy;
          const arrow = trendArrow(val);
          return (
            <span>
              {val == null ? '-' : formatPercent(val, 2)}
              {arrow && <span className="research-trend-arrow" style={{ color: arrow.color }}>{arrow.symbol}</span>}
            </span>
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
        cellStyle: ({ row }) => signedHeatStyle(row.original.cagr, 10),
        cell: ({ row }) => (row.original.cagr == null ? '-' : formatPercent(row.original.cagr, 2)),
      });
    }
    return cols;
  }, [columnPeriods]);

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
    <div className="research-page">
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
      />

      {error && <div className="alert alert-warning py-2">{error}</div>}

      {isDeepDive && detailData?.company && (
        <div className="card shadow-sm mb-2 research-deep-dive-header">
          <div className="card-body py-2 px-2 d-flex flex-wrap align-items-center gap-2">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <h1 className="h4 mb-0">{activeTicker}</h1>
                <button
                  type="button"
                  className={`btn btn-sm ${isInPortfolio(activeTicker) ? 'btn-outline-secondary' : 'btn-success'}`}
                  onClick={handleAddToPortfolio}
                >
                  {isInPortfolio(activeTicker) ? 'In Portfolio' : 'Add to Portfolio'}
                </button>
              </div>
              <div className="text-muted small">{detailData.company.name}</div>
              <div className="text-muted small">
                {[detailData.company.sector, detailData.company.industry].filter(Boolean).join(' · ')}
              </div>
            </div>
            {detailData.price?.latest != null && (
              <div className="ms-auto fw-semibold research-header-price">
                {formatCompactUsd(detailData.price.latest)}
              </div>
            )}
          </div>
          {scoreBadges && (
            <div className="card-body pt-0 px-2 pb-2">
              <div className="research-score-badges">
                {scoreBadges.map(([label, value]) => (
                  <span key={label} className="research-score-badge">{label}: {value}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isDeepDive && (
        <div className="card shadow-sm research-screener-card">
          <div className="card-header py-2 d-flex flex-wrap gap-2 align-items-center">
            <span>Financial Screener</span>
            <span className="text-muted small">
              {screenerTickers.length} ticker{screenerTickers.length === 1 ? '' : 's'} · metrics × tickers · arrow keys to navigate
            </span>
            <div className="ms-auto d-flex flex-wrap gap-1">
              {SCREENER_METRIC_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`btn btn-sm ${screenerExpandedGroups.has(group.id) ? 'btn-secondary' : 'btn-outline-secondary'}`}
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
          <div className="card-body p-1">
            {loading && !screenerGridRows.length ? (
              <div className="p-3">Loading…</div>
            ) : screenerTickers.length === 0 ? (
              <div className="p-3">Enter at least one ticker above.</div>
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

      {isDeepDive && (
        <div className="card shadow-sm research-deep-dive-card">
          <div className="card-header py-1 px-2 d-flex flex-wrap gap-2 align-items-center">
            <span className="small fw-semibold">Historical Financials</span>
            <div className="ms-auto d-flex flex-wrap gap-1">
              {RESEARCH_METRIC_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`btn btn-sm ${expandedGroups.has(group.id) ? 'btn-secondary' : 'btn-outline-secondary'}`}
                  onClick={() => setExpandedGroups((prev) => {
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
          <div className="card-body p-0">
            {loading && !detailGridRows.length ? (
              <div className="p-2 small">Loading…</div>
            ) : detailGridRows.length ? (
              <FinancialGrid
                data={detailGridRows}
                columns={detailColumns}
                stickyColumnIds={['metric']}
                getRowId={(row) => row.id}
                compact
                maxHeight="calc(100vh - 260px)"
              />
            ) : (
              <div className="p-2 small">No financial history available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
