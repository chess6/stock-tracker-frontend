import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

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

  useEffect(() => {
    setLoading(true);
    async function fetchAll() {
      const types = ['income', 'balanceSheet', 'cashFlow'];
      const data = {};
      for (const type of types) {
  const res = await axios.get(`${API_ENDPOINTS.FINANCIALS(ticker)}?type=${type}&period=${period}&limit=${years === 'all' ? 100 : years}`);
        data[type] = res.data;
      }
      setFinancials(data);
      setLoading(false);
    }
    fetchAll();
  }, [ticker, period, years]);

  // Bar chart data for key metrics (income statement)
  const barChartFields = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'grossProfit', label: 'Gross Profit' },
    { key: 'operatingIncome', label: 'Operating Income' },
    { key: 'pretaxIncome', label: 'Pretax Income' },
  ];
  const barChartSeries = barChartFields.map(field => ({
    name: field.label,
    data: (financials.income || []).map(row => row[field.key] || 0),
  }));
  const barChartOptions = {
    chart: { type: 'bar', stacked: false },
    xaxis: {
      categories: (financials.income || []).map(row => row.endDate ? row.endDate.slice(0, 10) : ''),
      title: { text: 'Period End' },
    },
    title: { text: 'Key Financials', align: 'left' },
    legend: { position: 'top' },
  };

  // Render table for a statement type
  function renderTable(type) {
    const rows = financials[type] || [];
    if (!rows.length) return <div>No data.</div>;
    const keys = Object.keys(rows[0]).filter(k => k !== 'ticker' && k !== 'periodType');
    return (
      <table style={{ width: '100%', marginBottom: 32, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {keys.map(key => (
              <th key={key} style={{ border: '1px solid #ccc', padding: 4 }}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {keys.map(key => (
                <td key={key} style={{ border: '1px solid #ccc', padding: 4 }}>{row[key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      {/* Sidebar with summary info (reuse from summary if needed) */}
      <div style={{ minWidth: 200 }}>
        <nav>
          <Link to={`/${ticker}`}>Summary</Link> |{' '}
          <Link to={`/${ticker}/financials`}>Financials</Link>
        </nav>
        <h2>{ticker}</h2>
        {/* Add more summary info here if desired */}
      </div>
      <div style={{ flex: 1 }}>
        <h1>Financials</h1>
        <div style={{ marginBottom: 16 }}>
          {periodOptions.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{ fontWeight: period === opt.value ? 'bold' : 'normal', marginRight: 8 }}>{opt.label}</button>
          ))}
          {yearOptions.map(opt => (
            <button key={opt} onClick={() => setYears(opt)} style={{ fontWeight: years === opt ? 'bold' : 'normal', marginRight: 8 }}>{opt === 'all' ? 'All Years' : `Last ${opt}`}</button>
          ))}
        </div>
        <div style={{ marginBottom: 24 }}>
          <ApexCharts options={barChartOptions} series={barChartSeries} type="bar" height={320} />
        </div>
        <div style={{ marginBottom: 16 }}>
          {statementTypes.map(type => (
            <button key={type.value} onClick={() => setActiveType(type.value)} style={{ fontWeight: activeType === type.value ? 'bold' : 'normal', marginRight: 8 }}>{type.label}</button>
          ))}
        </div>
        {loading ? <div>Loading...</div> : renderTable(activeType)}
      </div>
    </div>
  );
};

export default FinancialsPage;
