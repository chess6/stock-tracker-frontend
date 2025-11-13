import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import { formatUsd } from '../utils/formatters';

const StockScreenerPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    
    // Helper to build OpenInsider URL for a ticker and days window
    function getOpenInsiderUrl(ticker, days) {
      return `http://openinsider.com/screener?s=${ticker}&fd=${days}&sortcol=0&cnt=100&page=1`;
    }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(API_ENDPOINTS.INSIDER_BUYING_SUMS);
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
        if (!cancelled) setRows((data || []).map((r, idx) => ({
          id: r.id ?? r.ticker ?? idx,
          ticker: r.ticker,
          company: r.company ?? r.name ?? '',
          buy6m: Number(r.buy6m ?? r.insiderBuy6m ?? 0),
          buy3m: Number(r.buy3m ?? r.insiderBuy3m ?? 0),
          buy1m: Number(r.buy1m ?? r.insiderBuy1m ?? 0),
        })));
      } catch (e) {
        if (!cancelled) setError('Failed to load screener data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = useMemo(() => [
    {
      header: '#',
      accessorKey: 'rowIndex',
      cell: info => info.row.index + 1,
      size: 60,
      enableSorting: false,
    },
    { header: 'Ticker', accessorKey: 'ticker', cell: info => info.getValue(), size: 120 },
    { header: 'Company', accessorKey: 'company', cell: info => (
      <span style={{ whiteSpace: 'nowrap' }}>{info.getValue()}</span>
    ), size: 240 },
    { header: 'Insider Buy 6M', accessorKey: 'buy6m', cell: info => formatUsd(info.getValue(), 0), size: 140 },
    { header: 'Insider Buy 3M', accessorKey: 'buy3m', cell: info => formatUsd(info.getValue(), 0), size: 140 },
    { header: 'Insider Buy 1M', accessorKey: 'buy1m', cell: info => formatUsd(info.getValue(), 0), size: 140 },
    {
        header: 'OpenInsider',
        accessorKey: 'openInsider',
        cell: info => {
            const ticker = info.row.original.ticker;
            console.log('dbug info', info)
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
  ], []);

  return (
    <div className="container py-3">
      <div className="row mb-3">
        <div className="col">
          <h1 className="h3 mb-0">Stock Screener</h1>
          <div className="text-muted">Insider buying totals by ticker (6M &gt; $100k)</div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : rows.length === 0 ? (
            <div>No results.</div>
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
