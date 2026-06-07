import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { Container, Row, Col, Card, CardBody, CardTitle, Button, Spinner } from 'reactstrap';
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
            setNews(newsRes.value.data || []);
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
      <Container className="py-5 text-center text-muted">
        <Spinner size="sm" className="me-2" /> Loading {ticker}…
      </Container>
    );
  }

  return (
    <Container className="py-3">
      {loadError && <div className="alert alert-warning">{loadError}</div>}
      <TickerSubnav ticker={ticker} />
      <Row className="mb-4">
        <Col md={8} className="mx-auto">
          <Card className="shadow-sm p-3">
            <CardBody>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <CardTitle tag="h3" className="mb-0">{tickerMeta?.name || ticker} Summary</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  color={isInPortfolio(ticker) ? 'outline-secondary' : 'success'}
                  onClick={handleAddToPortfolio}
                >
                  {isInPortfolio(ticker) ? 'In Portfolio' : 'Add to Portfolio'}
                </Button>
              </div>
              {metaFields.length > 0 && (
                <div className="mb-2 small text-muted">
                  {metaFields.map(([label, value]) => (
                    <div key={label}><strong>{label}:</strong> {value}</div>
                  ))}
                  {(tickerMeta?.sec_filings_url || tickerMeta?.secfilings) && (
                    <div><strong>SEC Filings:</strong> <a href={tickerMeta.sec_filings_url || tickerMeta.secfilings} target="_blank" rel="noopener noreferrer">Link</a></div>
                  )}
                  {(tickerMeta?.company_site || tickerMeta?.companysite) && (
                    <div><strong>Company Site:</strong> <a href={tickerMeta.company_site || tickerMeta.companysite} target="_blank" rel="noopener noreferrer">{tickerMeta.company_site || tickerMeta.companysite}</a></div>
                  )}
                </div>
              )}
              <div className="mb-1 text-muted">
                {latestClose != null && (
                  <span>
                    Latest Close: <strong>${latestClose.toFixed(2)}</strong>
                  </span>
                )}
                {prevClose != null && (
                  <span style={{ marginLeft: 12 }}>
                    Prev Close: <strong>${prevClose.toFixed(2)}</strong>
                  </span>
                )}
                {changeInfo && (
                  <span className={changeInfo.up ? 'st-change-up' : 'st-change-down'} style={{ marginLeft: 12 }}>
                    {changeInfo.up ? '+' : ''}{changeInfo.diff.toFixed(2)} ({changeInfo.up ? '+' : ''}{changeInfo.pct.toFixed(2)}%)
                  </span>
                )}
              </div>
              <div className="mb-1">
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('1D')}>1D</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('5D')}>5D</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('1M')}>1M</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('3M')}>3M</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('6M')}>6M</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('YTD')}>YTD</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('1Y')}>1Y</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('5Y')}>5Y</Button>
                <Button size="sm" color="secondary" className="me-2" onClick={() => setRange('MAX')}>MAX</Button>
              </div>
              <ApexCharts options={chartOptions} series={chartSeries} type="line" height={300} />
            </CardBody>
          </Card>
        </Col>
      </Row>
      <h3>News Feed</h3>
      <ul className="list-unstyled">
        {news.length === 0 && <li className="text-muted">No news found.</li>}
        {news.map((item, idx) => (
          <li key={idx} className="mb-3">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-primary fw-semibold text-decoration-none">
              {item.title}
            </a>
            <div className="small text-muted">{item.publishedDate ? item.publishedDate.slice(0, 10) : ''}</div>
            {item.description && <div className="small text-secondary">{item.description}</div>}
          </li>
        ))}
      </ul>
    </Container>
  );
};

export default SummaryPage;
