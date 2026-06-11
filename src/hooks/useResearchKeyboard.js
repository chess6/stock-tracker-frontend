import { useEffect } from 'react';
import { resolveResearchKeyAction } from '../utils/researchKeyboard';

export default function useResearchKeyboard({
  enabled = true,
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
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
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
