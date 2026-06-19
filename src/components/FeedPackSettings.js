import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import StSpinner from './StSpinner';

export default function FeedPackSettings() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(API_ENDPOINTS.ADMIN_FEED_PACKS);
      setPacks(res.data?.packs || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load feed packs');
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const togglePack = async (packId, enabled) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const enabledPacks = packs
        .filter((pack) => (pack.id === packId ? enabled : pack.enabled))
        .map((pack) => pack.id);
      const res = await axios.post(API_ENDPOINTS.ADMIN_FEED_PACKS, { enabledPacks });
      setPacks(res.data?.packs || []);
      setMessage('Feed pack preferences saved.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save feed packs');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="st-spinner-wrap"><StSpinner /> Loading feed packs…</div>;
  }

  return (
    <div className="st-panel">
      <div className="st-panel-header">
        <h2 className="st-panel-title h6 mb-0">Optional feed packs</h2>
      </div>
      <div className="st-panel-body">
        <p className="small text-muted mb-3">
          Core finance and regulatory feeds ingest by default. Enable optional packs to include
          technology, AI, crypto, and other supplemental sources.
        </p>
        {error && <div className="st-alert-danger mb-2">{error}</div>}
        {message && <div className="st-alert-secondary mb-2">{message}</div>}
        <div className="d-flex flex-column gap-2">
          {packs.map((pack) => (
            <label key={pack.id} className="form-check d-flex align-items-center gap-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={Boolean(pack.enabled)}
                disabled={saving}
                onChange={(e) => togglePack(pack.id, e.target.checked)}
              />
              <span className="form-check-label text-capitalize">
                {pack.id.replace(/_/g, ' ')}
                <span className="text-muted small ms-2">({pack.feedCount} feeds)</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
