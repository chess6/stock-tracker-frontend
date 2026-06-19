import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ANALYTICS_DEEP_DIVE_STRIP_HEIGHT, mergeApexOptions } from '../../utils/chartTheme';
import { formatCompositeScore } from '../../utils/compositeRank';

const GATE_ORDER = [
  'solvency_runway',
  'accounting_integrity',
  'secular_decline',
  'margin_of_safety',
];

function gateStatusClass(status) {
  if (status === 'pass') return 'thesis-drift-gate--pass';
  if (status === 'fail') return 'thesis-drift-gate--fail';
  return 'thesis-drift-gate--unknown';
}

export default function ThesisDriftChart({ history = [], loading = false, compact = false }) {
  const chartPayload = useMemo(() => {
    const labels = history.map((point) => point.snapshot_date);
    const scores = history.map((point) => (
      point.composite_score == null ? null : Number(point.composite_score)
    ));
    return { labels, scores };
  }, [history]);

  const options = useMemo(() => mergeApexOptions({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: {
      categories: chartPayload.labels,
      labels: {
        show: chartPayload.labels.length <= 12,
        style: { fontSize: compact ? '9px' : '11px' },
      },
    },
    yaxis: {
      min: 0,
      max: 1,
      decimalsInFloat: 2,
      title: { text: compact ? undefined : 'Composite score' },
      labels: { style: { fontSize: compact ? '9px' : '11px' } },
    },
    tooltip: {
      y: {
        formatter: (value) => formatCompositeScore(value),
      },
    },
    legend: { show: false },
  }), [chartPayload.labels, compact]);

  if (loading) {
    return <div className="research-chart-empty">Loading thesis drift…</div>;
  }

  if (chartPayload.labels.length < 1) {
    return (
      <div className="research-chart-empty">
        Thesis drift appears after thesis snapshots are persisted nightly.
      </div>
    );
  }

  const chartHeight = compact ? ANALYTICS_DEEP_DIVE_STRIP_HEIGHT : 160;

  return (
    <div className={`thesis-drift-chart${compact ? ' thesis-drift-chart--compact' : ''}`}>
      {compact && <div className="thesis-drift-chart-title">Thesis drift</div>}
      {chartPayload.labels.length >= 2 ? (
        <Chart
          type="line"
          height={chartHeight}
          series={[{ name: 'Composite score', data: chartPayload.scores }]}
          options={options}
        />
      ) : (
        <div className="thesis-drift-single-score st-num">
          {formatCompositeScore(chartPayload.scores[0])}
        </div>
      )}
      <div className="thesis-drift-gate-timeline">
        {history.map((point) => (
          <div key={point.snapshot_date} className="thesis-drift-gate-row">
            <span className="thesis-drift-gate-date">{point.snapshot_date}</span>
            <span className="thesis-drift-gate-dots">
              {GATE_ORDER.map((gate) => {
                const status = point.gates?.[gate] || 'unknown';
                return (
                  <span
                    key={`${point.snapshot_date}-${gate}`}
                    className={`thesis-drift-gate ${gateStatusClass(status)}`}
                    title={`${gate.replace(/_/g, ' ')}: ${status}`}
                  />
                );
              })}
            </span>
            {point.disqualified && (
              <span className="thesis-drift-disqualified">DQ</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
