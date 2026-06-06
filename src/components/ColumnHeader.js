import { useState, useRef, useEffect } from 'react';

/**
 * Column header with optional terminal-style help popover (full name, formula, source).
 */
export default function ColumnHeader({ label, meta = {}, canSort, sortDir, onSort }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const hasHelp = meta.tooltip || meta.formula || meta.source;

  return (
    <div
      className="d-inline-flex align-items-center gap-1"
      style={{ position: 'relative', whiteSpace: 'nowrap' }}
      ref={ref}
    >
      <span
        role={canSort ? 'button' : undefined}
        onClick={canSort ? onSort : undefined}
        style={{ cursor: canSort ? 'pointer' : 'default' }}
        title={meta.tooltip || label}
      >
        {label}
      </span>
      {hasHelp && (
        <button
          type="button"
          className="btn btn-link p-0 border-0"
          style={{ fontSize: 11, lineHeight: 1, color: 'rgba(255,255,255,0.75)', minWidth: 14 }}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={`Help for ${meta.fullName || label}`}
        >
          ?
        </button>
      )}
      {canSort && (
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '↕'}
        </span>
      )}
      {open && (
        <div
          className="position-absolute bg-white border rounded shadow-sm text-dark"
          style={{ top: '120%', left: 0, zIndex: 20, minWidth: 220, maxWidth: 300, padding: '8px 10px', fontSize: 12, fontWeight: 400 }}
          onClick={(e) => e.stopPropagation()}
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
      )}
    </div>
  );
}
