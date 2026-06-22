import { commitResearchScroll } from './researchScrollState';
import {
  buildResearchTickerPath,
  saveScreenerScrollBeforeLeave,
  saveScreenScrollBeforeLeave,
} from './researchNavigation';

jest.mock('./researchScrollState', () => ({
  commitResearchScroll: jest.fn(),
}));

describe('researchNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 180 });
  });

  it('builds research ticker paths', () => {
    expect(buildResearchTickerPath('aapl', 'MRY')).toBe('/overview/AAPL?dim=MRY');
  });

  it('commits screener and screen scroll keys', () => {
    saveScreenerScrollBeforeLeave();
    expect(commitResearchScroll).toHaveBeenCalledWith('research-screener');
    saveScreenScrollBeforeLeave();
    expect(commitResearchScroll).toHaveBeenCalledWith('research-screen');
  });
});
