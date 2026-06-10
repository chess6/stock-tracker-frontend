import { memo, useMemo } from 'react';
import { prepareSparklineData } from '../../utils/researchCalculations';

function MetricSparklineLite({
  series = [],
  format,
  height = 20,
  width = 56,
}) {
  const prepared = useMemo(() => prepareSparklineData(series, format), [series, format]);
  const { data, yMin, yMax, trendUp } = prepared;

  const path = useMemo(() => {
    if (data.length < 2) return null;
    const spanX = width / (data.length - 1);
    const ySpan = yMax - yMin || 1;
    const points = data.map((v, i) => {
      const x = i * spanX;
      const y = height - ((v - yMin) / ySpan) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  }, [data, height, width, yMin, yMax]);

  if (!path) {
    return <span className="research-sparkline-placeholder" aria-hidden="true" />;
  }

  const color = trendUp ? '#28a745' : '#dc3545';

  return (
    <svg
      className="research-sparkline-lite"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default memo(MetricSparklineLite);
