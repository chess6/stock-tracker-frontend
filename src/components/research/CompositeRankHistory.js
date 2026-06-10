import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { mergeApexOptions } from '../../utils/chartTheme';
import { formatCompositeScore } from '../../utils/compositeRank';

export default function CompositeRankHistory({ history = [], loading = false }) {
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
      labels: { show: chartPayload.labels.length <= 12 },
    },
    yaxis: [
      {
        min: 0,
        max: 1,
        decimalsInFloat: 2,
        title: { text: 'Score' },
      },
      {
        opposite: true,
        reversed: true,
        title: { text: 'Rank' },
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
    legend: { show: true, position: 'top' },
  }), [chartPayload.labels]);

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

  return (
    <div className="composite-rank-history">
      <Chart
        type="line"
        height={180}
        series={[
          { name: 'Composite score', data: chartPayload.scores },
          { name: 'Universe rank', data: chartPayload.ranks, yAxisIndex: 1 },
        ]}
        options={options}
      />
    </div>
  );
}
