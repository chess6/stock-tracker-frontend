import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
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
      cell: info => (
        <Link to={`/${info.getValue()}`} className="fw-semibold text-decoration-underline">
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
      cellStyle: ({ row }) => signedHeatStyle(row.original?.change, 10),
      cell: info => formatPercent(info.getValue(), 1),
      size: 110,
    },
  ], [window, handleAdd]);

  return (
    <div className="container py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h1 className="h3 mb-1">Price Movers</h1>
          <div className="text-muted">terminal-style screens: ±10% {window === 'd' ? 'daily' : 'weekly'} movers from cached prices.</div>
        </div>
        <div className="btn-group" role="group">
          <button type="button" className={`btn btn-sm ${window === 'd' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setWindow('d')}>Daily (d)</button>
          <button type="button" className={`btn btn-sm ${window === 'w' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setWindow('w')}>Weekly (w)</button>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="text-center py-5 text-muted">Loading movers…</div>
      ) : movers.length === 0 ? (
        <div className="alert alert-secondary">No movers found. Bootstrap prices for more tickers via Admin.</div>
      ) : (
        <DataGrid
          columns={columns}
          data={movers}
          getRowId={row => row.ticker}
          enableRowSelection={false}
          tableClassName="table table-sm table-bordered"
        />
      )}
    </div>
  );
}
