import {
  resolvePageShortcuts,
  buildProfileShortcutSections,
} from './pageShortcuts';

describe('pageShortcuts', () => {
  it('returns portfolio grid sort shortcuts on home', () => {
    const guide = resolvePageShortcuts('/');
    expect(guide?.pageLabel).toBe('Portfolio');
    expect(guide?.sections[0].items.some((item) => item.keys.includes('Shift'))).toBe(true);
  });

  it('returns screener and financial grid shortcuts on research', () => {
    const guide = resolvePageShortcuts('/research');
    expect(guide?.pageLabel).toBe('Research');
    expect(guide?.sections).toHaveLength(2);
  });

  it('returns deep-dive shortcuts on ticker overview route', () => {
    const guide = resolvePageShortcuts('/overview/AAPL');
    expect(guide?.pageLabel).toBe('Overview');
    expect(guide?.sections[0].items.some((item) => item.keys.includes('←'))).toBe(true);
  });

  it('returns financial grid shortcuts on financials route', () => {
    const guide = resolvePageShortcuts('/financials/AAPL');
    expect(guide?.pageLabel).toBe('Financials');
    expect(guide?.sections[0].title).toBe('Financial tables');
  });

  it('returns screen navigation shortcuts', () => {
    const guide = resolvePageShortcuts('/screen');
    expect(guide?.pageLabel).toBe('Screen');
  });

  it('returns null for pages without page-specific shortcuts', () => {
    expect(resolvePageShortcuts('/news')).toBeNull();
  });

  it('always includes global shortcuts in profile sections', () => {
    const sections = buildProfileShortcutSections('/news');
    expect(sections.some((section) => section.title === 'Global')).toBe(true);
    expect(sections).toHaveLength(1);
  });

  it('includes page and global sections on portfolio', () => {
    const sections = buildProfileShortcutSections('/');
    expect(sections.some((section) => section.title === 'This page — Portfolio')).toBe(true);
    expect(sections.some((section) => section.title === 'Global')).toBe(true);
  });
});
