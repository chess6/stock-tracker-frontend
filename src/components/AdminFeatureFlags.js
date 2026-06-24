import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { FEATURE_FLAG_META } from '../config/featureFlags';

export default function AdminFeatureFlags({ showToast, disabled = false }) {
  const [flags, setFlags] = useState({});
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  const loadFlags = useCallback(async () => {
    const res = await axios.get(API_ENDPOINTS.ADMIN_CONFIG);
    setFlags(res.data?.flags || {});
    setSources(res.data?.sources || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFlags().catch(() => {
      setLoading(false);
      showToast?.('Failed to load feature flags', 'danger', 6000);
    });
  }, [loadFlags, showToast]);

  const toggleFlag = async (key, nextValue) => {
    if (sources[key] === 'env') {
      const label = FEATURE_FLAG_META.find((item) => item.key === key)?.label || key;
      showToast?.(
        `${label} is locked by STOCK_TRACKER_FF_${key.toUpperCase()} in .env — remove or change it there, then restart the backend.`,
        'warning',
        8000,
      );
      return;
    }
    setSavingKey(key);
    try {
      const res = await axios.post(API_ENDPOINTS.ADMIN_CONFIG, { [key]: nextValue });
      setFlags(res.data?.flags || {});
      setSources(res.data?.sources || {});
      const skipped = res.data?.skipped_env_locked || [];
      const label = FEATURE_FLAG_META.find((item) => item.key === key)?.label || key;
      if (skipped.includes(key)) {
        showToast?.(
          `${label} is env-locked; update .env and restart the backend to change it.`,
          'warning',
          8000,
        );
      } else {
        showToast?.(`${label} ${nextValue ? 'enabled' : 'disabled'}`, 'success', 4000);
      }
    } catch (error) {
      const message = error?.response?.data?.error || 'Failed to update feature flag';
      showToast?.(message, 'danger', 6000);
    } finally {
      setSavingKey(null);
    }
  };

  const activeFlags = FEATURE_FLAG_META.filter((item) => !item.inactive);
  const enabledCount = activeFlags.filter((item) => Boolean(flags[item.key])).length;

  return (
    <details className="st-details admin-feature-flags-panel">
      <summary className="st-details-summary admin-feature-flags-summary">
        <span>Experimental feature flags</span>
        {!loading && (
          <span className="admin-feature-flags-summary-meta">
            {enabledCount} of {activeFlags.length} enabled
          </span>
        )}
      </summary>
      <div className="st-panel-body">
        <p className="st-muted-note mb-2">
          Toggles persist in SQLite and survive restarts. Environment variables
          {' '}
          <code className="small">STOCK_TRACKER_FF_&lt;KEY&gt;</code>
          {' '}
          override stored values and lock the Admin toggle until removed from
          {' '}
          <code className="small">.env</code>
          {' '}
          and the backend is restarted.
        </p>
        {loading ? (
          <div className="st-muted-note">Loading flags…</div>
        ) : (
          <ul className="admin-feature-flags-list mb-0">
            {FEATURE_FLAG_META.map((item) => {
              if (item.inactive) {
                return (
                  <li key={item.key} className="admin-feature-flag-item admin-feature-flag-item--inactive">
                    <div className="admin-feature-flag-retired">
                      <span className="admin-feature-flag-label">{item.label}</span>
                      <span className="st-badge-muted admin-feature-flag-inactive-badge">Inactive</span>
                      <span className="admin-feature-flag-key">{item.key}</span>
                    </div>
                    <div className="admin-feature-flag-desc">{item.description}</div>
                  </li>
                );
              }

              const enabled = Boolean(flags[item.key]);
              const envLocked = sources[item.key] === 'env';
              const busy = savingKey === item.key;
              return (
                <li key={item.key} className="admin-feature-flag-item">
                  <div className="form-check form-switch admin-feature-flag-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id={`flag-${item.key}`}
                      checked={enabled}
                      disabled={disabled || busy || envLocked}
                      onChange={(event) => toggleFlag(item.key, event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`flag-${item.key}`}>
                      <span className="admin-feature-flag-label">{item.label}</span>
                      <span className="admin-feature-flag-key">{item.key}</span>
                      {envLocked && (
                        <span className="st-badge st-badge-muted ms-2" title="Set in .env; restart backend after changing">
                          env locked
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="admin-feature-flag-desc">{item.description}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
