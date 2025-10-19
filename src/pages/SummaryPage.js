import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

const SummaryPage = () => {
  const { ticker } = useParams();
  const [prices, setPrices] = useState([]); // summary endpoint
  const [intraday, setIntraday] = useState([]); // intraday endpoint
  const [prevClose, setPrevClose] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('1Y');

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    async function fetchAll() {
      try {
        // Fetch summary (historical)
        const summaryResp = await axios.get(API_ENDPOINTS.SUMMARY(ticker));
        if (!cancelled) setPrices(summaryResp.data.prices || []);
        // Fetch intraday (for 1D/5D)
        const intradayResp = await axios.get(API_ENDPOINTS.INTRADAY(ticker));
        if (!cancelled) {
          setIntraday((intradayResp.data.intraday || []).map(point => {
            const value = point && point.close !== undefined ? Number(point.close) : Number(point?.last);
            return {
              date: point.date || point.time || '',
              close: Number.isNaN(value) ? null : value,
            };
          }).filter(p => p.close !== null));
          const prev = intradayResp.data.prevClose;
          if (prev !== null && prev !== undefined) {
            const parsedPrev = Number(prev);
            setPrevClose(Number.isNaN(parsedPrev) ? null : parsedPrev);
          } else {
            setPrevClose(null);
          }
        }
        // Fetch news
        const newsResp = await axios.get(API_ENDPOINTS.NEWS(ticker));
        if (!cancelled) setNews(newsResp.data || []);
      } catch (e) {
        if (!cancelled) {
          setPrices([]);
          setIntraday([]);
          setPrevClose(null);
          setNews([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [ticker]);


  // Memoized filtered prices for chart, updates on range/intraday/prices change
  const filteredPrices = useMemo(() => {
    const now = new Date();
    let fromDate;
    if (range === '1D') {
      // Use all intraday points for 1D
      return intraday && intraday.length > 0 ? intraday : [];
    }
    if (range === '5D') {
      // Use intraday, but downsample to match 1D tick count
      if (!intraday || intraday.length === 0) return [];
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 5);
      const fiveDay = intraday.filter(p => {
        if (!p.date) return false;
        const d = new Date(p.date);
        return d >= fromDate;
      });
      // Downsample to match 1D tick count (use 1D tick count as base)
      const oneDayTicks = intraday.length;
      if (fiveDay.length <= oneDayTicks) return fiveDay;
      const step = Math.floor(fiveDay.length / oneDayTicks);
      return fiveDay.filter((_, idx) => idx % step === 0);
    }
    // All other ranges use summary prices
    if (!prices || prices.length === 0) return [];
    switch (range) {
      case '1M':
        fromDate = new Date(now);
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        fromDate = new Date(now);
        fromDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        fromDate = new Date(now);
        fromDate.setMonth(now.getMonth() - 6);
        break;
      case 'YTD':
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        fromDate = new Date(now);
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2Y':
        fromDate = new Date(now);
        fromDate.setFullYear(now.getFullYear() - 2);
        break;
      case '5Y':
        fromDate = new Date(now);
        fromDate.setFullYear(now.getFullYear() - 5);
        break;
      case '10Y':
        fromDate = new Date(now);
        fromDate.setFullYear(now.getFullYear() - 10);
        break;
      case 'ALL':
      default:
        return prices;
    }
    return prices.filter(p => {
      if (!p.date) return false;
      const d = new Date(p.date);
      return d >= fromDate;
    });
  }, [range, intraday, prices]);

  const rangeOptions = [
    { label: '1D', value: '1D' },
    { label: '5D', value: '5D' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: '2Y', value: '2Y' },
    { label: '5Y', value: '5Y' },
    { label: '10Y', value: '10Y' },
    { label: 'ALL', value: 'ALL' },
  ];


  const chartOptions = {
    chart: { id: 'price-line' },
    xaxis: {
      categories: filteredPrices.map(p => p.date ? p.date.slice(0, 16) : ''),
      title: { text: 'Date' },
      labels: { rotate: -45, hideOverlappingLabels: true },
    },
    yaxis: { title: { text: 'Price' } },
    title: { text: `${ticker} Price History`, align: 'left' },
  };
  const chartSeries = [
    {
      name: 'Close',
      data: filteredPrices.map(p => p.close),
    },
  ];

  return (
    <div>
      <nav>
        <Link to={`/${ticker}`}>Summary</Link> |{' '}
        <Link to={`/${ticker}/financials`}>Financials</Link>
      </nav>
      <h1>Summary for {ticker}</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              {rangeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  style={{
                    margin: '0 4px',
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: range === opt.value ? '2px solid #007bff' : '1px solid #ccc',
                    background: range === opt.value ? '#e9f5ff' : '#fff',
                    color: range === opt.value ? '#007bff' : '#333',
                    fontWeight: range === opt.value ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <ApexCharts options={chartOptions} series={chartSeries} type="line" height={320} />
          </div>
          <h2>News Feed</h2>
          <ul>
            {news.length === 0 && <li>No news found.</li>}
            {news.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 12 }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                <div style={{ color: '#888', fontSize: 12 }}>{item.publishedDate ? item.publishedDate.slice(0, 10) : ''}</div>
                <div>{item.description}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SummaryPage;
