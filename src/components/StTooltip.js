import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MetricFormulaDisplay from './MetricFormulaDisplay';
import { getFormulaDisplaySpec } from '../utils/formulaDisplayRegistry';

const GAP = 8;
const VIEWPORT_PAD = 8;
const MAX_TOOLTIP_WIDTH = 248;

function rectsOverlap(a, b, pad = 2) {
  return !(
    a.right + pad < b.left
    || a.left - pad > b.right
    || a.bottom + pad < b.top
    || a.top - pad > b.bottom
  );
}

function isColumnHeaderAnchor(anchorEl) {
  return Boolean(anchorEl?.closest?.('thead th, .column-header-help'));
}

/** Sticky grid headers / nav bands that should not cover portaled tooltips. */
function getGridObstacleRects(anchorEl) {
  if (typeof document === 'undefined') return [];
  const ownHeader = anchorEl?.closest?.('th') ?? null;
  const ownThead = anchorEl?.closest?.('thead');
  const anchorTable = anchorEl?.closest?.('table');
  const selectors = [
    '.research-grid-thead-page th',
    '.research-grid-scroll thead th',
    '.data-grid-table thead th[style*="position: sticky"]',
    '.portfolio-grid-table thead th[style*="position: sticky"]',
    '.research-screener-card-toolbar',
    '.st-navbar',
  ];
  const rects = [];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el === ownHeader) return;
      // Column-header tooltips sit above the header row — sibling/group thead cells are not obstacles.
      if (ownThead && anchorTable && el.closest?.('thead') === ownThead && el.closest?.('table') === anchorTable) {
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) rects.push(rect);
    });
  });
  return rects;
}

function popupBox(anchorRect, popupEl, placement) {
  const width = popupEl?.offsetWidth || 176;
  const height = popupEl?.offsetHeight || 48;
  let left = anchorRect.left;
  let top = anchorRect.bottom + GAP;

  if (placement === 'top-start') {
    top = anchorRect.top - GAP - height;
  } else if (placement === 'right-start') {
    left = anchorRect.right + GAP;
    top = anchorRect.top;
  } else if (placement === 'bottom-end') {
    left = anchorRect.right - width;
    top = anchorRect.bottom + GAP;
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - MAX_TOOLTIP_WIDTH));
  top = Math.max(VIEWPORT_PAD, top);

  return {
    top,
    left,
    bottom: top + height,
    right: left + width,
    width,
    height,
  };
}

function boxToStyle(box, placement) {
  const base = {
    position: 'fixed',
    zIndex: 10000,
    visibility: 'visible',
    opacity: 1,
  };

  if (placement === 'top-start') {
    return {
      ...base,
      left: `${box.left}px`,
      top: `${box.bottom}px`,
      transform: 'translateY(-100%)',
    };
  }
  if (placement === 'bottom-end') {
    return {
      ...base,
      left: `${box.right}px`,
      top: `${box.top}px`,
      transform: 'translateX(-100%)',
    };
  }
  return {
    ...base,
    left: `${box.left}px`,
    top: `${box.top}px`,
  };
}

function avoidObstacles(anchorEl, popupEl, placement, { lockVerticalFlip = false } = {}) {
  const anchorRect = anchorEl.getBoundingClientRect();
  const obstacles = getGridObstacleRects(anchorEl);
  let effectivePlacement = placement;
  let box = popupBox(anchorRect, popupEl, effectivePlacement);

  const hitsObstacle = () => obstacles.some((o) => rectsOverlap(box, o));

  for (let attempt = 0; attempt < 5 && obstacles.length && hitsObstacle(); attempt += 1) {
    const obstacle = obstacles.find((o) => rectsOverlap(box, o));
    if (!obstacle) break;

    if (effectivePlacement === 'top-start') {
      if (lockVerticalFlip) {
        box.top = Math.max(VIEWPORT_PAD, box.top);
        box.bottom = box.top + box.height;
        break;
      }
      effectivePlacement = 'bottom-start';
      box = popupBox(anchorRect, popupEl, effectivePlacement);
    } else if (effectivePlacement === 'right-start') {
      const nextTop = Math.max(box.top, obstacle.bottom + GAP);
      box = {
        ...box,
        top: nextTop,
        bottom: nextTop + box.height,
      };
    } else if (effectivePlacement === 'bottom-start') {
      if (lockVerticalFlip) {
        box.top = Math.max(VIEWPORT_PAD, box.top);
        box.bottom = box.top + box.height;
        break;
      }
      effectivePlacement = 'top-start';
      box = popupBox(anchorRect, popupEl, effectivePlacement);
    } else {
      const nextTop = obstacle.bottom + GAP;
      box = {
        ...box,
        top: nextTop,
        bottom: nextTop + box.height,
      };
    }
  }

  return { style: boxToStyle(box, effectivePlacement), placement: effectivePlacement };
}

function computeFloatingStyle(anchor, popupEl, placement, options = {}) {
  if (!anchor) return null;
  const lockVerticalFlip = options.lockVerticalFlip ?? isColumnHeaderAnchor(anchor);
  if (popupEl) {
    return avoidObstacles(anchor, popupEl, placement, { lockVerticalFlip });
  }

  const rect = anchor.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + GAP;
  let transform;

  if (placement === 'top-start') {
    top = rect.top - GAP;
    transform = 'translateY(-100%)';
  } else if (placement === 'right-start') {
    left = rect.right + GAP;
    top = rect.top;
  } else if (placement === 'bottom-end') {
    left = rect.right;
    top = rect.bottom + GAP;
    transform = 'translateX(-100%)';
  }

  const maxLeft = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - MAX_TOOLTIP_WIDTH));
  const maxTop = Math.max(VIEWPORT_PAD, top);

  return {
    style: {
      position: 'fixed',
      left: `${maxLeft}px`,
      top: `${maxTop}px`,
      transform,
      zIndex: 10000,
      visibility: 'visible',
      opacity: 1,
    },
    placement,
  };
}

/**
 * Standard floating tooltip — popup is position:absolute and does not affect layout.
 * Prefer this over raw `title` for rich or styled help text.
 *
 * @param {import('react').ReactNode} tip — tooltip body; omit to render children only
 * @param {'bottom-start'|'bottom-end'|'top-start'|'right-start'} [placement]
 * @param {boolean} [floating] — portal to body with fixed positioning (escapes sticky/overflow)
 */
export default function StTooltip({
  tip,
  children,
  className = '',
  placement = 'bottom-start',
  floating = false,
}) {
  const anchorRef = useRef(null);
  const popupRef = useRef(null);
  const lockedPlacementRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState(null);
  const [resolvedPlacement, setResolvedPlacement] = useState(placement);

  const positionTooltip = useCallback(() => {
    if (!floating || !anchorRef.current) return;
    const preferredPlacement = lockedPlacementRef.current ?? placement;
    const computed = computeFloatingStyle(anchorRef.current, popupRef.current, preferredPlacement);
    if (!computed) return;
    if (popupRef.current && !lockedPlacementRef.current) {
      lockedPlacementRef.current = computed.placement;
    }
    setPopupStyle(computed.style);
    setResolvedPlacement(computed.placement);
  }, [floating, placement]);

  useEffect(() => () => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !floating) {
      if (!open) {
        lockedPlacementRef.current = null;
        setPopupStyle(null);
        setResolvedPlacement(placement);
      }
      return undefined;
    }

    let rafId = 0;
    const run = () => positionTooltip();
    run();
    if (!popupRef.current || popupRef.current.offsetHeight === 0) {
      rafId = requestAnimationFrame(run);
    }

    const onScrollOrResize = () => positionTooltip();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, floating, placement, positionTooltip]);

  if (tip == null || tip === '') {
    return children;
  }

  const popup = floating ? (
    open ? (
      createPortal(
        <span
          ref={popupRef}
          className="st-tooltip-popup st-tooltip-popup-floating st-tooltip-popup-portal"
          role="tooltip"
          data-placement={resolvedPlacement}
          style={popupStyle ?? {
            position: 'fixed',
            left: '-9999px',
            top: '-9999px',
            visibility: 'hidden',
            opacity: 0,
            zIndex: 10000,
          }}
        >
          {tip}
        </span>,
        document.body,
      )
    ) : null
  ) : (
    <span className="st-tooltip-popup" role="tooltip">
      {tip}
    </span>
  );

  return (
    <>
      <span
        ref={anchorRef}
        className={`st-tooltip${className ? ` ${className}` : ''}`}
        data-placement={placement}
        data-floating={floating ? 'true' : undefined}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        {children}
        {!floating && popup}
      </span>
      {floating && popup}
    </>
  );
}

/** Rich column / metric help blocks for StTooltip. */
export function StTooltipMetricHelp({
  metricKey,
  fullName,
  tooltip,
  formula,
  source,
}) {
  const displaySpec = getFormulaDisplaySpec(metricKey, formula);

  return (
    <>
      {fullName && <div className="st-tooltip-title">{fullName}</div>}
      {tooltip && <div className="st-tooltip-desc">{tooltip}</div>}
      {displaySpec && (
        <div className="st-tooltip-formula-block">
          <div className="st-tooltip-label">Formula</div>
          <MetricFormulaDisplay spec={displaySpec} />
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
