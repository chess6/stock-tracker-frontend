import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

const DEFAULT_BATCH = 50;
const STATUS_POLL_MS = 2000;
const BATCH_SLEEP_MS = 500;

function computeProgress(counts) {
  const pending = counts?.pending ?? 0;
  const processing = counts?.processing ?? 0;
  const complete = counts?.complete ?? 0;
  const total = pending + processing + complete;
  const percent = total > 0 ? Math.round((complete / total) * 100) : 0;
  return { pending, processing, complete, total, percent };
}

export default function ArticleEnrichmentPanel({
  disabled = false,
  showToast,
  onCountsChange,
  onRunComplete,
}) {
  const [counts, setCounts] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH);
  const [enableEmbeddings, setEnableEmbeddings] = useState(true);
  const [enableFinbert, setEnableFinbert] = useState(true);
  const [forceReenrich, setForceReenrich] = useState(false);
  const [lastBatch, setLastBatch] = useState(null);
  const [embeddingsError, setEmbeddingsError] = useState('');
  const stopRef = useRef(false);
  const onCountsChangeRef = useRef(onCountsChange);
  const onRunCompleteRef = useRef(onRunComplete);
  onCountsChangeRef.current = onCountsChange;
  onRunCompleteRef.current = onRunComplete;

  const fetchCounts = useCallback(async () => {
    const res = await axios.get(API_ENDPOINTS.ADMIN_ENRICH_ARTICLES_STATUS);
    const next = res.data || {};
    setCounts(next);
    setEmbeddingsError(
      next.embeddings_available === false
        ? (next.embeddings_error || 'Embedding model unavailable — run pip install -r requirements-nlp.txt')
        : '',
    );
    return next;
  }, []);

  useEffect(() => {
    fetchCounts()
      .catch(() => showToast?.('Failed to load enrichment status', 'danger', 6000))
      .finally(() => setLoadingStatus(false));
  }, [fetchCounts, showToast]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      fetchCounts().catch(() => {});
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [running, fetchCounts]);

  const runEnrichmentLoop = async () => {
    stopRef.current = false;
    setRunning(true);
    setLastBatch(null);

    try {
      if (forceReenrich) {
        let totalRequeued = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const requeueRes = await axios.post(API_ENDPOINTS.ADMIN_ENRICH_ARTICLES, {
            limit: batchSize,
            requeue_completed: true,
            requeue_only: true,
            enable_embeddings: false,
            enable_finbert: false,
            requeue_limit: 500,
          });
          const requeued = requeueRes.data?.requeued ?? 0;
          totalRequeued += requeued;
          if (requeued <= 0) break;
        }
        if (totalRequeued > 0) {
          showToast?.(`Requeued ${totalRequeued} articles for re-enrichment`, 'info', 5000);
        }
      }

      let rounds = 0;
      while (!stopRef.current) {
        rounds += 1;
        const response = await axios.post(
          API_ENDPOINTS.ADMIN_ENRICH_ARTICLES,
          {
            limit: batchSize,
            enable_embeddings: enableEmbeddings,
            enable_finbert: enableFinbert,
          },
        );

        const payload = response.data || {};
        const pipeline = payload.pipeline || {};
        setLastBatch({
          round: rounds,
          processed: payload.processed ?? 0,
          errors: (payload.results || []).filter((item) => item.status === 'error').length,
          requeued: payload.requeued ?? 0,
        });
        setCounts(pipeline);
        onCountsChangeRef.current?.(pipeline);

        const pending = pipeline.pending ?? 0;
        const processing = pipeline.processing ?? 0;
        const processed = payload.processed ?? 0;

        if (pending === 0 && processing === 0) {
          showToast?.('Article enrichment complete', 'success', 5000);
          break;
        }
        if (processed === 0 && pending === 0 && processing === 0) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, BATCH_SLEEP_MS));
      }
      if (stopRef.current) {
        showToast?.('Enrichment stopped', 'warning', 4000);
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Enrichment failed';
      if (error?.response?.data?.embeddings_available === false) {
        setEmbeddingsError(message);
      }
      showToast?.(message, 'danger', 8000);
    } finally {
      setRunning(false);
      try {
        const latest = await fetchCounts();
        onCountsChangeRef.current?.(latest);
        onRunCompleteRef.current?.();
      } catch {
        // ignore refresh errors after run
      }
    }
  };

  const handleStop = () => {
    stopRef.current = true;
  };

  const progress = computeProgress(counts);
  const hasBacklog = progress.pending > 0 || progress.processing > 0;

  return (
    <div className="article-enrichment-panel border rounded p-3 mt-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h2 className="h6 mb-1">Article enrichment</h2>
          <div className="text-muted small">
            Full NLP pipeline: sentiment, event classification, embeddings, entity linking, and event clustering.
            Separate from the bootstrap pipeline — run after feed ingest.
          </div>
        </div>
        <button
          type="button"
          className="st-btn-ghost"
          disabled={disabled || running || loadingStatus}
          onClick={() => fetchCounts().catch(() => showToast?.('Failed to refresh status', 'danger', 4000))}
        >
          Refresh status
        </button>
      </div>

      <div className="article-enrichment-progress mb-2">
        <div className="d-flex justify-content-between align-items-center small mb-1">
          <span className="text-muted">Enrichment progress</span>
          <span className="fw-semibold">
            {loadingStatus ? '…' : `${progress.percent}%`}
            {!loadingStatus && progress.total > 0 && (
              <span className="text-muted fw-normal">
                {' '}
                ({progress.complete} / {progress.total} complete)
              </span>
            )}
          </span>
        </div>
        <div className="progress article-enrichment-progress-bar" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`progress-bar ${running ? 'progress-bar-striped progress-bar-animated' : ''}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {!loadingStatus && (
          <div className="article-enrichment-stats small text-muted mt-1">
            <span>Pending: {progress.pending}</span>
            <span className="mx-2">·</span>
            <span>Processing: {progress.processing}</span>
            <span className="mx-2">·</span>
            <span>Complete: {progress.complete}</span>
            {(counts?.error ?? 0) > 0 && (
              <>
                <span className="mx-2">·</span>
                <span className="text-warning">Errors: {counts.error}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="article-enrichment-options">
        <div className="row g-2 align-items-end">
          <div className="col-sm-3 col-md-2">
            <label className="st-label small" htmlFor="enrichBatchSize">Batch size</label>
            <input
              id="enrichBatchSize"
              type="number"
              min={1}
              max={200}
              className="st-input form-control-sm"
              value={batchSize}
              disabled={disabled || running}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(200, Number(e.target.value) || DEFAULT_BATCH)))}
            />
          </div>
          <div className="col-sm-9 col-md-10 d-flex flex-wrap gap-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="enrichEnableEmbeddings"
                checked={enableEmbeddings}
                disabled={disabled || running}
                onChange={(e) => setEnableEmbeddings(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="enrichEnableEmbeddings">
                Embeddings (required for clustering)
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="enrichEnableFinbert"
                checked={enableFinbert}
                disabled={disabled || running}
                onChange={(e) => setEnableFinbert(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="enrichEnableFinbert">
                FinBERT sentiment
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="enrichForceReenrich"
                checked={forceReenrich}
                disabled={disabled || running}
                onChange={(e) => setForceReenrich(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="enrichForceReenrich">
                Force re-enrich completed
              </label>
            </div>
          </div>
        </div>
      </div>

      {embeddingsError && enableEmbeddings && (
        <div className="alert alert-danger py-2 small mt-2 mb-2" role="alert">
          {embeddingsError}
        </div>
      )}

      {hasBacklog && !running && !loadingStatus && (
        <div className="alert alert-warning py-2 small mt-2 mb-2" role="status">
          {progress.pending + progress.processing} article{(progress.pending + progress.processing) === 1 ? '' : 's'} awaiting enrichment.
          Enable embeddings for event clustering on the News page.
        </div>
      )}

      {lastBatch && (
        <div className="small text-muted mt-2" role="status">
          Last batch: round {lastBatch.round}, processed {lastBatch.processed}
          {lastBatch.errors > 0 ? `, ${lastBatch.errors} error${lastBatch.errors === 1 ? '' : 's'}` : ''}
          {lastBatch.requeued > 0 ? `, requeued ${lastBatch.requeued}` : ''}
        </div>
      )}

      <div className="d-flex gap-2 mt-2">
        <button
          type="button"
          className="st-btn-primary"
          disabled={disabled || running || loadingStatus}
          onClick={runEnrichmentLoop}
        >
          {running ? 'Enriching articles…' : hasBacklog ? 'Run enrichment' : 'Run enrichment (check backlog)'}
        </button>
        {running && (
          <button type="button" className="st-btn-ghost" onClick={handleStop}>
            Stop after current batch
          </button>
        )}
      </div>
    </div>
  );
}
