import {
  clonePreset,
  deleteSavedScreen,
  getSavedScreens,
  resetSavedScreensForTests,
  saveScreen,
} from './savedScreens';
import { getScreenPreset } from '../config/screenPresets';

describe('savedScreens', () => {
  beforeEach(() => {
    resetSavedScreensForTests();
  });

  it('saves and lists screens', () => {
    const entry = saveScreen({
      name: 'My Deep Value',
      universe: 'sp500',
      filterGroups: [{ op: 'AND', filters: [{ metric: 'pb', op: 'lt', value: 0.7 }] }],
      sort: { metric: 'pb', dir: 'asc' },
      limit: 50,
    });
    expect(entry.id).toBeTruthy();
    const screens = getSavedScreens();
    expect(screens).toHaveLength(1);
    expect(screens[0].name).toBe('My Deep Value');
  });

  it('replaces screen with same name', () => {
    saveScreen({
      name: 'Test',
      universe: 'sp500',
      filterGroups: [{ op: 'AND', filters: [{ metric: 'pe', op: 'lt', value: 10 }] }],
    });
    saveScreen({
      name: 'Test',
      universe: 'sp500',
      filterGroups: [{ op: 'AND', filters: [{ metric: 'pb', op: 'lt', value: 0.5 }] }],
    });
    expect(getSavedScreens()).toHaveLength(1);
    expect(getSavedScreens()[0].filterGroups[0].filters[0].metric).toBe('pb');
  });

  it('deletes a saved screen', () => {
    const entry = saveScreen({
      name: 'Delete Me',
      universe: 'sp500',
      filterGroups: [{ op: 'AND', filters: [{ metric: 'pb', op: 'lt', value: 0.7 }] }],
    });
    deleteSavedScreen(entry.id);
    expect(getSavedScreens()).toHaveLength(0);
  });

  it('clones a built-in preset', () => {
    const cloned = clonePreset(getScreenPreset('deep_value'));
    expect(cloned.universe).toBe('sp500');
    expect(cloned.filterGroups[0].filters.length).toBeGreaterThan(0);
    expect(cloned.sourcePresetId).toBe('deep_value');
  });
});
