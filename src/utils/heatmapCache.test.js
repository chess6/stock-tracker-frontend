import {
  rowsDatasetKey,
  buildColumnMinMaxMap,
  getCachedColumnMinMaxMap,
  clearHeatmapCache,
} from './heatmapCache';

describe('heatmapCache', () => {
  beforeEach(() => {
    clearHeatmapCache();
  });

  test('rowsDatasetKey changes when metric values change', () => {
    const base = [{ ticker: 'A', ep: 10 }, { ticker: 'B', ep: 12 }];
    const changed = [{ ticker: 'A', ep: 10 }, { ticker: 'B', ep: 15 }];
    const keyA = rowsDatasetKey(base, { metricKeys: ['ep'] });
    const keyB = rowsDatasetKey(changed, { metricKeys: ['ep'] });
    expect(keyA).not.toBe(keyB);
  });

  test('rowsDatasetKey stable for same data', () => {
    const rows = [{ ticker: 'A', ep: 10 }];
    const key1 = rowsDatasetKey(rows, { metricKeys: ['ep'] });
    const key2 = rowsDatasetKey(rows, { metricKeys: ['ep'] });
    expect(key1).toBe(key2);
  });

  test('buildColumnMinMaxMap computes min/max', () => {
    const rows = [{ ep: 2 }, { ep: 8 }, { ep: null }];
    const map = buildColumnMinMaxMap(rows, ['ep']);
    expect(map.ep).toEqual({ min: 2, max: 8 });
  });

  test('getCachedColumnMinMaxMap returns cached result', () => {
    const rows = [{ ticker: 'A', ep: 3 }, { ticker: 'B', ep: 7 }];
    const datasetKey = rowsDatasetKey(rows, { idKey: 'ticker', metricKeys: ['ep'] });
    const first = getCachedColumnMinMaxMap(rows, ['ep'], datasetKey);
    const second = getCachedColumnMinMaxMap(rows, ['ep'], datasetKey);
    expect(first).toBe(second);
    expect(first.ep).toEqual({ min: 3, max: 7 });
  });
});
