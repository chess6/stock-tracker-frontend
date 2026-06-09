import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import {
  ANALYTICS_CHART_HEIGHT,
  analyticsChartOptions,
  tightPercentBounds,
} from '../../utils/chartTheme';
import { formatPercent } from '../../utils/formatters';

function annualPeriods(periods = []) {
  return [...periods]
    .filter((period) => {
      const dim = (period.dimension || '').toUpperCase();
      return dim === 'ARY' || dim === 'MRY';
    })
    .sort((a, b) => (a.periodEnd || '').localeCompare(b.periodEnd || ''));
}

function operatingMargin(period) {
  const revenue = period.fundamentals?.revenue;
  const opinc = period.fundamentals?.opinc ?? period.fundamentals?.ebit;
  if (revenue == null || revenue === 0 || opinc == null) return null;
  return opinc / revenue;
}

function fcfMargin(period) {
  const revenue = period.fundamentals?.revenue;
  if (revenue == null || revenue === 0) return null;
  const fcf = period.fundamentals?.fcf ?? (
    period.fundamentals?.ncfo != null
      ? period.fundamentals.ncfo - (period.fundamentals.capex || 0)
      : null
  );
  if (fcf == null) return null;
  return fcf / revenue;
}

const MARGIN_COLORS = ['#6ecf97', '#5b9cf5', '#f5a623', '#e87882'];

/** Deep-dive left column — total Apex height (plot + axes + legend). */
const MARGIN_DEEP_DIVE_HEIGHT = 310;

export default function MarginTrendChart({ periods = [], compact = false, deepDive = false }) {
  const annual = useMemo(() => annualPeriods(periods), [periods]);

  const chartData = useMemo(() => {
    const labels = annual.map((period) => (period.periodEnd || '').slice(0, 4));
    return {
      labels,
      gross: annual.map((period) => {
        const value = period.metrics?.grossMargin;
        return value == null ? null : value * 100;
      }),
      operating: annual.map(operatingMargin).map((value) => (value == null ? null : value * 100)),
      net: annual.map((period) => {
        const value = period.metrics?.netMargin;
        return value == null ? null : value * 100;
      }),
      fcf: annual.map(fcfMargin).map((value) => (value == null ? null : value * 100)),
    };
  }, [annual]);

  const series = useMemo(() => ([
    { name: 'Gross', data: chartData.gross },
    { name: 'Operating', data: chartData.operating },
    { name: 'Net', data: chartData.net },
    { name: 'FCF', data: chartData.fcf },
  ]), [chartData]);

  const yBounds = useMemo(
    () => tightPercentBounds(
      series.map((item) => item.data),
      deepDive ? 1 : 3,
      deepDive ? 1 : 2,
    ),
    [series, deepDive],
  );

  const options = useMemo(() => analyticsChartOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      redrawOnParentResize: true,
    },
    legend: deepDive ? {
      position: 'top',
      horizontalAlign: 'left',
      offsetY: -4,
      height: 18,
      fontSize: '9px',
      itemMargin: { horizontal: 5, vertical: 0 },
    } : undefined,
    stroke: { width: compact ? 2.5 : 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    grid: deepDive ? {
      padding: { top: 0, right: 4, bottom: -4, left: 0 },
    } : undefined,
    xaxis: {
      categories: chartData.labels,
      labels: {
        rotate: chartData.labels.length >= 8 ? 0 : -45,
        style: { fontSize: '9px' },
        offsetY: deepDive ? -2 : 0,
      },
    },
    yaxis: {
      min: yBounds.min,
      max: yBounds.max,
      labels: {
        formatter: (value) => formatPercent(value, 0),
        style: { fontSize: '9px' },
      },
      title: { text: undefined },
    },
    tooltip: {
      y: { formatter: (value) => (value == null ? '-' : formatPercent(value, 1)) },
    },
    colors: MARGIN_COLORS,
  }), [chartData.labels, compact, deepDive, yBounds.max, yBounds.min]);

  if (annual.length < 2) {
    return <div className="research-chart-empty">Not enough annual history for margin trends.</div>;
  }

  const height = deepDive
    ? MARGIN_DEEP_DIVE_HEIGHT
    : (compact ? ANALYTICS_CHART_HEIGHT : 260);

  return (
    <div className={deepDive ? 'research-chart-plot research-chart-plot-margin' : 'research-chart-plot'}>
      <Chart options={options} series={series} type="line" height={height} />
    </div>
  );
}
