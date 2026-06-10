import { divergenceSignalLabel, narrativeStateLabel } from './narrativeStates';

describe('narrativeStates labels', () => {
  it('maps known narrative states', () => {
    expect(narrativeStateLabel('bankruptcy_fear')).toBe('Bankruptcy fear');
    expect(narrativeStateLabel('margin_stabilization')).toBe('Margin stabilization');
  });

  it('maps divergence signals', () => {
    expect(divergenceSignalLabel('rerating_candidate')).toBe('Rerating candidate');
    expect(divergenceSignalLabel('risk_flag')).toBe('Risk flag');
  });
});
