import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
const MARGIN_DEEP_DIVE_MIN_HEIGHT = 180;

function usePlotHeight(enabled, active, minHeight) {
  const ref = useRef(null);
  const [height, setHeight] = useState(minHeight);

  useLayoutEffect(() => {
    if (!enabled || !active) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    const update = () => {
      const next = Math.floor(el.clientHeight);
      if (next >= minHeight) setHeight(next);
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, active, minHeight]);

  return [ref, height];
}

export default function MarginTrendChart({ periods = [], compact = false, deepDive = false }) {
  const annual = useMemo(() => annualPeriods(periods), [periods]);
  const hasData = annual.length >= 2;
  const [measureRef, plotHeight] = usePlotHeight(deepDive, hasData, MARGIN_DEEP_DIVE_MIN_HEIGHT);

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
      parentHeightOffset: 0,
      redrawOnParentResize: true,
    },
    legend: deepDive ? {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      floating: true,
      fontSize: '9px',
      height: 0,
      offsetY: 6,
      offsetX: -4,
      itemMargin: { horizontal: 5, vertical: 0 },
    } : undefined,
    stroke: { width: compact ? 2.5 : 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    grid: deepDive ? {
      padding: { top: 8, right: 4, bottom: 0, left: 0 },
    } : undefined,
    xaxis: {
      categories: chartData.labels,
      labels: {
        rotate: chartData.labels.length >= 8 ? 0 : -45,
        style: { fontSize: '9px' },
        offsetY: 0,
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

  if (!hasData) {
    return <div className="research-chart-empty">Not enough annual history for margin trends.</div>;
  }

  const height = deepDive
    ? plotHeight
    : (compact ? ANALYTICS_CHART_HEIGHT : 260);

  if (deepDive) {
    return (
      <div ref={measureRef} className="research-margin-chart-measure">
        <div className="research-chart-plot-margin" style={{ height }}>
          <Chart
            key={`margin-${height}`}
            options={options}
            series={series}
            type="line"
            height={height}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="research-chart-plot">
      <Chart options={options} series={series} type="line" height={height} />
    </div>
  );
}
