import registrySnapshot from '../config/__fixtures__/metric_registry.snapshot.json';
import {
  applyRegistryRules,
  getMetricBackground,
  beneishHeatStyle,
  survivabilityHeatStyle,
  piotroskiHeatStyle,
  altmanZHeatStyle,
  screenerCellHeatStyle,
  buildHistoricalStats,
} from './scoringColors';
import { piotroskiHeatStyle as heatMapPiotroski, altmanZHeatStyle as heatMapAltman } from './heatMap';

const SCORE_METRICS = [
  { key: 'piotroskiF', samples: [2, 6, 8] },
  { key: 'altmanZ', samples: [1.2, 2.5, 4.5] },
  { key: 'beneishM', samples: [-2.75, -2.29, -1.5] },
  { key: 'survivability', samples: [15, 45, 85] },
];

const DEPRECATED_WRAPPERS = {
  piotroskiF: piotroskiHeatStyle,
  altmanZ: altmanZHeatStyle,
  beneishM: beneishHeatStyle,
  survivability: survivabilityHeatStyle,
};

describe('scoring parity (deprecated wrappers vs canonical)', () => {
  beforeEach(() => {
    applyRegistryRules(registrySnapshot.metrics);
  });

  SCORE_METRICS.forEach(({ key, samples }) => {
    test(`${key} deprecated wrapper matches getMetricBackground`, () => {
      const wrapper = DEPRECATED_WRAPPERS[key];
      samples.forEach((value) => {
        const canonical = getMetricBackground(key, value, { mode: 'deep_value' });
        const legacy = wrapper(value);
        expect(legacy).toEqual(canonical);
      });
    });
  });

  test('heatMap score helpers delegate to canonical path', () => {
    expect(heatMapPiotroski(8)).toEqual(getMetricBackground('piotroskiF', 8, { mode: 'deep_value' }));
    expect(heatMapAltman(1.2)).toEqual(getMetricBackground('altmanZ', 1.2, { mode: 'deep_value' }));
  });

  test('screenerCellHeatStyle matches getMetricBackground for sector mode', () => {
    const sector = buildHistoricalStats([0.2, 0.3, 0.4, 0.5, 0.6]);
    const value = 0.55;
    const viaWrapper = screenerCellHeatStyle('grossMargin', value, {
      mode: 'sector',
      format: 'percent',
      sectorBreakpoints: sector,
    });
    const canonical = getMetricBackground('grossMargin', value, {
      mode: 'sector',
      format: 'percent',
      sector: sector,
    });
    expect(viaWrapper).toEqual(canonical);
  });
});
