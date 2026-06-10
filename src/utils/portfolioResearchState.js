import { ALL_TAGS_FILTER, getActiveTagFilter, setActiveTagFilter } from './companyTags';
import {
  DEFAULT_PORTFOLIO_GROUP_BY,
  getActivePortfolioGroupBy,
  getCollapsedPortfolioGroups,
  setActivePortfolioGroupBy,
  setCollapsedPortfolioGroups,
} from './portfolioRowGroups';
import {
  DEFAULT_PORTFOLIO_PRESET_ID,
  getActivePortfolioPresetId,
  getPortfolioPresetById,
  setActivePortfolioPresetId,
} from '../config/portfolioPresets';
import { parseCompareParam } from './researchUrlState';

export const PORTFOLIO_RESEARCH_STATE_KEY = 'portfolio-research-state';

function normalizeSorting(sorting) {
  if (!Array.isArray(sorting)) return [];
  return sorting
    .filter((item) => item && typeof item.id === 'string')
    .map((item) => ({ id: item.id, desc: Boolean(item.desc) }));
}

function normalizeVisibleColumns(columns) {
  if (!Array.isArray(columns)) return null;
  const cleaned = columns.filter((col) => typeof col === 'string' && col);
  return cleaned.length ? cleaned : null;
}

function readUnifiedStore() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_RESEARCH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLegacyState() {
  const preset = getPortfolioPresetById(getActivePortfolioPresetId());
  return {
    presetId: getActivePortfolioPresetId(),
    groupBy: getActivePortfolioGroupBy(),
    tagFilter: getActiveTagFilter(),
    visibleColumns: preset.visibleColumns,
    sorting: preset.defaultSort ? [preset.defaultSort] : [],
    collapsedGroups: [...getCollapsedPortfolioGroups()],
    compareTickers: [],
    compareOpen: false,
    showPercentileRanks: false,
  };
}

export function sanitizePortfolioResearchState(raw = {}) {
  const presetId = getPortfolioPresetById(raw.presetId || DEFAULT_PORTFOLIO_PRESET_ID).id;
  const preset = getPortfolioPresetById(presetId);
  const groupBy = raw.groupBy || DEFAULT_PORTFOLIO_GROUP_BY;
  const tagFilter = raw.tagFilter || ALL_TAGS_FILTER;
  const compareTickers = parseCompareParam(
    Array.isArray(raw.compareTickers) ? raw.compareTickers.join(',') : '',
  );

  return {
    presetId,
    groupBy,
    tagFilter,
    visibleColumns: normalizeVisibleColumns(raw.visibleColumns) || preset.visibleColumns,
    sorting: normalizeSorting(raw.sorting).length
      ? normalizeSorting(raw.sorting)
      : (preset.defaultSort ? [preset.defaultSort] : []),
    collapsedGroups: Array.isArray(raw.collapsedGroups)
      ? raw.collapsedGroups.filter((key) => typeof key === 'string')
      : [],
    compareTickers,
    compareOpen: Boolean(raw.compareOpen) && compareTickers.length >= 2,
    showPercentileRanks: Boolean(raw.showPercentileRanks),
  };
}

export function loadPortfolioResearchState(searchParams) {
  const stored = sanitizePortfolioResearchState(readUnifiedStore() || readLegacyState());
  const fromUrl = parsePortfolioSearchParams(searchParams);
  return sanitizePortfolioResearchState({ ...stored, ...fromUrl });
}

export function parsePortfolioSearchParams(searchParams) {
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(searchParams || '');
  const out = {};

  const preset = params.get('preset');
  if (preset) out.presetId = preset;

  const groupBy = params.get('groupBy');
  if (groupBy) out.groupBy = groupBy;

  const tag = params.get('tag');
  if (tag) out.tagFilter = tag === ALL_TAGS_FILTER ? ALL_TAGS_FILTER : tag;

  const compare = parseCompareParam(params.get('compare'));
  if (compare.length) {
    out.compareTickers = compare;
    out.compareOpen = compare.length >= 2;
  }

  if (params.get('percentiles') === '1') {
    out.showPercentileRanks = true;
  }

  return out;
}

export function buildPortfolioSearchParams(state = {}) {
  const params = {};
  if (state.presetId && state.presetId !== DEFAULT_PORTFOLIO_PRESET_ID) {
    params.preset = state.presetId;
  }
  if (state.groupBy && state.groupBy !== DEFAULT_PORTFOLIO_GROUP_BY) {
    params.groupBy = state.groupBy;
  }
  if (state.tagFilter && state.tagFilter !== ALL_TAGS_FILTER) {
    params.tag = state.tagFilter;
  }
  if (state.compareOpen && state.compareTickers?.length >= 2) {
    params.compare = state.compareTickers.join(',');
  }
  if (state.showPercentileRanks) {
    params.percentiles = '1';
  }
  return params;
}

export function savePortfolioResearchState(state) {
  const sanitized = sanitizePortfolioResearchState(state);
  localStorage.setItem(PORTFOLIO_RESEARCH_STATE_KEY, JSON.stringify(sanitized));

  setActivePortfolioPresetId(sanitized.presetId);
  setActivePortfolioGroupBy(sanitized.groupBy);
  setActiveTagFilter(sanitized.tagFilter);
  setCollapsedPortfolioGroups(new Set(sanitized.collapsedGroups));

  return sanitized;
}

/** @internal test helper */
export function resetPortfolioResearchStateForTests() {
  localStorage.removeItem(PORTFOLIO_RESEARCH_STATE_KEY);
}
