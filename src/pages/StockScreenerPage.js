import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setRows, setError } from '../store';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import { formatDecimal, formatUsd } from '../utils/formatters';
import { insiderDollarStyle } from '../utils/heatMap';
import { addToPortfolioWithNotification, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { useHeatmapThemeKey } from '../hooks/useHeatmapThemeKey';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { formatFreshnessTimestamp } from '../utils/dataFreshness';
import { insiderScreenerUrl, tickerFindersUrl, tickerFinancialsUrl } from '../utils/tickerLinks';
import { isDarkTheme } from '../utils/themeState';

const CLUSTER_MIN_BUY_VALUE = 100000;

const StockScreenerPage = () => {
  useHeatmapThemeKey();
  const rows = useSelector((state) => state.screener.rows);
  const loaded = useSelector((state) => state.screener.loaded);
  const error = useSelector((state) => state.screener.error);
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'cluster' ? 'cluster' : 'dollar';
  const [loading, setLoading] = useState(true);
  const [clusterRows, setClusterRows] = useState([]);
  const [clusterError, setClusterError] = useState(null);
  const [insidersUpdatedAt, setInsidersUpdatedAt] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const setMode = (nextMode) => {
    const next = nextMode === 'cluster' ? { mode: 'cluster' } : {};
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    if (mode !== 'dollar') {
      setLoading(false);
      return undefined;
    }
    if (loaded) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      setLoading(true);
      dispatch(setError(null));
      try {
        const res = await axios.get(API_ENDPOINTS.INSIDER_BUYING_SUMS, {
          params: { min_buy6m: CLUSTER_MIN_BUY_VALUE },
        });
        let data = res?.data;
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
      } catch {
        if (!cancelled) dispatch(setError('Failed to load screener data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, dispatch, mode]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== 'cluster') return undefined;
    (async () => {
      setLoading(true);
      setClusterError(null);
      try {
        const res = await axios.get(API_ENDPOINTS.RESEARCH_INSIDER_CLUSTERS, {
          params: { limit: 100, min_buy_value: CLUSTER_MIN_BUY_VALUE },
        });
        const clusters = Array.isArray(res.data?.clusters) ? res.data.clusters : [];
        const mapped = clusters.map((row, idx) => ({
          id: `${row.ticker}-${row.windowStart || idx}`,
          ticker: row.ticker,
          company: row.companyName || '',
          uniqueBuyers: row.uniqueBuyers,
          buyCount: row.buyCount,
          totalBuyValue: row.totalBuyValue,
          intensityScore: row.intensityScore,
          windowStart: row.windowStart,
          windowEnd: row.windowEnd,
        }));
        if (!cancelled) setClusterRows(mapped);
      } catch {
        if (!cancelled) {
          setClusterError('Failed to load insider cluster screener.');
          setClusterRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

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
  }, [loaded, mode]);

  const handleAdd = useCallback((symbol) => {
    const notif = addToPortfolioWithNotification(symbol);
    showToast(notif.message, notif.type);
  }, [showToast]);

  const dollarColumns = useMemo(() => [
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
      header: '#',
      accessorKey: 'rowIndex',
      cell: (info) => info.row.index + 1,
      size: 60,
      enableSorting: false,
    },
    {
      header: 'Ticker',
      accessorKey: 'ticker',
      cell: (info) => {
        const ticker = info.getValue();
        const row = info.row.original;
        return (
          <a
            href={tickerFindersUrl(ticker)}
            target="_blank"
            rel="noopener noreferrer"
            className="st-ticker"
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault();
              navigate(tickerFindersUrl(ticker), { state: row });
            }}
          >
            {ticker}
          </a>
        );
      },
      size: 120,
    },
    {
      header: 'Company',
      accessorKey: 'company',
      cell: (info) => <span style={{ whiteSpace: 'nowrap' }}>{info.getValue()}</span>,
      size: 240,
    },
    {
      header: 'Insider Buy 6M',
      accessorKey: 'buy6m',
      meta: { numeric: true },
      cellStyle: (info) => insiderDollarStyle(info.getValue()),
      cell: (info) => formatUsd(info.getValue(), 0),
      size: 140,
    },
    {
      header: '6m # owners',
      accessorKey: 'owners6m',
      cell: (info) => info.getValue(),
      cellStyle: (info) => {
        const owners = info.getValue();
        if (owners >= 3) {
          const capped = Math.min(owners, 12);
          const lightness = 25 + (capped - 3) * 7;
          const dark = isDarkTheme();
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
      size: 120,
    },
    {
      header: 'Insider Buy 3M',
      accessorKey: 'buy3m',
      meta: { numeric: true },
      cellStyle: (info) => insiderDollarStyle(info.getValue()),
      cell: (info) => formatUsd(info.getValue(), 0),
      size: 140,
    },
    {
      header: 'Insider Buy 1M',
      accessorKey: 'buy1m',
      meta: { numeric: true },
      cellStyle: (info) => insiderDollarStyle(info.getValue()),
      cell: (info) => formatUsd(info.getValue(), 0),
      size: 140,
    },
    {
      header: 'Insider links',
      accessorKey: 'insiderLinks',
      cell: (info) => {
        const ticker = info.row.original.ticker;
        return (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
            <a href={insiderScreenerUrl(ticker, 180)} target="_blank" rel="noopener noreferrer">6M</a>
            <a href={insiderScreenerUrl(ticker, 90)} target="_blank" rel="noopener noreferrer">3M</a>
            <a href={insiderScreenerUrl(ticker, 30)} target="_blank" rel="noopener noreferrer">1M</a>
          </div>
        );
      },
      size: 180,
    },
  ], [navigate, handleAdd]);

  const clusterColumns = useMemo(() => [
    {
      header: '',
      id: 'add',
      cell: (info) => {
        const ticker = info.row.original.ticker;
        return (
          <button
            type="button"
            className={isInPortfolio(ticker) ? 'st-btn-success-outline st-btn-icon' : 'st-btn-success st-btn-icon'}
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
      cell: (info) => (
        <Link to={tickerFinancialsUrl(info.getValue())} className="st-ticker">
          {info.getValue()}
        </Link>
      ),
      size: 90,
    },
    { header: 'Company', accessorKey: 'company', size: 200 },
    {
      header: 'Window',
      id: 'window',
      cell: (info) => {
        const row = info.row.original;
        return `${(row.windowStart || '').slice(0, 10)} → ${(row.windowEnd || '').slice(0, 10)}`;
      },
      size: 180,
    },
    { header: 'Buyers', accessorKey: 'uniqueBuyers', meta: { numeric: true }, size: 80 },
    { header: 'Buys', accessorKey: 'buyCount', meta: { numeric: true }, size: 70 },
    {
      header: 'Buy Value',
      accessorKey: 'totalBuyValue',
      meta: { numeric: true },
      cellStyle: (info) => insiderDollarStyle(info.getValue()),
      cell: (info) => formatUsd(info.getValue(), 0),
      size: 120,
    },
    {
      header: 'Intensity',
      accessorKey: 'intensityScore',
      meta: { numeric: true },
      cell: (info) => formatDecimal(info.getValue(), 3),
      size: 90,
    },
  ], [handleAdd]);

  const activeRows = mode === 'cluster' ? clusterRows : rows;
  const activeError = mode === 'cluster' ? clusterError : error;
  const activeColumns = mode === 'cluster' ? clusterColumns : dollarColumns;

  return (
    <div className="st-page st-page--full">
      <div className="st-page-header">
        <div className="st-page-header-title">
          <h1 className="st-page-heading">Stock Screener</h1>
          <div className="st-page-subtitle">
            {mode === 'cluster'
              ? 'Cluster $+ — 3+ insiders buying within 30 days with cluster buy value ≥ $100k'
              : 'Insider buying totals by ticker (6M > $100k)'}
            {insidersUpdatedAt && (
              <span className="ms-1">· insiders cached {formatFreshnessTimestamp(insidersUpdatedAt)}</span>
            )}
          </div>
        </div>
        <div className="st-page-header-actions">
          <div className="st-segment" role="group" aria-label="Screener mode">
            <button
              type="button"
              className={`st-segment-btn ${mode === 'dollar' ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
              onClick={() => setMode('dollar')}
            >
              $ (6M buys)
            </button>
            <button
              type="button"
              className={`st-segment-btn ${mode === 'cluster' ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
              onClick={() => setMode('cluster')}
            >
              $+ (clusters)
            </button>
          </div>
        </div>
      </div>

      <div className="st-panel">
        <div className="st-panel-body-flush" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="st-spinner-wrap py-2">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Loading screener…
            </div>
          ) : activeError ? (
            <div className="alert alert-danger mb-0">{activeError}</div>
          ) : activeRows.length === 0 ? (
            <div className="alert alert-secondary mb-0">
              {mode === 'cluster'
                ? <>No insider buy clusters match the threshold. Try <Link to="/admin">refreshing insider data</Link> first.</>
                : <>No tickers match the $100k 6M insider threshold. Try <Link to="/admin">bootstrapping insider data</Link> first.</>}
            </div>
          ) : (
            <DataGrid
              data={activeRows}
              columns={activeColumns}
              enableRowSelection={false}
              enableSorting
              enableGlobalFilter
              compact
              tableExtraClassName="portfolio-grid-table"
              tableClassName="table table-sm table-bordered st-grid-table"
              style={{ minWidth: 800 }}
              maxHeight="70vh"
              pageChunkSize={300}
              getRowId={(row) => String(row.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockScreenerPage;
