import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { signedHeatStyle, columnHeatStyle, columnMinMax } from '../utils/heatMap';
import { addToPortfolioWithNotification, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import './industry.css';

const toNum = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));

function displayIndustryName(name) {
  if (!name) return '';
  return String(name).replace(/<br\s*\/?>/gi, ' ').trim();
}

export default function IndustryPage() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
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
            setSelected((prev) => prev || { sector: industries[0].sector, industry: industries[0].industry });
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
    if (!selected?.industry) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingPeers(true);
      setError('');
      try {
        const peerRes = await axios.get(API_ENDPOINTS.INDUSTRY_PEERS, {
          params: { industry: selected.industry, sector: selected.sector || undefined, limit: 80 },
        });
        const peers = peerRes.data?.peers || [];
        if (!peers.length) {
          if (!cancelled) setRows([]);
          return;
        }
        const tickers = peers.map(p => p.ticker).join(',');
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
  }, [selected]);

  const heatRanges = useMemo(() => ({ ep: columnMinMax(rows, 'ep') }), [rows]);

  const sectors = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      const sector = g.sector || 'Other';
      map[sector] = map[sector] || [];
      map[sector].push(g);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  const columns = useMemo(() => [
    {
      header: '',
      id: 'add',
      cell: info => {
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
      cell: info => <Link to={`/${info.getValue()}`} className="st-ticker">{info.getValue()}</Link>,
      size: 90,
    },
    { header: 'Name', accessorKey: 'name', size: 180 },
    { header: 'Mkt Cap', accessorKey: 'marketCap', cell: info => formatUsd(info.getValue(), 0), size: 110 },
    { header: 'Price', accessorKey: 'price', cell: info => formatUsd(info.getValue()), size: 90 },
    {
      header: 'D% Ch',
      accessorKey: 'change',
      cellStyle: ({ row }) => signedHeatStyle(row.original?.change, 5),
      cell: info => formatPercent(info.getValue(), 1),
      size: 90,
    },
    {
      header: 'E/P',
      accessorKey: 'ep',
      cellStyle: ({ row }) => columnHeatStyle(row.original?.ep, heatRanges.ep.min, heatRanges.ep.max),
      cell: info => formatDecimal(info.getValue(), 2),
      size: 80,
    },
    {
      header: '% to 52H',
      accessorKey: 'pctTo52wHi',
      cellStyle: ({ row }) => signedHeatStyle(row.original?.pctTo52wHi, 15),
      cell: info => formatPercent(info.getValue(), 1),
      size: 100,
    },
  ], [heatRanges, handleAdd]);

  return (
    <div className="st-page st-page--full">
      <h1 className="st-page-heading">Industry Peers</h1>
      <p className="st-page-subtitle">Sub-industry peer view — companies grouped by SEC SIC industry (populated on fundamentals refresh).</p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="industry-layout">
        <div className="st-panel industry-sidebar">
          <div className="st-panel-header">Industries</div>
          <div className="industry-sidebar-body">
            {loadingGroups ? <div className="text-muted small">Loading industries…</div> : sectors.map(([sector, items]) => (
              <div key={sector} className="industry-sector-group">
                <div className="industry-sector-label">{sector}</div>
                {items.map((item) => {
                  const active = selected?.industry === item.industry && selected?.sector === item.sector;
                  return (
                    <button
                      key={`${item.sector}-${item.industry}`}
                      type="button"
                      className={`industry-pick-btn${active ? ' industry-pick-btn-active' : ''}`}
                      onClick={() => setSelected({ sector: item.sector, industry: item.industry })}
                    >
                      <span>{displayIndustryName(item.industry)}</span>
                      <span className="industry-pick-count">{item.company_count}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {!loadingGroups && groups.length === 0 && (
              <div className="text-muted small">No industries yet. Run Admin → Refresh Fundamentals to enrich SIC metadata.</div>
            )}
          </div>
        </div>
        <div className="st-panel industry-main">
          <div className="st-panel-header">
            {displayIndustryName(selected?.industry) || 'Select an industry'}
          </div>
          <div className="industry-main-body">
            {loadingPeers ? (
              <div className="text-muted py-2 small">Loading peers…</div>
            ) : (
              <DataGrid
                columns={columns}
                data={rows}
                getRowId={row => row.ticker}
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
