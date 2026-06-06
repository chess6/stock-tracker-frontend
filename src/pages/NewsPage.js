import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Badge, Button, Col, Container, Form, FormGroup, Input, Label, Row, Spinner } from 'reactstrap';
import API_ENDPOINTS from '../apiConfig';

const PAGE_SIZE = 50;

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'finance', label: 'Finance' },
  { value: 'tech', label: 'Tech' },
  { value: 'semis', label: 'Semiconductors' },
  { value: 'security', label: 'Security' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'community', label: 'Community' },
];

function formatPublished(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 16) : date.toLocaleString();
}

function snippet(text, maxLen = 220) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length <= maxLen ? clean : `${clean.slice(0, maxLen)}…`;
}

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ q: '', category: '', sourceDomain: '' });

  const loadNews = useCallback(async (nextOffset, filters) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: nextOffset };
      if (filters.q) params.q = filters.q;
      if (filters.category) params.category = filters.category;
      if (filters.sourceDomain) params.sourceDomain = filters.sourceDomain;
      const res = await axios.get(API_ENDPOINTS.NEWS_FEED, { params });
      setArticles(res.data?.articles || []);
      setTotal(res.data?.total || 0);
      setOffset(nextOffset);
    } catch (err) {
      setArticles([]);
      setTotal(0);
      setError(err?.response?.data?.error || 'Failed to load news feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews(0, appliedFilters);
  }, [appliedFilters, loadNews]);

  const applyFilters = (e) => {
    e.preventDefault();
    setAppliedFilters({ q: q.trim(), category, sourceDomain: sourceDomain.trim() });
  };

  const clearFilters = () => {
    setQ('');
    setCategory('');
    setSourceDomain('');
    setAppliedFilters({ q: '', category: '', sourceDomain: '' });
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + articles.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <Container className="py-3">
      <Row className="mb-3 align-items-end">
        <Col>
          <h1 className="h3 mb-1">News</h1>
          <div className="text-muted">
            Unique articles from ingested RSS feeds, deduplicated by URL and near-duplicate titles.
          </div>
        </Col>
        <Col xs="auto">
          <Link to="/admin" className="btn btn-sm btn-outline-secondary">Ingest feeds in Admin</Link>
        </Col>
      </Row>

      <Form onSubmit={applyFilters} className="mb-3 p-3 border rounded bg-light">
        <Row className="g-2 align-items-end">
          <Col md={4}>
            <FormGroup>
              <Label for="newsSearch" className="small mb-1">Search</Label>
              <Input
                id="newsSearch"
                type="search"
                placeholder="Title or summary…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <Label for="newsCategory" className="small mb-1">Category</Label>
              <Input
                id="newsCategory"
                type="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>{item.label}</option>
                ))}
              </Input>
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <Label for="newsSource" className="small mb-1">Source domain</Label>
              <Input
                id="newsSource"
                type="text"
                placeholder="e.g. bbc.co.uk"
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col md={2} className="d-flex gap-2">
            <Button color="primary" type="submit" size="sm">Apply</Button>
            <Button color="secondary" type="button" size="sm" outline onClick={clearFilters}>Clear</Button>
          </Col>
        </Row>
      </Form>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5"><Spinner /> Loading news…</div>
      ) : articles.length === 0 ? (
        <div className="alert alert-secondary">
          No articles found. Run <strong>Ingest Default Feeds</strong> from the{' '}
          <Link to="/admin">Admin</Link> console to populate the feed.
        </div>
      ) : (
        <>
          <div className="text-muted small mb-2">
            Showing {pageStart}–{pageEnd} of {total}
          </div>
          <div className="list-group mb-3">
            {articles.map((item) => (
              <div key={item.id} className="list-group-item list-group-item-action flex-column align-items-start py-3">
                <div className="d-flex w-100 justify-content-between gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fw-semibold text-decoration-none"
                  >
                    {item.title}
                  </a>
                  <small className="text-muted text-nowrap">{formatPublished(item.publishedDate)}</small>
                </div>
                <div className="small text-muted mb-1">{item.sourceDomain || 'Unknown source'}</div>
                {item.description && <div className="small text-secondary">{snippet(item.description)}</div>}
                {item.tickers?.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {item.tickers.map((ticker) => (
                      <Link key={ticker} to={`/${ticker}`}>
                        <Badge color="dark" pill className="me-1">{ticker}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-between">
            <Button
              color="secondary"
              size="sm"
              outline
              disabled={!hasPrev}
              onClick={() => loadNews(Math.max(0, offset - PAGE_SIZE), appliedFilters)}
            >
              Previous
            </Button>
            <Button
              color="secondary"
              size="sm"
              outline
              disabled={!hasNext}
              onClick={() => loadNews(offset + PAGE_SIZE, appliedFilters)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </Container>
  );
}
