import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setRows, setError } from '../store';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import { formatUsd } from '../utils/formatters';
import { insiderDollarStyle } from '../utils/heatMap';
import { addToPortfolioWithNotification, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { formatFreshnessTimestamp } from '../utils/dataFreshness';

const StockScreenerPage = () => {
  const rows = useSelector(state => state.screener.rows);
  const loaded = useSelector(state => state.screener.loaded);
  const error = useSelector(state => state.screener.error);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [insidersUpdatedAt, setInsidersUpdatedAt] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
    
    // Helper to build OpenInsider URL for a ticker and days window
    function getOpenInsiderUrl(ticker, days) {
      return `http://openinsider.com/screener?s=${ticker}&fd=${days}&sortcol=0&cnt=100&page=1`;
    }

  useEffect(() => {
    let cancelled = false;
    if (loaded) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      dispatch(setError(null));
      try {
        const res = await axios.get(API_ENDPOINTS.INSIDER_BUYING_SUMS, {
          params: { min_buy6m: 100000 },
        });
        let data = res?.data;
        // Normalize various possible shapes
        if (data && Array.isArray(data.rows)) {
          data = data.rows;
        } else if (data && Array.isArray(data)) {
          // ok
        } else if (data && data.screener) {
          data = data.screener;
        } else {
          data = [];
        }
        const mappedRows = (data || []).map((r, idx) => ({
          id: r.id ?? r.ticker ?? idx,
          ticker: r.ticker,
          company: r.company ?? r.name ?? '',
          buy6m: Number(r.buy6m ?? r.insiderBuy6m ?? 0),
          buy3m: Number(r.buy3m ?? r.insiderBuy3m ?? 0),
          buy1m: Number(r.buy1m ?? r.insiderBuy1m ?? 0),
          owners6m: Number(r.owners6m ?? 0),
        }));
        if (!cancelled) dispatch(setRows(mappedRows));
      } catch (e) {
        if (!cancelled) dispatch(setError('Failed to load screener data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, dispatch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.ADMIN_STATUS);
        if (!cancelled) setInsidersUpdatedAt(res.data?.freshness?.insidersUpdatedAt || null);
      } catch {
        if (!cancelled) setInsidersUpdatedAt(null);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded]);

  const handleAdd = useCallback((symbol) => {
    const notif = addToPortfolioWithNotification(symbol);
    showToast(notif.message, notif.type);
  }, [showToast]);

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
      header: '#',
      accessorKey: 'rowIndex',
      cell: info => info.row.index + 1,
      size: 60,
      enableSorting: false,
    },
    { 
      header: 'Ticker', 
      accessorKey: 'ticker', 
      cell: info => {
        const ticker = info.getValue();
        const row = info.row.original;
        return (
          <a
            href={`/${ticker}/insiders`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-primary"
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={e => {
              e.preventDefault();
              navigate(`/${ticker}/insiders`, { state: row });
            }}
          >
            {ticker}
          </a>
        );
      }, 
      size: 120 
    },
    { header: 'Company', accessorKey: 'company', cell: info => (
      <span style={{ whiteSpace: 'nowrap' }}>{info.getValue()}</span>
    ), size: 240 },
  {
      header: 'Insider Buy 6M',
      accessorKey: 'buy6m',
      meta: { numeric: true },
      cellStyle: info => insiderDollarStyle(info.getValue()),
      cell: info => formatUsd(info.getValue(), 0),
      size: 140,
    },
    { 
      header: '6m # owners', 
      accessorKey: 'owners6m', 
      cell: info => info.getValue(),
      cellStyle: info => {
        const owners = info.getValue();
        if (owners >= 3) {
          const capped = Math.min(owners, 12);
          const lightness = 25 + (capped - 3) * 7;
          const dark = typeof document !== 'undefined'
            && document.documentElement.getAttribute('data-bs-theme') === 'dark';
          const color = dark
            ? (lightness < 45 ? '#f0fff4' : '#0a2e14')
            : (lightness < 40 ? '#fff' : '#222');
          return {
            background: `hsl(120, 100%, ${lightness}%)`,
            color,
          };
        }
        return {};
      },
      size: 120 
    },
    {
      header: 'Insider Buy 3M',
      accessorKey: 'buy3m',
      meta: { numeric: true },
      cellStyle: info => insiderDollarStyle(info.getValue()),
      cell: info => formatUsd(info.getValue(), 0),
      size: 140,
    },
    {
      header: 'Insider Buy 1M',
      accessorKey: 'buy1m',
      meta: { numeric: true },
      cellStyle: info => insiderDollarStyle(info.getValue()),
      cell: info => formatUsd(info.getValue(), 0),
      size: 140,
    },
    {
        header: 'OpenInsider',
        accessorKey: 'openInsider',
        cell: info => {
            const ticker = info.row.original.ticker;
            return (
                <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                    <a href={getOpenInsiderUrl(ticker, 180)} target="_blank" rel="noopener noreferrer">6M</a>
                    <a href={getOpenInsiderUrl(ticker, 90)} target="_blank" rel="noopener noreferrer">3M</a>
                    <a href={getOpenInsiderUrl(ticker, 30)} target="_blank" rel="noopener noreferrer">1M</a>
                </div>
            );
        },
        size: 180,
    },
  ], [navigate, handleAdd]);

  return (
    <div className="container py-3">
      <div className="row mb-1">
        <div className="col">
          <h1 className="h3 mb-0">Stock Screener</h1>
          <div className="text-muted">
            Insider buying totals by ticker (6M &gt; $100k)
            {insidersUpdatedAt && (
              <span className="ms-2">· insiders cached {formatFreshnessTimestamp(insidersUpdatedAt)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="text-center py-4 text-muted">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Loading screener…
            </div>
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : rows.length === 0 ? (
            <div className="alert alert-secondary mb-0">
              No tickers match the $100k 6M insider threshold. Try <Link to="/admin">bootstrapping insider data</Link> first.
            </div>
          ) : (
            <DataGrid
              data={rows}
              columns={columns}
              enableRowSelection={false}
              enableSorting={true}
              enableGlobalFilter={true}
              style={{ minWidth: 800 }}
              maxHeight="80vh"
              pageChunkSize={300}
              getRowId={row => String(row.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockScreenerPage;
