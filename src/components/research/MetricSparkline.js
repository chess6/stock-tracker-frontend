import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { mergeApexOptions } from '../../utils/chartTheme';
import { prepareSparklineData } from '../../utils/researchCalculations';

export default function MetricSparkline({
  series = [],
  format,
  color,
  height = 24,
  width = 72,
}) {
  const prepared = useMemo(() => prepareSparklineData(series, format), [series, format]);
  const { data, yMin, yMax, trendUp } = prepared;

  const lineColor = useMemo(
    () => color || (trendUp ? '#28a745' : '#dc3545'),
    [color, trendUp],
  );

  const options = useMemo(() => mergeApexOptions({
    chart: {
      type: 'area',
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    stroke: { width: 1.5, curve: 'smooth' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    colors: [lineColor],
    tooltip: { enabled: false },
    yaxis: {
      min: yMin,
      max: yMax,
    },
  }), [lineColor, yMax, yMin]);

  if (data.length < 2) {
    return <span className="research-sparkline-placeholder" aria-hidden="true" />;
  }

  return (
    <span className="research-sparkline" aria-hidden="true">
      <Chart options={options} series={[{ data }]} type="area" height={height} width={width} />
    </span>
  );
}
