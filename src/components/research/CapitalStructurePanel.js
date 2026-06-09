import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import {
  ANALYTICS_CHART_HEIGHT_SHORT,
  analyticsChartOptions,
} from '../../utils/chartTheme';
import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';
import { getCapitalStructureSnapshot } from '../../utils/capitalStructureStats';

export default function CapitalStructurePanel({ periods = [], compact = false, inline = false }) {
  const snapshot = useMemo(() => getCapitalStructureSnapshot(periods), [periods]);
  const annual = useMemo(() => snapshot?.annual || [], [snapshot]);
  const latest = snapshot?.latest;

  const chartData = useMemo(() => {
    const labels = annual.map((period) => (period.periodEnd || '').slice(0, 4));
    return {
      labels,
      debtEquity: annual.map((period) => period.metrics?.de ?? null),
      currentRatio: annual.map((period) => period.metrics?.currentRatio ?? null),
      leverage: annual.map((period) => {
        const assets = period.fundamentals?.assets;
        const liabilities = period.fundamentals?.liabilities;
        if (!assets || liabilities == null) return null;
        return liabilities / assets;
      }),
    };
  }, [annual]);

  const options = useMemo(() => analyticsChartOptions({
    chart: {
      type: 'area',
      stacked: false,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData.labels,
      labels: {
        rotate: chartData.labels.length >= 8 ? 0 : -45,
        style: { fontSize: '9px' },
      },
    },
    yaxis: [
      {
        seriesName: 'Debt/Equity',
        labels: { formatter: (value) => formatDecimal(value, 2), style: { fontSize: '9px' } },
        title: { text: undefined },
      },
      {
        opposite: true,
        seriesName: 'Leverage',
        labels: { formatter: (value) => formatPercent(value * 100, 0), style: { fontSize: '9px' } },
        title: { text: undefined },
      },
    ],
    colors: ['#e87882', '#5b9cf5', '#f5a623'],
  }), [chartData.labels]);

  const series = useMemo(() => ([
    { name: 'Debt/Equity', data: chartData.debtEquity },
    { name: 'Current Ratio', data: chartData.currentRatio },
    { name: 'Leverage', data: chartData.leverage },
  ]), [chartData]);

  if (!latest) {
    return <div className="research-chart-empty">No capital structure data available.</div>;
  }

  const chartHeight = inline || compact ? ANALYTICS_CHART_HEIGHT_SHORT : 240;

  return (
    <div className={inline ? 'research-capital-panel research-capital-inline research-capital-inline-fixed' : 'research-capital-panel'}>
      {!inline && (
        <>
          <div className="research-stat-strip">
            <span className="research-stat-strip-item">
              <span className="research-stat-strip-label">Debt</span>
              <span className="research-stat-strip-value st-num">
                {snapshot.latestDebt == null ? '-' : formatCompactUsd(snapshot.latestDebt)}
              </span>
            </span>
            <span className="research-stat-strip-item">
              <span className="research-stat-strip-label">Equity</span>
              <span className="research-stat-strip-value st-num">
                {snapshot.latestEquity == null ? '-' : formatCompactUsd(snapshot.latestEquity)}
              </span>
            </span>
            <span className="research-stat-strip-item">
              <span className="research-stat-strip-label">Cash</span>
              <span className="research-stat-strip-value st-num">
                {snapshot.latestCash == null ? '-' : formatCompactUsd(snapshot.latestCash)}
              </span>
            </span>
            <span className="research-stat-strip-item">
              <span className="research-stat-strip-label">Cash/Debt</span>
              <span className="research-stat-strip-value st-num">
                {snapshot.cashToDebt == null ? '-' : formatDecimal(snapshot.cashToDebt, 2)}
              </span>
            </span>
          </div>
          <div className="research-capital-ratios">
            D/E {snapshot.de == null ? '-' : formatDecimal(snapshot.de, 2)}
            {' · '}
            CR {snapshot.currentRatio == null ? '-' : formatDecimal(snapshot.currentRatio, 2)}
            {' · '}
            Lev {snapshot.leverage == null ? '-' : formatPercent(snapshot.leverage * 100, 1)}
          </div>
        </>
      )}
      {annual.length >= 2 ? (
        <div className="research-chart-plot research-chart-plot-short">
          <Chart options={options} series={series} type="area" height={chartHeight} />
        </div>
      ) : (
        <div className="research-chart-empty">Not enough annual history for leverage trends.</div>
      )}
    </div>
  );
}
