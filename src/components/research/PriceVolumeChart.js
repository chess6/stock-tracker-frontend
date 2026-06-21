import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import StSpinner from '../StSpinner';
import StIcon from '../StIcon';
import { RESEARCH_ICONS } from '../../icons/researchIcons';
import {
  MARKET_HISTORY_CHART_HEIGHT,
  analyticsChartOptions,
} from '../../utils/chartTheme';
import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';
import { useHeatmapThemeKey } from '../../hooks/useHeatmapThemeKey';
import {
  PRICE_CHART_RANGES,
  EXTENDED_HISTORY_RANGES,
  mergePriceHistories,
  filterPriceHistoryByRange,
  computeRangePerformance,
  isLimitedHistory,
  buildInsiderBuyAnnotations,
  buildPeriodEndAnnotations,
  tightPriceBounds,
  marketHistoryChartHeight,
} from '../../utils/priceVolumeChart';

function formatVolume(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const num = Number(value);
  if (num >= 1_000_000_000) return `${formatDecimal(num / 1_000_000_000, 1)}B`;
  if (num >= 1_000_000) return `${formatDecimal(num / 1_000_000, 1)}M`;
  if (num >= 1_000) return `${formatDecimal(num / 1_000, 1)}K`;
  return formatDecimal(num, 0);
}

function formatRangeDate(value) {
  if (!value) return '—';
  const date = new Date(value.slice(0, 10));
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function PriceVolumeChart({
  priceHistory = [],
  extendedPriceHistory = null,
  insiderTransactions = [],
  periods = [],
  loading = false,
  extendedLoading = false,
  onNeedExtendedHistory,
}) {
  const heatmapThemeKey = useHeatmapThemeKey();
  const chartPlotRef = useRef(null);
  const [range, setRange] = useState('1Y');
  const [showVolume, setShowVolume] = useState(false);
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    if (!EXTENDED_HISTORY_RANGES.has(range) || !onNeedExtendedHistory) return undefined;
    onNeedExtendedHistory();
    return undefined;
  }, [range, onNeedExtendedHistory]);

  useEffect(() => {
    const node = chartPlotRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const updateWidth = () => {
      setPlotWidth(node.clientWidth || 0);
    };
    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const mergedHistory = useMemo(
    () => mergePriceHistories(priceHistory, extendedPriceHistory),
    [priceHistory, extendedPriceHistory],
  );

  const filteredHistory = useMemo(
    () => filterPriceHistoryByRange(mergedHistory, range),
    [mergedHistory, range],
  );

  const performance = useMemo(
    () => computeRangePerformance(filteredHistory),
    [filteredHistory],
  );

  const limitedHistory = useMemo(
    () => isLimitedHistory(mergedHistory, range),
    [mergedHistory, range],
  );

  const priceAxisBounds = useMemo(
    () => tightPriceBounds(filteredHistory),
    [filteredHistory],
  );

  const annotations = useMemo(() => {
    if (!filteredHistory.length) return [];
    const rangeStart = filteredHistory[0].date;
    const rangeEnd = filteredHistory[filteredHistory.length - 1].date;
    return [
      ...buildInsiderBuyAnnotations(insiderTransactions, rangeStart, rangeEnd),
      ...buildPeriodEndAnnotations(periods, rangeStart, rangeEnd),
    ];
  }, [filteredHistory, insiderTransactions, periods]);

  const pricePoints = useMemo(() => filteredHistory
    .filter((point) => point.close != null)
    .map((point) => ({ x: point.date, y: Number(point.close) })), [filteredHistory]);

  const volumePoints = useMemo(() => filteredHistory
    .filter((point) => point.volume != null)
    .map((point) => ({ x: point.date, y: Number(point.volume) })), [filteredHistory]);

  const chartSeries = useMemo(() => {
    const series = [{
      name: 'Close',
      type: 'area',
      data: pricePoints,
    }];
    if (showVolume && volumePoints.length > 0) {
      series.push({
        name: 'Volume',
        type: 'line',
        data: volumePoints,
      });
    }
    return series;
  }, [pricePoints, volumePoints, showVolume]);

  const chartHeight = useMemo(() => {
    const width = plotWidth || chartPlotRef.current?.clientWidth || 0;
    if (!width) return MARKET_HISTORY_CHART_HEIGHT;
    return marketHistoryChartHeight(width, {
      showVolume,
      pointCount: pricePoints.length,
    });
  }, [plotWidth, showVolume, pricePoints.length]);

  const chartOptions = useMemo(() => analyticsChartOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    stroke: {
      width: showVolume ? [2, 1.5] : 2,
      curve: 'smooth',
    },
    fill: showVolume
      ? {
        type: ['gradient', 'solid'],
        opacity: [1, 0],
        gradient: { opacityFrom: 0.28, opacityTo: 0.04 },
      }
      : {
        type: 'gradient',
        gradient: { opacityFrom: 0.28, opacityTo: 0.04 },
      },
    dataLabels: { enabled: false },
    legend: {
      show: showVolume,
      position: 'bottom',
      fontSize: '9px',
      height: 24,
      itemMargin: { horizontal: 6, vertical: 0 },
    },
    xaxis: {
      type: 'datetime',
      labels: { rotate: -45, style: { fontSize: '9px' } },
    },
    yaxis: showVolume
      ? [
        {
          seriesName: 'Close',
          ...priceAxisBounds,
          labels: {
            formatter: (value) => formatDecimal(value, 2),
            style: { fontSize: '9px' },
          },
          title: { text: undefined },
        },
        {
          opposite: true,
          seriesName: 'Volume',
          labels: {
            formatter: (value) => formatVolume(value),
            style: { fontSize: '9px' },
          },
          title: { text: undefined },
        },
      ]
      : {
        ...priceAxisBounds,
        labels: {
          formatter: (value) => formatDecimal(value, 2),
          style: { fontSize: '9px' },
        },
        title: { text: undefined },
      },
    grid: {
      padding: { top: 2, right: showVolume ? 8 : 6, bottom: 0, left: 2 },
    },
    annotations: {
      xaxis: annotations,
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'MMM dd, yyyy' },
      y: {
        formatter: (value, { seriesIndex }) => (
          seriesIndex === 1 ? formatVolume(value) : formatCompactUsd(value)
        ),
      },
    },
    colors: showVolume ? ['#5b9cf5', '#6c757d'] : ['#5b9cf5'],
  }), [annotations, heatmapThemeKey, priceAxisBounds, showVolume]);

  const hasChartData = pricePoints.length >= 2;
  const showLoading = loading && !mergedHistory.length;
  const showExtendedLoading = extendedLoading && EXTENDED_HISTORY_RANGES.has(range);

  const performanceLabel = performance ? (
    <>
      <span className={performance.pctReturn >= 0 ? 'st-change-up' : 'st-change-down'}>
        {range}
        {' '}
        return:
        {' '}
        {performance.pctReturn >= 0 ? '+' : ''}
        {formatPercent(performance.pctReturn, 1)}
      </span>
      <span className="research-market-history-performance-sep">·</span>
      <span className={performance.absReturn >= 0 ? 'st-change-up' : 'st-change-down'}>
        {performance.absReturn >= 0 ? '+' : ''}
        {formatCompactUsd(performance.absReturn)}
      </span>
      <span className="research-market-history-performance-sep">·</span>
      <span className="text-muted">
        {formatRangeDate(performance.startDate)}
        {' – '}
        {formatRangeDate(performance.endDate)}
      </span>
    </>
  ) : (
    <span className="text-muted">No performance data for this range.</span>
  );

  return (
    <div className="st-panel research-overview-market-history">
      <div className="st-panel-header research-market-history-header">
        <span className="research-market-history-title">
          <StIcon icon={RESEARCH_ICONS.marginTrends} />
          Market History
        </span>
        <div className="research-market-history-controls">
          <div className="st-segment research-market-history-ranges" role="group" aria-label="Price range">
            {PRICE_CHART_RANGES.map((option) => (
              <button
                key={option}
                type="button"
                className={`st-segment-btn ${range === option ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
                onClick={() => setRange(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="st-segment research-market-history-volume-toggle" role="group" aria-label="Volume overlay">
            <button
              type="button"
              className={`st-segment-btn ${showVolume ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
              aria-pressed={showVolume}
              onClick={() => setShowVolume((current) => !current)}
            >
              Volume
            </button>
          </div>
        </div>
      </div>
      <div className="st-panel-body research-panel-body-tight research-market-history-body">
        <div className="research-market-history-performance small">
          {performanceLabel}
          {showExtendedLoading && (
            <>
              <span className="research-market-history-performance-sep">·</span>
              <span className="text-muted d-inline-flex align-items-center gap-1">
                <StSpinner size="sm" />
                Loading extended history…
              </span>
            </>
          )}
          {limitedHistory && !showExtendedLoading && (
            <>
              <span className="research-market-history-performance-sep">·</span>
              <span className="text-muted">Limited history available in cache.</span>
            </>
          )}
        </div>

        {showLoading && (
          <div
            className="research-chart-empty research-market-history-chart-plot d-flex align-items-center gap-2"
            style={{ minHeight: MARKET_HISTORY_CHART_HEIGHT }}
          >
            <StSpinner size="sm" />
            <span>Loading market history…</span>
          </div>
        )}

        {!showLoading && !hasChartData && (
          <div
            className="research-chart-empty research-market-history-chart-plot"
            style={{ minHeight: MARKET_HISTORY_CHART_HEIGHT }}
          >
            Insufficient price history for this range.
          </div>
        )}

        {!showLoading && hasChartData && (
          <div
            ref={chartPlotRef}
            className="research-market-history-chart-plot"
            style={{ minHeight: chartHeight }}
          >
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={chartHeight}
              width="100%"
            />
          </div>
        )}
      </div>
    </div>
  );
}
