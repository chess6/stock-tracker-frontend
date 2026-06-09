import { render, screen } from '@testing-library/react';
import StTooltip, { StTooltipText } from './StTooltip';

describe('StTooltip', () => {
  test('renders children only when tip is empty', () => {
    render(<StTooltip tip=""><span>Cell</span></StTooltip>);
    expect(screen.getByText('Cell')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('renders floating popup with tip content', () => {
    render(
      <StTooltip tip={<StTooltipText text="profitability · strong" />}>
        <span>Metric</span>
      </StTooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('profitability · strong');
    expect(document.querySelector('.st-tooltip-popup')).toBeInTheDocument();
  });
});
