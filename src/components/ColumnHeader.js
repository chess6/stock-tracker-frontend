import { useState } from 'react';

/** Plain-text help fallback for screen readers / tests. */
export function formatColumnHeaderHelp(meta = {}) {
  const parts = [];
  if (meta.fullName) parts.push(meta.fullName);
  if (meta.tooltip) parts.push(meta.tooltip);
  if (meta.formula) parts.push(`Formula: ${meta.formula}`);
  if (meta.source) parts.push(`Source: ${meta.source}`);
  return parts.join('\n');
}

function HelpPopover({ meta }) {
  return (
    <div
      className="position-absolute bg-body border rounded shadow-sm column-header-help-popover"
      style={{
        top: '120%',
        left: 0,
        zIndex: 20,
        minWidth: 220,
        maxWidth: 300,
        padding: '8px 10px',
        fontSize: 12,
        fontWeight: 400,
        pointerEvents: 'none',
      }}
    >
      {meta.fullName && <div className="fw-bold mb-1">{meta.fullName}</div>}
      {meta.tooltip && <div className="text-muted mb-1">{meta.tooltip}</div>}
      {meta.formula && (
        <div className="mb-1">
          <span className="fw-semibold">Formula: </span>
          <code style={{ fontSize: 11 }}>{meta.formula}</code>
        </div>
      )}
      {meta.source && (
        <div className="text-muted" style={{ fontSize: 11 }}>
          Source: {meta.source}
        </div>
      )}
    </div>
  );
}

/**
 * Column header with terminal-style help popover on hover (full name, formula, source).
 */
export default function ColumnHeader({ label, meta = {}, canSort, sortDir, onSort }) {
  const [hovered, setHovered] = useState(false);
  const hasHelp = meta.tooltip || meta.formula || meta.source || meta.fullName;

  return (
    <div
      className="d-inline-flex align-items-center gap-1 column-header-help"
      style={{ position: 'relative', whiteSpace: 'nowrap' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        role={canSort ? 'button' : undefined}
        onClick={canSort ? onSort : undefined}
        style={{ cursor: canSort ? 'pointer' : 'default' }}
        aria-label={hasHelp ? formatColumnHeaderHelp(meta) : label}
      >
        {label}
      </span>
      {canSort && (
        <span className="st-grid-sort-icon">
          {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '↕'}
        </span>
      )}
      {hovered && hasHelp && <HelpPopover meta={meta} />}
    </div>
  );
}
