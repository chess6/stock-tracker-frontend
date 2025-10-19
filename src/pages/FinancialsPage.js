import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { Grid } from '@svar-ui/react-grid';

const yearOptions = [5, 10, 15, 'all'];
const statementTypes = [
  { label: 'Income Statement', value: 'income' },
  { label: 'Balance Sheet', value: 'balanceSheet' },
  { label: 'Cash Flow', value: 'cashFlow' },
];
const periodOptions = [
  { label: 'Annual', value: 'annual' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'TTM', value: 'ttm' },
];

const FinancialsPage = () => {
  const { ticker } = useParams();
  const [financials, setFinancials] = useState({ income: [], balanceSheet: [], cashFlow: [] });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('annual');
  const [years, setYears] = useState(10);
  const [activeType, setActiveType] = useState('income');
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'gp', 'opinc', 'netinc']);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchAll() {
      try {
        const types = ['income', 'balanceSheet', 'cashFlow'];
        const data = {};
        for (const type of types) {
          const res = await axios.get(`${API_ENDPOINTS.FINANCIALS(ticker)}?type=${type}&period=${period}&limit=${years === 'all' ? 100 : years}`);
          // Defensive: NASDAQ API returns { raw: { datatable: { columns, data } } }
          if (res.data && res.data.raw && res.data.raw.datatable && Array.isArray(res.data.raw.datatable.data)) {
            // Map columns to keys
            const columns = res.data.raw.datatable.columns || [];
            const colNames = columns.map(c => c.name);
            const rows = res.data.raw.datatable.data.map(arr => {
              const obj = {};
              colNames.forEach((k, i) => { obj[k] = arr[i]; });
              return obj;
            });
            data[type] = rows;
          } else if (Array.isArray(res.data)) {
            data[type] = res.data;
          } else {
            data[type] = [];
          }
        }
        if (!cancelled) setFinancials(data);
      } catch (e) {
        if (!cancelled) setFinancials({ income: [], balanceSheet: [], cashFlow: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [ticker, period, years]);

  // Metric definitions per statement
  const METRICS_MAP = {
    income: [
      { key: 'revenue', label: 'Revenue', alt: ['revenueusd'] },
      { key: 'gp', label: 'Gross Profit', alt: ['grossProfit'] },
      { key: 'opinc', label: 'Operating Income', alt: ['operatingIncome'] },
      { key: 'ebit', label: 'EBIT' },
      { key: 'ebitda', label: 'EBITDA' },
      { key: 'netinc', label: 'Net Income', alt: ['netIncome','netinccmn'] },
      { key: 'eps', label: 'EPS' },
      { key: 'rnd', label: 'R&D' },
      { key: 'sgna', label: 'SG&A' },
      { key: 'taxexp', label: 'Tax Expense' },
    ],
    balanceSheet: [
      { key: 'assets', label: 'Total Assets' },
      { key: 'liabilities', label: 'Total Liabilities' },
      { key: 'equity', label: 'Shareholders’ Equity' },
      { key: 'cashneq', label: 'Cash & Equivalents' },
      { key: 'debt', label: 'Total Debt' },
      { key: 'ppnenet', label: 'PP&E, Net' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'receivables', label: 'Receivables' },
      { key: 'payables', label: 'Payables' },
      { key: 'workingcapital', label: 'Working Capital' },
    ],
    cashFlow: [
      { key: 'ncfo', label: 'Operating Cash Flow', alt: ['operatingCashFlow'] },
      { key: 'capex', label: 'Capital Expenditures' },
      { key: 'fcf', label: 'Free Cash Flow' },
      { key: 'ncfi', label: 'Investing Cash Flow' },
      { key: 'ncff', label: 'Financing Cash Flow' },
      { key: 'ncfdiv', label: 'Dividends Paid' },
      { key: 'ncfdebt', label: 'Debt Issued/Repurchased' },
      { key: 'ncf', label: 'Net Cash Flow' },
    ],
  };

  const safeNumber = (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const statementRows = useMemo(() => {
    const data = financials[activeType] || [];
    const metrics = METRICS_MAP[activeType] || [];
    if (!data.length || !metrics.length) return [];
    return metrics.map((m, rIdx) => {
      const row = { id: rIdx, metric: m.label, key: m.key };
      data.forEach((periodRow, idx) => {
        // Try main key, then alt keys, then fallback to '-'
        let val = null;
        if (periodRow[m.key] !== undefined && periodRow[m.key] !== null) {
          val = safeNumber(periodRow[m.key]);
        } else if (m.alt && Array.isArray(m.alt)) {
          for (const altKey of m.alt) {
            if (periodRow[altKey] !== undefined && periodRow[altKey] !== null) {
              val = safeNumber(periodRow[altKey]);
              if (val !== null) break;
            }
          }
        }
        row[`p${idx}`] = val === null ? '-' : val;
      });
      return row;
    });
  }, [financials, activeType]);

  const statementColumns = useMemo(() => {
    const data = financials[activeType] || [];
    if (!data.length) return [];
    // Try to get period label from available keys
    const periods = data.map(r => {
      // NASDAQ: calendardate, reportperiod, fiscalperiod
      return (r.calendardate || r.reportperiod || r.fiscalperiod || r.endDate || r.periodEnd || '').slice(0,10);
    });
    return [
      { id: 'metric', header: 'Metric', width: 240, pinned: 'left' },
      ...periods.map((p, idx) => ({ id: `p${idx}`, header: p || `P${idx+1}`, width: 140, sort: false })),
    ];
  }, [financials, activeType]);

  const chartSeries = useMemo(() => {
    const data = financials[activeType] || [];
    const labelFor = (key) => {
      const m = (METRICS_MAP[activeType]||[]).find(x=>x.key===key);
      return m ? m.label : key;
    };
    return selectedMetrics.map(key => ({
      name: labelFor(key),
      data: data.map(r => {
        const alt = (METRICS_MAP[activeType]||[]).find(m=>m.key===key)?.alt;
        const altKey = alt ? alt.find(k => r[k] !== undefined && r[k] !== null) : undefined;
        return safeNumber(r[key] ?? (altKey ? r[altKey] : undefined)) ?? 0;
      }),
    }));
  }, [selectedMetrics, activeType, financials]);

  const barChartOptions = useMemo(() => ({
    chart: { type: 'bar', stacked: false },
    xaxis: {
      categories: (financials[activeType] || []).map(r => (r.endDate || r.periodEnd || r.calendardate || '').slice(0,10)),
      title: { text: 'Period End' },
    },
    title: { text: 'Key Financials', align: 'left' },
    legend: { position: 'top' },
    tooltip: { y: { formatter: (val) => typeof val === 'number' ? val.toLocaleString() : '-' } },
  }), [financials, activeType]);

  const onMetricRowClick = (row) => {
    if (!row || !row.key) return;
    const key = row.key;
    setSelectedMetrics(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  };

  return (
    <div className="container py-3">
      <div className="row mb-3">
        <div className="col">
          <nav className="mb-2">
            <Link to={`/${ticker}`}>Summary</Link> |{' '}
            <Link to={`/${ticker}/financials`}>Financials</Link>
          </nav>
          <h1 className="h3 mb-0">{ticker} Financials</h1>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-auto">
              <label className="form-label d-block">Period</label>
              <div className="btn-group" role="group">
                {periodOptions.map(opt => (
                  <button key={opt.value} type="button" className={`btn btn-sm ${period === opt.value ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setPeriod(opt.value)}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="col-auto">
              <label htmlFor="yearsSelect" className="form-label">Range</label>
              <select id="yearsSelect" className="form-select form-select-sm" value={years} onChange={e => setYears(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                {yearOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'All Years' : `Last ${opt} Years`}</option>
                ))}
              </select>
            </div>
            <div className="col-auto ms-auto">
              <div className="btn-group" role="group">
                {statementTypes.map(type => (
                  <button key={type.value} type="button" className={`btn btn-sm ${activeType === type.value ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setActiveType(type.value)}>{type.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <ApexCharts options={barChartOptions} series={chartSeries} type="bar" height={320} />
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header">{statementTypes.find(s=>s.value===activeType)?.label}</div>
        <div className="card-body">
          {loading ? (
            <div>Loading...</div>
          ) : (
            (statementRows.length === 0) ? (
              <div>No data.</div>
            ) : (
              <Grid
                data={statementRows}
                columns={statementColumns.map(c => ({...c, header: c.header, footer: c.header}))}
                rowClassName={row => selectedMetrics.includes(row.key) ? 'table-primary' : ''}
                onRowClick={(row) => onMetricRowClick(row)}
                autoRowHeight
              />
            )
          )}
          <div className="form-text mt-2">Tip: Click a metric row to toggle it in the chart above.</div>
        </div>
      </div>
    </div>
  );
};

export default FinancialsPage;
