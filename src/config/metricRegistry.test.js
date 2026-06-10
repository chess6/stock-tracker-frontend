jest.mock('axios', () => ({
  get: jest.fn(),
}));

import axios from 'axios';
import registrySnapshot from './__fixtures__/metric_registry.snapshot.json';
import {
  detectRegistryDrift,
  loadMetricRegistry,
  resetMetricRegistryForTests,
} from './metricRegistry';
import { METRIC_RULES } from '../utils/scoringColors';

describe('metricRegistry', () => {
  beforeEach(() => {
    resetMetricRegistryForTests();
    jest.resetAllMocks();
  });

  test('loadMetricRegistry applies backend rules', async () => {
    axios.get.mockResolvedValue({ data: registrySnapshot });
    const registry = await loadMetricRegistry();
    expect(registry).toHaveLength(registrySnapshot.metrics.length);
    expect(METRIC_RULES.de.dangerThreshold).toBe(2);
    expect(METRIC_RULES.de.excellentThreshold).toBe(0.5);
  });

  test('detectRegistryDrift returns empty for matching snapshot', () => {
    const drifts = detectRegistryDrift(registrySnapshot.metrics, registrySnapshot.metrics);
    expect(drifts).toEqual([]);
  });

  test('detectRegistryDrift warns on threshold changes', () => {
    const mutated = registrySnapshot.metrics.map((entry) => (
      entry.key === 'pe'
        ? { ...entry, danger_threshold: 99 }
        : entry
    ));
    const drifts = detectRegistryDrift(mutated, registrySnapshot.metrics);
    expect(drifts.some((msg) => msg.includes('pe.danger_threshold'))).toBe(true);
  });
});
