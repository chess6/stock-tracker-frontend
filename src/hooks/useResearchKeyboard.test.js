import { fireEvent, render, screen } from '@testing-library/react';
import useResearchKeyboard from './useResearchKeyboard';

function KeyboardHarness({
  tickers,
  selectedIndex,
  isDeepDive,
  compareTickers,
  handlers,
}) {
  useResearchKeyboard({
    enabled: true,
    tickers,
    selectedIndex,
    onSelectedIndexChange: handlers.onSelectedIndexChange,
    isDeepDive,
    compareTickers,
    compareFocusIndex: 0,
    onCompareFocusIndexChange: handlers.onCompareFocusIndexChange,
    onOpenTicker: handlers.onOpenTicker,
    onTogglePin: handlers.onTogglePin,
    onToggleCompare: handlers.onToggleCompare,
    onEscape: handlers.onEscape,
  });
  return <div data-testid="harness">ready</div>;
}

describe('useResearchKeyboard', () => {
  it('wires j/k and Enter to handlers', () => {
    const handlers = {
      onSelectedIndexChange: jest.fn(),
      onOpenTicker: jest.fn(),
      onTogglePin: jest.fn(),
      onToggleCompare: jest.fn(),
      onEscape: jest.fn(),
      onCompareFocusIndexChange: jest.fn(),
    };
    render(
      <KeyboardHarness
        tickers={['AAPL', 'MSFT']}
        selectedIndex={0}
        isDeepDive={false}
        compareTickers={[]}
        handlers={handlers}
      />,
    );
    expect(screen.getByTestId('harness')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'k' });
    expect(handlers.onSelectedIndexChange).toHaveBeenCalledWith(1);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(handlers.onOpenTicker).toHaveBeenCalledWith('AAPL');
    fireEvent.keyDown(window, { key: 'p' });
    expect(handlers.onTogglePin).toHaveBeenCalledWith('AAPL');
  });

  it('calls escape handler in deep-dive mode', () => {
    const handlers = {
      onSelectedIndexChange: jest.fn(),
      onOpenTicker: jest.fn(),
      onTogglePin: jest.fn(),
      onToggleCompare: jest.fn(),
      onEscape: jest.fn(),
      onCompareFocusIndexChange: jest.fn(),
    };
    render(
      <KeyboardHarness
        tickers={[]}
        selectedIndex={0}
        isDeepDive
        compareTickers={['AAPL', 'MSFT']}
        handlers={handlers}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handlers.onEscape).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handlers.onCompareFocusIndexChange).toHaveBeenCalledWith(1);
  });
});
