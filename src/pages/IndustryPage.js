import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faChevronDown,
  faChevronRight,
  faAnglesDown,
  faAnglesUp,
} from '@fortawesome/free-solid-svg-icons';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { signedHeatStyle, columnHeatStyle } from '../utils/heatMap';
import { getCachedColumnMinMaxMap, rowsDatasetKey } from '../utils/heatmapCache';
import { addToPortfolioWithNotification, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { tickerFinancialsUrl } from '../utils/tickerLinks';
import './industry.css';

const PEER_LIMIT = 80;
const OTHER_SECTOR_LABEL = 'Other';

const toNum = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));

function normalizeSector(sector) {
  return sector || OTHER_SECTOR_LABEL;
}

/** DB stores null sector for filer-type rows; omit sector filter when querying peers. */
function sectorApiParam(sector) {
  if (!sector || sector === OTHER_SECTOR_LABEL) return undefined;
  return sector;
}

function displayIndustryName(name) {
  if (!name) return '';
  return String(name).replace(/<br\s*\/?>/gi, ' ').trim();
}

async function fetchPeersForSelection(selected, groups) {
  if (!selected) return [];
  if (!selected.industry && !selected.sector) return [];

  if (selected.industry) {
    const peerRes = await axios.get(API_ENDPOINTS.INDUSTRY_PEERS, {
      params: {
        industry: selected.industry,
        sector: sectorApiParam(selected.sector),
        limit: PEER_LIMIT,
      },
    });
    return peerRes.data?.peers || [];
  }

  const normalized = normalizeSector(selected.sector);
  const subindustries = groups.filter((g) => normalizeSector(g.sector) === normalized);
  const responses = await Promise.all(
    subindustries.map((item) => axios.get(API_ENDPOINTS.INDUSTRY_PEERS, {
      params: {
        industry: item.industry,
        sector: sectorApiParam(item.sector),
        limit: PEER_LIMIT,
      },
    })),
  );
  const byTicker = new Map();
  responses.forEach((res) => {
    (res.data?.peers || []).forEach((peer) => {
      if (!byTicker.has(peer.ticker)) byTicker.set(peer.ticker, peer);
    });
  });
  return [...byTicker.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export default function IndustryPage() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expandedSectors, setExpandedSectors] = useState(() => new Set());
  const [rows, setRows] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleAdd = useCallback((symbol) => {
    const notif = addToPortfolioWithNotification(symbol);
    showToast(notif.message, notif.type);
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGroups(true);
      try {
        const res = await axios.get(API_ENDPOINTS.INDUSTRIES);
        const industries = res.data?.industries || [];
        if (!cancelled) {
          setGroups(industries);
          if (industries.length) {
            const defaultPick =
              industries.find((g) => g.sector && g.industry) ||
              industries.find((g) => g.industry) ||
              industries[0];
            setSelected((prev) => prev || {
              sector: normalizeSector(defaultPick.sector),
              industry: defaultPick.industry,
            });
            setExpandedSectors(new Set([normalizeSector(defaultPick.sector)]));
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load industries');
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected || (!selected.industry && !selected.sector)) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingPeers(true);
      setError('');
      try {
        const peers = await fetchPeersForSelection(selected, groups);
        if (!peers.length) {
          if (!cancelled) setRows([]);
          return;
        }
        const tickers = peers.map((p) => p.ticker).join(',');
        const [fundRes, statsRes, changeRes] = await Promise.allSettled([
          axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickers}&mostRecent=true`),
          axios.get(API_ENDPOINTS.MARKET_STATS, { params: { tickers } }),
          axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers } }),
        ]);
        const metrics = fundRes.status === 'fulfilled' ? (fundRes.value.data?.metrics || {}) : {};
        const stats = statsRes.status === 'fulfilled' ? (statsRes.value.data?.stats || {}) : {};
        const changes = changeRes.status === 'fulfilled' ? (changeRes.value.data?.changes || {}) : {};
        const built = peers.map((peer) => {
          const m = metrics[peer.ticker] || {};
          const s = stats[peer.ticker] || {};
          const ch = changes[peer.ticker] || {};
          let change = null;
          if (ch.todayClose != null && ch.prevClose != null && ch.prevClose !== 0) {
            change = ((ch.todayClose - ch.prevClose) / ch.prevClose) * 100;
          }
          return {
            id: peer.ticker,
            ticker: peer.ticker,
            name: peer.name,
            industry: peer.industry,
            marketCap: toNum(m.marketCap),
            price: toNum(ch.todayClose),
            change,
            ep: toNum(m.ep),
            pctTo52wHi: toNum(s.pctTo52wHi),
            insiderBuy6m: null,
          };
        });
        if (!cancelled) setRows(built);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err?.response?.data?.error || 'Failed to load industry peers');
        }
      } finally {
        if (!cancelled) setLoadingPeers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, groups]);

  const heatDatasetKey = useMemo(
    () => rowsDatasetKey(rows, { idKey: 'ticker', metricKeys: ['ep', 'change', 'pctTo52wHi'] }),
    [rows],
  );
  const heatRanges = useMemo(
    () => getCachedColumnMinMaxMap(rows, ['ep'], heatDatasetKey),
    [rows, heatDatasetKey],
  );
  const gridRows = useMemo(() => rows.map((row) => ({
    ...row,
    _heatStyles: {
      change: signedHeatStyle(row.change, 5),
      ep: columnHeatStyle(row.ep, heatRanges.ep.min, heatRanges.ep.max),
      pctTo52wHi: signedHeatStyle(row.pctTo52wHi, 15),
    },
  })), [rows, heatRanges]);

  const sectors = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      const sector = normalizeSector(g.sector);
      map[sector] = map[sector] || [];
      map[sector].push(g);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  const sectorNames = useMemo(() => sectors.map(([sector]) => sector), [sectors]);

  const allExpanded = sectorNames.length > 0 && sectorNames.every((sector) => expandedSectors.has(sector));

  const toggleSectorExpanded = useCallback((sector) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    setExpandedSectors(allExpanded ? new Set() : new Set(sectorNames));
  }, [allExpanded, sectorNames]);

  const selectionLabel = useMemo(() => {
    if (!selected) return 'Select an industry';
    if (selected.industry) return displayIndustryName(selected.industry);
    if (selected.sector) return `${selected.sector} (all sub-industries)`;
    return 'Select an industry';
  }, [selected]);

  const columns = useMemo(() => [
    {
      header: '',
      id: 'add',
      cell: (info) => {
        const ticker = info.row.original.ticker;
        return (
          <button
            type="button"
            className={isInPortfolio(ticker) ? 'st-btn-success-outline st-btn-icon' : 'st-btn-success st-btn-icon'}
            title={isInPortfolio(ticker) ? 'Already in portfolio' : 'Add to portfolio'}
            onClick={() => handleAdd(ticker)}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        );
      },
      size: 44,
      enableSorting: false,
    },
    {
      header: 'Ticker',
      accessorKey: 'ticker',
      cell: (info) => <Link to={tickerFinancialsUrl(info.getValue())} className="st-ticker">{info.getValue()}</Link>,
      size: 90,
    },
    { header: 'Name', accessorKey: 'name', size: 180 },
    { header: 'Mkt Cap', accessorKey: 'marketCap', cell: (info) => formatUsd(info.getValue(), 0), size: 110 },
    { header: 'Price', accessorKey: 'price', cell: (info) => formatUsd(info.getValue()), size: 90 },
    {
      header: 'D% Ch',
      accessorKey: 'change',
      cellStyle: ({ row }) => row.original?._heatStyles?.change || {},
      cell: (info) => formatPercent(info.getValue(), 1),
      size: 90,
    },
    {
      header: 'E/P',
      accessorKey: 'ep',
      cellStyle: ({ row }) => row.original?._heatStyles?.ep || {},
      cell: (info) => formatDecimal(info.getValue(), 2),
      size: 80,
    },
    {
      header: '% to 52H',
      accessorKey: 'pctTo52wHi',
      cellStyle: ({ row }) => row.original?._heatStyles?.pctTo52wHi || {},
      cell: (info) => formatPercent(info.getValue(), 1),
      size: 100,
    },
  ], [handleAdd]);

  return (
    <div className="st-page st-page--full">
      <h1 className="st-page-heading">Industry Peers</h1>
      <p className="st-page-subtitle">Sub-industry peer view — companies grouped by SEC SIC industry (populated on fundamentals refresh).</p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="industry-layout">
        <div className="st-panel industry-sidebar">
          <div className="st-panel-header industry-sidebar-header">
            <span>Industries</span>
            {!loadingGroups && sectorNames.length > 0 && (
              <button
                type="button"
                className="st-btn-ghost industry-expand-all-btn"
                title={allExpanded ? 'Collapse all' : 'Expand all'}
                aria-label={allExpanded ? 'Collapse all industries' : 'Expand all industries'}
                onClick={toggleExpandAll}
              >
                <FontAwesomeIcon icon={allExpanded ? faAnglesUp : faAnglesDown} />
              </button>
            )}
          </div>
          <div className="industry-sidebar-body">
            {loadingGroups ? <div className="text-muted small">Loading industries…</div> : sectors.map(([sector, items]) => {
              const expanded = expandedSectors.has(sector);
              const sectorCount = items.reduce((sum, item) => sum + (item.company_count || 0), 0);
              const sectorActive = normalizeSector(selected?.sector) === sector && !selected?.industry;
              return (
                <div key={sector} className="industry-sector-group">
                  <div className="industry-sector-header">
                    <button
                      type="button"
                      className="industry-sector-toggle"
                      aria-expanded={expanded}
                      aria-label={expanded ? `Collapse ${sector}` : `Expand ${sector}`}
                      onClick={() => toggleSectorExpanded(sector)}
                    >
                      <FontAwesomeIcon icon={expanded ? faChevronDown : faChevronRight} />
                    </button>
                    <button
                      type="button"
                      className={`industry-sector-btn${sectorActive ? ' industry-sector-btn-active' : ''}`}
                      onClick={() => setSelected({ sector, industry: null })}
                    >
                      <span className="industry-pick-label">{sector}</span>
                      <span className="industry-pick-count">{sectorCount}</span>
                    </button>
                  </div>
                  {expanded && (
                    <div className="industry-subindustry-list">
                      {items.map((item) => {
                        const active =
                          selected?.industry === item.industry
                          && normalizeSector(selected?.sector) === normalizeSector(item.sector);
                        return (
                          <button
                            key={`${item.sector}-${item.industry}`}
                            type="button"
                            className={`industry-pick-btn industry-subindustry-btn${active ? ' industry-pick-btn-active' : ''}`}
                            onClick={() => setSelected({
                              sector: normalizeSector(item.sector),
                              industry: item.industry,
                            })}
                          >
                            <span className="industry-pick-label">{displayIndustryName(item.industry)}</span>
                            <span className="industry-pick-count">{item.company_count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {!loadingGroups && groups.length === 0 && (
              <div className="text-muted small">No industries yet. Run Admin → Refresh Fundamentals to enrich SIC metadata.</div>
            )}
          </div>
        </div>
        <div className="st-panel industry-main">
          <div className="st-panel-header">
            {selectionLabel}
          </div>
          <div className="industry-main-body">
            {loadingPeers ? (
              <div className="text-muted py-2 small">Loading peers…</div>
            ) : (
              <DataGrid
                columns={columns}
                data={gridRows}
                getRowId={(row) => row.ticker}
                enableRowSelection={false}
                compact
                tableExtraClassName="portfolio-grid-table"
                tableClassName="table table-sm table-bordered st-grid-table"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
