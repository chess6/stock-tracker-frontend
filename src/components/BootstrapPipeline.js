import { useMemo, useState } from 'react';
import {
  BOOTSTRAP_STEPS,
  buildPipelineStages,
  defaultSelectedStepIds,
} from '../config/bootstrapPipeline';
import { runBootstrapPipeline } from '../config/bootstrapPipelineRunner';
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

function PipelineNode({
  step,
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
        title={`${step.label}${step.requiresTickers ? ' (requires tickers)' : ''}`}
        aria-pressed={isOn}
        aria-label={`${step.label}, ${isOn ? 'included' : 'excluded'}`}
        onClick={() => onToggle(step.id)}
        onFocus={() => onFocus(step.id)}
        onMouseEnter={() => onFocus(step.id)}
      >
        <span className={`jx-node-badge ${isOn ? '' : 'jx-node-badge--off'}`} aria-hidden="true" />
        <span className="jx-node-abbr">{step.shortLabel}</span>
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
}) {
  const stages = useMemo(() => buildPipelineStages(), []);
  const [selected, setSelected] = useState(() => new Set(defaultSelectedStepIds()));
  const [stepStatus, setStepStatus] = useState({});
  const [focusedStepId, setFocusedStepId] = useState(BOOTSTRAP_STEPS[0]?.id);
  const [running, setRunning] = useState(false);

  const selectedCount = selected.size;
  const tickersMissing = !tickersCsv.trim();
  const tickerStepsSelected = BOOTSTRAP_STEPS.some(
    (step) => selected.has(step.id) && step.requiresTickers,
  );

  const focusedStep = BOOTSTRAP_STEPS.find((step) => step.id === focusedStepId) || BOOTSTRAP_STEPS[0];

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
      setSelected(new Set(defaultSelectedStepIds()));
    } else if (preset === 'all') {
      setSelected(new Set(BOOTSTRAP_STEPS.map((step) => step.id)));
    } else {
      setSelected(new Set());
    }
    setStepStatus({});
  };

  const handleRun = async () => {
    if (selectedCount === 0) {
      showToast?.('Select at least one pipeline step', 'warning', 4000);
      return;
    }
    if (tickerStepsSelected && tickersMissing) {
      showToast?.('Enter tickers or use portfolio for ticker-scoped steps', 'warning', 5000);
      return;
    }

    setRunning(true);
    const initialStatus = {};
    selected.forEach((id) => { initialStatus[id] = 'idle'; });
    setStepStatus(initialStatus);

    try {
      const { stepResults, failedCount } = await runBootstrapPipeline({
        selectedStepIds: [...selected],
        tickersCsv,
        onStepStatus: (stepId, status) => {
          setStepStatus((prev) => ({ ...prev, [stepId]: status }));
        },
      });

      await onComplete?.(stepResults);

      if (failedCount === 0) {
        const completed = Object.values(stepResults).filter((r) => r.status === 'success').length;
        showToast?.(`Pipeline complete — ${completed} step${completed === 1 ? '' : 's'} succeeded`, 'success', 5000);
      } else {
        showToast?.(`Pipeline finished with ${failedCount} failed step${failedCount === 1 ? '' : 's'}`, 'danger', 6000);
      }
    } catch (error) {
      showToast?.(error?.message || 'Pipeline failed', 'danger', 6000);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bootstrap-pipeline border rounded p-3 mt-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h2 className="h6 mb-1">Bootstrap Pipeline</h2>
          <div className="text-muted small">
            Click stages to include or exclude. Parallel stages run together.
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={disabled || running}
            onClick={() => applyPreset('recommended')}
          >
            Recommended
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={disabled || running}
            onClick={() => applyPreset('all')}
          >
            Select all
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={disabled || running}
            onClick={() => applyPreset('none')}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="jx-pipeline-track" role="list" aria-label="Bootstrap pipeline stages">
        {stages.map((stage, stageIndex) => (
          <div key={stage.wave} className="d-flex align-items-center flex-shrink-0" role="presentation">
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
              <div className="jx-stage-nodes">
                {stage.steps.map((step) => (
                  <PipelineNode
                    key={step.id}
                    step={step}
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
          <div className="fw-semibold small">
            {focusedStep.label}
            {focusedStep.requiresTickers && (
              <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2">tickers</span>
            )}
            {!selected.has(focusedStep.id) && (
              <span className="badge bg-light text-muted border ms-2">excluded</span>
            )}
          </div>
          <div className="text-muted small">{focusedStep.description}</div>
        </div>
      )}

      {tickerStepsSelected && tickersMissing && (
        <div className="alert alert-warning py-2 small mb-3 mt-2" role="alert">
          Ticker-scoped stages need symbols in the field above (or a non-empty portfolio).
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary mt-2"
        disabled={disabled || running || selectedCount === 0}
        onClick={handleRun}
      >
        {running ? 'Running pipeline…' : `Run pipeline (${selectedCount} stage${selectedCount === 1 ? '' : 's'})`}
      </button>
    </div>
  );
}
