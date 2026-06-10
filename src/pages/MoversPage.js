import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import StSpinner from '../components/StSpinner';
import { formatUsd, formatPercent } from '../utils/formatters';
import { signedHeatStyle } from '../utils/heatMap';
import { addToPortfolioWithNotification, isInPortfolio } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';

export default function MoversPage() {
  const [window, setWindow] = useState('d');
  const [movers, setMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleAdd = useCallback((symbol) => {
    const notif = addToPortfolioWithNotification(symbol);
    showToast(notif.message, notif.type);
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(API_ENDPOINTS.MOVERS, {
          params: { window, threshold: 10, limit: 75 },
        });
        if (!cancelled) setMovers(res.data?.movers || []);
      } catch (err) {
        if (!cancelled) {
          setMovers([]);
          setError(err?.response?.data?.error || 'Failed to load movers');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [window]);

  const gridRows = useMemo(() => movers.map((row) => ({
    ...row,
    _heatStyles: { change: signedHeatStyle(row.change, 10) },
  })), [movers]);

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
      cell: info => (
        <Link to={`/${info.getValue()}`} className="st-ticker">
          {info.getValue()}
        </Link>
      ),
      size: 100,
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: info => formatUsd(info.getValue()),
      size: 100,
    },
    {
      header: window === 'd' ? 'D% Ch' : 'W% Ch',
      accessorKey: 'change',
      cellStyle: ({ row }) => row.original?._heatStyles?.change || {},
      cell: info => formatPercent(info.getValue(), 1),
      size: 110,
    },
  ], [window, handleAdd]);

  return (
    <div className="st-page st-page--narrow">
      <div className="st-page-header">
        <div className="st-page-header-title">
          <h1 className="st-page-heading">Price Movers</h1>
          <div className="st-page-subtitle">±10% {window === 'd' ? 'daily' : 'weekly'} movers from cached prices.</div>
        </div>
        <div className="st-page-header-actions">
        <div className="st-segment" role="group" aria-label="Mover window">
          <button type="button" className={`st-segment-btn ${window === 'd' ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`} onClick={() => setWindow('d')}>Daily (d)</button>
          <button type="button" className={`st-segment-btn ${window === 'w' ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`} onClick={() => setWindow('w')}>Weekly (w)</button>
        </div>
        </div>
      </div>
      {error && <div className="st-alert-danger">{error}</div>}
      {loading ? (
        <div className="st-spinner-wrap"><StSpinner size="sm" /> Loading movers…</div>
      ) : movers.length === 0 ? (
        <div className="st-alert-secondary">No movers found. Bootstrap prices for more tickers via Admin.</div>
      ) : (
        <DataGrid
          columns={columns}
          data={gridRows}
          getRowId={row => row.ticker}
          enableRowSelection={false}
          compact
          tableExtraClassName="portfolio-grid-table"
          tableClassName="table table-sm table-bordered st-grid-table"
        />
      )}
    </div>
  );
}
