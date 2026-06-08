import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { mergeApexOptions } from '../../utils/chartTheme';
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

export default function MarginTrendChart({ periods = [], compact = false }) {
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

  const options = useMemo(() => mergeApexOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData.labels,
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: {
      labels: {
        formatter: (value) => formatPercent(value, 0),
      },
      title: { text: 'Margin %' },
    },
    legend: { position: 'top', fontSize: '11px' },
    tooltip: {
      y: { formatter: (value) => (value == null ? '-' : formatPercent(value, 1)) },
    },
    colors: ['#20c997', '#0d6efd', '#6610f2', '#fd7e14'],
  }), [chartData.labels]);

  const series = useMemo(() => ([
    { name: 'Gross', data: chartData.gross },
    { name: 'Operating', data: chartData.operating },
    { name: 'Net', data: chartData.net },
    { name: 'FCF', data: chartData.fcf },
  ]), [chartData]);

  if (annual.length < 2) {
    return <div className="small text-muted p-1">Not enough annual history for margin trends.</div>;
  }

  return (
    <Chart options={options} series={series} type="line" height={compact ? 165 : 260} />
  );
}
