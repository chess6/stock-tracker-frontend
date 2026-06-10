import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { FEATURE_FLAG_META } from '../config/featureFlags';

export default function AdminFeatureFlags({ showToast, disabled = false }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  const loadFlags = useCallback(async () => {
    const res = await axios.get(API_ENDPOINTS.ADMIN_CONFIG);
    setFlags(res.data?.flags || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFlags().catch(() => {
      setLoading(false);
      showToast?.('Failed to load feature flags', 'danger', 6000);
    });
  }, [loadFlags, showToast]);

  const toggleFlag = async (key, nextValue) => {
    setSavingKey(key);
    try {
      const res = await axios.post(API_ENDPOINTS.ADMIN_CONFIG, { [key]: nextValue });
      setFlags(res.data?.flags || {});
      const label = FEATURE_FLAG_META.find((item) => item.key === key)?.label || key;
      showToast?.(`${label} ${nextValue ? 'enabled' : 'disabled'}`, 'success', 4000);
    } catch (error) {
      const message = error?.response?.data?.error || 'Failed to update feature flag';
      showToast?.(message, 'danger', 6000);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="st-panel">
      <div className="st-panel-header">Experimental feature flags</div>
      <div className="st-panel-body">
        <p className="st-muted-note mb-2">
          Toggles persist in SQLite and survive restarts. Environment variables
          {' '}
          <code className="small">STOCK_TRACKER_FF_&lt;KEY&gt;</code>
          {' '}
          override stored values when set before starting the backend.
        </p>
        {loading ? (
          <div className="st-muted-note">Loading flags…</div>
        ) : (
          <ul className="admin-feature-flags-list mb-0">
            {FEATURE_FLAG_META.map((item) => {
              const enabled = Boolean(flags[item.key]);
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
                      disabled={disabled || busy}
                      onChange={(event) => toggleFlag(item.key, event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`flag-${item.key}`}>
                      <span className="admin-feature-flag-label">{item.label}</span>
                      <span className="admin-feature-flag-key">{item.key}</span>
                    </label>
                  </div>
                  <div className="admin-feature-flag-desc">{item.description}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
