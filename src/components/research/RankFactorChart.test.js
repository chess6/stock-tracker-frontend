import { render, screen } from '@testing-library/react';
import RankFactorChart from './RankFactorChart';

describe('RankFactorChart', () => {
  it('renders factor bars with percentile, contribution, and weight', () => {
    render(
      <RankFactorChart
        compositeId="deep_value"
        rankRow={{
          ticker: 'AAPL',
          rank: 3,
          compositeScore: 0.71,
          factorsPresent: 2,
          factorsTotal: 6,
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
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.getByText(/contrib 0\.20/)).toBeInTheDocument();
    expect(screen.getByText(/weight 25%/)).toBeInTheDocument();
    expect(screen.getAllByText('data unavailable').length).toBeGreaterThan(0);
  });

  it('shows empty state when no rank row', () => {
    render(<RankFactorChart embedded />);
    expect(screen.getByText(/No composite rank available/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<RankFactorChart loading embedded />);
    expect(screen.getByText(/Loading rank breakdown/i)).toBeInTheDocument();
  });

  it('displays API-returned weights over preset defaults', () => {
    render(
      <RankFactorChart
        compositeId="deep_value"
        rankRow={{
          ticker: 'AAPL',
          rank: 1,
          compositeScore: 0.65,
          factorsPresent: 1,
          factorsTotal: 6,
          factors: [
            { key: 'survivability', weight: 0.55, normalized: 0.7, contribution: 0.385 },
          ],
        }}
        embedded
      />,
    );

    expect(screen.getByText(/weight 55%/)).toBeInTheDocument();
    expect(screen.queryByText(/weight 20%/)).not.toBeInTheDocument();
  });
});
