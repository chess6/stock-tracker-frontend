/** @typedef {{ keys: string | string[], label: string }} PageShortcut */

/** @typedef {{ title?: string, items: PageShortcut[] }} PageShortcutSection */

/** @typedef {{ pageLabel: string, sections: PageShortcutSection[] } | null} PageShortcutGuide */

/** @type {PageShortcut[]} */
export const GLOBAL_SHORTCUTS = [
  { keys: ['↑', '↓'], label: 'Move selection in ticker search results' },
  { keys: 'Enter', label: 'Open highlighted ticker from search' },
];

/** @type {PageShortcut[]} */
export const DATAGRID_SORT_SHORTCUTS = [
  { keys: 'Click', label: 'Sort column ascending or descending' },
  { keys: ['Shift', 'Click'], label: 'Add a secondary sort column' },
  { keys: 'Reset sort', label: 'Restore the default sort order (toolbar)' },
];

/** @type {PageShortcut[]} */
export const FINANCIAL_GRID_SHORTCUTS = [
  { keys: ['↑', '↓', '←', '→'], label: 'Move the focused cell' },
  { keys: ['Tab', 'Shift+Tab'], label: 'Move across columns' },
];

/** @type {PageShortcut[]} */
export const RESEARCH_SCREENER_SHORTCUTS = [
  { keys: 'j', label: 'Previous ticker' },
  { keys: 'k', label: 'Next ticker' },
  { keys: 'Enter', label: 'Open deep-dive for selected ticker' },
  { keys: 'p', label: 'Pin or unpin selected ticker' },
  { keys: 'c', label: 'Add or remove selected ticker from compare' },
  { keys: ['←', '→'], label: 'Cycle compare tickers (when 2+ selected)' },
];

/** @type {PageShortcut[]} */
export const OVERVIEW_SHORTCUTS = [
  { keys: ['←', '→'], label: 'Switch ticker subnav tabs' },
];

/** @type {PageShortcut[]} */
export const RESEARCH_DEEP_DIVE_SHORTCUTS = [
  { keys: 'Esc', label: 'Close open section, then return to screener' },
  { keys: ['←', '→'], label: 'Cycle compare tickers (when 2+ selected)' },
];

/** @type {PageShortcut[]} */
export const SCREEN_SHORTCUTS = [
  { keys: 'j', label: 'Previous row' },
  { keys: 'k', label: 'Next row' },
  { keys: 'Enter', label: 'Open deep-dive for selected row' },
  { keys: 'p', label: 'Pin or unpin selected ticker' },
];

function gridSortGuide(pageLabel) {
  return {
    pageLabel,
    sections: [{ items: DATAGRID_SORT_SHORTCUTS }],
  };
}

/**
 * Resolve keyboard and interaction shortcuts for the active route.
 * @param {string} pathname
 * @returns {PageShortcutGuide}
 */
export function resolvePageShortcuts(pathname = '') {
  if (!pathname) return null;

  if (pathname === '/') {
    return gridSortGuide('Portfolio');
  }

  if (pathname.startsWith('/overview/')) {
    return {
      pageLabel: 'Overview',
      sections: [{ items: OVERVIEW_SHORTCUTS }],
    };
  }

  if (pathname.startsWith('/research/') && pathname !== '/research') {
    return {
      pageLabel: 'Overview',
      sections: [{ items: OVERVIEW_SHORTCUTS }],
    };
  }

  if (pathname.startsWith('/financials/')) {
    return {
      pageLabel: 'Financials',
      sections: [
        { title: 'Financial tables', items: FINANCIAL_GRID_SHORTCUTS },
      ],
    };
  }

  if (pathname === '/research') {
    return {
      pageLabel: 'Research',
      sections: [
        { items: RESEARCH_SCREENER_SHORTCUTS },
        { title: 'Financial screener', items: FINANCIAL_GRID_SHORTCUTS },
      ],
    };
  }

  if (pathname === '/screen') {
    return {
      pageLabel: 'Screen',
      sections: [{ items: SCREEN_SHORTCUTS }],
    };
  }

  if (pathname === '/screener') {
    return gridSortGuide('Screener');
  }

  if (pathname.startsWith('/finders/')) {
    return gridSortGuide('Finders');
  }

  if (pathname === '/columns') {
    return gridSortGuide('Columns');
  }

  if (pathname === '/industry') {
    return gridSortGuide('Industry');
  }

  return null;
}

/**
 * @param {string} pathname
 * @returns {PageShortcutSection[]}
 */
export function buildProfileShortcutSections(pathname = '') {
  const sections = [];
  const pageGuide = resolvePageShortcuts(pathname);

  if (pageGuide) {
    pageGuide.sections.forEach((section, index) => {
      sections.push({
        title: section.title
          ? `${pageGuide.pageLabel} — ${section.title}`
          : (index === 0 ? `This page — ${pageGuide.pageLabel}` : pageGuide.pageLabel),
        items: section.items,
      });
    });
  }

  sections.push({ title: 'Global', items: GLOBAL_SHORTCUTS });
  return sections;
}
