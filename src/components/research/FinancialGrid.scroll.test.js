/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import FinancialGrid from './FinancialGrid';
import { readResearchScroll, saveResearchScroll } from '../../utils/researchScrollState';

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

describe('FinancialGrid scroll persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    let scrollY = 0;
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollY,
    });
    window.scrollTo = jest.fn((_x, y) => {
      scrollY = y;
    });
    window.scrollTo(0, 0);
  });

  it('saves and restores window scroll in page scroll mode', () => {
    const columns = [{ id: 'metric', accessorKey: 'metric', header: 'Metric' }];
    const data = [{ id: 'row-1', metric: 'P/E' }];

    const { unmount } = render(
      <FinancialGrid
        data={data}
        columns={columns}
        scrollMode="page"
        scrollPersistenceKey="research-screener"
        enableKeyboardNav={false}
      />,
    );

    window.scrollTo(0, 320);
    unmount();
    expect(readResearchScroll('research-screener')).toBe(320);

    saveResearchScroll('research-screener', 320);
    render(
      <FinancialGrid
        data={data}
        columns={columns}
        scrollMode="page"
        scrollPersistenceKey="research-screener"
        enableKeyboardNav={false}
      />,
    );
    expect(window.scrollTo).toHaveBeenCalledWith(0, 320);
  });
});
