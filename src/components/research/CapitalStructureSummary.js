import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';
import { getCapitalStructureSnapshot } from '../../utils/capitalStructureStats';
import { getMetricTooltip } from '../../config/tooltipRegistry';

export default function CapitalStructureSummary({ periods = [] }) {
  const snapshot = getCapitalStructureSnapshot(periods);
  if (!snapshot) return null;

  const {
    latestDebt,
    latestEquity,
    latestCash,
    cashToDebt,
    de,
    currentRatio,
    leverage,
  } = snapshot;

  return (
    <div className="research-header-capital">
      <div className="research-header-capital-strip">
        <span className="research-stat-strip-item" title="Total debt from the latest SEC filing. Includes short-term and long-term borrowings.">
          <span className="research-stat-strip-label">Debt</span>
          <span className="research-stat-strip-value st-num">
            {latestDebt == null ? '-' : formatCompactUsd(latestDebt)}
          </span>
        </span>
        <span className="research-stat-strip-item" title="Total shareholders' equity. Negative equity indicates accumulated losses exceed contributed capital.">
          <span className="research-stat-strip-label">Equity</span>
          <span className="research-stat-strip-value st-num">
            {latestEquity == null ? '-' : formatCompactUsd(latestEquity)}
          </span>
        </span>
        <span className="research-stat-strip-item" title="Cash and cash equivalents. Compare against debt to assess net cash or net debt positioning.">
          <span className="research-stat-strip-label">Cash</span>
          <span className="research-stat-strip-value st-num">
            {latestCash == null ? '-' : formatCompactUsd(latestCash)}
          </span>
        </span>
        <span className="research-stat-strip-item" title={getMetricTooltip('cashToDebt')?.tooltip || 'Cash / Debt'}>
          <span className="research-stat-strip-label">Cash/Debt</span>
          <span className="research-stat-strip-value st-num">
            {cashToDebt == null ? '-' : formatDecimal(cashToDebt, 2)}
          </span>
        </span>
      </div>
      <div className="research-header-capital-ratios">
        <span title={getMetricTooltip('de')?.tooltip || 'Debt / Equity'}>D/E {de == null ? '-' : formatDecimal(de, 2)}</span>
        {' · '}
        <span title={getMetricTooltip('currentRatio')?.tooltip || 'Current Ratio'}>CR {currentRatio == null ? '-' : formatDecimal(currentRatio, 2)}</span>
        {' · '}
        <span title="Debt as a proportion of total capital (debt + equity). Higher values indicate greater reliance on debt financing.">Lev {leverage == null ? '-' : formatPercent(leverage * 100, 1)}</span>
      </div>
    </div>
  );
}
