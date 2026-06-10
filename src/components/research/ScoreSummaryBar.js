import { Link } from 'react-router-dom';
import StTooltip, { StTooltipMetricHelp } from '../StTooltip';
import { getMetricTooltipMeta } from '../../config/tooltipRegistry';
import { formatDecimal } from '../../utils/formatters';
import { getMetricBackground } from '../../utils/scoringColors';

const SCORE_COLUMNS = [
  { key: 'piotroskiF', label: 'F' },
  { key: 'altmanZ', label: 'Z' },
  { key: 'beneishM', label: 'M' },
  { key: 'survivability', label: 'Surv' },
];

function ScoreBadge({ label, value, style }) {
  return (
    <span className="research-score-summary-badge" style={style}>
      <span className="research-score-summary-label">{label}</span>
      <span className="research-score-summary-value">{value ?? '-'}</span>
    </span>
  );
}

function formatScoreValue(key, scores) {
  const value = scores?.[key];
  if (value == null) return '-';
  if (key === 'altmanZ' || key === 'beneishM') return formatDecimal(value, 2);
  if (key === 'survivability') return Math.round(value);
  return value;
}

function scoreBadgeStyle(key, scores) {
  const value = scores?.[key];
  return getMetricBackground(key, value, { mode: 'deep_value' });
}

function tickerScores(screenerData, ticker) {
  return screenerData?.[ticker]?.scores || null;
}

export default function ScoreSummaryBar({ tickers, screenerData }) {
  if (!tickers?.length) return null;

  return (
    <div className="research-score-summary-bar">
      {tickers.map((ticker) => {
        const scores = tickerScores(screenerData, ticker);
        const row = screenerData?.[ticker];
        if (!scores && row?.error) {
          return (
            <div key={ticker} className="research-score-summary-row">
              <span className="research-score-summary-ticker-name st-ticker">{ticker}</span>
              <span className="research-score-summary-empty small text-muted">No data</span>
            </div>
          );
        }
        if (!scores) return null;

        return (
          <div key={ticker} className="research-score-summary-row">
            <Link to={`/research/${ticker}`} className="research-score-summary-ticker-name st-ticker">
              {ticker}
            </Link>
            {SCORE_COLUMNS.map((col) => {
              const meta = getMetricTooltipMeta(col.key, col.label);
              const badge = (
                <ScoreBadge
                  label={col.label}
                  value={formatScoreValue(col.key, scores)}
                  style={scoreBadgeStyle(col.key, scores)}
                />
              );
              if (!meta) return <span key={col.key}>{badge}</span>;
              return (
                <StTooltip
                  key={col.key}
                  className="research-score-summary-tip"
                  placement="bottom-start"
                  tip={<StTooltipMetricHelp {...meta} />}
                >
                  {badge}
                </StTooltip>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
