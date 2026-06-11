import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import StSpinner from '../components/StSpinner';
import TickerSubnav from '../components/TickerSubnav';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { mergeApexOptions } from '../utils/chartTheme';

const SummaryPage = () => {
  const { ticker } = useParams();
  const [prices, setPrices] = useState([]); // summary endpoint
  const [intraday, setIntraday] = useState([]); // intraday endpoint
  const [news, setNews] = useState([]);
  const [range, setRange] = useState('1Y');
  const [latestClose, setLatestClose] = useState(null);
  const [prevClose, setPrevClose] = useState(null);
  const [tickerMeta, setTickerMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { showToast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setLoadError('');
      try {
        const [summaryRes, intradayRes, newsRes, changeRes] = await Promise.allSettled([
          axios.get(API_ENDPOINTS.SUMMARY(ticker)),
          axios.get(API_ENDPOINTS.INTRADAY(ticker)),
          axios.get(API_ENDPOINTS.NEWS(ticker)),
          axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: ticker } }),
        ]);
        if (!cancelled) {
          const failures = [];
          if (summaryRes.status === 'fulfilled') {
            setPrices(summaryRes.value.data.prices || []);
          } else {
            setPrices([]);
            failures.push('price history');
          }
          if (intradayRes.status === 'fulfilled') {
            const data = intradayRes.value.data;
            const intradayArr = (data.intraday || [])
              .map(point => {
                const value = point && point.close !== undefined ? Number(point.close) : Number(point?.last);
                return {
                  date: point.date || point.time || '',
                  close: Number.isNaN(value) ? null : value,
                };
              })
              .filter(p => p.close !== null);
            setIntraday(intradayArr);
            setTickerMeta(data.tickerMeta || null);
          } else {
            setIntraday([]);
            setTickerMeta(null);
            failures.push('intraday quote');
          }
          if (newsRes.status === 'fulfilled') {
            const raw = newsRes.value.data || [];
            setNews([...raw].sort((a, b) => {
              const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
              const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
              return db - da;
            }));
          } else {
            setNews([]);
            failures.push('news');
          }
          if (changeRes.status === 'fulfilled') {
            const changes = (changeRes.value.data && changeRes.value.data.changes) || {};
            const info = changes[ticker] || {};
            const prev = info.prevClose;
            const today = info.todayClose;
            setPrevClose(prev != null && !Number.isNaN(Number(prev)) ? Number(prev) : null);
            setLatestClose(today != null && !Number.isNaN(Number(today)) ? Number(today) : null);
          } else {
            setPrevClose(null);
            setLatestClose(null);
            failures.push('daily change');
          }
          if (failures.length) {
            setLoadError(`Some data could not be loaded (${failures.join(', ')}). Try Admin → Refresh Prices.`);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPrices([]);
          setIntraday([]);
          setNews([]);
          setPrevClose(null);
          setLatestClose(null);
          setTickerMeta(null);
          setLoadError('Failed to load ticker data. Check that the backend is running.');
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
      return intraday && intraday.length > 0 ? intraday : [];
    }
    if (range === '5D') {
      if (!intraday || intraday.length === 0) return [];
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 5);
      const fiveDay = intraday.filter(p => {
        if (!p.date) return false;
        const d = new Date(p.date);
        return d >= fromDate;
      });
      const oneDayTicks = intraday.length;
      if (fiveDay.length <= oneDayTicks) return fiveDay;
      const step = Math.floor(fiveDay.length / oneDayTicks);
      return fiveDay.filter((_, idx) => idx % step === 0);
    }
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


  const chartOptions = useMemo(() => mergeApexOptions({
    chart: { id: 'price-line' },
    xaxis: {
      categories: filteredPrices.map(p => p.date ? p.date.slice(0, 16) : ''),
      title: { text: 'Date' },
      labels: { rotate: -45, hideOverlappingLabels: true },
    },
    yaxis: { title: { text: 'Price' } },
    title: { text: `${ticker} Price History`, align: 'left' },
    theme: { mode: theme },
  }), [filteredPrices, ticker, theme]);
  const chartSeries = [
    {
      name: 'Close',
      data: filteredPrices.map(p => p.close),
    },
  ];

  const changeInfo = useMemo(() => {
    if (latestClose == null || prevClose == null || prevClose === 0) return null;
    const diff = latestClose - prevClose;
    const pct = (diff / prevClose) * 100;
    return {
      diff,
      pct,
      up: diff >= 0,
    };
  }, [latestClose, prevClose]);


  const metaFields = [
    ['Exchange', tickerMeta?.exchange],
    ['Sector', tickerMeta?.sector],
    ['Industry', tickerMeta?.industry],
    ['Location', tickerMeta?.location],
    ['Currency', tickerMeta?.currency],
  ].filter(([, value]) => value);

  const handleAddToPortfolio = () => {
    const notif = addToPortfolioWithNotification(ticker);
    showToast(notif.message, notif.type);
  };

  if (loading) {
    return (
      <div className="st-page st-spinner-wrap">
        <StSpinner size="sm" /> Loading {ticker}…
      </div>
    );
  }

  return (
    <div className="st-page st-page--split-wide">
      {loadError && <div className="st-alert-warn">{loadError}</div>}
      <TickerSubnav ticker={ticker} />
      <div className="summary-layout">
      <div className="st-panel">
        <div className="st-panel-body">
          <div className="st-page-header">
            <div className="st-page-header-title">
              <h1 className="st-page-heading">{tickerMeta?.name || ticker} Summary</h1>
            </div>
            <div className="st-page-header-actions">
              <button
                type="button"
                className={isInPortfolio(ticker) ? 'st-btn-success-outline' : 'st-btn-success'}
                onClick={handleAddToPortfolio}
              >
                {isInPortfolio(ticker) ? 'In Portfolio' : 'Add to Portfolio'}
              </button>
            </div>
          </div>
          {metaFields.length > 0 && (
            <div className="summary-meta-strip">
              {metaFields.map(([label, value]) => (
                <span key={label}><strong>{label}:</strong> {value}</span>
              ))}
              {(tickerMeta?.sec_filings_url || tickerMeta?.secfilings) && (
                <span>
                  <strong>SEC:</strong>{' '}
                  <a href={tickerMeta.sec_filings_url || tickerMeta.secfilings} target="_blank" rel="noopener noreferrer" className="st-link-muted">Filings</a>
                </span>
              )}
              {(tickerMeta?.company_site || tickerMeta?.companysite) && (
                <span>
                  <strong>Site:</strong>{' '}
                  <a href={tickerMeta.company_site || tickerMeta.companysite} target="_blank" rel="noopener noreferrer" className="st-link-muted">
                    {tickerMeta.company_site || tickerMeta.companysite}
                  </a>
                </span>
              )}
            </div>
          )}
          <div className="summary-meta-strip">
            {latestClose != null && (
              <span>
                Latest: <strong className="st-num">${latestClose.toFixed(2)}</strong>
              </span>
            )}
            {prevClose != null && (
              <span>
                Prev: <strong className="st-num">${prevClose.toFixed(2)}</strong>
              </span>
            )}
            {changeInfo && (
              <span className={changeInfo.up ? 'st-change-up' : 'st-change-down'}>
                {changeInfo.up ? '+' : ''}{changeInfo.diff.toFixed(2)} ({changeInfo.up ? '+' : ''}{changeInfo.pct.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="mb-1 st-segment">
            {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'MAX'].map((r) => (
              <button
                key={r}
                type="button"
                className={`st-segment-btn ${range === r ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="summary-chart-plot">
            <ApexCharts options={chartOptions} series={chartSeries} type="line" height={200} />
          </div>
        </div>
      </div>
      <div className="st-panel">
        <div className="st-panel-header">News Feed</div>
        <div className="st-panel-body">
          <ul className="summary-news-list">
            {news.length === 0 && <li className="st-muted-note">No news found.</li>}
            {news.map((item, idx) => (
              <li key={idx} className="summary-news-item">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="st-link-muted fw-semibold text-decoration-none">
                  {item.title}
                </a>
                <div className="small st-muted-note">{item.publishedDate ? item.publishedDate.slice(0, 10) : ''}</div>
                {item.description && <div className="small st-muted-note news-snippet">{item.description}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SummaryPage;
