import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import {
  BOOTSTRAP_STEPS,
  WAVE_LABELS,
  buildPipelineStages,
  explainStepRecommendation,
  recommendedSelectedStepIds,
  stepDisplayIndex,
} from '../config/bootstrapPipeline';
import {
  formatPipelineStepResult,
  runBootstrapPipeline,
} from '../config/bootstrapPipelineRunner';
import {
  FULL_LIMITS,
  PIPELINE_MODES,
  buildFullRunConfirmationContent,
  estimatePipelineDuration,
  formatSecondsRange,
  modeSummary,
  stepDescriptionForMode,
} from '../config/bootstrapPipelineModes';
import './BootstrapPipeline.css';

function connectorClass(stageIndex, stages, selected, stepStatus) {
  if (stageIndex <= 0) return '';
  const prevStage = stages[stageIndex - 1];
  const prevSteps = prevStage.steps.filter((step) => selected.has(step.id));
  if (!prevSteps.length) return '';

  const statuses = prevSteps.map((step) => stepStatus[step.id] || 'idle');
  if (statuses.every((s) => s === 'success')) return 'jx-connector--active';
  if (statuses.some((s) => s === 'success' || s === 'running')) return 'jx-connector--partial';
  return '';
}

function stepStatusLabel(status, isSelected) {
  if (status === 'running') return { text: 'Running', className: 'jx-step-status--running' };
  if (status === 'success') return { text: 'Done', className: 'jx-step-status--success' };
  if (status === 'error') return { text: 'Failed', className: 'jx-step-status--error' };
  if (status === 'skipped') return { text: 'Skipped', className: 'jx-step-status--idle' };
  if (isSelected) return { text: 'Queued', className: 'jx-step-status--queued' };
  return { text: 'Excluded', className: 'jx-step-status--excluded' };
}

function PipelineNode({
  step,
  stepIndex,
  selected,
  status,
  disabled,
  focused,
  onToggle,
  onFocus,
}) {
  const isOn = selected.has(step.id);
  const classes = [
    'jx-node',
    isOn ? 'jx-node--on' : 'jx-node--off',
    focused ? 'jx-node--focused' : '',
    status === 'running' ? 'jx-node--running' : '',
    status === 'success' ? 'jx-node--success' : '',
    status === 'error' ? 'jx-node--error' : '',
    status === 'skipped' ? 'jx-node--skipped' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="jx-node-wrap">
      <button
        type="button"
        className={classes}
        disabled={disabled}
        title={step.label}
        aria-pressed={isOn}
        aria-label={`${step.label}, ${isOn ? 'included' : 'excluded'}`}
        onClick={() => onToggle(step.id)}
        onFocus={() => onFocus(step.id)}
        onMouseEnter={() => onFocus(step.id)}
      >
        <span className={`jx-node-badge ${isOn ? '' : 'jx-node-badge--off'}`} aria-hidden="true" />
        <span className="jx-node-index">{stepIndex}</span>
      </button>
      <div className={`jx-node-label ${isOn ? '' : 'jx-node-label--off'} ${focused ? 'text-primary' : ''}`}>
        {step.shortLabel}
      </div>
    </div>
  );
}

export default function BootstrapPipeline({
  tickersCsv,
  disabled = false,
  onComplete,
  showToast,
  freshness = {},
  counts = {},
  coverage = {},
  statusLoaded = false,
}) {
  const stages = useMemo(() => buildPipelineStages(), []);
  const cacheContext = useMemo(
    () => ({ freshness, counts, coverage }),
    [freshness, counts, coverage],
  );
  const recommendedIds = useMemo(
    () => recommendedSelectedStepIds(cacheContext),
    [cacheContext],
  );
  const hasAppliedRecommended = useRef(false);
  const [selected, setSelected] = useState(() => new Set());
  const [stepStatus, setStepStatus] = useState({});
  const [stepResults, setStepResults] = useState({});
  const [focusedStepId, setFocusedStepId] = useState(BOOTSTRAP_STEPS[0]?.id);
  const [running, setRunning] = useState(false);
  const [fullSlowRun, setFullSlowRun] = useState(false);
  const [fullRunConfirmOpen, setFullRunConfirmOpen] = useState(false);

  const selectedCount = selected.size;
  const pipelineMode = fullSlowRun ? PIPELINE_MODES.FULL : PIPELINE_MODES.FAST;
  const selectedStepIds = useMemo(() => [...selected], [selected]);
  const durationEstimate = useMemo(
    () => estimatePipelineDuration(selectedStepIds, pipelineMode, tickersCsv),
    [selectedStepIds, pipelineMode, tickersCsv],
  );
  const fullRunConfirmContent = useMemo(
    () => (fullSlowRun ? buildFullRunConfirmationContent(selectedStepIds, tickersCsv) : null),
    [fullSlowRun, selectedStepIds, tickersCsv],
  );
  const tickersMissing = !tickersCsv.trim();
  const tickerStepsSelected = BOOTSTRAP_STEPS.some(
    (step) => selected.has(step.id) && step.requiresTickers,
  );

  useEffect(() => {
    if (!statusLoaded) return;
    if (hasAppliedRecommended.current) return;
    setSelected(new Set(recommendedSelectedStepIds(cacheContext)));
    hasAppliedRecommended.current = true;
  }, [statusLoaded, cacheContext]);

  const focusedStep = BOOTSTRAP_STEPS.find((step) => step.id === focusedStepId) || BOOTSTRAP_STEPS[0];
  const focusedRecommend = useMemo(
    () => (statusLoaded ? explainStepRecommendation(focusedStep.id, cacheContext) : null),
    [statusLoaded, focusedStep.id, cacheContext],
  );
  const focusedEstimate = durationEstimate.steps.find((step) => step.stepId === focusedStep.id);
  const focusedStatus = stepStatusLabel(stepStatus[focusedStep.id], selected.has(focusedStep.id));
  const focusedResult = stepResults[focusedStep.id];
  const focusedResultText = formatPipelineStepResult(focusedStep.id, focusedResult);
  const focusedModeDescription = useMemo(
    () => stepDescriptionForMode(focusedStep.id, pipelineMode),
    [focusedStep.id, pipelineMode],
  );

  const toggleStep = (stepId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const applyPreset = (preset) => {
    if (preset === 'recommended') {
      if (!statusLoaded) {
        showToast?.('Loading cache status… try again in a moment', 'warning', 4000);
        return;
      }
      setSelected(new Set(recommendedSelectedStepIds(cacheContext)));
    } else if (preset === 'all') {
      setSelected(new Set(BOOTSTRAP_STEPS.map((step) => step.id)));
    } else {
      setSelected(new Set());
    }
    setStepStatus({});
    setStepResults({});
  };

  const executePipeline = useCallback(async () => {
    setRunning(true);
    const initialStatus = {};
    selected.forEach((id) => { initialStatus[id] = 'idle'; });
    setStepStatus(initialStatus);
    setStepResults({});

    try {
      const { stepResults: results, failedCount } = await runBootstrapPipeline({
        selectedStepIds,
        tickersCsv,
        mode: pipelineMode,
        onStepStatus: (stepId, status) => {
          setStepStatus((prev) => ({ ...prev, [stepId]: status }));
        },
      });

      setStepResults(results);
      await onComplete?.(results);

      if (failedCount === 0) {
        const completed = Object.values(results).filter((r) => r.status === 'success').length;
        showToast?.(`Pipeline complete — ${completed} step${completed === 1 ? '' : 's'} succeeded`, 'success', 5000);
      } else {
        const errorLines = Object.entries(results)
          .filter(([, result]) => result.status === 'error')
          .map(([stepId, result]) => {
            const step = BOOTSTRAP_STEPS.find((item) => item.id === stepId);
            const label = step?.shortLabel || stepId;
            return `${label}: ${result.error}`;
          });
        const detail = errorLines.length ? ` — ${errorLines.join('; ')}` : '';
        showToast?.(
          `Pipeline finished with ${failedCount} failed step${failedCount === 1 ? '' : 's'}${detail}`,
          'danger',
          10000,
        );
      }
    } catch (error) {
      showToast?.(error?.message || 'Pipeline failed', 'danger', 6000);
    } finally {
      setRunning(false);
    }
  }, [onComplete, pipelineMode, selected, selectedStepIds, showToast, tickersCsv]);

  const handleRun = () => {
    if (selectedCount === 0) {
      showToast?.('Select at least one pipeline step', 'warning', 4000);
      return;
    }
    if (tickerStepsSelected && tickersMissing) {
      showToast?.('Enter tickers or use portfolio for ticker-scoped steps', 'warning', 5000);
      return;
    }
    if (fullSlowRun) {
      setFullRunConfirmOpen(true);
      return;
    }
    executePipeline();
  };

  return (
    <div className="bootstrap-pipeline border rounded p-3 mt-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h2 className="h6 mb-1">Bootstrap Pipeline</h2>
          <div className="text-muted small">
            Click numbered stages to include or exclude. Hover or focus a stage for details.
            {statusLoaded && (
              <span className="d-block mt-1">
                Recommended selects {recommendedIds.length} of {BOOTSTRAP_STEPS.length} stages from cache freshness.
                {recommendedIds.length === 0 ? ' Cache is up to date.' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="st-btn-ghost"
            disabled={disabled || running}
            onClick={() => applyPreset('recommended')}
          >
            Recommended
          </button>
          <button
            type="button"
            className="st-btn-ghost"
            disabled={disabled || running}
            onClick={() => applyPreset('all')}
          >
            Select all
          </button>
          <button
            type="button"
            className="st-btn-ghost"
            disabled={disabled || running}
            onClick={() => applyPreset('none')}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="jx-pipeline-track" role="list" aria-label="Bootstrap pipeline stages">
        {stages.map((stage, stageIndex) => (
          <div key={stage.wave} className="d-flex align-items-start flex-shrink-0" role="presentation">
            {stageIndex > 0 && (
              <div
                className={`jx-connector ${connectorClass(stageIndex, stages, selected, stepStatus)}`}
                aria-hidden="true"
              />
            )}
            <div
              className={`jx-stage ${stage.parallel ? 'jx-stage-parallel' : ''}`}
              role="listitem"
              aria-label={stage.label}
            >
              <div className="jx-stage-title">{stage.label}</div>
              <div className="jx-stage-nodes">
                {stage.steps.map((step) => (
                  <PipelineNode
                    key={step.id}
                    step={step}
                    stepIndex={stepDisplayIndex(step.id)}
                    selected={selected}
                    status={stepStatus[step.id] || 'idle'}
                    disabled={disabled || running}
                    focused={focusedStepId === step.id}
                    onToggle={toggleStep}
                    onFocus={setFocusedStepId}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {focusedStep && (
        <div className="jx-step-detail">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fw-semibold small">
              {stepDisplayIndex(focusedStep.id)}. {focusedStep.label}
            </span>
            <span className={`jx-step-status ${focusedStatus.className}`}>{focusedStatus.text}</span>
            {focusedStep.requiresTickers && (
              <span className="badge bg-secondary-subtle text-secondary-emphasis">tickers</span>
            )}
          </div>
          <div className="text-muted small mt-1">{focusedStep.description}</div>
          {focusedModeDescription && (
            <div className="text-muted small">{focusedModeDescription}</div>
          )}
          <div className="jx-step-detail-grid">
            <div className="jx-step-detail-item">
              <span className="jx-step-detail-label">Phase</span>
              {WAVE_LABELS[focusedStep.wave]}
            </div>
            <div className="jx-step-detail-item">
              <span className="jx-step-detail-label">Est. duration</span>
              {selected.has(focusedStep.id) && focusedEstimate
                ? formatSecondsRange(focusedEstimate.minSeconds, focusedEstimate.maxSeconds)
                : 'Not selected'}
            </div>
            {statusLoaded && focusedRecommend && (
              <div className="jx-step-detail-item">
                <span className="jx-step-detail-label">Recommended</span>
                {focusedRecommend.included ? 'Yes' : 'No'}
                {' — '}
                {focusedRecommend.reason}
              </div>
            )}
          </div>
          {focusedResult?.status === 'error' && (
            <div className="jx-step-detail-error" role="alert">
              <span className="jx-step-detail-label">Error</span>
              {focusedResult.error}
            </div>
          )}
          {focusedResult?.status === 'skipped' && focusedResult.error && (
            <div className="jx-step-detail-warn" role="status">
              <span className="jx-step-detail-label">Skipped</span>
              {focusedResult.error}
            </div>
          )}
          {focusedResultText && (
            <div className="jx-step-detail-result" role="status">
              <span className="jx-step-detail-label">Result</span>
              {focusedResultText}
            </div>
          )}
        </div>
      )}

      <div className="jx-pipeline-mode mt-2">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="bootstrap-full-slow-run"
            checked={fullSlowRun}
            disabled={disabled || running}
            onChange={(event) => setFullSlowRun(event.target.checked)}
          />
          <label className="form-check-label small" htmlFor="bootstrap-full-slow-run">
            {`Full slow run (${FULL_LIMITS.ingest_feeds.maxArticlesPerFeed} articles/feed, full article extraction, longer history)`}
          </label>
        </div>
        <div className="text-muted small mt-1">
          {modeSummary(pipelineMode)}
          {selectedCount > 0 && (
            <span className="ms-1">
              Estimated total:
              {' '}
              {formatSecondsRange(durationEstimate.minSeconds, durationEstimate.maxSeconds)}
              {fullSlowRun ? ' — confirmation required before start.' : '.'}
            </span>
          )}
        </div>
      </div>

      {statusLoaded && recommendedIds.length === 0 && selectedCount === 0 && (
        <div className="alert alert-success py-2 small mb-3 mt-2" role="status">
          Cache is fresh — no bootstrap stages are needed right now. Use Select all for a full refresh.
        </div>
      )}

      {tickerStepsSelected && tickersMissing && (
        <div className="alert alert-warning py-2 small mb-3 mt-2" role="alert">
          Ticker-scoped stages need symbols in the field above (or a non-empty portfolio).
        </div>
      )}

      <button
        type="button"
        className="st-btn-primary mt-2"
        disabled={disabled || running || selectedCount === 0}
        onClick={handleRun}
      >
        {running
          ? 'Running pipeline…'
          : `Run ${fullSlowRun ? 'full' : 'fast'} pipeline (${selectedCount} stage${selectedCount === 1 ? '' : 's'})`}
      </button>

      <ConfirmModal
        isOpen={fullRunConfirmOpen}
        title="Start full slow pipeline?"
        confirmLabel="Start full run"
        confirmColor="primary"
        message={fullRunConfirmContent ? (
          <div className="bootstrap-pipeline-confirm">
            <p className="bootstrap-pipeline-confirm-lead">
              Estimated total: <strong>{fullRunConfirmContent.totalRange}</strong>
            </p>
            <p className="bootstrap-pipeline-confirm-copy">
              Full article HTML extraction, up to {fullRunConfirmContent.maxArticlesPerFeed} articles
              per feed, longer price history, and more insider filings.
              {fullRunConfirmContent.ingestRange && (
                <>
                  {' '}Feed ingest alone is estimated at {fullRunConfirmContent.ingestRange}.
                </>
              )}
            </p>
            <div className="bootstrap-pipeline-confirm-steps-label">Selected steps</div>
            <ul className="bootstrap-pipeline-confirm-steps">
              {fullRunConfirmContent.steps.map((step) => (
                <li key={step.label}>
                  <span>{step.label}</span>
                  <span className="bootstrap-pipeline-confirm-step-range">{step.range}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : ''}
        onCancel={() => setFullRunConfirmOpen(false)}
        onConfirm={() => {
          setFullRunConfirmOpen(false);
          executePipeline();
        }}
      />
    </div>
  );
}
