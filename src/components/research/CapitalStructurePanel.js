import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { mergeApexOptions } from '../../utils/chartTheme';
import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';

function annualPeriods(periods = []) {
  return [...periods]
    .filter((period) => {
      const dim = (period.dimension || '').toUpperCase();
      return dim === 'ARY' || dim === 'MRY';
    })
    .sort((a, b) => (a.periodEnd || '').localeCompare(b.periodEnd || ''));
}

function debtValue(fundamentals = {}) {
  if (fundamentals.debt != null) return fundamentals.debt;
  const current = fundamentals.debtcurrent || 0;
  const longTerm = fundamentals.debtlt || 0;
  if (fundamentals.debtcurrent != null || fundamentals.debtlt != null) {
    return current + longTerm;
  }
  return null;
}

export default function CapitalStructurePanel({ periods = [], compact = false }) {
  const annual = useMemo(() => annualPeriods(periods), [periods]);
  const latest = annual[annual.length - 1];
  const latestFundamentals = latest?.fundamentals || {};
  const latestMetrics = latest?.metrics || {};

  const latestDebt = debtValue(latestFundamentals);
  const latestEquity = latestFundamentals.equity;
  const latestCash = latestFundamentals.cashneq;
  const latestAssets = latestFundamentals.assets;
  const leverage = latestAssets && latestFundamentals.liabilities != null
    ? latestFundamentals.liabilities / latestAssets
    : null;
  const cashToDebt = latestDebt && latestCash != null && latestDebt !== 0
    ? latestCash / latestDebt
    : null;

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

  const options = useMemo(() => mergeApexOptions({
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
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: [
      {
        seriesName: 'Debt/Equity',
        labels: { formatter: (value) => formatDecimal(value, 2) },
        title: { text: 'Ratios' },
      },
      {
        opposite: true,
        seriesName: 'Leverage',
        labels: { formatter: (value) => formatPercent(value * 100, 0) },
        title: { text: 'Liabilities / Assets' },
      },
    ],
    legend: { position: 'top', fontSize: '11px' },
    colors: ['#dc3545', '#0d6efd', '#ffc107'],
  }), [chartData.labels]);

  const series = useMemo(() => ([
    { name: 'Debt/Equity', data: chartData.debtEquity },
    { name: 'Current Ratio', data: chartData.currentRatio },
    { name: 'Leverage', data: chartData.leverage },
  ]), [chartData]);

  if (!latest) {
    return <div className="small text-muted p-1">No capital structure data available.</div>;
  }

  const chartHeight = compact ? 150 : 240;

  return (
    <div className="research-capital-panel">
      <div className="row g-1 mb-1">
        <div className="col-6 col-md-3">
          <div className="research-capital-stat">
            <div className="text-muted small">Total Debt</div>
            <div className="fw-semibold small">{latestDebt == null ? '-' : formatCompactUsd(latestDebt)}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="research-capital-stat">
            <div className="text-muted small">Equity</div>
            <div className="fw-semibold small">{latestEquity == null ? '-' : formatCompactUsd(latestEquity)}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="research-capital-stat">
            <div className="text-muted small">Cash</div>
            <div className="fw-semibold small">{latestCash == null ? '-' : formatCompactUsd(latestCash)}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="research-capital-stat">
            <div className="text-muted small">Cash / Debt</div>
            <div className="fw-semibold small">{cashToDebt == null ? '-' : formatDecimal(cashToDebt, 2)}</div>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="small text-muted mb-1">
          Latest D/E {latestMetrics.de == null ? '-' : formatDecimal(latestMetrics.de, 2)}
          {' · '}
          Current ratio {latestMetrics.currentRatio == null ? '-' : formatDecimal(latestMetrics.currentRatio, 2)}
          {' · '}
          Leverage {leverage == null ? '-' : formatPercent(leverage * 100, 1)}
        </div>
      )}
      {annual.length >= 2 ? (
        <Chart options={options} series={series} type="area" height={chartHeight} />
      ) : (
        <div className="small text-muted">Not enough annual history for leverage trends.</div>
      )}
    </div>
  );
}
