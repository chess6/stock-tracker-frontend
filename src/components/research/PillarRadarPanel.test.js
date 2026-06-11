import { render, screen } from '@testing-library/react';
import PillarRadarPanel from './PillarRadarPanel';

describe('PillarRadarPanel', () => {
  it('renders skipped notice when gates fail', () => {
    render(
      <PillarRadarPanel
        pillarData={{
          skipped: true,
          failedGates: ['solvency_runway'],
          pillars: [],
        }}
      />,
    );
    expect(screen.getByText(/Pillar dashboard skipped/i)).toBeInTheDocument();
  });

  it('renders eight pillar tiers without aggregate score', () => {
    const pillars = [
      'valuation',
      'survivability',
      'business_durability',
      'capital_quality',
      'insider_conviction',
      'fundamental_trends',
      'turnaround_evidence',
      'narrative_divergence',
    ].map((pillar, idx) => ({
      pillar,
      label: pillar,
      score: 0.5 + idx * 0.02,
      tier: 'moderate',
      factorsPresent: 3,
      factorsTotal: 4,
      factors: [],
    }));

    render(<PillarRadarPanel pillarData={{ skipped: false, pillars }} />);
    expect(screen.getByText(/not summed into a single rating/i)).toBeInTheDocument();
    expect(screen.getAllByText(/moderate/i).length).toBeGreaterThanOrEqual(8);
  });
});
