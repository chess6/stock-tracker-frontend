import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, CardTitle, Button, Nav } from 'reactstrap';

const SummaryPage = () => {
  const { ticker } = useParams();
  const [prices, setPrices] = useState([]); // summary endpoint
  const [intraday, setIntraday] = useState([]); // intraday endpoint
  const [news, setNews] = useState([]);
  const [range, setRange] = useState('1Y');
  const [latestClose, setLatestClose] = useState(null);
  const [prevClose, setPrevClose] = useState(null);
  const [tickerMeta, setTickerMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [summaryRes, intradayRes, newsRes, changeRes] = await Promise.allSettled([
          axios.get(API_ENDPOINTS.SUMMARY(ticker)),
          axios.get(API_ENDPOINTS.INTRADAY(ticker)),
          axios.get(API_ENDPOINTS.NEWS(ticker)),
          axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: ticker } }),
        ]);
        if (!cancelled) {
          if (summaryRes.status === 'fulfilled') {
            setPrices(summaryRes.value.data.prices || []);
          } else {
            setPrices([]);
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
          }
          if (newsRes.status === 'fulfilled') {
            setNews(newsRes.value.data || []);
          } else {
            setNews([]);
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
        }
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


  return (
    <Container className="py-3">
      <Row className="mb-4">
        <Nav>
          <Link to={`/${ticker}`}>Summary</Link> |{' '}
          <Link to={`/${ticker}/financials`}>Financials</Link>
        </Nav>
        <Col md={8} className="mx-auto">
          <Card className="shadow-sm p-3">
            <CardBody>
              <CardTitle tag="h3" className="mb-1">{tickerMeta?.name || ticker} Summary</CardTitle>
              {tickerMeta && (
                <div className="mb-2" style={{ fontSize: 13, color: '#444' }}>
                  <div><strong>Exchange:</strong> {tickerMeta.exchange}</div>
                  <div><strong>Category:</strong> {tickerMeta.category}</div>
                  <div><strong>Sector:</strong> {tickerMeta.sector}</div>
                  <div><strong>Industry:</strong> {tickerMeta.industry}</div>
                  <div><strong>Location:</strong> {tickerMeta.location}</div>
                  <div><strong>Currency:</strong> {tickerMeta.currency}</div>
                  <div><strong>Market Cap Scale:</strong> {tickerMeta.scalemarketcap}</div>
                  <div><strong>Revenue Scale:</strong> {tickerMeta.scalerevenue}</div>
                  <div><strong>First Added:</strong> {tickerMeta.firstadded}</div>
                  <div><strong>First Price Date:</strong> {tickerMeta.firstpricedate}</div>
                  <div><strong>Last Price Date:</strong> {tickerMeta.lastpricedate}</div>
                  <div><strong>SEC Filings:</strong> <a href={tickerMeta.secfilings} target="_blank" rel="noopener noreferrer">Link</a></div>
                  <div><strong>Company Site:</strong> <a href={tickerMeta.companysite} target="_blank" rel="noopener noreferrer">{tickerMeta.companysite}</a></div>
                </div>
              )}
              <div className="mb-1" style={{ fontSize: 14, color: '#666' }}>
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
                  <span style={{ marginLeft: 12, color: changeInfo.up ? '#0a7' : '#d33' }}>
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
    </Container>
  );
};

export default SummaryPage;
