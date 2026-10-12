import { render, screen } from '@testing-library/react';
import registrySnapshot from '../config/__fixtures__/metric_registry.snapshot.json';
import { applyRegistryRules } from '../utils/scoringColors';
import MetricFormulaFraction from './MetricFormulaFraction';
import StTooltipHeatCell from './StTooltipHeatCell';

describe('StTooltipHeatCell', () => {
  beforeEach(() => {
    applyRegistryRules(registrySnapshot.metrics);
  });

  test('renders tier and stacked fraction bar', () => {
    render(
      <StTooltipHeatCell
        metricKey="grossMargin"
        value={0.8927}
        heatContext={{ mode: 'deep_value', format: 'percent' }}
        tickerData={{
          fundamentals: { revenue: 439_400_000_000, gp: 392_400_000_000 },
        }}
      />,
    );
    expect(screen.getByText(/Elite \(5\/5\)/)).toBeInTheDocument();
    expect(screen.getByText('$392 B')).toBeInTheDocument();
    expect(screen.getByText('$439 B')).toBeInTheDocument();
    expect(screen.getByText('= 89.27%')).toBeInTheDocument();
    expect(document.querySelector('.st-metric-fraction-bar')).toBeInTheDocument();
  });
});

describe('MetricFormulaFraction', () => {
  test('returns null when operands missing', () => {
    const { container } = render(<MetricFormulaFraction numerator="" denominator="$100" result="50%" />);
    expect(container).toBeEmptyDOMElement();
  });
});
