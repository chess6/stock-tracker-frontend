import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import StSpinner from '../components/StSpinner';
import API_ENDPOINTS from '../apiConfig';
import { getPortfolio, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';

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

function snippet(text, maxLen = 140) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length <= maxLen ? clean : `${clean.slice(0, maxLen)}…`;
}

function sentimentBadge(label) {
  if (!label || label === 'neutral') return null;
  const cls = label === 'positive' ? 'st-badge-positive' : label === 'negative' ? 'st-badge-negative' : 'st-badge-muted';
  return <span className={`st-badge ${cls} ms-2`}>{label}</span>;
}

function matchStrategyLabel(strategy) {
  const labels = {
    cashtag: '$',
    headline_ticker: 'headline',
    alias: 'alias',
    company_name: 'name',
    company_alias: 'alias',
  };
  return labels[strategy] || strategy;
}

function tickerMatchBadge(match) {
  const strategy = match.matchStrategy || 'ticker';
  const confidence = match.confidence != null ? `${Math.round(match.confidence * 100)}%` : '';
  const title = `${match.ticker}: ${strategy}${confidence ? ` (${confidence})` : ''}`;
  const cls = strategy === 'cashtag' || strategy === 'headline_ticker' ? 'st-badge-blue' : 'st-badge-muted';
  return (
    <Link key={`${match.ticker}-${strategy}`} to={`/${match.ticker}`} title={title}>
      <span className={`st-badge ${cls} me-1`}>
        {match.ticker}
        <span className="opacity-75 ms-1">{matchStrategyLabel(strategy)}</span>
      </span>
    </Link>
  );
}

export default function NewsPage() {
  const [searchParams] = useSearchParams();
  const initialTickers = useMemo(
    () => (searchParams.get('tickers') || '').split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
    [searchParams],
  );
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [portfolioOnly, setPortfolioOnly] = useState(initialTickers.length > 0);
  const [appliedFilters, setAppliedFilters] = useState({
    q: '',
    category: '',
    sourceDomain: '',
    tickers: initialTickers.join(','),
    portfolioOnly: initialTickers.length > 0,
  });

  const [portfolioTickers, setPortfolioTickers] = useState(() => getPortfolio());

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioTickers(getPortfolio()));
    const sync = () => setPortfolioTickers(getPortfolio());
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
  }, []);

  const loadNews = useCallback(async (nextOffset, filters) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: nextOffset };
      if (filters.q) params.q = filters.q;
      if (filters.category) params.category = filters.category;
      if (filters.sourceDomain) params.sourceDomain = filters.sourceDomain;
      if (filters.portfolioOnly && portfolioTickers.length > 0) {
        params.tickers = portfolioTickers.join(',');
      } else if (filters.tickers) {
        params.tickers = filters.tickers;
      }
      const res = await axios.get(API_ENDPOINTS.NEWS_FEED, { params });
      const raw = res.data?.articles || [];
      setArticles([...raw].sort((a, b) => {
        const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return db - da;
      }));
      setTotal(res.data?.total || 0);
      setOffset(nextOffset);
    } catch (err) {
      setArticles([]);
      setTotal(0);
      setError(err?.response?.data?.error || 'Failed to load news feed');
    } finally {
      setLoading(false);
    }
  }, [portfolioTickers]);

  useEffect(() => {
    loadNews(0, appliedFilters);
  }, [appliedFilters, loadNews]);

  const applyFilters = (e) => {
    e.preventDefault();
    setAppliedFilters({
      q: q.trim(),
      category,
      sourceDomain: sourceDomain.trim(),
      tickers: initialTickers.join(','),
      portfolioOnly,
    });
  };

  const clearFilters = () => {
    setQ('');
    setCategory('');
    setSourceDomain('');
    setPortfolioOnly(false);
    setAppliedFilters({ q: '', category: '', sourceDomain: '', tickers: '', portfolioOnly: false });
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + articles.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="st-page st-page--constrained">
      <div className="st-page-header">
        <div className="st-page-header-title">
          <h1 className="st-page-heading">News</h1>
          <div className="st-page-subtitle">
            Unique articles from ingested RSS feeds, deduplicated by URL and near-duplicate titles.
          </div>
        </div>
        <div className="st-page-header-actions">
          <Link to="/admin" className="st-btn-ghost st-link-btn">Ingest feeds in Admin</Link>
        </div>
      </div>

      <form onSubmit={applyFilters} className="st-panel">
        <div className="st-panel-body">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
              <label htmlFor="newsSearch" className="st-label">Search</label>
              <input
                id="newsSearch"
                type="search"
                className="st-input"
                placeholder="Title or summary…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
          </div>
          <div className="col-md-3">
              <label htmlFor="newsCategory" className="st-label">Category</label>
              <select
                id="newsCategory"
                className="st-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>{item.label}</option>
                ))}
              </select>
          </div>
          <div className="col-md-3">
              <label htmlFor="newsSource" className="st-label">Source domain</label>
              <input
                id="newsSource"
                type="text"
                className="st-input"
                placeholder="e.g. bbc.co.uk"
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
              />
          </div>
          <div className="col-md-2">
              <div className="form-check mt-0">
              <input
                type="checkbox"
                className="form-check-input"
                id="portfolioOnlyNews"
                checked={portfolioOnly}
                onChange={(e) => setPortfolioOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="portfolioOnlyNews">Portfolio only</label>
              </div>
          </div>
          <div className="col-md-2 d-flex gap-2 align-items-end">
            <button type="submit" className="st-btn-primary">Apply</button>
            <button type="button" className="st-btn-ghost" onClick={clearFilters}>Clear</button>
          </div>
        </div>
        </div>
      </form>

      {error && <div className="st-alert-danger">{error}</div>}

      {loading ? (
        <div className="st-spinner-wrap"><StSpinner /> Loading news…</div>
      ) : articles.length === 0 ? (
        <div className="st-alert-secondary">
          No articles found. Run <strong>Ingest Default Feeds</strong> from the{' '}
          <Link to="/admin">Admin</Link> console to populate the feed.
        </div>
      ) : (
        <>
          <div className="text-muted small mb-1">
            Showing {pageStart}–{pageEnd} of {total}
          </div>
          <div className="list-group news-feed">
            {articles.map((item) => (
              <div key={item.id} className="list-group-item list-group-item-action list-group-item-compact news-feed-item flex-column align-items-start">
                <div className="d-flex w-100 justify-content-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fw-semibold st-link-muted text-decoration-none"
                  >
                    {item.title}
                    {sentimentBadge(item.sentimentLabel)}
                  </a>
                  <small className="text-muted text-nowrap">{formatPublished(item.publishedDate)}</small>
                </div>
                <div className="news-feed-meta text-muted">{item.sourceDomain || 'Unknown source'}</div>
                {item.description && <div className="small text-secondary news-snippet">{snippet(item.description)}</div>}
                {(item.tickerMatches?.length > 0 || item.tickers?.length > 0) && (
                  <div className="mt-1 d-flex flex-wrap gap-1">
                    {(item.tickerMatches?.length ? item.tickerMatches : item.tickers.map((ticker) => ({ ticker }))).map((match) => (
                      item.tickerMatches?.length
                        ? tickerMatchBadge(match)
                        : (
                          <Link key={match.ticker} to={`/${match.ticker}`}>
                            <span className="st-badge st-badge-muted me-1">{match.ticker}</span>
                          </Link>
                        )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="st-btn-ghost"
              disabled={!hasPrev}
              onClick={() => loadNews(Math.max(0, offset - PAGE_SIZE), appliedFilters)}
            >
              Previous
            </button>
            <button
              type="button"
              className="st-btn-ghost"
              disabled={!hasNext}
              onClick={() => loadNews(offset + PAGE_SIZE, appliedFilters)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
