import { fireEvent, render, screen } from '@testing-library/react';
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
  });

  test('portals floating tooltip to document.body above overflow containers', () => {
    render(
      <StTooltip floating placement="top-start" tip={<StTooltipText text="gross profit / revenue" />}>
        <span>Gross Margin</span>
      </StTooltip>,
    );
    fireEvent.mouseEnter(screen.getByText('Gross Margin'));
    const portalTip = screen.getByRole('tooltip');
    expect(portalTip).toHaveTextContent('gross profit / revenue');
    expect(portalTip).toHaveClass('st-tooltip-popup-portal');
    expect(portalTip).toHaveStyle({ position: 'fixed', zIndex: '10000' });
    fireEvent.mouseLeave(screen.getByText('Gross Margin'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
