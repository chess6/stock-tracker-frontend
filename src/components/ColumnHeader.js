import { memo } from 'react';
import StTooltip, { StTooltipMetricHelp } from './StTooltip';

/** Plain-text help for screen readers when tooltip is closed. */
export function formatColumnHeaderHelp(meta = {}) {
  const parts = [];
  if (meta.fullName) parts.push(meta.fullName);
  if (meta.tooltip) parts.push(meta.tooltip);
  if (meta.formula) parts.push(`Formula: ${meta.formula}`);
  if (meta.source) parts.push(`Source: ${meta.source}`);
  return parts.join('\n');
}

/**
 * Column header with standard st-tooltip help on hover (formula, source, full name).
 */
function ColumnHeader({
  label,
  meta = {},
  canSort,
  sortDir,
  sortIndex,
  multiSortActive,
  onSort,
  tooltipPlacement = 'bottom-start',
  tooltipFloating = false,
}) {
  const hasHelp = meta.tooltip || meta.formula || meta.source || meta.fullName;
  const helpLabel = hasHelp ? formatColumnHeaderHelp(meta) : label;
  const sortLabel = sortDir
    ? `, sorted ${sortDir === 'desc' ? 'descending' : 'ascending'}${multiSortActive ? `, priority ${sortIndex + 1}` : ''}`
    : '';

  const headerInner = (
    <>
      <span
        role={canSort ? 'button' : undefined}
        onClick={canSort ? onSort : undefined}
        style={{ cursor: canSort ? 'pointer' : 'default' }}
        aria-label={`${helpLabel}${sortLabel}`}
      >
        {label}
      </span>
      {sortDir && (
        <span className="st-grid-sort-icon" aria-hidden="true">
          {sortDir === 'asc' ? '↑' : '↓'}
          {multiSortActive && sortIndex != null && (
            <span className="st-grid-sort-index">{sortIndex + 1}</span>
          )}
        </span>
      )}
    </>
  );

  if (!hasHelp) {
    return (
      <span
        className="column-header-help"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
      >
        {headerInner}
      </span>
    );
  }

  return (
    <StTooltip
      className="column-header-help"
      placement={tooltipPlacement}
      floating={tooltipFloating}
      tip={(
        <StTooltipMetricHelp
          fullName={meta.fullName}
          tooltip={meta.tooltip}
          formula={meta.formula}
          source={meta.source}
        />
      )}
    >
      {headerInner}
    </StTooltip>
  );
}

export default memo(ColumnHeader);
