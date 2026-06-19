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
import { tickerFinancialsUrl } from '../utils/tickerLinks';

const MOVER_WINDOWS = [
  { id: 'd', label: 'Daily', changeHeader: 'D% Ch' },
  { id: 'w', label: 'Weekly', changeHeader: 'W% Ch' },
  { id: 'm', label: 'Monthly', changeHeader: 'M% Ch' },
];

const WINDOW_IDS = MOVER_WINDOWS.map(({ id }) => id);

function emptyByWindow() {
  return { d: [], w: [], m: [] };
}

function initialStatusState(status = 'loading') {
  return { d: status, w: status, m: status };
}

function isRequestCanceled(err) {
  return axios.isCancel?.(err) || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
}

function buildGridRows(movers) {
  return movers.map((row) => ({
    ...row,
    _heatStyles: { change: signedHeatStyle(row.change, 10) },
  }));
}

function MoversGrid({ label, changeHeader, movers, status, error, onAdd }) {
  const gridRows = useMemo(() => buildGridRows(movers), [movers]);

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
            onClick={() => onAdd(ticker)}
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
        <Link to={tickerFinancialsUrl(info.getValue())} className="st-ticker">
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
      header: changeHeader,
      accessorKey: 'change',
      cellStyle: ({ row }) => row.original?._heatStyles?.change || {},
      cell: info => formatPercent(info.getValue(), 1),
      size: 110,
    },
  ], [changeHeader, onAdd]);

  return (
    <section
      className="movers-section"
      aria-busy={status === 'loading'}
      aria-live="polite"
    >
      <h2 className="movers-section-heading">{label}</h2>
      {status === 'loading' ? (
        <div className="movers-section-loading-panel">
          <div className="movers-section-loading">
            <StSpinner size="sm" />
            <span>Loading {label.toLowerCase()} movers…</span>
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="st-alert-danger movers-section-empty">{error}</div>
      ) : movers.length === 0 ? (
        <div className="st-alert-secondary movers-section-empty">No {label.toLowerCase()} movers at ±10%.</div>
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
    </section>
  );
}

async function loadMoverWindow(id, signal) {
  const res = await axios.get(API_ENDPOINTS.MOVERS, {
    params: { window: id, threshold: 10, limit: 75 },
    signal,
  });
  return res.data?.movers || [];
}

export default function MoversPage() {
  const [moversByWindow, setMoversByWindow] = useState(emptyByWindow);
  const [statusByWindow, setStatusByWindow] = useState(() => initialStatusState('loading'));
  const [errorsByWindow, setErrorsByWindow] = useState(() => ({ d: '', w: '', m: '' }));
  const { showToast } = useToast();

  const handleAdd = useCallback((symbol) => {
    const notif = addToPortfolioWithNotification(symbol);
    showToast(notif.message, notif.type);
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStatusByWindow(initialStatusState('loading'));
    setErrorsByWindow({ d: '', w: '', m: '' });

    WINDOW_IDS.forEach((id) => {
      loadMoverWindow(id, controller.signal)
        .then((movers) => {
          if (!active) return;
          setMoversByWindow((prev) => ({ ...prev, [id]: movers }));
          setErrorsByWindow((prev) => ({ ...prev, [id]: '' }));
          setStatusByWindow((prev) => ({ ...prev, [id]: 'ready' }));
        })
        .catch((err) => {
          if (!active || isRequestCanceled(err)) return;
          setMoversByWindow((prev) => ({ ...prev, [id]: [] }));
          setErrorsByWindow((prev) => ({
            ...prev,
            [id]: err?.response?.data?.error || `Failed to load ${id} movers`,
          }));
          setStatusByWindow((prev) => ({ ...prev, [id]: 'error' }));
        });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const anyLoading = WINDOW_IDS.some((id) => statusByWindow[id] === 'loading');

  return (
    <div className="st-page st-page--full movers-page">
      <div className="st-page-header">
        <div className="st-page-header-title">
          <h1 className="st-page-heading">Price Movers</h1>
          <div className="st-page-subtitle">
            {anyLoading
              ? 'Loading daily, weekly, and monthly movers from cached prices…'
              : '±10% daily, weekly, and monthly movers from cached prices.'}
          </div>
        </div>
        {anyLoading && (
          <div className="st-page-header-actions movers-page-loading-badge" aria-live="polite">
            <StSpinner size="sm" />
            <span>Loading…</span>
          </div>
        )}
      </div>
      <div className="movers-sections">
        {MOVER_WINDOWS.map(({ id, label, changeHeader }) => (
          <MoversGrid
            key={id}
            label={label}
            changeHeader={changeHeader}
            movers={moversByWindow[id]}
            status={statusByWindow[id]}
            error={errorsByWindow[id]}
            onAdd={handleAdd}
          />
        ))}
      </div>
    </div>
  );
}
