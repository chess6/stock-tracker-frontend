import { useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

function formatDate(value) {
  if (!value) return 'Not available yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminConsolePage() {
  const [status, setStatus] = useState({ counts: {}, freshness: {} });
  const [feeds, setFeeds] = useState([]);
  const [tickers, setTickers] = useState('AAPL,MSFT,NVDA,AMD,GOOGL,AMZN,META,TSLA');
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState('');

  const loadStatus = async () => {
    const [statusRes, feedsRes] = await Promise.all([
      axios.get(API_ENDPOINTS.ADMIN_STATUS),
      axios.get(API_ENDPOINTS.ADMIN_DEFAULT_FEEDS),
    ]);
    setStatus(statusRes.data || { counts: {}, freshness: {} });
    setFeeds(feedsRes.data?.feeds || []);
  };

  useEffect(() => {
    loadStatus().catch(() => {
      setMessage('Failed to load admin status');
    });
  }, []);

  const runAction = async (action, request) => {
    setBusyAction(action);
    setMessage('');
    try {
      const response = await request();
      await loadStatus();
      setMessage(typeof response.data === 'object' ? `${action} complete` : String(response.data));
    } catch (error) {
      setMessage(error?.response?.data?.error || `${action} failed`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="container py-3">
      <div className="row mb-3">
        <div className="col">
          <h1 className="h3 mb-1">Admin Console</h1>
          <div className="text-muted">Manage local cache bootstrap, fundamentals refreshes, and default RSS ingestion.</div>
        </div>
      </div>

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
            </div>
            <div className="col-lg-4 d-flex gap-2">
              <button
                className="btn btn-primary"
                disabled={busyAction !== null}
                onClick={() => runAction('Bootstrap', () => axios.post(`${API_ENDPOINTS.ADMIN_BOOTSTRAP}?tickers=${encodeURIComponent(tickers)}`))}
              >
                {busyAction === 'Bootstrap' ? 'Running...' : 'Bootstrap All'}
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={busyAction !== null}
                onClick={() => loadStatus()}
              >
                Refresh Status
              </button>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap mt-3">
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
              onClick={() => runAction('Fundamentals refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_FUNDAMENTALS}?tickers=${encodeURIComponent(tickers)}`))}
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
              onClick={() => runAction('Price refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_PRICES}?tickers=${encodeURIComponent(tickers)}`))}
            >
              {busyAction === 'Price refresh' ? 'Running...' : 'Refresh Prices'}
            </button>
            <button
              className="btn btn-outline-primary"
              disabled={busyAction !== null}
              onClick={() => runAction('Insider refresh', () => axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_INSIDERS}?tickers=${encodeURIComponent(tickers)}`))}
            >
              {busyAction === 'Insider refresh' ? 'Running...' : 'Refresh Insiders'}
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
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">Freshness</h2>
              <ul className="mb-0">
                <li>Companies updated: {formatDate(status.freshness?.companiesUpdatedAt)}</li>
                <li>Fundamentals updated: {formatDate(status.freshness?.fundamentalsUpdatedAt)}</li>
                <li>Feeds last polled: {formatDate(status.freshness?.feedsLastPolledAt)}</li>
                <li>Prices updated: {formatDate(status.freshness?.pricesUpdatedAt)}</li>
                <li>Insiders updated: {formatDate(status.freshness?.insidersUpdatedAt)}</li>
                <li>Latest article published: {formatDate(status.freshness?.latestArticlePublishedAt)}</li>
                <li>Latest article fetched: {formatDate(status.freshness?.latestArticleFetchedAt)}</li>
              </ul>
            </div>
          </div>
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
