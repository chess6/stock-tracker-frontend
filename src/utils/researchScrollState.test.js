import {
  clearResearchScroll,
  commitResearchScroll,
  readResearchScroll,
  saveResearchScroll,
  touchResearchScroll,
} from './researchScrollState';

describe('researchScrollState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists scroll position per key', () => {
    saveResearchScroll('research-screener', 240);
    expect(readResearchScroll('research-screener')).toBe(240);
    clearResearchScroll('research-screener');
    expect(readResearchScroll('research-screener')).toBeNull();
  });

  it('commits peak scroll after transient scroll-to-top', () => {
    touchResearchScroll('research-screener', 240);
    touchResearchScroll('research-screener', 0);
    commitResearchScroll('research-screener');
    expect(readResearchScroll('research-screener')).toBe(240);
  });
});
