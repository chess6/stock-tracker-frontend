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

  it('returns deep-dive shortcuts on ticker research route', () => {
    const guide = resolvePageShortcuts('/research/AAPL');
    expect(guide?.pageLabel).toBe('Research deep-dive');
    expect(guide?.sections[0].items.some((item) => item.keys === 'Esc')).toBe(true);
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
