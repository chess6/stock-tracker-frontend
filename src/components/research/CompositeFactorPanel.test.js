import { render, screen } from '@testing-library/react';
import CompositeFactorPanel from './CompositeFactorPanel';

describe('CompositeFactorPanel', () => {
  it('renders factor bars sorted by contribution', () => {
    render(
      <CompositeFactorPanel
        compositeId="deep_value"
        rankRow={{
          ticker: 'AAPL',
          rank: 3,
          compositeScore: 0.71,
          factorsPresent: 2,
          factorsTotal: 5,
          factors: [
            { key: 'survivability', weight: 0.2, normalized: 0.6, contribution: 0.12 },
            { key: 'valuation_dislocation', weight: 0.25, normalized: 0.8, contribution: 0.2 },
          ],
        }}
        embedded
      />,
    );

    expect(screen.getByText('Deep Value Opportunity')).toBeInTheDocument();
    expect(screen.getByText('0.710')).toBeInTheDocument();
    expect(screen.getByText('Valuation dislocation')).toBeInTheDocument();
    expect(screen.getByText('Survivability')).toBeInTheDocument();
  });

  it('shows empty state when no rank row', () => {
    render(<CompositeFactorPanel embedded />);
    expect(screen.getByText(/No composite rank available/i)).toBeInTheDocument();
  });
});
