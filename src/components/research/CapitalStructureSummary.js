import { formatCompactUsd, formatDecimal, formatPercent } from '../../utils/formatters';
import { getCapitalStructureSnapshot } from '../../utils/capitalStructureStats';

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
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Debt</span>
          <span className="research-stat-strip-value st-num">
            {latestDebt == null ? '-' : formatCompactUsd(latestDebt)}
          </span>
        </span>
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Equity</span>
          <span className="research-stat-strip-value st-num">
            {latestEquity == null ? '-' : formatCompactUsd(latestEquity)}
          </span>
        </span>
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Cash</span>
          <span className="research-stat-strip-value st-num">
            {latestCash == null ? '-' : formatCompactUsd(latestCash)}
          </span>
        </span>
        <span className="research-stat-strip-item">
          <span className="research-stat-strip-label">Cash/Debt</span>
          <span className="research-stat-strip-value st-num">
            {cashToDebt == null ? '-' : formatDecimal(cashToDebt, 2)}
          </span>
        </span>
      </div>
      <div className="research-header-capital-ratios">
        D/E {de == null ? '-' : formatDecimal(de, 2)}
        {' · '}
        CR {currentRatio == null ? '-' : formatDecimal(currentRatio, 2)}
        {' · '}
        Lev {leverage == null ? '-' : formatPercent(leverage * 100, 1)}
      </div>
    </div>
  );
}
