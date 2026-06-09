/**
 * Standard floating tooltip — popup is position:absolute and does not affect layout.
 * Prefer this over raw `title` for rich or styled help text.
 *
 * @param {import('react').ReactNode} tip — tooltip body; omit to render children only
 * @param {'bottom-start'|'bottom-end'|'top-start'} [placement]
 */
export default function StTooltip({
  tip,
  children,
  className = '',
  placement = 'bottom-start',
}) {
  if (tip == null || tip === '') {
    return children;
  }

  return (
    <span
      className={`st-tooltip${className ? ` ${className}` : ''}`}
      data-placement={placement}
    >
      {children}
      <span className="st-tooltip-popup" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

/** Rich column / metric help blocks for StTooltip. */
export function StTooltipMetricHelp({ fullName, tooltip, formula, source }) {
  return (
    <>
      {fullName && <div className="st-tooltip-title">{fullName}</div>}
      {tooltip && <div className="st-tooltip-desc">{tooltip}</div>}
      {formula && (
        <div className="st-tooltip-row">
          <span className="st-tooltip-label">Formula: </span>
          <code className="st-tooltip-code">{formula}</code>
        </div>
      )}
      {source && <div className="st-tooltip-meta">Source: {source}</div>}
    </>
  );
}

/** Plain string tip with optional line breaks preserved. */
export function StTooltipText({ text }) {
  if (!text) return null;
  return <span className="st-tooltip-text">{text}</span>;
}
