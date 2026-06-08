import { useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../../apiConfig';
import { DIMENSION_OPTIONS, SCREENER_METRIC_GROUPS, YEAR_OPTIONS } from '../../config/researchMetrics';
import { getPortfolio } from '../../utils/portfolio';

const SORT_OPTIONS = SCREENER_METRIC_GROUPS.flatMap((group) => group.metrics.map((metric) => ({
  value: metric.id,
  label: metric.label,
})));

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
  sortMetric,
  onSortMetricChange,
  onExportCsv,
  onCopyGrid,
  onCopyShareLink,
  exportDisabled = false,
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
              <div className="col-lg-2">
                <label htmlFor="researchSortMetric" className="form-label mb-1">Sort tickers by</label>
                <select
                  id="researchSortMetric"
                  className="form-select form-select-sm"
                  value={sortMetric || ''}
                  onChange={(e) => onSortMetricChange?.(e.target.value || null)}
                >
                  <option value="">Default order</option>
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          <div className="col-auto ms-lg-auto d-flex flex-wrap gap-1 align-items-end">
            {onCopyShareLink && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onCopyShareLink}
                title="Copy shareable link"
              >
                Share
              </button>
            )}
            {onCopyGrid && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onCopyGrid}
                disabled={exportDisabled}
                title="Copy grid to clipboard"
              >
                Copy
              </button>
            )}
            {onExportCsv && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onExportCsv}
                disabled={exportDisabled}
                title="Download CSV"
              >
                CSV
              </button>
            )}
            {mode === 'screener' && (
              <button type="button" className="btn btn-sm btn-success" onClick={onLoad} disabled={loading}>
                {loading ? 'Loading…' : 'Load'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
