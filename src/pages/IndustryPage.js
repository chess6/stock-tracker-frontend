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

const toNum = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));

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
            className={`btn btn-sm ${isInPortfolio(ticker) ? 'btn-outline-secondary' : 'btn-success'}`}
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
      cell: info => <Link to={`/${info.getValue()}`}>{info.getValue()}</Link>,
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
    <div className="container-fluid py-3">
      <h1 className="h3 mb-1">Industry Peers</h1>
      <p className="text-muted mb-3">terminal-style sub-industry view — peers grouped by SEC SIC industry (populated on fundamentals refresh).</p>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-lg-3">
          <div className="card shadow-sm">
            <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loadingGroups ? <div className="text-muted">Loading industries…</div> : sectors.map(([sector, items]) => (
                <div key={sector} className="mb-3">
                  <div className="fw-semibold small text-uppercase text-muted mb-1">{sector}</div>
                  {items.map((item) => {
                    const active = selected?.industry === item.industry && selected?.sector === item.sector;
                    return (
                      <button
                        key={`${item.sector}-${item.industry}`}
                        type="button"
                        className={`btn btn-sm w-100 text-start mb-1 ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setSelected({ sector: item.sector, industry: item.industry })}
                      >
                        {item.industry}
                        <span className="badge bg-light text-dark ms-2">{item.company_count}</span>
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
        </div>
        <div className="col-lg-9">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">{selected?.industry || 'Select an industry'}</h2>
              {loadingPeers ? (
                <div className="text-muted py-4">Loading peers…</div>
              ) : (
                <DataGrid
                  columns={columns}
                  data={rows}
                  getRowId={row => row.ticker}
                  enableRowSelection={false}
                  tableClassName="table table-sm table-bordered"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
