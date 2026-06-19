import { useCallback, useState } from 'react';
import {
  deletePortfolioWatchlist,
  getPortfolioWatchlistTickers,
  getPortfolioWatchlists,
  savePortfolioWatchlist,
} from '../utils/portfolioWatchlists';
import { setPortfolioTickers } from '../utils/portfolio';

function formatPreview(tickers) {
  const preview = tickers.slice(0, 6).join(', ');
  const suffix = tickers.length > 6 ? ` +${tickers.length - 6} more` : '';
  return `${preview}${suffix}`;
}

export default function PortfolioWatchlists({
  portfolio,
  onLoaded,
  showToast,
  cacheFreshness,
  formatFreshnessTimestamp,
  presetId,
  presets,
  onPresetChange,
}) {
  const [watchlists, setWatchlists] = useState(() => getPortfolioWatchlists());
  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(() => {
    setWatchlists(getPortfolioWatchlists());
  }, []);

  const handleSave = () => {
    try {
      const entry = savePortfolioWatchlist(name, portfolio);
      refresh();
      setName('');
      showToast?.(`Saved watchlist "${entry.name}" (${entry.tickers.length} tickers).`, 'success');
    } catch (err) {
      showToast?.(err.message || 'Failed to save watchlist.', 'error');
    }
  };

  const handleLoad = (wl) => {
    setBusyId(wl.id);
    try {
      const tickers = getPortfolioWatchlistTickers(wl.id);
      if (!tickers?.length) {
        showToast?.('Watchlist is empty or missing.', 'error');
        refresh();
        return;
      }
      setPortfolioTickers(tickers);
      onLoaded?.();
      showToast?.(`Loaded "${wl.name}" (${tickers.length} tickers).`, 'success');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (wl) => {
    deletePortfolioWatchlist(wl.id);
    refresh();
    showToast?.(`Deleted watchlist "${wl.name}".`, 'success');
  };

  const summaryMeta = watchlists.length
    ? `${watchlists.length} saved · ${portfolio.length} tickers in list`
    : 'None saved yet';

  return (
    <details className="st-details portfolio-watchlists-panel">
      <summary className="st-details-summary portfolio-watchlists-summary">
        <span>Portfolio lists &amp; view</span>
        <span className="portfolio-watchlists-summary-meta">{summaryMeta}</span>
      </summary>
      <div className="st-panel-body">
      {(cacheFreshness || (presets?.length && onPresetChange)) && (
        <div className="portfolio-watchlists-settings mb-3">
          {cacheFreshness && formatFreshnessTimestamp && (
            <div className="portfolio-watchlists-cache st-muted-note">
              Cache: prices {formatFreshnessTimestamp(cacheFreshness.pricesUpdatedAt)}
              {' · '}fundamentals {formatFreshnessTimestamp(cacheFreshness.fundamentalsUpdatedAt)}
              {' · '}insiders {formatFreshnessTimestamp(cacheFreshness.insidersUpdatedAt)}
            </div>
          )}
          {presets?.length > 0 && onPresetChange && (
            <label className="portfolio-watchlists-preset d-flex align-items-center gap-2 mb-0">
              <span className="portfolio-watchlists-settings-label">View preset</span>
              <select
                className="form-select form-select-sm portfolio-watchlists-preset-select"
                value={presetId}
                onChange={onPresetChange}
                aria-label="Portfolio research view preset"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <p className="small mb-2 st-muted-note">
        Save the current ticker list to this browser. Reload it anytime if your portfolio gets wiped.
      </p>

      <div className="d-flex gap-2 flex-wrap align-items-end mb-3">
        <div className="flex-grow-1" style={{ minWidth: 180 }}>
          <label htmlFor="portfolio-watchlist-name" className="form-label small mb-1">
            Watchlist name
          </label>
          <input
            id="portfolio-watchlist-name"
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. Deep value basket"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </div>
        <button
          type="button"
          className="st-btn"
          disabled={!portfolio.length}
          onClick={handleSave}
        >
          Save current list
        </button>
      </div>

      {!watchlists.length ? (
        <p className="small mb-0 st-muted-note">No saved watchlists yet.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {watchlists.map((wl) => (
            <div
              key={wl.id}
              className="d-flex gap-2 align-items-center flex-wrap justify-content-between"
            >
              <div className="small">
                <strong>{wl.name}</strong>
                <span className="st-muted-note">
                  {' '}
                  · {wl.tickers.length} tickers
                  {wl.savedAt ? ` · saved ${new Date(wl.savedAt).toLocaleString()}` : ''}
                </span>
                <div className="st-muted-note">{formatPreview(wl.tickers)}</div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="st-btn-ghost"
                  disabled={busyId === wl.id}
                  onClick={() => handleLoad(wl)}
                >
                  {busyId === wl.id ? 'Loading…' : 'Load'}
                </button>
                <button
                  type="button"
                  className="st-btn-ghost"
                  style={{ color: 'var(--st-negative)' }}
                  onClick={() => handleDelete(wl)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </details>
  );
}
