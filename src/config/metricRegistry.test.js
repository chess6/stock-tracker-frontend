import axios from 'axios';
import registrySnapshot from './__fixtures__/metric_registry.snapshot.json';
import {
  detectRegistryDrift,
  loadMetricRegistry,
  resetMetricRegistryForTests,
} from './metricRegistry';
import { METRIC_RULES } from '../utils/scoringColors';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

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

  test('detectRegistryDrift reports threshold mismatches', () => {
    const live = [{ ...registrySnapshot.metrics[0], danger_threshold: 999 }];
    const drifts = detectRegistryDrift(live, registrySnapshot.metrics);
    expect(drifts.some((msg) => msg.includes('danger_threshold'))).toBe(true);
  });
});
