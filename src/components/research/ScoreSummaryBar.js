import { formatDecimal } from '../../utils/formatters';
import {
  altmanZHeatStyle,
  beneishHeatStyle,
  piotroskiHeatStyle,
  survivabilityHeatStyle,
} from '../../utils/scoringColors';

function ScoreBadge({ label, value, style }) {
  return (
    <span className="research-score-summary-badge" style={style} title={label}>
      <span className="research-score-summary-label">{label}</span>
      <span className="research-score-summary-value">{value ?? '-'}</span>
    </span>
  );
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
            <div key={ticker} className="research-score-summary-ticker">
              <div className="research-score-summary-ticker-name">{ticker}</div>
              <span className="text-muted small">No data</span>
            </div>
          );
        }
        if (!scores) return null;

        return (
          <div key={ticker} className="research-score-summary-ticker">
            <div className="research-score-summary-ticker-name">{ticker}</div>
            <div className="research-score-summary-badges">
              <ScoreBadge
                label="F"
                value={scores.piotroskiF}
                style={piotroskiHeatStyle(scores.piotroskiF)}
              />
              <ScoreBadge
                label="Z"
                value={scores.altmanZ != null ? formatDecimal(scores.altmanZ, 2) : '-'}
                style={altmanZHeatStyle(scores.altmanZ)}
              />
              <ScoreBadge
                label="M"
                value={scores.beneishM != null ? formatDecimal(scores.beneishM, 2) : '-'}
                style={beneishHeatStyle(scores.beneishM)}
              />
              <ScoreBadge
                label="Surv"
                value={scores.survivability != null ? Math.round(scores.survivability) : '-'}
                style={survivabilityHeatStyle(scores.survivability)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
