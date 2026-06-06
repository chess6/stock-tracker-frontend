import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DataGrid from '../components/DataGrid';
import {
  formatShares,
  formatUsd,
  formatDecimal,
} from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import API_ENDPOINTS from '../apiConfig';

export default function TickerDetailsPage() {
  const navigate = useNavigate();
  const { ticker } = useParams();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(API_ENDPOINTS.SF2(ticker))
      .then(res => res.json())
      .then(data => {
        const datatable = data?.datatable;
        if (!datatable || !Array.isArray(datatable.data) || !Array.isArray(datatable.columns)) {
          setError('No SF2 data found');
          setRows([]);
          setColumns([]);
          setLoading(false);
          return;
        }
        setRows(datatable.data.map((row, idx) => {
          const obj = {};
          datatable.columns.forEach((col, i) => {
            obj[col.name] = row[i];
          });
          obj.id = idx;
          return obj;
        }));
        setColumns(datatable.columns.map(col => ({
          header: col.name,
          accessorKey: col.name,
          // Format cell based on column type
          cell: info => {
            const value = info.getValue();
            switch (col.type) {
              case 'Integer':
                // Shares columns
                if (col.name.includes('shares') || col.name === 'transactionvalue') {
                  return formatShares(value);
                }
                return formatDecimal(value, 0);
              case 'double':
                // Price columns
                if (col.name.includes('price') || col.name === 'priceexercisable') {
                  return formatUsd(value);
                }
                return formatDecimal(value, 2);
              case 'Date':
                // Format date as YYYY-MM-DD
                return value ? String(value).slice(0, 10) : '';
              default:
                return value;
            }
          },
          size: 140,
          cellStyle: (col.name === 'issuername' || col.name === 'officertitle' || col.name === 'ownername') ? { whiteSpace: 'nowrap' } : undefined,
        })));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load SF2 data');
        setLoading(false);
      });
  }, [ticker]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!rows.length) return <div>No SF2 data found for {ticker}.</div>;

  return (
    <div className="container py-3">
      <button className="btn btn-sm btn-outline-secondary mb-1" onClick={() => navigate(-1)}>
        &larr; Back to Screener
      </button>
      <h2 className="mb-1">Details for {ticker}</h2>
      <DataGrid
        data={rows}
        columns={columns}
        enableRowSelection={false}
        enableSorting={true}
        enableGlobalFilter={true}
        style={{ minWidth: 800 }}
        pageChunkSize={50}
        getRowId={row => String(row.id ?? row.ticker ?? ticker)}
        maxHeight={'calc(100vh - 230px)'}
      />
    </div>
  );
}
