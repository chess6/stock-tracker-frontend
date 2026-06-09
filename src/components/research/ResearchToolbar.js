import { useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../../apiConfig';
import StIcon from '../StIcon';
import { COLOR_MODES } from '../../utils/scoringColors';
import { DIMENSION_OPTIONS, SCREENER_METRIC_GROUPS, YEAR_OPTIONS } from '../../config/researchMetrics';
import { RESEARCH_ICONS } from '../../icons/researchIcons';
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
  colorMode = 'deep_value',
  onColorModeChange,
  showHeatLegend = true,
  onShowHeatLegendChange,
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
    <div className="st-panel mb-2">
      <div className="st-panel-body">
        <div className={`research-toolbar-grid${mode === 'screener' ? ' research-toolbar-grid-mode-screener' : ''}`}>
          {mode === 'screener' && (
            <>
              <div className="research-toolbar-field">
                <label htmlFor="researchTickers" className="st-label">Tickers</label>
                <input
                  id="researchTickers"
                  type="text"
                  className="st-input font-mono"
                  placeholder="AAPL,MSFT,GME"
                  value={tickersText}
                  onChange={(e) => onTickersTextChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && onLoad()}
                />
              </div>
              <div className="research-toolbar-field">
                <label htmlFor="researchWatchlist" className="st-label">Watchlist</label>
                <select
                  id="researchWatchlist"
                  className="st-select"
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
              <div className="research-toolbar-field">
                <label htmlFor="researchSortMetric" className="st-label">Sort tickers by</label>
                <select
                  id="researchSortMetric"
                  className="st-select"
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
          <div className="research-toolbar-field">
            <span className="st-label block">Period</span>
            <div className="st-segment" role="group" aria-label="Financial period">
              {DIMENSION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`st-segment-btn ${dimension === opt.value ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
                  onClick={() => onDimensionChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="research-toolbar-field">
            <label htmlFor="researchColorMode" className="st-label">Color mode</label>
            <select
              id="researchColorMode"
              className="st-select"
              value={colorMode}
              onChange={(e) => onColorModeChange?.(e.target.value)}
            >
              {COLOR_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'deep_value' ? 'Deep value' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="research-toolbar-field">
            <label className="st-label d-block">&nbsp;</label>
            <div className="d-flex align-items-center pb-1">
              <input
                className="st-check"
                type="checkbox"
                id="researchHeatLegend"
                checked={showHeatLegend}
                onChange={(e) => onShowHeatLegendChange?.(e.target.checked)}
              />
              <label className="st-check-label" htmlFor="researchHeatLegend">Heat legend</label>
            </div>
          </div>
          {mode === 'deep-dive' && (
            <>
              <div className="research-toolbar-field">
                <label htmlFor="researchYears" className="st-label">Range</label>
                <select
                  id="researchYears"
                  className="st-select"
                  style={{ minWidth: '7rem' }}
                  value={years}
                  onChange={(e) => onYearsChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  {YEAR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt === 'all' ? 'All Years' : `Last ${opt} Years`}</option>
                  ))}
                </select>
              </div>
              <div className="research-toolbar-field">
                <label className="st-label d-block">&nbsp;</label>
                <div className="d-flex align-items-center pb-1">
                <input
                  className="st-check"
                  type="checkbox"
                  id="researchHideEmptyRows"
                  checked={hideEmptyRows}
                  onChange={(e) => onHideEmptyRowsChange(e.target.checked)}
                />
                <label className="st-check-label" htmlFor="researchHideEmptyRows">Hide empty rows</label>
                </div>
              </div>
            </>
          )}
          <div className="research-toolbar-actions d-flex flex-wrap gap-1 align-items-end">
            {onCopyShareLink && (
              <button type="button" className="st-btn-ghost" onClick={onCopyShareLink} title="Copy shareable link">
                <StIcon icon={RESEARCH_ICONS.share} />
                Share
              </button>
            )}
            {onCopyGrid && (
              <button
                type="button"
                className="st-btn-ghost"
                onClick={onCopyGrid}
                disabled={exportDisabled}
                title="Copy grid to clipboard"
              >
                <StIcon icon={RESEARCH_ICONS.copy} />
                Copy
              </button>
            )}
            {onExportCsv && (
              <button
                type="button"
                className="st-btn-ghost"
                onClick={onExportCsv}
                disabled={exportDisabled}
                title="Download CSV"
              >
                <StIcon icon={RESEARCH_ICONS.csv} />
                CSV
              </button>
            )}
            {mode === 'screener' && (
              <button type="button" className="st-btn-primary" onClick={onLoad} disabled={loading}>
                {loading ? 'Loading…' : 'Load'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
