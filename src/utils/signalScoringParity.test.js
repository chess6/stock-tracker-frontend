import parityFixtures from '../config/__fixtures__/signal_scoring_parity.json';
import {
  RESEARCH_IMPORTANCE_WEIGHTS,
  computeResearchImportance,
  researchImportanceBreakdown,
} from './signalScoring';

describe('signal scoring parity (frontend vs backend fixtures)', () => {
  test('weights sum to 1', () => {
    const sum = Object.values(RESEARCH_IMPORTANCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  parityFixtures.forEach((fixture) => {
    test(`${fixture.id} matches backend golden score`, () => {
      const score = computeResearchImportance(fixture.inputs);
      expect(score).toBe(fixture.expected);
      const breakdown = researchImportanceBreakdown(fixture.inputs);
      expect(breakdown.total).toBe(fixture.expected);
    });
  });
});
