import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Chart from 'react-apexcharts';
import API_ENDPOINTS from '../../apiConfig';
import { buildGteDate } from '../../config/researchMetrics';
import { mergeApexOptions } from '../../utils/chartTheme';
import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';

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
];

const CHART_COLORS = ['#0d6efd', '#20c997', '#6610f2', '#fd7e14', '#dc3545'];

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

export default function CompareMetricsPanel({ compareTickers = [] }) {
  const [detailByTicker, setDetailByTicker] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (compareTickers.length < 2) {
      setDetailByTicker({});
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
            const res = await axios.get(API_ENDPOINTS.RESEARCH_TICKER(ticker), { params });
            return [ticker, res.data];
          }),
        );
        if (cancelled) return;
        setDetailByTicker(Object.fromEntries(results));
      } catch {
        if (!cancelled) {
          setError('Failed to load comparison history.');
          setDetailByTicker({});
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

  if (compareTickers.length < 2) {
    return (
      <div className="card shadow-sm mb-2 research-compare-panel">
        <div className="card-body py-2 small text-muted">
          Select 2–5 tickers using the compare checkboxes to overlay metric trends.
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-2 research-compare-panel">
      <div className="card-header py-1 px-2 d-flex flex-wrap gap-2 align-items-center">
        <span className="fw-semibold small">Cross-Ticker Comparison</span>
        <span className="text-muted small">
          {compareTickers.join(' · ')}
        </span>
      </div>
      <div className="card-body p-1">
        {loading && <div className="small p-1">Loading comparison data…</div>}
        {error && <div className="small text-warning p-1">{error}</div>}
        {!loading && !error && tickerData.length >= 2 && (
          <div className="row g-1">
            {COMPARE_METRICS.map((metric) => (
              <div key={metric.id} className="col-xl-6">
                <div className="research-compare-chart-card">
                  <div className="research-compare-chart-title">{metric.label}</div>
                  <CompareMetricChart metric={metric} tickerData={tickerData} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const MAX_COMPARE_TICKERS = 5;
