import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import StSpinner from '../components/StSpinner';
import SignalCard from '../components/signals/SignalCard';
import API_ENDPOINTS from '../apiConfig';
import { SIGNAL_LENS_TABS, SIGNAL_RADAR_PRESETS } from '../config/signalRadarPresets';
import { getPortfolio, loadUserPreferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolio';
import {
  dismissSignal,
  fetchSignalState,
  markSignalRead,
  snoozeSignal,
  touchSignalLastVisited,
} from '../utils/signalState';
import { formatQueueDate } from '../utils/researchQueueFormat';

const SIGNAL_LIMIT = 50;
const BRIEF_LIMIT = 12;

function FeatureDisabledBanner({ flag }) {
  return (
    <div className="st-alert-warning mb-3" role="status">
      Signals require <code>{flag}</code>.
      {' '}Enable in <Link to="/admin">Admin → Feature flags</Link> alongside{' '}
      <code>experimental_research_queue</code> for nightly queue builds.
    </div>
  );
}

function LensTabs({ active, onChange }) {
  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {SIGNAL_LENS_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`btn btn-sm ${active === tab.id ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function ResearchQueuePage() {
  const [lens, setLens] = useState('worklist');
  const [radarPreset, setRadarPreset] = useState(SIGNAL_RADAR_PRESETS[0].id);
  const [signals, setSignals] = useState([]);
  const [briefItems, setBriefItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [briefMeta, setBriefMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [portfolioTickers, setPortfolioTickers] = useState(() => getPortfolio());
  const [portfolioOnly, setPortfolioOnly] = useState(false);
  const [showRead, setShowRead] = useState(false);

  useEffect(() => {
    loadUserPreferences().then(() => setPortfolioTickers(getPortfolio()));
    const sync = () => setPortfolioTickers(getPortfolio());
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
  }, []);

  const activeRadar = useMemo(
    () => SIGNAL_RADAR_PRESETS.find((p) => p.id === radarPreset) || SIGNAL_RADAR_PRESETS[0],
    [radarPreset],
  );

  const loadSignals = useCallback(async () => {
    setLoading(true);
    setError('');
    setDisabled(false);
    try {
      const params = { limit: SIGNAL_LIMIT, hide_read: !showRead };
      if (portfolioOnly) params.portfolio_only = true;
      if (lens === 'watch') {
        params.lens = 'watch';
        params.portfolio_only = true;
        params.min_importance = 0.5;
      } else if (lens === 'radar') {
        params.lens = activeRadar.lens;
      }

      const [signalsRes, briefRes] = await Promise.all([
        axios.get(API_ENDPOINTS.SIGNALS, { params }),
        axios.get(API_ENDPOINTS.SIGNALS_MORNING_BRIEF, { params: { limit: BRIEF_LIMIT } }),
      ]);

      setSignals(signalsRes.data?.items || []);
      setMeta({
        returned: signalsRes.data?.returned,
        uniqueAfterDedup: signalsRes.data?.uniqueAfterDedup,
        lastVisitedAt: signalsRes.data?.userState?.lastVisitedAt,
        computedAt: signalsRes.data?.meta?.computedAt,
      });
      setBriefItems(briefRes.data?.items || []);
      setBriefMeta({
        lastVisitedAt: briefRes.data?.lastVisitedAt,
        returned: briefRes.data?.returned,
      });
      await fetchSignalState();
    } catch (err) {
      const flag = err.response?.data?.flag;
      if (err.response?.status === 404 && flag === 'experimental_signals') {
        setDisabled(true);
        setSignals([]);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load signals');
      }
    } finally {
      setLoading(false);
    }
  }, [lens, activeRadar.lens, portfolioOnly, showRead]);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  useEffect(() => {
    return () => {
      touchSignalLastVisited().catch(() => {});
    };
  }, []);

  const handleDismiss = async (signal) => {
    await dismissSignal({
      dedupKey: signal.dedupKey,
      ticker: signal.ticker,
      eventType: signal.signalType,
      eventDate: signal.eventDate,
    });
    await loadSignals();
  };

  const handleSnooze = async (signal) => {
    await snoozeSignal(signal.dedupKey, 7);
    await loadSignals();
  };

  const handleMarkRead = async (signal) => {
    await markSignalRead(signal.dedupKey, true);
    await loadSignals();
  };

  const displayedSignals = lens === 'brief' ? briefItems : signals;

  return (
    <main className="container-fluid py-2 news-page">
      <div className="research-queue-layout">
        <aside className="research-queue-sidebar">
          <div className="st-panel news-page-filters">
            <div className="st-panel-header">Signals</div>
            <div className="st-panel-body news-page-filters-body">
              <p className="text-muted small mb-2">
                Research workstation — ranked by research importance, not news volume.
                Legacy article feed: <Link to="/firehose">Firehose</Link>.
              </p>
              <div className="news-page-checks">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rqPortfolioOnly"
                    checked={portfolioOnly}
                    onChange={(e) => setPortfolioOnly(e.target.checked)}
                    disabled={lens === 'watch' || portfolioTickers.length === 0}
                  />
                  <label className="form-check-label" htmlFor="rqPortfolioOnly">Portfolio only</label>
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rqShowRead"
                    checked={showRead}
                    onChange={(e) => setShowRead(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rqShowRead">Show read</label>
                </div>
              </div>
              {lens === 'radar' && (
                <>
                  <label htmlFor="radarPreset" className="st-label mt-2">Radar scan</label>
                  <select
                    id="radarPreset"
                    className="st-select"
                    value={radarPreset}
                    onChange={(e) => setRadarPreset(e.target.value)}
                  >
                    {SIGNAL_RADAR_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.label}</option>
                    ))}
                  </select>
                  <p className="text-muted small mb-0">{activeRadar.description}</p>
                </>
              )}
            </div>
          </div>
        </aside>

        <div className="news-page-main">
          {disabled && <FeatureDisabledBanner flag="experimental_signals" />}
          {error && <div className="st-alert-danger">{error}</div>}

          <LensTabs active={lens} onChange={setLens} />

          <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-2">
            <div>
              <h2 className="h6 mb-0 text-muted text-uppercase">
                {lens === 'brief' ? 'Morning brief' : lens === 'radar' ? activeRadar.label : lens === 'watch' ? 'Portfolio watch' : 'Prioritized worklist'}
              </h2>
              <p className="text-muted small mb-0">
                {loading ? 'Loading…' : `${displayedSignals.length} signal${displayedSignals.length === 1 ? '' : 's'}`}
                {meta.uniqueAfterDedup != null && lens === 'worklist' ? ` (${meta.uniqueAfterDedup} unique)` : ''}
              </p>
            </div>
            <div className="text-muted small text-end">
              {meta.computedAt && <div>Updated {formatQueueDate(meta.computedAt)}</div>}
              {briefMeta.lastVisitedAt && lens === 'brief' && (
                <div>Since {formatQueueDate(briefMeta.lastVisitedAt)}</div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="st-spinner-wrap"><StSpinner label="Loading signals…" /></div>
          ) : (
            <>
              {!disabled && displayedSignals.length === 0 && (
                <div className="st-alert-secondary">
                  No signals for this lens. Run nightly jobs and enable feature flags in Admin.
                </div>
              )}
              <ul className="list-group list-group-flush news-feed">
                {displayedSignals.map((signal) => (
                  <SignalCard
                    key={signal.dedupKey || `${signal.ticker}-${signal.signalType}-${signal.eventDate}`}
                    signal={signal}
                    onDismiss={handleDismiss}
                    onSnooze={handleSnooze}
                    onMarkRead={handleMarkRead}
                    showActions={lens !== 'brief'}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
