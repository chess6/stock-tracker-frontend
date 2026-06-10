import { render, screen } from '@testing-library/react';
import ResearchCompactScoreBadges from './ResearchCompactScoreBadges';

describe('ResearchCompactScoreBadges', () => {
  it('renders compact score chips when scores exist', () => {
    render(
      <ResearchCompactScoreBadges
        scores={{
          piotroskiF: 7,
          altmanZ: 2.4,
          beneishM: -2.1,
          survivability: 72,
        }}
      />,
    );
    const badges = screen.getByLabelText('Score badges');
    expect(badges).toBeInTheDocument();
    expect(badges.textContent).toMatch(/F7/);
    expect(badges.textContent).toMatch(/Z2\.4/);
    expect(badges.textContent).toMatch(/S72/);
  });

  it('renders nothing when scores are missing', () => {
    const { container } = render(<ResearchCompactScoreBadges scores={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
