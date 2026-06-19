import { render, screen } from '@testing-library/react';
import ThesisDriftChart from './ThesisDriftChart';

describe('ThesisDriftChart', () => {
  it('renders gate timeline for thesis history', () => {
    render(
      <ThesisDriftChart
        history={[
          {
            snapshot_date: '2026-06-01',
            composite_score: 0.72,
            disqualified: false,
            gates: {
              solvency_runway: 'pass',
              accounting_integrity: 'fail',
            },
          },
        ]}
        embedded
      />,
    );
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('0.720')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ThesisDriftChart loading embedded />);
    expect(screen.getByText(/Loading thesis drift/)).toBeInTheDocument();
  });

  it('shows empty state without history', () => {
    render(<ThesisDriftChart history={[]} embedded />);
    expect(screen.getByText(/Thesis drift appears after/)).toBeInTheDocument();
  });
});
