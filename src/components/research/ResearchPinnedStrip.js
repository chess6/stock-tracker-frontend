import { Link } from 'react-router-dom';
import { tickerFinancialsUrl } from '../../utils/tickerLinks';

export default function ResearchPinnedStrip({
  pinnedTickers = [],
  selectedTicker,
  onUnpin,
  onSelect,
  onBeforeDeepDive,
}) {
  if (!pinnedTickers.length) return null;

  return (
    <div className="research-pinned-strip" aria-label="Pinned companies">
      <span className="research-pinned-strip-label">Pinned</span>
      <div className="research-pinned-strip-items">
        {pinnedTickers.map((ticker) => (
          <span
            key={ticker}
            className={`research-pinned-chip${selectedTicker === ticker ? ' research-pinned-chip--active' : ''}`}
          >
            <button
              type="button"
              className="research-pinned-chip-main"
              onClick={() => onSelect?.(ticker)}
            >
              <Link
                to={tickerFinancialsUrl(ticker)}
                className="st-ticker"
                onClick={(e) => {
                  e.stopPropagation();
                  onBeforeDeepDive?.();
                }}
              >
                {ticker}
              </Link>
            </button>
            <button
              type="button"
              className="research-pinned-chip-unpin"
              aria-label={`Unpin ${ticker}`}
              onClick={() => onUnpin?.(ticker)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
