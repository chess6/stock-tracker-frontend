import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Badge, Card, CardBody, Col, Container, Row, Spinner } from 'reactstrap';
import API_ENDPOINTS from '../apiConfig';
import { signedHeatStyle } from '../utils/heatMap';
import { formatDecimal, formatPercent } from '../utils/formatters';

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

  const grouped = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      map[item.group] = map[item.group] || [];
      map[item.group].push(item);
    });
    return GROUP_ORDER.filter((group) => map[group]?.length).map((group) => ({
      id: group,
      label: GROUP_LABELS[group] || group,
      items: map[group],
    }));
  }, [items]);

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

      {loading && (
        <div className="text-center py-5"><Spinner /> Loading macro data…</div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="alert alert-secondary">Macro data unavailable. Ensure yfinance can reach market data sources.</div>
      )}

      {grouped.map((section) => (
        <div key={section.id} className="mb-4">
          <h2 className="h5 mb-2">{section.label}</h2>
          <Row className="g-3">
            {section.items.map((item) => (
              <Col key={item.id} xs={12} sm={6} md={4} lg={3}>
                <Card className="h-100 shadow-sm border-0">
                  <CardBody
                    className="py-3"
                    style={signedHeatStyle(item.changePct, 5)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold">{item.label}</div>
                        <div className="text-muted small">{item.symbol}</div>
                      </div>
                      <Badge color="dark" pill>{formatPercent(item.changePct, 2)}</Badge>
                    </div>
                    <div className="mt-2 fs-5 fw-bold">{formatDecimal(item.price, 2)}</div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      {meta?.source && (
        <div className="text-muted small">Source: {meta.source}</div>
      )}
    </Container>
  );
}
