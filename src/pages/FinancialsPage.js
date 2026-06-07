import { useEffect, useMemo, useState } from 'react';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { useParams } from 'react-router-dom';
import TickerSubnav from '../components/TickerSubnav';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import DataGrid from '../components/DataGrid';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { signedHeatStyle } from '../utils/heatMap';
import { useTheme } from '../context/ThemeContext';
import { mergeApexOptions } from '../utils/chartTheme';

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
const reportOptions = [
  { label: 'As Reported', value: 'AR' },
  { label: 'Most Recent', value: 'MR' },
];

const METRICS_MAP = {
  income: [
    { key: 'revenue', label: 'Revenue', alt: ['revenueusd'] },
    { key: 'cor', label: 'Cost of Revenue', alt: ['costofrevenue'] },
    { key: 'gp', label: 'Gross Profit', alt: ['grossProfit'] },
    { key: 'opex', label: 'Operating Expenses', alt: ['operatingexpenses'] },
    { key: 'sgna', label: 'SG&A' },
    { key: 'rnd', label: 'R&D', alt: ['researchanddevelopment'] },
    { key: 'opinc', label: 'Operating Income', alt: ['operatingIncome'] },
    { key: 'ebit', label: 'EBIT' },
    { key: 'ebitda', label: 'EBITDA' },
    { key: 'netinc', label: 'Net Income', alt: ['netIncome', 'netinccmn'] },
    { key: 'eps', label: 'EPS' },
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

const FinancialsPage = () => {
  const { ticker } = useParams();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const handleAddToPortfolio = () => {
    if (!ticker) return;
    const notif = addToPortfolioWithNotification(ticker);
    showToast(notif.message, notif.type);
  };
  const [financials, setFinancials] = useState({ income: [], balanceSheet: [], cashFlow: [] });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('annual');
  const [years, setYears] = useState(5);
  const [report, setReport] = useState('AR');
  const [activeType, setActiveType] = useState('income');
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'gp', 'opinc', 'netinc']);
  const [hideEmptyRows, setHideEmptyRows] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchAll() {
      try {
        const tickers = Array.isArray(ticker) ? ticker : [ticker];
        const tickersStr = tickers.join(',');
        // Calculate gte date based on years variable
        let gteDate = '';
        if (years !== 'all' && years && typeof years === 'number') {
          const now = new Date();
          const past = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
          gteDate = past.toISOString().slice(0, 10);
        }
        // Build dimension param from reportOptions + periodOptions (e.g. ARY, MRQ, MRT, etc)
        let reportCode = report || 'AR';
        let periodCode = 'Y';
        if (period === 'annual') periodCode = 'Y';
        else if (period === 'quarterly') periodCode = 'Q';
        else if (period === 'ttm') periodCode = 'T';
        const dimensionParam = `${reportCode}${periodCode}`;
        const url = `${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&dimension=${dimensionParam}${gteDate ? `&gte=${gteDate}` : ''}`;
        const res = await axios.get(url);
        let rows = [];
        if (res.data && res.data.raw && res.data.raw.datatable && Array.isArray(res.data.raw.datatable.data)) {
        const columns = res.data.raw.datatable.columns || [];
          const colNames = columns.map(c => c.name);
          rows = res.data.raw.datatable.data.map(arr => {
            const obj = {};
            colNames.forEach((k, i) => { obj[k] = arr[i]; });
            return obj;
          });
        } else if (Array.isArray(res.data)) {
          rows = res.data;
        }
        if (!cancelled) setFinancials({ income: rows, balanceSheet: rows, cashFlow: rows });
      } catch (e) {
        if (!cancelled) setFinancials({ income: [], balanceSheet: [], cashFlow: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [ticker, period, years, report]);

  const safeNumber = (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  // Build rows and columns for DataGrid
  const data = useMemo(() => financials[activeType] || [], [financials, activeType]);
  const metrics = useMemo(() => METRICS_MAP[activeType] || [], [activeType]);
  const periods = useMemo(
    () => data.map(r => (r.calendardate || r.reportperiod || r.fiscalperiod || r.endDate || r.periodEnd || '').slice(0, 10)),
    [data],
  );
  const formatMetricValue = (val, key) => {
    if (val === '-' || val === null || val === undefined) return '-';
    if ([
      'revenue','cor','gp','opex','opinc','ebit','ebitda','netinc','assets','liabilities','equity','cashneq','debt','ppnenet','inventory','receivables','payables','workingcapital','ncfo','capex','fcf','ncfi','ncff','ncfdiv','ncfdebt','ncf','rnd','sgna','taxexp'
    ].includes(key)) {
      return formatUsd(val, 0);
    }
    if (['eps','sp','tbp','bp','ep','cfop','sfcfp'].includes(key)) {
      return formatDecimal(val, 2);
    }
    if (key.includes('margin') || key.includes('percent')) {
      return formatPercent(val, 2);
    }
    return formatDecimal(val, 2);
  };

  const columns = [
    {
      header: 'Metric',
      accessorKey: 'metric',
      cell: info => (
        <span style={{ whiteSpace: 'nowrap' }}>{info.row.original.metric}</span>
      ),
      enableSorting: false,
      size: 160,
    },
    ...periods.map((p, idx) => ({
      header: p || `P${idx + 1}`,
      accessorKey: `p${idx}`,
      cell: info => formatMetricValue(info.getValue(), info.row.original.key || ''),
      size: 120,
    })),
    ...(periods.length >= 2 ? [{
      header: 'YoY %',
      accessorKey: 'yoy',
      meta: { numeric: true },
      cellStyle: ({ row }) => signedHeatStyle(row.original?.yoy, 8),
      cell: info => {
        const val = info.getValue();
        return val == null || val === '-' ? '-' : formatPercent(val, 1);
      },
      size: 90,
    }] : []),
  ];
  // Rows: one per metric
  const tabRows = useMemo(() => {
    const built = metrics.map((m, rIdx) => {
      const row = { id: rIdx, metric: m.label, key: m.key };
      data.forEach((periodRow, idx) => {
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
      const current = row.p0;
      const prior = row.p1;
      if (typeof current === 'number' && typeof prior === 'number' && prior !== 0) {
        row.yoy = ((current - prior) / Math.abs(prior)) * 100;
      } else {
        row.yoy = null;
      }
      return row;
    });
    if (!hideEmptyRows) return built;
    return built.filter(row => periods.some((_, idx) => row[`p${idx}`] !== '-'));
  }, [metrics, data, periods, hideEmptyRows]);

  // Deduplicate selectedMetrics for chart
  const chartSeries = useMemo(() => {
    const data = financials[activeType] || [];
    const labelFor = (key) => {
      const m = (METRICS_MAP[activeType] || []).find(x => x.key === key);
      return m ? m.label : key;
    };
    const seriesArr = [];
    selectedMetrics.forEach(key => {
      const alt = (METRICS_MAP[activeType] || []).find(m => m.key === key)?.alt;
      const seriesData = data.map(r => {
        const altKey = alt ? alt.find(k => r[k] !== undefined && r[k] !== null) : undefined;
        return safeNumber(r[key] ?? (altKey ? r[altKey] : undefined)) ?? 0;
      });
      seriesArr.push({
        name: labelFor(key),
        data: seriesData
      });
    });
    return seriesArr;
  }, [selectedMetrics, activeType, financials]);
  // Chart width and scroll container for ApexCharts
  const chartWidth = Math.max(600, periods.length * 200); // 60px per bar, min 600px

  const barChartOptions = useMemo(() => mergeApexOptions({
    chart: {
      type: 'bar',
      stacked: false,
      zoom: { enabled: true, type: 'x', autoScaleYaxis: true }, // not working
      toolbar: { // not working
        show: true,
        tools: {
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
        autoSelected: 'zoom',
      },
      pan: { enabled: true, type: 'x', },
    },
    plotOptions: {
        bar: {
          columnWidth: '80%', // Make bars thinner to fit content
          barHeight: '70%',
          groupPadding: 0.02, // Reduce spacing between grouped bars
          barPadding: 2, // Reduce padding between bars
      }
    },
    xaxis: {
      categories: (financials[activeType] || []).map(r => (r.endDate || r.periodEnd || r.calendardate || '').slice(0, 10)),
      title: { text: 'Period End' },
    },
    title: { text: 'Key Financials', align: 'left' },
    legend: { position: 'top' },
    dataLabels: {
      enabled: true,
      formatter: (val) => {
        if (typeof val !== 'number' || isNaN(val)) return '';
        const absVal = Math.abs(val);
        let suffix = '';
        let divisor = 1;
        if (absVal >= 1e12) {
          suffix = 'T';
          divisor = 1e12;
        } else if (absVal >= 1e9) {
          suffix = 'B';
          divisor = 1e9;
        } else if (absVal >= 1e6) {
          suffix = 'M';
          divisor = 1e6;
        } else if (absVal >= 1e3) {
          suffix = 'K';
          divisor = 1e3;
        }
        const short = (val / divisor).toPrecision(3);
        return short + suffix;
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      followCursor: true,
      y: {
        formatter: (val) => {
          if (typeof val !== 'number' || isNaN(val)) return '-';
          const absVal = Math.abs(val);
          let suffix = '';
          let divisor = 1;
          if (absVal >= 1e12) {
            suffix = 'T';
            divisor = 1e12;
          } else if (absVal >= 1e9) {
            suffix = 'B';
            divisor = 1e9;
          } else if (absVal >= 1e6) {
            suffix = 'M';
            divisor = 1e6;
          } else if (absVal >= 1e3) {
            suffix = 'K';
            divisor = 1e3;
          }
          const short = (val / divisor).toPrecision(3);
          return short + suffix;
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => {
          if (typeof val !== 'number' || isNaN(val)) return '';
          const absVal = Math.abs(val);
          let suffix = '';
          let divisor = 1;
          if (absVal >= 1e12) {
            suffix = 'T';
            divisor = 1e12;
          } else if (absVal >= 1e9) {
            suffix = 'B';
            divisor = 1e9;
          } else if (absVal >= 1e6) {
            suffix = 'M';
            divisor = 1e6;
          } else if (absVal >= 1e3) {
            suffix = 'K';
            divisor = 1e3;
          }
          const short = (val / divisor).toPrecision(3);
          return short + suffix;
        }
      }
    }
  }), [financials, activeType, theme]);

  const onMetricRowClick = (row) => {
    const original = row?.original ?? row;
    if (!original || !original.key) return;
    const key = original.key;
    setSelectedMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
  <div className="container py-3">
      <TickerSubnav ticker={ticker} />
      <div className="row mb-1">
        <div className="col">
          <h1 className="h3 mb-0">{ticker} Financials</h1>
          <button
            type="button"
            className={`btn btn-sm ms-2 ${isInPortfolio(ticker) ? 'btn-outline-secondary' : 'btn-success'}`}
            onClick={handleAddToPortfolio}
            style={{ verticalAlign: 'middle' }}
          >
            {isInPortfolio(ticker) ? 'In Portfolio' : 'Add to Portfolio'}
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-1">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-auto">
              <label className="form-label d-block">Report</label>
              <div className="btn-group" role="group">
                {reportOptions.map(opt => (
                  <button key={opt.value} type="button" className={`btn btn-sm ${report === opt.value ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setReport(opt.value)}>{opt.label}</button>
                ))}
              </div>
            </div>
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
            <div className="col-auto">
              <label className="form-label d-block">&nbsp;</label>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hideEmptyRows"
                  checked={hideEmptyRows}
                  onChange={(e) => setHideEmptyRows(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="hideEmptyRows">Hide empty rows</label>
              </div>
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

      <div className="card shadow-sm mb-1">
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: chartWidth }}>
            <ApexCharts options={barChartOptions} series={chartSeries} type="bar" height={500} width={chartWidth} />
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header">{statementTypes.find(s => s.value === activeType)?.label}</div>
        <div className="card-body">
          <div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              (tabRows.length === 0) ? (
                <div>No data.</div>
              ) : (
                <DataGrid
                  data={tabRows}
                  columns={columns.map(col => ({
                    ...col,
                    cellStyle: { whiteSpace: 'nowrap' },
                  }))}
                  enableRowSelection={false}
                  enableSorting={false}
                  enableGlobalFilter={false}
                  onRowClick={onMetricRowClick}
                  rowSelection={undefined}
                  // Highlight selected metrics
                  getRowId={row => String(row.id)}
                  rowProps={row => ({
                    className: selectedMetrics.includes(row.key) ? 'table-primary' : '',
                  })}
                />
              )
            )}
            <div className="form-text mt-2">Tip: Click a metric row to toggle it in the chart above.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialsPage;
