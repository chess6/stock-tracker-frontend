import StTooltip from './StTooltip';
import StTooltipHeatCell from './StTooltipHeatCell';

export const GRID_HEAT_TOOLTIP_PROPS = { placement: 'top-start', floating: true };

/**
 * Heat-colored grid cell with optional tier + formula fraction tooltip.
 */
export default function HeatGridCell({
  value,
  formatted,
  metricKey,
  heatContext = {},
  dataContext,
  showTier = true,
  enableTooltip = true,
}) {
  if (!enableTooltip || metricKey == null || value == null || value === '') {
    return <span>{formatted}</span>;
  }

  return (
    <StTooltip
      tip={(
        <StTooltipHeatCell
          metricKey={metricKey}
          value={value}
          heatContext={heatContext}
          dataContext={dataContext}
          showTier={showTier}
        />
      )}
      {...GRID_HEAT_TOOLTIP_PROPS}
    >
      <span>{formatted}</span>
    </StTooltip>
  );
}
