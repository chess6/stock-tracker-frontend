import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import StSpinner from '../components/StSpinner';
import API_ENDPOINTS from '../apiConfig';
import { getPortfolio, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';
import { tickerFinancialsUrl } from '../utils/tickerLinks';

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
    <Link key={`${match.ticker}-${strategy}`} to={tickerFinancialsUrl(match.ticker)} title={title}>
      <span className={`st-badge ${cls} me-1`}>
        {match.ticker}
        <span className="opacity-75 ms-1">{matchStrategyLabel(strategy)}</span>
      </span>
    </Link>
  );
}

function formatEventType(value) {
  if (!value) return 'event';
  return String(value).replace(/_/g, ' ');
}

function formatSentiment(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const num = Number(value);
  const label = num > 0.05 ? 'positive' : num < -0.05 ? 'negative' : 'neutral';
  return { num, label };
}

const SORT_OPTIONS = [
  { value: 'importance', label: 'Top ranked' },
  { value: 'latest', label: 'Latest first' },
];

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadMoreSentinelRef = useRef(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [portfolioOnly, setPortfolioOnly] = useState(false);
  const [divergenceOnly, setDivergenceOnly] = useState(false);
  const [clusterView, setClusterView] = useState(false);
  const [sort, setSort] = useState('importance');
  const [tickerFilter, setTickerFilter] = useState(initialTickers.join(',') || '');
  const [clusters, setClusters] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({
    q: '',
    category: '',
    sourceDomain: '',
    tickers: initialTickers.join(','),
    portfolioOnly: false,
    divergenceOnly: false,
    clusterView: false,
    sort: 'importance',
  });

  const [portfolioTickers, setPortfolioTickers] = useState(() => getPortfolio());
  const [sourceDomainOptions, setSourceDomainOptions] = useState([]);

  const tickerOptions = useMemo(() => {
    const merged = new Set([...portfolioTickers, ...initialTickers]);
    return [...merged].sort();
  }, [portfolioTickers, initialTickers]);

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioTickers(getPortfolio()));
    const sync = () => setPortfolioTickers(getPortfolio());
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    axios.get(API_ENDPOINTS.NEWS_SOURCE_DOMAINS)
      .then((res) => {
        if (cancelled) return;
        const domains = Array.isArray(res.data?.domains) ? res.data.domains : [];
        setSourceDomainOptions(domains.filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setSourceDomainOptions([]);
      });
    return () => { cancelled = true; };
  }, []);

  const loadClusters = useCallback(async (nextOffset, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const res = await axios.get(API_ENDPOINTS.NEWS_CLUSTERS, {
        params: { limit: PAGE_SIZE, offset: nextOffset, hours: 72 },
      });
      const newClusters = res.data?.clusters || [];
      setClusters((prev) => append ? [...prev, ...newClusters] : newClusters);
      setTotal(res.data?.total || 0);
      setOffset(nextOffset);
      setArticles([]);
    } catch (err) {
      if (!append) {
        setClusters([]);
        setTotal(0);
      }
      setError(err?.response?.data?.error || 'Failed to load news clusters');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadNews = useCallback(async (nextOffset, filters, append = false) => {
    if (filters.clusterView) {
      await loadClusters(nextOffset, append);
      return;
    }
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: nextOffset };
      if (filters.q) params.q = filters.q;
      if (filters.category) params.category = filters.category;
      if (filters.sourceDomain) params.sourceDomain = filters.sourceDomain;
      if (filters.divergenceOnly) params.divergenceOnly = true;
      if (filters.sort && filters.sort !== 'importance') params.sort = filters.sort;
      if (filters.portfolioOnly && portfolioTickers.length > 0) {
        params.tickers = portfolioTickers.join(',');
      } else if (filters.tickers) {
        params.tickers = filters.tickers;
      }
      const res = await axios.get(API_ENDPOINTS.NEWS_FEED, { params });
      const newArticles = res.data?.articles || [];
      setArticles((prev) => append ? [...prev, ...newArticles] : newArticles);
      setClusters([]);
      setTotal(res.data?.total || 0);
      setOffset(nextOffset);
    } catch (err) {
      if (!append) {
        setArticles([]);
        setClusters([]);
        setTotal(0);
      }
      setError(err?.response?.data?.error || 'Failed to load news feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [portfolioTickers, loadClusters]);

  useEffect(() => {
    loadNews(0, appliedFilters, false);
  }, [appliedFilters, loadNews]);

  const loadedCount = appliedFilters.clusterView ? clusters.length : articles.length;
  const hasMore = loadedCount < total;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    loadNews(loadedCount, appliedFilters, true);
  }, [loading, loadingMore, hasMore, loadedCount, appliedFilters, loadNews]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMore || loading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: '200px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore, loadedCount]);

  const applyFilters = (e) => {
    e.preventDefault();
    const normalizedTicker = tickerFilter.trim().toUpperCase();
    const usePortfolioOnly = portfolioOnly && !normalizedTicker;
    setAppliedFilters({
      q: q.trim(),
      category,
      sourceDomain: sourceDomain.trim(),
      tickers: normalizedTicker,
      portfolioOnly: usePortfolioOnly,
      divergenceOnly,
      clusterView,
      sort,
    });
  };

  const clearFilters = () => {
    setQ('');
    setCategory('');
    setSourceDomain('');
    setTickerFilter('');
    setPortfolioOnly(false);
    setDivergenceOnly(false);
    setClusterView(false);
    setSort('importance');
    setAppliedFilters({
      q: '',
      category: '',
      sourceDomain: '',
      tickers: '',
      portfolioOnly: false,
      divergenceOnly: false,
      clusterView: false,
      sort: 'importance',
    });
  };

  const pageStart = total === 0 ? 0 : 1;
  const pageEnd = loadedCount;

  return (
    <div className="st-page st-page--constrained news-page">
      <div className="st-page-header">
        <div className="st-page-header-title">
          <h1 className="st-page-heading">News</h1>
          <div className="st-page-subtitle">
            {appliedFilters.clusterView
              ? 'Event clusters group related stories across sources (last 72 hours).'
              : 'Unique articles from ingested RSS feeds, deduplicated by URL and near-duplicate titles.'}
          </div>
        </div>
        <div className="st-page-header-actions">
          <Link to="/admin" className="st-btn-ghost st-link-btn">Ingest feeds in Admin</Link>
        </div>
      </div>

      <div className="news-page-layout">
        <aside className="news-page-sidebar">
          <form onSubmit={applyFilters} className="st-panel news-page-filters">
            <div className="st-panel-header">Search &amp; filters</div>
            <div className="st-panel-body news-page-filters-body">
              <label htmlFor="newsSearch" className="st-label">Search</label>
              <input
                id="newsSearch"
                type="search"
                className="st-input"
                placeholder="Title or summary…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <div className="news-page-filter-row">
                <div className="news-page-filter-field">
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
                <div className="news-page-filter-field">
                  <label htmlFor="newsTicker" className="st-label">Ticker</label>
                  <input
                    id="newsTicker"
                    type="text"
                    className="st-input"
                    list="news-ticker-options"
                    placeholder="All tickers"
                    value={tickerFilter}
                    onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
                    disabled={clusterView || portfolioOnly}
                    aria-label="Filter news by ticker"
                  />
                  <datalist id="news-ticker-options">
                    {tickerOptions.map((ticker) => (
                      <option key={ticker} value={ticker} />
                    ))}
                  </datalist>
                </div>
              </div>

              <label htmlFor="newsSource" className="st-label">Source domain</label>
              <input
                id="newsSource"
                type="text"
                className="st-input"
                list="news-source-domain-options"
                placeholder="All sources"
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
                aria-label="Filter news by source domain"
              />
              <datalist id="news-source-domain-options">
                {sourceDomainOptions.map((domain) => (
                  <option key={domain} value={domain} />
                ))}
              </datalist>

              <label htmlFor="newsSort" className="st-label">Sort</label>
              <select
                id="newsSort"
                className="st-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                disabled={clusterView}
              >
                {SORT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <div className="news-page-checks">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="clusterViewNews"
                    checked={clusterView}
                    onChange={(e) => setClusterView(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="clusterViewNews">Cluster view</label>
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="divergenceOnlyNews"
                    checked={divergenceOnly}
                    onChange={(e) => setDivergenceOnly(e.target.checked)}
                    disabled={clusterView}
                  />
                  <label className="form-check-label" htmlFor="divergenceOnlyNews">Narrative drift</label>
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="portfolioOnlyNews"
                    checked={portfolioOnly}
                    onChange={(e) => {
                      setPortfolioOnly(e.target.checked);
                      if (e.target.checked) setTickerFilter('');
                    }}
                    disabled={clusterView}
                  />
                  <label className="form-check-label" htmlFor="portfolioOnlyNews">Portfolio only</label>
                </div>
              </div>

              <div className="news-page-filter-actions d-flex gap-2">
                <button type="submit" className="st-btn-primary">Apply</button>
                <button type="button" className="st-btn-ghost" onClick={clearFilters}>Clear</button>
              </div>
            </div>
          </form>
        </aside>

        <div className="news-page-main">
      {error && <div className="st-alert-danger">{error}</div>}

      {loading ? (
        <div className="st-spinner-wrap"><StSpinner /> Loading news…</div>
      ) : appliedFilters.clusterView ? (
        clusters.length === 0 ? (
          <div className="st-alert-secondary">
            No event clusters yet. Run ingest and enrichment so articles can be grouped by event.
          </div>
        ) : (
          <>
            <div className="text-muted small mb-1">
              Showing {pageStart}–{pageEnd} of {total} clusters
            </div>
            <div className="list-group news-feed">
              {clusters.map((cluster) => {
                const sentiment = formatSentiment(cluster.consensusSentiment);
                return (
                  <div key={cluster.id} className="list-group-item list-group-item-compact news-feed-item flex-column align-items-start">
                    <div className="d-flex w-100 justify-content-between gap-2 align-items-start">
                      <div>
                        <div className="fw-semibold">{cluster.headline || formatEventType(cluster.eventType)}</div>
                        <div className="news-feed-meta text-muted mt-1">
                          <span className="st-badge st-badge-muted me-1">{formatEventType(cluster.eventType)}</span>
                          <span className="me-2">{cluster.sourceCount} source{cluster.sourceCount === 1 ? '' : 's'}</span>
                          <span className="me-2">{cluster.articleCount} article{cluster.articleCount === 1 ? '' : 's'}</span>
                          {sentiment && (
                            <span className={`st-badge ${sentiment.label === 'positive' ? 'st-badge-positive' : sentiment.label === 'negative' ? 'st-badge-negative' : 'st-badge-muted'}`}>
                              consensus {sentiment.num.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {cluster.sourceDomains?.length > 0 && (
                          <div className="small text-secondary mt-1">
                            {cluster.sourceDomains.join(' · ')}
                          </div>
                        )}
                      </div>
                      <small className="text-muted text-nowrap">{formatPublished(cluster.lastSeenAt)}</small>
                    </div>
                    {cluster.articles?.length > 0 && (
                      <div className="mt-2 ps-2 border-start">
                        {cluster.articles.map((article) => (
                          <div key={article.id} className="small py-1">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="st-link-muted text-decoration-none"
                            >
                              {article.title}
                            </a>
                            <span className="text-muted ms-2">
                              {article.sourceDomain}
                              {article.newsImportanceScore != null && (
                                <span> · {Number(article.newsImportanceScore).toFixed(2)}</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div
                ref={loadMoreSentinelRef}
                className="text-center text-muted small py-2"
              >
                {loadingMore ? 'Loading more…' : 'Scroll for more…'}
              </div>
            )}
          </>
        )
      ) : articles.length === 0 ? (
        <div className="st-alert-secondary">
          No articles found. Run <strong>Ingest Default Feeds</strong> from the{' '}
          <Link to="/admin">Admin</Link> console to populate the feed.
        </div>
      ) : (
        <>
          <div className="text-muted small mb-1">
            Showing {pageStart}–{pageEnd} of {total}
            {appliedFilters.sort === 'latest' && ' · sorted by publish date'}
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
                <div className="news-feed-meta text-muted">
                  {item.sourceDomain || 'Unknown source'}
                  {item.newsImportanceScore != null && (
                    <span className="ms-2">· score {Number(item.newsImportanceScore).toFixed(2)}</span>
                  )}
                  {item.divergenceContext && (
                    <span className="ms-2 st-badge st-badge-muted">{item.divergenceContext}</span>
                  )}
                  {item.eventClusterId && (
                    <span className="ms-2">· cluster #{item.eventClusterId}</span>
                  )}
                </div>
                {item.description && <div className="small text-secondary news-snippet">{snippet(item.description)}</div>}
                {(item.tickerMatches?.length > 0 || item.tickers?.length > 0) && (
                  <div className="mt-1 d-flex flex-wrap gap-1">
                    {(item.tickerMatches?.length ? item.tickerMatches : item.tickers.map((ticker) => ({ ticker }))).map((match) => (
                      item.tickerMatches?.length
                        ? tickerMatchBadge(match)
                        : (
                          <Link key={match.ticker} to={tickerFinancialsUrl(match.ticker)}>
                            <span className="st-badge st-badge-muted me-1">{match.ticker}</span>
                          </Link>
                        )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <div
              ref={loadMoreSentinelRef}
              className="text-center text-muted small py-2"
            >
              {loadingMore ? 'Loading more…' : 'Scroll for more…'}
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
}
