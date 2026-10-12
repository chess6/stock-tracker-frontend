import { describeHeat } from '../utils/scoringColors';
import { getMetricFormulaBreakdown } from '../utils/metricFormulaBreakdown';
import MetricFormulaFraction from './MetricFormulaFraction';
import { StTooltipText } from './StTooltip';

/**
 * Heat-colored grid cell tooltip: tier label, optional stacked fraction, or heat basis text.
 */
export default function StTooltipHeatCell({
  metricKey,
  value,
  heatContext = {},
  dataContext,
  tickerData,
  showTier = true,
}) {
  const ctx = dataContext ?? tickerData;
  const formula = getMetricFormulaBreakdown(metricKey, ctx, value);
  const heatText = showTier ? describeHeat(metricKey, value, heatContext) : '';
  if (!formula && !heatText) return null;

  const tierLine = heatText ? heatText.split('\n')[0] : '';
  const heatBasis = showTier && !formula ? heatText.split('\n').slice(1).join('\n') : '';

  return (
    <span className="st-tooltip-heat-cell">
      {tierLine ? <div className="st-tooltip-heat-tier">{tierLine}</div> : null}
      {formula ? (
        <MetricFormulaFraction {...formula} />
      ) : heatBasis ? (
        <StTooltipText text={heatBasis} />
      ) : null}
    </span>
  );
}
