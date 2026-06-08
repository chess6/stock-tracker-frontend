import { useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../../apiConfig';
import { DIMENSION_OPTIONS, YEAR_OPTIONS } from '../../config/researchMetrics';
import { getPortfolio } from '../../utils/portfolio';

export default function ResearchToolbar({
  tickersText,
  onTickersTextChange,
  onLoad,
  dimension,
  onDimensionChange,
  years,
  onYearsChange,
  hideEmptyRows,
  onHideEmptyRowsChange,
  loading,
  mode = 'screener',
}) {
  const [watchlists, setWatchlists] = useState([]);
  const [watchlistName, setWatchlistName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.WATCHLISTS);
        if (!cancelled) setWatchlists(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setWatchlists([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applyWatchlist = async (name) => {
    setWatchlistName(name);
    if (name === '__portfolio__') {
      onTickersTextChange(getPortfolio().join(','));
      return;
    }
    if (!name) return;
    try {
      const res = await axios.get(API_ENDPOINTS.WATCHLIST_TICKERS(name));
      const tickers = Array.isArray(res.data?.tickers) ? res.data.tickers : (Array.isArray(res.data) ? res.data : []);
      onTickersTextChange(tickers.map((t) => String(t).toUpperCase()).join(','));
    } catch {
      onTickersTextChange('');
    }
  };

  return (
    <div className="research-toolbar card shadow-sm mb-2">
      <div className="card-body py-2">
        <div className="row g-2 align-items-end">
          {mode === 'screener' && (
            <>
              <div className="col-lg-4">
                <label htmlFor="researchTickers" className="form-label mb-1">Tickers</label>
                <input
                  id="researchTickers"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="AAPL,MSFT,GME"
                  value={tickersText}
                  onChange={(e) => onTickersTextChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && onLoad()}
                />
              </div>
              <div className="col-lg-2">
                <label htmlFor="researchWatchlist" className="form-label mb-1">Watchlist</label>
                <select
                  id="researchWatchlist"
                  className="form-select form-select-sm"
                  value={watchlistName}
                  onChange={(e) => applyWatchlist(e.target.value)}
                >
                  <option value="">— select —</option>
                  <option value="__portfolio__">Portfolio</option>
                  {watchlists.map((wl) => (
                    <option key={wl.name || wl.id} value={wl.name}>{wl.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="col-auto">
            <label className="form-label d-block mb-1">Period</label>
            <div className="btn-group btn-group-sm" role="group" aria-label="Financial period">
              {DIMENSION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`btn ${dimension === opt.value ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => onDimensionChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {mode === 'deep-dive' && (
            <>
              <div className="col-auto">
                <label htmlFor="researchYears" className="form-label mb-1">Range</label>
                <select
                  id="researchYears"
                  className="form-select form-select-sm"
                  value={years}
                  onChange={(e) => onYearsChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  {YEAR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt === 'all' ? 'All Years' : `Last ${opt} Years`}</option>
                  ))}
                </select>
              </div>
              <div className="col-auto">
                <label className="form-label d-block mb-1">&nbsp;</label>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="researchHideEmptyRows"
                    checked={hideEmptyRows}
                    onChange={(e) => onHideEmptyRowsChange(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="researchHideEmptyRows">Hide empty rows</label>
                </div>
              </div>
            </>
          )}
          {mode === 'screener' && (
            <div className="col-auto ms-lg-auto">
              <button type="button" className="btn btn-sm btn-success" onClick={onLoad} disabled={loading}>
                {loading ? 'Loading…' : 'Load'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
