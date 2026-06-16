import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isResearchRoute, resolveResearchKeyAction } from '../utils/researchKeyboard';

export default function useResearchKeyboard({
  enabled = true,
  routePrefix = '/research',
  tickers = [],
  selectedIndex = 0,
  onSelectedIndexChange,
  isDeepDive = false,
  compareTickers = [],
  compareFocusIndex = 0,
  onCompareFocusIndexChange,
  onOpenTicker,
  onTogglePin,
  onToggleCompare,
  onEscape,
}) {
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    if (!enabled || !isResearchRoute(location.pathname, routePrefix)) return undefined;

    const onKeyDown = (event) => {
      if (!isResearchRoute(pathnameRef.current, routePrefix)) return;
      const action = resolveResearchKeyAction(event, {
        tickers,
        selectedIndex,
        isDeepDive,
        compareTickers,
        compareFocusIndex,
      });
      if (!action) return;
      event.preventDefault();

      switch (action.type) {
        case 'select_index':
          onSelectedIndexChange?.(action.nextIndex);
          break;
        case 'open_ticker':
          onOpenTicker?.(action.ticker);
          break;
        case 'toggle_pin':
          onTogglePin?.(action.ticker);
          break;
        case 'toggle_compare':
          onToggleCompare?.(action.ticker);
          break;
        case 'close_details': {
          const open = document.querySelector('details.st-details[open]');
          if (open) open.removeAttribute('open');
          break;
        }
        case 'escape':
          onEscape?.();
          break;
        case 'cycle_compare':
          onCompareFocusIndexChange?.(action.nextIndex);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    enabled,
    routePrefix,
    location.pathname,
    tickers,
    selectedIndex,
    isDeepDive,
    compareTickers,
    compareFocusIndex,
    onSelectedIndexChange,
    onOpenTicker,
    onTogglePin,
    onToggleCompare,
    onEscape,
    onCompareFocusIndexChange,
  ]);
}
