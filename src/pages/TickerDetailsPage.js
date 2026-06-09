import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import StSpinner from '../components/StSpinner';
import DataGrid from '../components/DataGrid';
import TickerSubnav from '../components/TickerSubnav';
import {
  formatShares,
  formatUsd,
  formatDecimal,
} from '../utils/formatters';
import API_ENDPOINTS from '../apiConfig';

const COLUMN_FORMATTERS = {
  transactionvalue: (value) => formatUsd(value),
  filingdate: (value) => (value ? String(value).slice(0, 10) : '—'),
  transactiondate: (value) => (value ? String(value).slice(0, 10) : '—'),
};

export default function TickerDetailsPage() {
  const { ticker } = useParams();
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(API_ENDPOINTS.INSIDER_TRANSACTIONS(ticker))
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok && data?.error) {
          setError(data.error);
          setRows([]);
          setSource('');
          return;
        }
        const datatable = data?.datatable;
        setSource(data?.meta?.source || '');
        if (!datatable || !Array.isArray(datatable.data) || !Array.isArray(datatable.columns)) {
          setRows([]);
          return;
        }
        setRows(datatable.data.map((row, idx) => {
          const obj = { id: idx };
          datatable.columns.forEach((col, i) => {
            obj[col.name] = row[i];
          });
          return obj;
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load insider transactions');
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ticker]);

  const columns = useMemo(() => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]).filter((key) => key !== 'id');
    return keys.map((name) => ({
      header: name,
      accessorKey: name,
      cell: (info) => {
        const value = info.getValue();
        if (COLUMN_FORMATTERS[name]) return COLUMN_FORMATTERS[name](value);
        if (name.includes('shares')) return formatShares(value);
        if (name.includes('price')) return formatUsd(value);
        if (typeof value === 'number') return formatDecimal(value, 2);
        return value ?? '—';
      },
      cellStyle: (['issuername', 'officertitle', 'ownername', 'securitytitle'].includes(name))
        ? { whiteSpace: 'nowrap' }
        : undefined,
    }));
  }, [rows]);

  return (
    <div className="st-page st-page--full">
      <TickerSubnav ticker={ticker} />
      <div className="st-panel mb-2">
        <div className="st-panel-header">Insider Transactions — {ticker}</div>
        <div className="st-panel-body">
          <p className="st-muted-note mb-2">
            SEC Form 4 filings from local cache
            {source && <> · source: <code>{source}</code></>}
          </p>

          {loading && (
            <div className="st-spinner-wrap py-2">
              <StSpinner size="sm" /> Loading insider transactions…
            </div>
          )}
          {!loading && error && <div className="st-alert-danger">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="st-alert-secondary">
              No insider transactions cached for {ticker}. Run{' '}
              <Link to="/admin" className="st-link-muted">Admin → Refresh Insiders</Link> or bootstrap your portfolio tickers.
            </div>
          )}
        </div>
        {!loading && rows.length > 0 && (
          <div className="st-panel-body-flush">
            <DataGrid
              data={rows}
              columns={columns}
              enableRowSelection={false}
              enableSorting
              enableGlobalFilter
              style={{ minWidth: 800 }}
              pageChunkSize={50}
              getRowId={(row) => String(row.id)}
              maxHeight="calc(100vh - 260px)"
              compact
              tableExtraClassName="portfolio-grid-table"
              tableClassName="table table-sm table-bordered st-grid-table"
            />
          </div>
        )}
      </div>
    </div>
  );
}
