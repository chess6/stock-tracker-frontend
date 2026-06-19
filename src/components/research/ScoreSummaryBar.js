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

function ScoreHeaderCell({ col }) {
  const meta = getMetricTooltipMeta(col.key, col.label);
  const label = <span className="research-score-summary-th-label">{col.label}</span>;
  if (!meta) return label;
  return (
    <StTooltip
      className="research-score-summary-tip"
      placement="top-start"
      tip={<StTooltipMetricHelp {...meta} />}
    >
      {label}
    </StTooltip>
  );
}

export default function ScoreSummaryBar({ tickers, screenerData, onBeforeDeepDive }) {
  if (!tickers?.length) return null;

  const rows = tickers.map((ticker) => {
    const scores = tickerScores(screenerData, ticker);
    const row = screenerData?.[ticker];
    return { ticker, scores, error: row?.error };
  }).filter((row) => row.scores || row.error);

  if (!rows.length) return null;

  return (
    <div className="research-score-summary-bar">
      <table className="research-score-summary-table">
        <thead>
          <tr>
            <th scope="col" className="research-score-summary-th-metric" />
            {rows.map(({ ticker, scores }) => (
              <th key={ticker} scope="col" className="research-score-summary-th-ticker">
                {scores ? (
                  <Link
                    to={`/research/${ticker}`}
                    className="st-ticker research-score-summary-ticker-name"
                    onClick={() => onBeforeDeepDive?.()}
                  >
                    {ticker}
                  </Link>
                ) : (
                  <span className="st-ticker research-score-summary-ticker-name">{ticker}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCORE_COLUMNS.map((col) => (
            <tr key={col.key}>
              <th scope="row" className="research-score-summary-th-metric">
                <ScoreHeaderCell col={col} />
              </th>
              {rows.map(({ ticker, scores, error }) => (
                <td key={`${ticker}-${col.key}`} className="research-score-summary-td-metric">
                  {error && !scores ? (
                    <span className="research-score-summary-empty">—</span>
                  ) : (
                    <span
                      className="research-score-summary-pill"
                      style={scoreBadgeStyle(col.key, scores)}
                    >
                      {formatScoreValue(col.key, scores)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
