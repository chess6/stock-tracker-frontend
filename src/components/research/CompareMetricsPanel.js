import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Chart from 'react-apexcharts';
import API_ENDPOINTS from '../../apiConfig';
import { buildGteDate } from '../../config/researchMetrics';
import { mergeApexOptions } from '../../utils/chartTheme';
import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';
import {
  buildPortfolioPercentileRanks,
  buildRowsByTicker,
  COMPARE_SNAPSHOT_METRICS,
  formatCompareSnapshotValue,
} from '../../utils/portfolioCompare';

const COMPARE_METRICS = [
  {
    id: 'revenue',
    label: 'Revenue',
    format: 'usd',
    read: (period) => period.fundamentals?.revenue,
  },
  {
    id: 'grossMargin',
    label: 'Gross Margin',
    format: 'percent',
    read: (period) => {
      const value = period.metrics?.grossMargin;
      return value == null ? null : value * 100;
    },
  },
  {
    id: 'piotroskiF',
    label: 'Piotroski F',
    format: 'integer',
    read: (period) => period.scoreSnapshot?.piotroskiF ?? null,
  },
  {
    id: 'altmanZ',
    label: 'Altman Z',
    format: 'decimal',
    read: (period) => period.scoreSnapshot?.altmanZ ?? null,
  },
  {
    id: 'survivability',
    label: 'Survivability',
    format: 'integer',
    read: (period) => period.scoreSnapshot?.survivability ?? null,
  },
];

const CHART_COLORS = ['#5b9cf5', '#f5a623', '#6ecf97', '#e87882', '#9aa3ad'];

function annualPeriods(detail) {
  const periods = detail?.periods || [];
  const scoreByPeriod = {};
  (detail?.scoreHistory || []).forEach((score) => {
    scoreByPeriod[score.periodEnd] = score;
  });
  return [...periods]
    .filter((period) => {
      const dim = (period.dimension || '').toUpperCase();
      return dim === 'ARY' || dim === 'MRY';
    })
    .map((period) => ({
      ...period,
      scoreSnapshot: scoreByPeriod[period.periodEnd] || null,
    }))
    .sort((a, b) => (a.periodEnd || '').localeCompare(b.periodEnd || ''));
}

function formatTooltipValue(value, format) {
  if (value == null) return '-';
  switch (format) {
    case 'usd':
      return formatCompactUsd(value);
    case 'percent':
      return formatPercent(value, 1);
    case 'integer':
      return String(Math.round(value));
    default:
      return formatDecimal(value, 2);
  }
}

function DivergenceHistoryChart({ tickerData }) {
  const chartPayload = useMemo(() => {
    const labelSet = new Set();
    tickerData.forEach(({ history }) => {
      (history || []).forEach((point) => {
        if (point.snapshotDate) labelSet.add(point.snapshotDate.slice(0, 10));
      });
    });
    const labels = [...labelSet].sort();
    const series = tickerData.map(({ ticker, history }) => {
      const byDate = {};
      (history || []).forEach((point) => {
        const key = (point.snapshotDate || '').slice(0, 10);
        byDate[key] = point.divergenceScore;
      });
      return {
        name: ticker,
        data: labels.map((label) => (byDate[label] == null ? null : byDate[label])),
      };
    });
    return { labels, series };
  }, [tickerData]);

  const options = useMemo(() => mergeApexOptions({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    colors: CHART_COLORS,
    xaxis: {
      categories: chartPayload.labels,
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: {
      min: 0,
      max: 1,
      labels: { formatter: (value) => formatDecimal(value, 2) },
      title: { text: 'Divergence Score' },
    },
    legend: { position: 'top', fontSize: '11px' },
    tooltip: {
      y: { formatter: (value) => formatDecimal(value, 2) },
    },
  }), [chartPayload.labels]);

  if (chartPayload.labels.length < 2) {
    return <div className="small text-muted">Not enough divergence history.</div>;
  }

  return (
    <Chart
      options={options}
      series={chartPayload.series}
      type="line"
      height={180}
    />
  );
}

function CompareMetricChart({ metric, tickerData }) {
  const chartPayload = useMemo(() => {
    const labelSet = new Set();
    tickerData.forEach(({ periods }) => {
      periods.forEach((period) => {
        if (period.periodEnd) labelSet.add(period.periodEnd.slice(0, 4));
      });
    });
    const labels = [...labelSet].sort();
    const series = tickerData.map(({ ticker, periods }) => {
      const byYear = {};
      periods.forEach((period) => {
        const year = (period.periodEnd || '').slice(0, 4);
        byYear[year] = metric.read(period);
      });
      return {
        name: ticker,
        data: labels.map((label) => (byYear[label] == null ? null : byYear[label])),
      };
    });
    return { labels, series };
  }, [metric, tickerData]);

  const options = useMemo(() => mergeApexOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    colors: CHART_COLORS,
    xaxis: {
      categories: chartPayload.labels,
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: {
      labels: {
        formatter: (value) => formatTooltipValue(value, metric.format),
      },
      title: { text: metric.label },
    },
    legend: { position: 'top', fontSize: '11px' },
    tooltip: {
      y: { formatter: (value) => formatTooltipValue(value, metric.format) },
    },
  }), [chartPayload.labels, metric]);

  if (chartPayload.labels.length < 2) {
    return <div className="small text-muted">Not enough history.</div>;
  }

  return (
    <Chart
      options={options}
      series={chartPayload.series}
      type="line"
      height={180}
    />
  );
}

function CompareSnapshotTable({
  compareTickers,
  snapshotRows = [],
  percentileUniverse = [],
  showPercentileRanks = false,
}) {
  const rowsByTicker = useMemo(() => buildRowsByTicker(snapshotRows), [snapshotRows]);
  const percentileRanks = useMemo(() => {
    if (!showPercentileRanks) return null;
    return buildPortfolioPercentileRanks(
      percentileUniverse,
      COMPARE_SNAPSHOT_METRICS.map((metric) => metric.key),
      compareTickers,
    );
  }, [compareTickers, percentileUniverse, showPercentileRanks]);

  const hasSnapshot = compareTickers.some((ticker) => rowsByTicker[ticker]);
  if (!hasSnapshot) return null;

  return (
    <div className="research-compare-snapshot mb-2">
      <div className="research-compare-chart-title">Latest portfolio snapshot</div>
      <div className="table-responsive">
        <table className="table table-sm table-bordered research-compare-snapshot-table mb-0">
          <thead>
            <tr>
              <th>Metric</th>
              {compareTickers.map((ticker) => (
                <th key={ticker} className="text-end">{ticker}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_SNAPSHOT_METRICS.map((metric) => (
              <tr key={metric.key}>
                <td>{metric.label}</td>
                {compareTickers.map((ticker) => {
                  const row = rowsByTicker[ticker];
                  const value = row?.[metric.key];
                  const rank = percentileRanks?.[ticker]?.[metric.key];
                  return (
                    <td key={ticker} className="text-end numeric-cell">
                      {formatCompareSnapshotValue(value, metric.format)}
                      {rank != null && (
                        <span className="research-compare-percentile" title="Percentile within visible portfolio">
                          {' '}P{rank}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompareMetricsPanel({
  compareTickers = [],
  snapshotRows = [],
  percentileUniverse = [],
  showPercentileRanks = false,
  onTogglePercentileRanks,
  onClose,
}) {
  const [detailByTicker, setDetailByTicker] = useState({});
  const [narrativeByTicker, setNarrativeByTicker] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (compareTickers.length < 2) {
      setDetailByTicker({});
      setNarrativeByTicker({});
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const gte = buildGteDate(10);
        const results = await Promise.all(
          compareTickers.map(async (ticker) => {
            const params = { dimension: 'ARY' };
            if (gte) params.gte = gte;
            const [detailRes, narrativeRes] = await Promise.all([
              axios.get(API_ENDPOINTS.RESEARCH_TICKER(ticker), { params }),
              axios.get(API_ENDPOINTS.RESEARCH_NARRATIVE(ticker)),
            ]);
            return [ticker, detailRes.data, narrativeRes.data];
          }),
        );
        if (cancelled) return;
        setDetailByTicker(Object.fromEntries(results.map(([ticker, detail]) => [ticker, detail])));
        setNarrativeByTicker(Object.fromEntries(results.map(([ticker, , narrative]) => [ticker, narrative])));
      } catch {
        if (!cancelled) {
          setError('Failed to load comparison history.');
          setDetailByTicker({});
          setNarrativeByTicker({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [compareTickers]);

  const tickerData = useMemo(
    () => compareTickers
      .map((ticker) => ({
        ticker,
        periods: annualPeriods(detailByTicker[ticker]),
      }))
      .filter((entry) => entry.periods.length > 0),
    [compareTickers, detailByTicker],
  );

  const divergenceTickerData = useMemo(
    () => compareTickers.map((ticker) => ({
      ticker,
      history: narrativeByTicker[ticker]?.divergenceHistory || [],
    })),
    [compareTickers, narrativeByTicker],
  );

  const hasDivergenceHistory = divergenceTickerData.some(
    (entry) => (entry.history || []).length >= 2,
  );

  if (compareTickers.length < 2) {
    return (
      <div className="st-panel mb-2 research-compare-panel">
        <div className="st-panel-body text-xs text-st-muted">
          Select 2–5 tickers using the compare checkboxes to overlay metric trends.
        </div>
      </div>
    );
  }

  return (
    <div className="st-panel mb-2 research-compare-panel">
      <div className="st-panel-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span>Cross-Ticker Comparison</span>
          <span className="font-normal text-st-muted">{compareTickers.join(' · ')}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {onTogglePercentileRanks && (
            <button
              type="button"
              className="st-btn"
              onClick={onTogglePercentileRanks}
              aria-pressed={showPercentileRanks}
            >
              {showPercentileRanks ? 'Hide percentiles' : 'Show percentiles'}
            </button>
          )}
          {onClose && (
            <button type="button" className="st-btn-ghost" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
      <div className="st-panel-body p-1">
        <CompareSnapshotTable
          compareTickers={compareTickers}
          snapshotRows={snapshotRows}
          percentileUniverse={percentileUniverse}
          showPercentileRanks={showPercentileRanks}
        />
        {loading && <div className="p-1 text-xs text-st-muted">Loading comparison data…</div>}
        {error && <div className="p-1 text-xs text-st-amber">{error}</div>}
        {!loading && !error && tickerData.length >= 2 && (
          <div className="research-compare-grid">
            {COMPARE_METRICS.map((metric) => (
              <div key={metric.id}>
                <div className="research-compare-chart-card">
                  <div className="research-compare-chart-title">{metric.label}</div>
                  <CompareMetricChart metric={metric} tickerData={tickerData} />
                </div>
              </div>
            ))}
            {hasDivergenceHistory && (
              <div>
                <div className="research-compare-chart-card">
                  <div className="research-compare-chart-title">Divergence Score</div>
                  <DivergenceHistoryChart tickerData={divergenceTickerData} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const MAX_COMPARE_TICKERS = 5;
