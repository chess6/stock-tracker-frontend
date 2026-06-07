import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Badge, Card, CardBody, Col, Container, Row, Spinner, Table } from 'reactstrap';
import API_ENDPOINTS from '../apiConfig';
import { getPortfolio, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';
import { signedHeatStyle } from '../utils/heatMap';
import { formatDecimal, formatPercent, formatUsd } from '../utils/formatters';

const GROUP_ORDER = ['indices', 'commodities', 'rates', 'risk', 'industries'];
const GROUP_LABELS = {
  indices: 'Indices',
  commodities: 'Commodities',
  rates: 'Rates',
  risk: 'Risk',
  industries: 'Industries',
};

export default function DashboardPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolioTickers, setPortfolioTickers] = useState(() => getPortfolio());
  const [portfolioRows, setPortfolioRows] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const portfolioTickersKey = useMemo(() => portfolioTickers.join(','), [portfolioTickers]);

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioTickers(getPortfolio()));
    const sync = () => setPortfolioTickers(getPortfolio());
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(API_ENDPOINTS.MACRO_SNAPSHOT);
        if (!cancelled) {
          setItems(res.data?.items || []);
          setMeta(res.data?.meta || {});
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err?.response?.data?.error || 'Failed to load macro snapshot');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const portfolioList = portfolioTickersKey ? portfolioTickersKey.split(',') : [];
    if (!portfolioList.length) {
      setPortfolioRows((prev) => (prev.length ? [] : prev));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setPortfolioLoading(true);
      try {
        const tickers = portfolioTickersKey;
        const [topRes, changeRes] = await Promise.allSettled([
          axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers } }),
          axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers } }),
        ]);
        const quotes = topRes.status === 'fulfilled' ? (topRes.value.data?.quotes || {}) : {};
        const changes = changeRes.status === 'fulfilled' ? (changeRes.value.data?.changes || {}) : {};
        const built = portfolioList.map((ticker) => {
          const q = quotes[ticker] || {};
          const ch = changes[ticker] || {};
          const lastVal = [q.last, q.tngoLast, ch.todayClose].find((v) => v != null && !Number.isNaN(Number(v)));
          const price = lastVal != null ? Number(lastVal) : null;
          let change = null;
          if (ch.todayClose != null && ch.prevClose != null && ch.prevClose !== 0) {
            change = ((Number(ch.todayClose) - Number(ch.prevClose)) / Number(ch.prevClose)) * 100;
          }
          return {
            ticker,
            name: q.name || null,
            price,
            change,
            sector: q.sector || null,
          };
        });
        if (!cancelled) setPortfolioRows(built);
      } catch {
        if (!cancelled) setPortfolioRows([]);
      } finally {
        if (!cancelled) setPortfolioLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [portfolioTickersKey]);

  const grouped = useMemo(() => {
    const map = {};
    GROUP_ORDER.forEach((group) => { map[group] = []; });
    items.forEach((item) => {
      map[item.group] = map[item.group] || [];
      map[item.group].push(item);
    });
    return GROUP_ORDER.map((group) => ({
      id: group,
      label: GROUP_LABELS[group] || group,
      items: map[group] || [],
    })).filter((section) => section.items.length > 0);
  }, [items]);

  const unavailableCount = meta?.unavailable ?? items.filter((item) => !item.available).length;

  return (
    <Container className="py-3">
      <Row className="mb-3">
        <Col>
          <h1 className="h3 mb-1">Dashboard</h1>
          <div className="text-muted">
            terminal-style macro context: indices, commodities, rates, and sector ETFs.
          </div>
        </Col>
      </Row>

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Your Portfolio</h2>
          <Link to="/" className="small">Open full portfolio →</Link>
        </div>
        {portfolioTickers.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            No tickers in your portfolio yet.{' '}
            <Link to="/screener">Browse the screener</Link> or search above to add symbols.
          </div>
        ) : portfolioLoading ? (
          <div className="text-muted py-2"><Spinner size="sm" /> Loading portfolio quotes…</div>
        ) : (
          <div className="table-responsive">
            <Table size="sm" bordered hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">D% Ch</th>
                  <th>Sector</th>
                </tr>
              </thead>
              <tbody>
                {portfolioRows.map((row) => (
                  <tr key={row.ticker}>
                    <td><Link to={`/${row.ticker}`} className="fw-semibold">{row.ticker}</Link></td>
                    <td className="small text-muted">{row.name || '—'}</td>
                    <td className="text-end">{row.price != null ? formatUsd(row.price) : '—'}</td>
                    <td className="text-end" style={signedHeatStyle(row.change, 5)}>
                      {row.change != null ? formatPercent(row.change, 2) : '—'}
                    </td>
                    <td className="small">{row.sector || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-5"><Spinner /> Loading macro data…</div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="alert alert-secondary">Macro data unavailable. Ensure yfinance can reach market data sources.</div>
      )}

      {!loading && unavailableCount > 0 && (
        <div className="alert alert-warning py-2 small mb-3">
          {unavailableCount} of {items.length} macro symbols could not be quoted (shown as —). Market data may be delayed or blocked for some tickers.
        </div>
      )}

      {grouped.map((section) => (
        <div key={section.id} className="mb-4">
          <h2 className="h5 mb-2">{section.label}</h2>
          <Row className="g-3">
            {section.items.map((item) => (
              <Col key={item.id} xs={12} sm={6} md={4} lg={3}>
                <Card className={`h-100 shadow-sm border-0 ${item.available === false ? 'opacity-75' : ''}`}>
                  <CardBody
                    className="py-3"
                    style={item.available !== false ? signedHeatStyle(item.changePct, 5) : undefined}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold">{item.label}</div>
                        <div className="text-muted small">{item.symbol}</div>
                      </div>
                      {item.available !== false && item.changePct != null ? (
                        <span className="badge rounded-pill border border-current">{formatPercent(item.changePct, 2)}</span>
                      ) : (
                        <Badge color="secondary" pill>—</Badge>
                      )}
                    </div>
                    <div className="mt-2 fs-5 fw-bold">
                      {item.price != null ? formatDecimal(item.price, 2) : '—'}
                    </div>
                    {item.available === false && (
                      <div className="text-muted small mt-1">Quote unavailable</div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      {meta?.source && (
        <div className="text-muted small">
          Source: {meta.source}
          {meta.total != null && ` · ${meta.total} symbols`}
        </div>
      )}
    </Container>
  );
}
