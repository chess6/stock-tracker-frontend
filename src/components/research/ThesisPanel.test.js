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

  it('shows disqualification banner and hides non-premortem sections', () => {
    render(
      <ThesisPanel
        thesisData={{
          disqualified: true,
          disqualificationNotice: { failedGates: ['solvency_runway'] },
          sections: {
            preMortem: {
              headline: 'Disqualified',
              statements: [{ text: 'Gate failure dominates.', source: 'solvency_runway' }],
            },
            bearCase: [],
            bullCase: [],
            disconfirmingConditions: [],
          },
        }}
      />,
    );
    expect(screen.getByText(/Disqualified — gate failure/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed gates: solvency_runway/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bear case/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Valuation assessment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Disconfirming conditions/i)).not.toBeInTheDocument();
  });
});
