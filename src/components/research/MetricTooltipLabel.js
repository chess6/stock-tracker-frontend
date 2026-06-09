import ColumnHeader from '../ColumnHeader';
import { getMetricTooltipMeta } from '../../config/tooltipRegistry';

/**
 * Metric name label with registry tooltip (research grids).
 */
export default function MetricTooltipLabel({ metricKey, label, className }) {
  const meta = getMetricTooltipMeta(metricKey, label);
  if (!meta) {
    return <span className={className}>{label}</span>;
  }
  return (
    <span className={className}>
      <ColumnHeader label={label} meta={meta} />
    </span>
  );
}
