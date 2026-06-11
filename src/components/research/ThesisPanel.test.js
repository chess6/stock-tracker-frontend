import { render, screen } from '@testing-library/react';
import ThesisPanel from './ThesisPanel';

describe('ThesisPanel', () => {
  it('renders pre-mortem first and disconfirming conditions', () => {
    render(
      <ThesisPanel
        thesisData={{
          disqualified: false,
          sections: {
            preMortem: {
              headline: 'Pre-mortem: how you lose money here.',
              statements: [{ text: 'Cheap for 5 years — value trap base rate.' }],
            },
            bearCase: [{ text: 'Interest coverage 0.8x.' }],
            bullCase: [{ rebuttal: 'Insider buying suggests manageable leverage.' }],
            valuationAssessment: { summary: 'Anchored on haircut NAV.', assumptions: [] },
            catalystWatchlist: [],
            disconfirmingConditions: [
              { text: 'Thesis weakens if runway falls below 12 months.', factorKey: 'runway_months' },
              { text: 'Thesis weakens if Altman Z enters distress.', factorKey: 'altman_zone' },
            ],
            evidenceCoverage: { overall: 0.72 },
            signalIndependence: {
              orthogonalClassCount: 3,
              label: 'corroborated',
              description: 'Multi-source profile.',
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/Pre-mortem/i)).toBeInTheDocument();
    expect(screen.getByText(/Disconfirming conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence coverage & signal independence/i)).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it('shows disqualification banner when gates fail', () => {
    render(
      <ThesisPanel
        thesisData={{
          disqualified: true,
          sections: {
            preMortem: { headline: 'Disqualified', statements: [] },
            bearCase: [],
            bullCase: [],
            disconfirmingConditions: [
              { text: 'Condition A', factorKey: 'a' },
              { text: 'Condition B', factorKey: 'b' },
            ],
          },
        }}
      />,
    );
    expect(screen.getByText(/Disqualified — gate failure/i)).toBeInTheDocument();
  });
});
