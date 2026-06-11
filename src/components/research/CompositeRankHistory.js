import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ANALYTICS_DEEP_DIVE_STRIP_HEIGHT, mergeApexOptions } from '../../utils/chartTheme';
import { formatCompositeScore } from '../../utils/compositeRank';

export default function CompositeRankHistory({ history = [], loading = false, compact = false }) {
  const chartPayload = useMemo(() => {
    const labels = history.map((point) => point.snapshot_date);
    const scores = history.map((point) => (
      point.composite_score == null ? null : Number(point.composite_score)
    ));
    const ranks = history.map((point) => point.rank_in_universe ?? null);
    return { labels, scores, ranks };
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
    yaxis: [
      {
        min: 0,
        max: 1,
        decimalsInFloat: 2,
        title: { text: compact ? undefined : 'Score' },
        labels: { style: { fontSize: compact ? '9px' : '11px' } },
      },
      {
        opposite: true,
        reversed: true,
        title: { text: compact ? undefined : 'Rank' },
        labels: { style: { fontSize: compact ? '9px' : '11px' } },
      },
    ],
    tooltip: {
      shared: true,
      y: {
        formatter: (value, { seriesIndex }) => (
          seriesIndex === 0 ? formatCompositeScore(value) : `#${value}`
        ),
      },
    },
    legend: { show: !compact, position: 'top' },
  }), [chartPayload.labels, compact]);

  if (loading) {
    return <div className="research-chart-empty">Loading rank history…</div>;
  }

  if (chartPayload.labels.length < 2) {
    return (
      <div className="research-chart-empty">
        Rank history appears after nightly composite snapshots run.
      </div>
    );
  }

  const chartHeight = compact ? ANALYTICS_DEEP_DIVE_STRIP_HEIGHT : 180;

  return (
    <div className={`composite-rank-history${compact ? ' composite-rank-history--compact' : ''}`}>
      {compact && <div className="composite-rank-history-title">Rank history</div>}
      <Chart
        type="line"
        height={chartHeight}
        series={[
          { name: 'Composite score', data: chartPayload.scores },
          { name: 'Universe rank', data: chartPayload.ranks, yAxisIndex: 1 },
        ]}
        options={options}
      />
    </div>
  );
}
