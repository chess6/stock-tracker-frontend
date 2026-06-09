import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import BootstrapPipeline from '../components/BootstrapPipeline';
import { getPortfolio, getPortfolioTickersCsv, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';
import { formatFreshnessTimestamp, isStale, summarizeFreshness } from '../utils/dataFreshness';
import { useToast } from '../context/ToastContext';
import { clearScreener } from '../store';

const DEFAULT_TICKERS = 'AAPL,MSFT,NVDA,AMD,GOOGL,AMZN,META,TSLA';

const FRESHNESS_THRESHOLDS = {
  companiesUpdatedAt: 168,
  fundamentalsUpdatedAt: 168,
  companyScoresUpdatedAt: 168,
  feedsLastPolledAt: 12,
  pricesUpdatedAt: 36,
  insidersUpdatedAt: 168,
  insiderClustersUpdatedAt: 168,
  latestArticleFetchedAt: 12,
};

function initialTickersField() {
  return getPortfolioTickersCsv() || DEFAULT_TICKERS;
}

function resolveTickersForRequest(fieldValue) {
  const trimmed = fieldValue.trim();
  if (trimmed) return trimmed;
  return getPortfolioTickersCsv() || DEFAULT_TICKERS;
}

function formatDate(value) {
  return formatFreshnessTimestamp(value);
}

function staleClass(value, maxAgeHours) {
  return isStale(value, maxAgeHours) ? 'text-warning fw-semibold' : '';
}

export default function AdminConsolePage() {
  const [status, setStatus] = useState({ counts: {}, freshness: {}, feeds: [], jobs: {}, recentJobRuns: [] });
  const [feeds, setFeeds] = useState([]);
  const [tickers, setTickers] = useState(initialTickersField);
  const [portfolioCount, setPortfolioCount] = useState(() => getPortfolio().length);
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState('');
  const { showToast } = useToast();
  const dispatch = useDispatch();

  const tickersQuery = () => encodeURIComponent(resolveTickersForRequest(tickers));
  const resolvedTickersCsv = useMemo(() => resolveTickersForRequest(tickers), [tickers]);
  const freshnessSummary = useMemo(
    () => summarizeFreshness(status.freshness || {}, status.coverage || {}),
    [status.freshness, status.coverage],
  );

  const loadStatus = async () => {
    const [statusRes, feedsRes] = await Promise.all([
      axios.get(API_ENDPOINTS.ADMIN_STATUS),
      axios.get(API_ENDPOINTS.ADMIN_DEFAULT_FEEDS),
    ]);
    setStatus(statusRes.data || { counts: {}, freshness: {}, feeds: [], jobs: {}, recentJobRuns: [] });
    setFeeds(feedsRes.data?.feeds || []);
  };

  useEffect(() => {
    loadStatus().catch(() => {
      setMessage('Failed to load admin status');
    });
  }, []);

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioCount(getPortfolio().length));
    const syncPortfolio = () => setPortfolioCount(getPortfolio().length);
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, syncPortfolio);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, syncPortfolio);
  }, []);

  const runAction = async (action, request) => {
    setBusyAction(action);
    setMessage('');
    try {
      const response = await request();
      await loadStatus();
      const successText = typeof response.data === 'object' ? `${action} complete` : String(response.data);
      setMessage(successText);
      showToast(successText, 'success', 5000);
      dispatch(clearScreener());
    } catch (error) {
      const errorText = error?.response?.data?.error || `${action} failed`;
      setMessage(errorText);
      showToast(errorText, 'danger', 6000);
    } finally {
      setBusyAction(null);
    }
  };

  const feedHealthRows = status.feeds?.length ? status.feeds : [];

  return (
    <div className="st-page">
      <div className="row mb-3">
        <div className="col">
          <h1 className="h3 mb-1">Admin Console</h1>
          <div className="text-muted">
            Manage local cache bootstrap, fundamentals refreshes, and default RSS ingestion.
            {' '}<Link to="/columns">Column reference</Link> (legacy fundamentals field glossary).
          </div>
        </div>
      </div>

      {freshnessSummary.stale && (
        <div className="alert alert-warning" role="alert">
          Cache is stale: {freshnessSummary.reasons.join(', ')}. Run bootstrap or the relevant refresh action below.
        </div>
      )}

      {message && (
        <div className={`alert ${message.includes('failed') ? 'alert-danger' : 'alert-info'}`} role="alert">
          {message}
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-lg-8">
              <label className="form-label">Tickers to refresh</label>
              <input
                className="form-control"
                value={tickers}
                onChange={e => setTickers(e.target.value)}
                placeholder="AAPL,MSFT,NVDA"
              />
              <div className="form-text">
                {portfolioCount > 0
                  ? `Pre-filled from portfolio (${portfolioCount} ticker${portfolioCount === 1 ? '' : 's'}). Clear the field to still use portfolio on bootstrap.`
                  : 'Portfolio empty — using default tickers unless you enter symbols.'}
              </div>
            </div>
            <div className="col-lg-4 d-flex gap-2 flex-wrap">
              {portfolioCount > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setTickers(getPortfolioTickersCsv());
                    setPortfolioCount(getPortfolio().length);
                  }}
                >
                  Use portfolio
                </button>
              )}
              <button
                className="btn btn-outline-secondary"
                disabled={busyAction !== null}
                onClick={() => loadStatus()}
              >
                Refresh Status
              </button>
            </div>
          </div>
          <BootstrapPipeline
            tickersCsv={resolvedTickersCsv}
            disabled={busyAction !== null}
            showToast={showToast}
            onComplete={async (stepResults) => {
              await loadStatus();
              dispatch(clearScreener());
              const errors = Object.entries(stepResults)
                .filter(([, result]) => result.status === 'error')
                .map(([id, result]) => `${id}: ${result.error}`);
              if (errors.length) {
                setMessage(`Pipeline errors — ${errors.join('; ')}`);
              } else {
                setMessage('Pipeline complete');
              }
            }}
          />
          <div className="d-flex gap-2 flex-wrap mt-3 pt-3 border-top">
            <span className="align-self-center small text-muted me-1">Individual actions:</span>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Company sync', () => axios.post(API_ENDPOINTS.ADMIN_SYNC_COMPANIES))}
            >
              {busyAction === 'Company sync' ? 'Running...' : 'Sync Companies'}
            </button>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Fundamentals refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_FUNDAMENTALS}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Fundamentals refresh' ? 'Running...' : 'Refresh Fundamentals'}
            </button>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Feed ingest', () => axios.post(API_ENDPOINTS.ADMIN_INGEST_DEFAULT_FEEDS))}
            >
              {busyAction === 'Feed ingest' ? 'Running...' : 'Ingest Default Feeds'}
            </button>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Price refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_PRICES}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Price refresh' ? 'Running...' : 'Refresh Prices'}
            </button>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Insider refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_INSIDERS}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Insider refresh' ? 'Running...' : 'Refresh Insiders'}
            </button>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Enrich metadata', () => axios.post(`${API_ENDPOINTS.ADMIN_ENRICH_METADATA}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Enrich metadata' ? 'Running...' : 'Enrich Metadata'}
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={busyAction !== null}
              onClick={() => runAction('Enrich all missing metadata', () => axios.post(`${API_ENDPOINTS.ADMIN_ENRICH_METADATA}?all=true`))}
            >
              {busyAction === 'Enrich all missing metadata' ? 'Running...' : 'Enrich All Missing'}
            </button>
            <button
              className="btn btn-outline-warning"
              disabled={busyAction !== null}
              onClick={() => runAction('Article dedup', () => axios.post(API_ENDPOINTS.ADMIN_DEDUP_ARTICLES))}
            >
              {busyAction === 'Article dedup' ? 'Running...' : 'Dedup Articles'}
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={busyAction !== null}
              onClick={() => runAction('Queue RSS poll', () => axios.post(API_ENDPOINTS.ADMIN_ENQUEUE_JOB, {
                job_type: 'ingest_default_feeds',
                payload: { force_refresh: true },
              }))}
            >
              {busyAction === 'Queue RSS poll' ? 'Running...' : 'Queue RSS Poll'}
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">Counts</h2>
              <ul className="mb-0">
                <li>Companies: {status.counts?.companies ?? 0}</li>
                <li>Feeds: {status.counts?.feeds ?? 0}</li>
                <li>Articles: {status.counts?.articles ?? 0}</li>
                <li>Fundamentals: {status.counts?.fundamentals ?? 0}</li>
                <li>Prices: {status.counts?.prices ?? 0}</li>
                <li>Insider transactions: {status.counts?.insider_transactions ?? 0}</li>
                <li>Jobs queued: {status.jobs?.queued ?? 0}</li>
                <li>Jobs running: {status.jobs?.running ?? 0}</li>
                <li className={status.jobs?.failed > 0 ? 'text-danger fw-semibold' : ''}>
                  Jobs failed: {status.jobs?.failed ?? 0}
                </li>
                <li className={(status.coverage?.companiesMissingMetadata || 0) > 0 ? 'text-warning fw-semibold' : ''}>
                  Missing sector/industry: {status.coverage?.companiesMissingMetadata ?? 0}
                </li>
                <li>
                  Articles with market reactions: {status.coverage?.articlesWithMarketReactions ?? 0}
                  {' '}/ linked: {status.coverage?.linkedArticles ?? 0}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">Freshness</h2>
              <ul className="mb-0">
                <li className={staleClass(status.freshness?.companiesUpdatedAt, FRESHNESS_THRESHOLDS.companiesUpdatedAt)}>
                  Companies updated: {formatDate(status.freshness?.companiesUpdatedAt)}
                </li>
                <li className={staleClass(status.freshness?.fundamentalsUpdatedAt, FRESHNESS_THRESHOLDS.fundamentalsUpdatedAt)}>
                  Fundamentals updated: {formatDate(status.freshness?.fundamentalsUpdatedAt)}
                </li>
                <li className={staleClass(status.freshness?.feedsLastPolledAt, FRESHNESS_THRESHOLDS.feedsLastPolledAt)}>
                  Feeds last polled: {formatDate(status.freshness?.feedsLastPolledAt)}
                </li>
                <li className={staleClass(status.freshness?.pricesUpdatedAt, FRESHNESS_THRESHOLDS.pricesUpdatedAt)}>
                  Prices updated: {formatDate(status.freshness?.pricesUpdatedAt)}
                </li>
                <li className={staleClass(status.freshness?.insidersUpdatedAt, FRESHNESS_THRESHOLDS.insidersUpdatedAt)}>
                  Insiders updated: {formatDate(status.freshness?.insidersUpdatedAt)}
                </li>
                <li className={staleClass(status.freshness?.companyScoresUpdatedAt, FRESHNESS_THRESHOLDS.companyScoresUpdatedAt)}>
                  Company scores updated: {formatDate(status.freshness?.companyScoresUpdatedAt)}
                </li>
                <li className={staleClass(status.freshness?.insiderClustersUpdatedAt, FRESHNESS_THRESHOLDS.insiderClustersUpdatedAt)}>
                  Insider clusters updated: {formatDate(status.freshness?.insiderClustersUpdatedAt)}
                </li>
                <li>Latest article published: {formatDate(status.freshness?.latestArticlePublishedAt)}</li>
                <li className={staleClass(status.freshness?.latestArticleFetchedAt, FRESHNESS_THRESHOLDS.latestArticleFetchedAt)}>
                  Latest article fetched: {formatDate(status.freshness?.latestArticleFetchedAt)}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h2 className="h5">Feed Health</h2>
          {feedHealthRows.length === 0 ? (
            <div className="text-muted small">No feed poll history yet. Run ingest to populate health data.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Last polled</th>
                    <th>Last success</th>
                    <th>Failures</th>
                    <th>Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {feedHealthRows.map((feed) => (
                    <tr key={feed.feed_url} className={feed.consecutive_failures > 0 ? 'table-warning' : ''}>
                      <td>{feed.name}</td>
                      <td>{feed.category}</td>
                      <td>{formatDate(feed.last_polled_at)}</td>
                      <td>{formatDate(feed.last_success_at)}</td>
                      <td>{feed.consecutive_failures ?? 0}</td>
                      <td className="small text-danger">{feed.last_error_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h2 className="h5">Recent Job Runs</h2>
          {(status.recentJobRuns || []).length === 0 ? (
            <div className="text-muted small">No completed job runs yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Finished</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentJobRuns.map((run) => (
                    <tr key={run.id} className={run.status === 'error' || run.status === 'failed' ? 'table-warning' : ''}>
                      <td>{run.job_type} #{run.job_id}</td>
                      <td>{run.status}</td>
                      <td>{formatDate(run.finished_at)}</td>
                      <td className="small text-danger">{run.error_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h2 className="h5">Default RSS Feeds</h2>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map(feed => (
                  <tr key={feed.feed_url}>
                    <td>{feed.name}</td>
                    <td>{feed.category}</td>
                    <td><a href={feed.feed_url} target="_blank" rel="noopener noreferrer">{feed.feed_url}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
