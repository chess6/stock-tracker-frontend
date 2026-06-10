import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import BootstrapPipeline from '../components/BootstrapPipeline';
import { getPortfolio, getPortfolioTickersCsv, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';
import { formatFreshnessTimestamp, FRESHNESS_THRESHOLDS, isStale, summarizeFreshness } from '../utils/dataFreshness';
import { useToast } from '../context/ToastContext';
import { clearScreener } from '../store';
import { fetchSp500Tickers, queueSp500InsiderRefresh, staticSp500Meta } from '../utils/adminSp500';
import './admin.css';

const DEFAULT_TICKERS = 'AAPL,MSFT,NVDA,AMD,GOOGL,AMZN,META,TSLA';

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
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [feeds, setFeeds] = useState([]);
  const [tickers, setTickers] = useState(initialTickersField);
  const [portfolioCount, setPortfolioCount] = useState(() => getPortfolio().length);
  const [busyAction, setBusyAction] = useState(null);
  const [sp500Meta, setSp500Meta] = useState(null);
  const { showToast } = useToast();
  const staleToastKeyRef = useRef(null);
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
    setStatusLoaded(true);
  };

  useEffect(() => {
    loadStatus().catch(() => {
      showToast('Failed to load admin status', 'danger', 6000);
    });
    axios.get(API_ENDPOINTS.ADMIN_UNIVERSES)
      .then((res) => {
        const match = (res.data?.universes || []).find((item) => item.id === 'sp500');
        setSp500Meta(match || staticSp500Meta());
      })
      .catch(() => setSp500Meta(staticSp500Meta()));
  }, [showToast]);

  useEffect(() => {
    if (!statusLoaded || !freshnessSummary.stale) return;
    const key = freshnessSummary.reasons.join('|');
    if (staleToastKeyRef.current === key) return;
    staleToastKeyRef.current = key;
    showToast(
      `Cache is stale: ${freshnessSummary.reasons.join(', ')}. Run bootstrap or the relevant refresh action below.`,
      'warning',
      8000,
    );
  }, [freshnessSummary.reasons, freshnessSummary.stale, showToast, statusLoaded]);

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioCount(getPortfolio().length));
    const syncPortfolio = () => setPortfolioCount(getPortfolio().length);
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, syncPortfolio);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, syncPortfolio);
  }, []);

  const loadSp500Tickers = async () => {
    setBusyAction('Load S&P 500');
    try {
      const symbols = await fetchSp500Tickers();
      setTickers(symbols.join(','));
      showToast(`Loaded ${symbols.length} S&P 500 tickers into the refresh field.`, 'success', 5000);
    } catch (error) {
      const errorText = error?.response?.data?.error || error?.message || 'Failed to load S&P 500 tickers';
      showToast(errorText, 'danger', 6000);
    } finally {
      setBusyAction(null);
    }
  };

  const runAction = async (action, request) => {
    setBusyAction(action);
    try {
      const response = await request();
      await loadStatus();
      const successText = typeof response.data === 'object' ? `${action} complete` : String(response.data);
      showToast(successText, 'success', 5000);
      dispatch(clearScreener());
    } catch (error) {
      const errorText = error?.response?.data?.error || `${action} failed`;
      showToast(errorText, 'danger', 6000);
    } finally {
      setBusyAction(null);
    }
  };

  const feedHealthRows = status.feeds?.length ? status.feeds : [];

  return (
    <div className="st-page st-page--constrained admin-page">
      <div className="st-page-header">
        <div className="st-page-header-title">
        <h1 className="st-page-heading">Admin Console</h1>
        <div className="st-page-subtitle">
          Manage local cache bootstrap, fundamentals refreshes, and default RSS ingestion.
          {' '}<Link to="/columns" className="st-link-muted">Column reference</Link> (legacy fundamentals field glossary).
        </div>
        </div>
      </div>

      <div className="st-panel">
        <div className="st-panel-header">Screener universe</div>
        <div className="st-panel-body">
          <p className="st-muted-note mb-2">
            The insider screener only shows tickers with Form 4 data in SQLite. Load the S&amp;P 500
            universe to refresh insiders at scale (worker required for queued jobs).
          </p>
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={loadSp500Tickers}
            >
              {busyAction === 'Load S&P 500' ? 'Loading...' : `Use S&P 500${sp500Meta?.count ? ` (${sp500Meta.count})` : ''}`}
            </button>
            <button
              type="button"
              className="st-btn-success"
              disabled={busyAction !== null}
              onClick={() => runAction('Queue S&P 500 insiders', () => queueSp500InsiderRefresh())}
            >
              {busyAction === 'Queue S&P 500 insiders' ? 'Queueing...' : 'Queue S&P 500 insider refresh'}
            </button>
            <button
              type="button"
              className="st-btn-ghost"
              disabled={busyAction !== null}
              onClick={() => runAction('Company sync', () => axios.post(API_ENDPOINTS.ADMIN_SYNC_COMPANIES))}
            >
              {busyAction === 'Company sync' ? 'Running...' : 'Sync companies first'}
            </button>
          </div>
        </div>
      </div>

      <div className="st-panel">
        <div className="st-panel-header">Data refresh</div>
        <div className="st-panel-body">
          <div className="admin-toolbar-grid">
            <div>
              <label className="st-label" htmlFor="adminTickers">Tickers to refresh</label>
              <input
                id="adminTickers"
                className="st-input"
                value={tickers}
                onChange={e => setTickers(e.target.value)}
                placeholder="AAPL,MSFT,NVDA"
              />
              <div className="st-muted-note mt-1">
                {portfolioCount > 0
                  ? `Pre-filled from portfolio (${portfolioCount} ticker${portfolioCount === 1 ? '' : 's'}). Clear the field to still use portfolio on bootstrap.`
                  : 'Portfolio empty — using default tickers unless you enter symbols.'}
              </div>
            </div>
            <div className="admin-toolbar-actions">
              {portfolioCount > 0 && (
                <button
                  type="button"
                  className="st-btn-ghost"
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
                type="button"
                className="st-btn-ghost"
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
            freshness={status.freshness}
            counts={status.counts}
            coverage={status.coverage}
            statusLoaded={statusLoaded}
            onComplete={async () => {
              await loadStatus();
              dispatch(clearScreener());
            }}
          />
          <div className="admin-actions-row">
            <span className="st-muted-note align-self-center me-1">Individual actions:</span>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Company sync', () => axios.post(API_ENDPOINTS.ADMIN_SYNC_COMPANIES))}
            >
              {busyAction === 'Company sync' ? 'Running...' : 'Sync Companies'}
            </button>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Fundamentals refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_FUNDAMENTALS}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Fundamentals refresh' ? 'Running...' : 'Refresh Fundamentals'}
            </button>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Feed ingest', () => axios.post(API_ENDPOINTS.ADMIN_INGEST_DEFAULT_FEEDS))}
            >
              {busyAction === 'Feed ingest' ? 'Running...' : 'Ingest Default Feeds'}
            </button>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Price refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_PRICES}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Price refresh' ? 'Running...' : 'Refresh Prices'}
            </button>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Insider refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_INSIDERS}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Insider refresh' ? 'Running...' : 'Refresh Insiders'}
            </button>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Enrich metadata', () => axios.post(`${API_ENDPOINTS.ADMIN_ENRICH_METADATA}?tickers=${tickersQuery()}`))}
            >
              {busyAction === 'Enrich metadata' ? 'Running...' : 'Enrich Metadata'}
            </button>
            <button
              type="button"
              className="st-btn-ghost"
              disabled={busyAction !== null}
              onClick={() => runAction('Enrich all missing metadata', () => axios.post(`${API_ENDPOINTS.ADMIN_ENRICH_METADATA}?all=true`))}
            >
              {busyAction === 'Enrich all missing metadata' ? 'Running...' : 'Enrich All Missing'}
            </button>
            <button
              type="button"
              className="st-btn-muted"
              disabled={busyAction !== null}
              onClick={() => runAction('Article dedup', () => axios.post(API_ENDPOINTS.ADMIN_DEDUP_ARTICLES))}
            >
              {busyAction === 'Article dedup' ? 'Running...' : 'Dedup Articles'}
            </button>
            <button
              type="button"
              className="st-btn-ghost"
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

      <div className="admin-stats-grid">
        <div className="st-panel">
          <div className="st-panel-header">Counts</div>
          <div className="st-panel-body">
            <ul className="admin-stat-list mb-0">
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
        <div className="st-panel">
          <div className="st-panel-header">Freshness</div>
          <div className="st-panel-body">
            <ul className="admin-stat-list mb-0">
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

      <div className="st-panel">
        <div className="st-panel-header">Feed Health</div>
        <div className="st-panel-body-flush">
          {feedHealthRows.length === 0 ? (
            <div className="st-panel-body st-muted-note">No feed poll history yet. Run ingest to populate health data.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 st-grid-table st-grid-table-compact">
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

      <div className="st-panel">
        <div className="st-panel-header">Recent Job Runs</div>
        <div className="st-panel-body-flush">
          {(status.recentJobRuns || []).length === 0 ? (
            <div className="st-panel-body st-muted-note">No completed job runs yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 st-grid-table st-grid-table-compact">
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

      <div className="st-panel">
        <div className="st-panel-header">Default RSS Feeds</div>
        <div className="st-panel-body-flush">
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 st-grid-table st-grid-table-compact">
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
                    <td><a href={feed.feed_url} target="_blank" rel="noopener noreferrer" className="st-link-muted">{feed.feed_url}</a></td>
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
