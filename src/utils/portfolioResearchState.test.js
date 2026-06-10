import { ALL_TAGS_FILTER } from './companyTags';
import { resetCompanyTagsForTests } from './companyTags';
import { resetPortfolioGroupStorageForTests } from './portfolioRowGroups';
import { resetPortfolioPresetStorageForTests } from '../config/portfolioPresets';
import {
  buildPortfolioSearchParams,
  loadPortfolioResearchState,
  parsePortfolioSearchParams,
  resetPortfolioResearchStateForTests,
  savePortfolioResearchState,
} from './portfolioResearchState';

describe('portfolioResearchState', () => {
  beforeEach(() => {
    resetPortfolioResearchStateForTests();
    resetPortfolioPresetStorageForTests();
    resetPortfolioGroupStorageForTests();
    resetCompanyTagsForTests();
  });

  it('parses and builds portfolio URL params', () => {
    const parsed = parsePortfolioSearchParams(
      new URLSearchParams('preset=deep_value&groupBy=sector&tag=Core&compare=AAPL,MSFT&percentiles=1'),
    );
    expect(parsed).toEqual({
      presetId: 'deep_value',
      groupBy: 'sector',
      tagFilter: 'Core',
      compareTickers: ['AAPL', 'MSFT'],
      compareOpen: true,
      showPercentileRanks: true,
    });

    const params = buildPortfolioSearchParams({
      presetId: 'deep_value',
      groupBy: 'sector',
      tagFilter: 'Core',
      compareTickers: ['AAPL', 'MSFT'],
      compareOpen: true,
      showPercentileRanks: true,
    });
    expect(params).toEqual({
      preset: 'deep_value',
      groupBy: 'sector',
      tag: 'Core',
      compare: 'AAPL,MSFT',
      percentiles: '1',
    });
  });

  it('persists and reloads saved research state', () => {
    savePortfolioResearchState({
      presetId: 'insider_activity',
      groupBy: 'industry',
      tagFilter: ALL_TAGS_FILTER,
      compareTickers: ['NVDA', 'AMD'],
      compareOpen: true,
      collapsedGroups: ['Semiconductors'],
    });

    const loaded = loadPortfolioResearchState(new URLSearchParams());
    expect(loaded.presetId).toBe('insider_activity');
    expect(loaded.groupBy).toBe('industry');
    expect(loaded.compareTickers).toEqual(['NVDA', 'AMD']);
    expect(loaded.compareOpen).toBe(true);
    expect(loaded.collapsedGroups).toEqual(['Semiconductors']);
  });

  it('merges URL overrides on top of stored state', () => {
    savePortfolioResearchState({ presetId: 'default', groupBy: 'none', compareTickers: ['AAPL', 'MSFT'], compareOpen: true });
    const loaded = loadPortfolioResearchState(new URLSearchParams('preset=deep_value&groupBy=sector'));
    expect(loaded.presetId).toBe('deep_value');
    expect(loaded.groupBy).toBe('sector');
    expect(loaded.compareTickers).toEqual(['AAPL', 'MSFT']);
  });
});
