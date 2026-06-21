import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import StSpinner from '../StSpinner';
import StIcon from '../StIcon';
import { RESEARCH_ICONS } from '../../icons/researchIcons';
import {
  MARKET_HISTORY_CHART_HEIGHT,
  analyticsChartOptions,
} from '../../utils/chartTheme';
import { isDarkTheme } from '../../utils/themeState';
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
  tightVolumeBounds,
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

  const chartCategories = useMemo(() => filteredHistory
    .filter((point) => point.close != null)
    .map((point) => point.date), [filteredHistory]);

  const priceValues = useMemo(() => filteredHistory
    .filter((point) => point.close != null)
    .map((point) => Number(point.close)), [filteredHistory]);

  const volumeValues = useMemo(() => {
    const closeDates = new Set(chartCategories);
    return filteredHistory
      .filter((point) => closeDates.has(point.date) && point.volume != null && Number.isFinite(Number(point.volume)))
      .map((point) => Number(point.volume));
  }, [filteredHistory, chartCategories]);

  const hasVolumeData = volumeValues.length >= 2;
  const dark = isDarkTheme();
  const priceColor = dark ? '#5b9cf5' : '#4a90e2';
  const volumeColor = dark ? '#ffc857' : '#b86e00';
  const priceFillFrom = dark ? 0.35 : 0.4;
  const priceFillTo = dark ? 0.05 : 0.1;
  const volumeFillOpacity = dark ? 0.88 : 0.62;

  const volumeAxisBounds = useMemo(
    () => tightVolumeBounds(volumeValues.map((v) => ({ y: v }))),
    [volumeValues],
  );

  const chartSeries = useMemo(() => {
    const series = [{
      name: 'Close',
      type: 'area',
      data: priceValues,
    }];
    if (showVolume && hasVolumeData) {
      series.push({
        name: 'Volume',
        type: 'column',
        data: volumeValues,
      });
    }
    return series;
  }, [priceValues, volumeValues, showVolume, hasVolumeData]);

  const chartHeight = useMemo(() => {
    const width = plotWidth || chartPlotRef.current?.clientWidth || 0;
    if (!width) return MARKET_HISTORY_CHART_HEIGHT;
    return marketHistoryChartHeight(width, {
      showVolume,
      pointCount: priceValues.length,
    });
  }, [plotWidth, showVolume, priceValues.length]);

  const chartOptions = useMemo(() => analyticsChartOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        columnWidth: showVolume && hasVolumeData ? '88%' : '50%',
      },
    },
    stroke: {
      width: showVolume && hasVolumeData ? [2, 0] : 2,
      curve: 'smooth',
      colors: [priceColor, volumeColor],
    },
    fill: showVolume && hasVolumeData
      ? {
        type: ['gradient', 'solid'],
        opacity: [1, volumeFillOpacity],
        colors: [priceColor, volumeColor],
        gradient: {
          shadeIntensity: 0,
          opacityFrom: priceFillFrom,
          opacityTo: priceFillTo,
          stops: [0, 100],
        },
      }
      : {
        type: 'gradient',
        colors: [priceColor],
        gradient: {
          shadeIntensity: 0,
          opacityFrom: priceFillFrom,
          opacityTo: priceFillTo,
          stops: [0, 100],
        },
      },
    dataLabels: { enabled: false },
    legend: {
      show: showVolume && hasVolumeData,
      position: 'bottom',
      fontSize: '9px',
      height: 24,
      itemMargin: { horizontal: 6, vertical: 0 },
    },
    xaxis: {
      type: 'category',
      categories: chartCategories,
      labels: {
        rotate: -45,
        hideOverlappingLabels: true,
        style: { fontSize: '9px' },
        formatter: (value) => {
          const str = String(value);
          if (!/^\d{4}-\d{2}-\d{2}/.test(str)) return str;
          const d = new Date(str.slice(0, 10));
          if (Number.isNaN(d.getTime())) return str;
          const mon = d.toLocaleDateString(undefined, { month: 'short' });
          const yr = String(d.getFullYear()).slice(2);
          return `${mon} '${yr}`;
        },
      },
      tickAmount: 6,
    },
    yaxis: showVolume && hasVolumeData
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
          seriesName: 'Volume',
          opposite: true,
          show: true,
          ...volumeAxisBounds,
          labels: {
            formatter: (value) => formatVolume(value),
            style: { fontSize: '9px', colors: volumeColor },
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
      padding: { top: 2, right: showVolume && hasVolumeData ? 10 : 6, bottom: 0, left: 2 },
    },
    annotations: {
      xaxis: annotations,
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        formatter: (value, opts) => {
          const idx = opts?.dataPointIndex;
          const dateStr = (idx != null && chartCategories[idx]) || String(value);
          if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
          const d = new Date(dateStr.slice(0, 10));
          if (Number.isNaN(d.getTime())) return dateStr;
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        },
      },
      y: {
        formatter: (value, { seriesIndex }) => (
          seriesIndex === 1 ? formatVolume(value) : formatCompactUsd(value)
        ),
      },
    },
    colors: showVolume && hasVolumeData ? [priceColor, volumeColor] : [priceColor],
  }), [
    annotations,
    chartCategories,
    heatmapThemeKey,
    priceAxisBounds,
    volumeAxisBounds,
    showVolume,
    hasVolumeData,
    volumeColor,
    priceColor,
    priceFillFrom,
    priceFillTo,
    volumeFillOpacity,
  ]);

  const hasChartData = priceValues.length >= 2;
  const showLoading = loading && !mergedHistory.length;
  const showExtendedLoading = extendedLoading && EXTENDED_HISTORY_RANGES.has(range);
  const chartKey = `${range}-${showVolume ? 'vol' : 'price'}-${priceValues.length}-${heatmapThemeKey}`;

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
          {showVolume && !hasVolumeData && !showLoading && (
            <>
              <span className="research-market-history-performance-sep">·</span>
              <span className="text-muted">Volume data unavailable for this range.</span>
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
              key={chartKey}
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
