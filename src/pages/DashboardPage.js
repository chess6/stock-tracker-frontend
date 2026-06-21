import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_ENDPOINTS from '../apiConfig';
import StSpinner from '../components/StSpinner';
import MacroTreemap from '../components/dashboard/MacroTreemap';
import { getPortfolio, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';
import { tickerFinancialsUrl } from '../utils/tickerLinks';
import { signedHeatStyle } from '../utils/heatMap';
import { useHeatmapThemeKey } from '../hooks/useHeatmapThemeKey';
import { formatPercent, formatUsd } from '../utils/formatters';
import {
  filterPortfolioByMacroTiles,
  groupPortfolioRowsBySector,
  macroTileSelectionLabel,
} from '../utils/macroIndustryFilter';
import './dashboard.css';

const GROUP_ORDER = ['indices', 'commodities', 'rates', 'risk', 'industries'];
const GROUP_LABELS = {
  indices: 'Indices',
  commodities: 'Commodities',
  rates: 'Rates',
  risk: 'Risk',
  industries: 'Industries',
};

function PortfolioSnapshotRows({ rows }) {
  return rows.map((row) => (
    <tr key={row.ticker}>
      <td><Link to={tickerFinancialsUrl(row.ticker)} className="st-ticker fw-semibold">{row.ticker}</Link></td>
      <td className="small text-muted">{row.name || '—'}</td>
      <td className="text-end st-num">{row.price != null ? formatUsd(row.price) : '—'}</td>
      <td className="text-end st-num" style={row._changeStyle}>
        {row.change != null ? formatPercent(row.change, 2) : '—'}
      </td>
      <td className="small">{row.sector || '—'}</td>
    </tr>
  ));
}

export default function DashboardPage() {
  const heatmapThemeKey = useHeatmapThemeKey();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolioTickers, setPortfolioTickers] = useState(() => getPortfolio());
  const [portfolioRows, setPortfolioRows] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [selectedMacroTileIds, setSelectedMacroTileIds] = useState(() => new Set());
  const portfolioTickersKey = useMemo(() => portfolioTickers.join(','), [portfolioTickers]);

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioTickers(getPortfolio()));
    const sync = () => setPortfolioTickers(getPortfolio());
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(API_ENDPOINTS.MACRO_SNAPSHOT);
        if (!cancelled) {
          const payload = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          const payloadItems = payload?.items;
          if (!Array.isArray(payloadItems) || payloadItems.length === 0) {
            setItems([]);
            setMeta({});
            setError('Macro snapshot returned an unexpected response shape.');
            return;
          }
          setItems(payloadItems);
          setMeta(payload?.meta || {});
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setMeta({});
          setError(err?.response?.data?.error || 'Failed to load macro snapshot.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const portfolioList = portfolioTickersKey ? portfolioTickersKey.split(',') : [];
    if (!portfolioList.length) {
      setPortfolioRows((prev) => (prev.length ? [] : prev));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setPortfolioLoading(true);
      try {
        const tickers = portfolioTickersKey;
        const [topRes, changeRes] = await Promise.allSettled([
          axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers } }),
          axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers } }),
        ]);
        const quotes = topRes.status === 'fulfilled' ? (topRes.value.data?.quotes || {}) : {};
        const changes = changeRes.status === 'fulfilled' ? (changeRes.value.data?.changes || {}) : {};
        const built = portfolioList.map((ticker) => {
          const q = quotes[ticker] || {};
          const ch = changes[ticker] || {};
          const lastVal = [q.last, q.tngoLast, ch.todayClose].find((v) => v != null && !Number.isNaN(Number(v)));
          const price = lastVal != null ? Number(lastVal) : null;
          let change = null;
          if (ch.todayClose != null && ch.prevClose != null && ch.prevClose !== 0) {
            change = ((Number(ch.todayClose) - Number(ch.prevClose)) / Number(ch.prevClose)) * 100;
          }
          return {
            ticker,
            name: q.name || null,
            price,
            change,
            sector: q.sector || null,
          };
        });
        if (!cancelled) setPortfolioRows(built);
      } catch {
        if (!cancelled) setPortfolioRows([]);
      } finally {
        if (!cancelled) setPortfolioLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [portfolioTickersKey]);

  const portfolioRowsWithHeat = useMemo(
    () => portfolioRows.map((row) => ({
      ...row,
      _changeStyle: signedHeatStyle(row.change, 5),
    })),
    [portfolioRows, heatmapThemeKey],
  );

  const macroItemsById = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [items]);

  const filteredPortfolioRows = useMemo(
    () => filterPortfolioByMacroTiles(portfolioRowsWithHeat, selectedMacroTileIds),
    [portfolioRowsWithHeat, selectedMacroTileIds],
  );

  const groupedPortfolioRows = useMemo(
    () => groupPortfolioRowsBySector(filteredPortfolioRows),
    [filteredPortfolioRows],
  );

  const macroFilterActive = selectedMacroTileIds.size > 0;
  const macroFilterLabel = useMemo(
    () => macroTileSelectionLabel(selectedMacroTileIds, macroItemsById),
    [selectedMacroTileIds, macroItemsById],
  );

  const toggleMacroTile = useCallback((macroId) => {
    setSelectedMacroTileIds((prev) => {
      const next = new Set(prev);
      if (next.has(macroId)) next.delete(macroId);
      else next.add(macroId);
      return next;
    });
  }, []);

  const clearMacroFilter = useCallback(() => {
    setSelectedMacroTileIds(new Set());
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    GROUP_ORDER.forEach((group) => { map[group] = []; });
    items.forEach((item) => {
      map[item.group] = map[item.group] || [];
      map[item.group].push(item);
    });
    return GROUP_ORDER.map((group) => ({
      id: group,
      label: GROUP_LABELS[group] || group,
      items: map[group] || [],
    })).filter((section) => section.items.length > 0);
  }, [items]);

  const unavailableCount = meta?.unavailable ?? items.filter((item) => !item.available).length;
  const availableCount = items.length - unavailableCount;

  return (
    <div className="st-page st-page--split-wide">
      <div className="st-page-header">
        <div className="st-page-header-title">
          <h1 className="st-page-heading">Dashboard</h1>
          <div className="st-page-subtitle">
            Macro context: indices, commodities, rates, and sector ETFs.
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-layout__portfolio">
      <div className="st-panel">
        <div className="st-panel-header">Your Portfolio</div>
        <div className="st-panel-body">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small text-muted">Quick snapshot</span>
            <Link to="/" className="small st-link-muted">Open full portfolio →</Link>
          </div>
          {portfolioTickers.length === 0 ? (
            <div className="st-alert-secondary mb-0">
              No tickers in your portfolio yet.{' '}
              <Link to="/screener" className="st-link-muted">Browse the screener</Link> or search above to add symbols.
            </div>
          ) : portfolioLoading ? (
            <div className="text-muted py-1"><StSpinner size="sm" /> Loading portfolio quotes…</div>
          ) : (
            <>
              {macroFilterActive && (
                <div className="dashboard-portfolio-filter-bar mb-2">
                  <span className="small">
                    Filtered by <strong>{macroFilterLabel}</strong>
                    {' · '}
                    {filteredPortfolioRows.length} holding{filteredPortfolioRows.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearMacroFilter}
                  >
                    Clear filter
                  </button>
                </div>
              )}
              {macroFilterActive && filteredPortfolioRows.length === 0 ? (
                <div className="st-alert-secondary mb-0">
                  No portfolio holdings match the selected {selectedMacroTileIds.size === 1 ? 'tile' : 'tiles'}.
                </div>
              ) : macroFilterActive ? (
                groupedPortfolioRows.map(({ sector, rows }) => (
                  <div key={sector} className="dashboard-portfolio-sector-group mb-3">
                    <div className="dashboard-portfolio-sector-header">
                      {sector}
                      <span className="text-muted fw-normal"> · {rows.length}</span>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0 st-grid-table st-grid-table-compact">
                        <thead>
                          <tr>
                            <th>Ticker</th>
                            <th>Name</th>
                            <th className="text-end">Price</th>
                            <th className="text-end">D% Ch</th>
                            <th>Sector</th>
                          </tr>
                        </thead>
                        <tbody>
                          <PortfolioSnapshotRows rows={rows} />
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 st-grid-table st-grid-table-compact">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Name</th>
                        <th className="text-end">Price</th>
                        <th className="text-end">D% Ch</th>
                        <th>Sector</th>
                      </tr>
                    </thead>
                    <tbody>
                      <PortfolioSnapshotRows rows={portfolioRowsWithHeat} />
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </div>

        <div className="dashboard-layout__macro">
      {loading && (
        <div className="st-spinner-wrap"><StSpinner /> Loading macro data…</div>
      )}
      {error && <div className="st-alert-danger">{error}</div>}
      {!loading && !error && items.length > 0 && availableCount === 0 && (
        <div className="st-alert-secondary">
          Macro quotes are not available yet. Re-run <strong>Refresh Macro</strong> in Admin → Bootstrap pipeline
          (or POST /api/admin/refresh-macro). Snapshot reads SQLite first, then falls back to live yfinance for gaps like ^VIX.
        </div>
      )}

      {!loading && unavailableCount > 0 && (
        <div className="st-alert-warn">
          {unavailableCount} of {items.length} macro symbols could not be quoted (shown as —). Market data may be delayed or blocked for some tickers.
        </div>
      )}

      {!loading && grouped.length > 0 && (
        <div className="st-panel">
          <div className="st-panel-header">Macro Treemap</div>
          <div className="st-panel-body">
            <MacroTreemap
              sections={grouped}
              selectedTileIds={selectedMacroTileIds}
              onTileToggle={toggleMacroTile}
            />
          </div>
        </div>
      )}
        </div>
      </div>

      {meta?.source && (
        <div className="st-muted-note">
          Source: {meta.source}
          {meta.total != null && ` · ${meta.total} symbols`}
        </div>
      )}
    </div>
  );
}
