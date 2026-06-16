import { fireEvent, render, screen } from '@testing-library/react';
import useResearchKeyboard from './useResearchKeyboard';

const mockLocation = { pathname: '/research' };

jest.mock(
  'react-router-dom',
  () => ({
    useLocation: () => mockLocation,
  }),
  { virtual: true },
);

function KeyboardHarness({
  tickers,
  selectedIndex,
  isDeepDive,
  compareTickers,
  routePrefix = '/research',
  handlers,
}) {
  useResearchKeyboard({
    enabled: true,
    routePrefix,
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

function renderHarness(props) {
  mockLocation.pathname = props.initialPath || '/research';
  return render(<KeyboardHarness {...props} />);
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
    renderHarness(
      {
        tickers: ['AAPL', 'MSFT'],
        selectedIndex: 0,
        isDeepDive: false,
        compareTickers: [],
        handlers,
      },
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
    renderHarness(
      {
        tickers: [],
        selectedIndex: 0,
        isDeepDive: true,
        compareTickers: ['AAPL', 'MSFT'],
        initialPath: '/research/AAPL',
        handlers,
      },
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handlers.onEscape).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handlers.onCompareFocusIndexChange).toHaveBeenCalledWith(1);
  });

  it('does not handle keys when route prefix does not match', () => {
    const handlers = {
      onSelectedIndexChange: jest.fn(),
      onOpenTicker: jest.fn(),
      onTogglePin: jest.fn(),
      onToggleCompare: jest.fn(),
      onEscape: jest.fn(),
      onCompareFocusIndexChange: jest.fn(),
    };
    renderHarness(
      {
        tickers: ['AAPL', 'MSFT'],
        selectedIndex: 0,
        isDeepDive: false,
        compareTickers: [],
        routePrefix: '/research',
        initialPath: '/news',
        handlers,
      },
    );
    fireEvent.keyDown(window, { key: 'k' });
    expect(handlers.onSelectedIndexChange).not.toHaveBeenCalled();
  });
});
