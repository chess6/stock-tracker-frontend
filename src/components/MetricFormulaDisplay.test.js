import { render, screen } from '@testing-library/react';
import MetricFormulaDisplay from './MetricFormulaDisplay';
import { StTooltipMetricHelp } from './StTooltip';
import {
  formatFormulaPlainText,
  getFormulaDisplaySpec,
  parseFormulaString,
} from '../utils/formulaDisplayRegistry';

describe('formulaDisplayRegistry', () => {
  test('gross margin spec is a ratio', () => {
    const spec = getFormulaDisplaySpec('grossMargin', 'gross profit / revenue');
    expect(spec.type).toBe('ratio');
    expect(formatFormulaPlainText(spec)).toBe('Gross profit / Revenue');
  });

  test('altman Z uses weighted sum of mini fractions', () => {
    const spec = getFormulaDisplaySpec('altmanZ');
    expect(spec.type).toBe('weighted_sum');
    expect(spec.terms).toHaveLength(5);
  });

  test('parseFormulaString handles subtraction and notes', () => {
    const spec = parseFormulaString('revenue − gross profit (or reported directly)');
    expect(spec.type).toBe('difference');
    expect(spec.note).toBe('or reported directly');
  });
});

describe('MetricFormulaDisplay', () => {
  test('renders stacked ratio for gross margin', () => {
    render(<MetricFormulaDisplay spec={getFormulaDisplaySpec('grossMargin')} />);
    expect(screen.getByText('Gross profit')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(document.querySelector('.st-metric-fraction-bar')).toBeInTheDocument();
  });

  test('renders enterprise value group in EV/EBITDA', () => {
    render(<MetricFormulaDisplay spec={getFormulaDisplaySpec('evEbitda')} />);
    expect(screen.getByText('Market cap')).toBeInTheDocument();
    expect(screen.getByText('EBITDA')).toBeInTheDocument();
  });

  test('tangible book per share uses single minus per subtracted term', () => {
    const { container } = render(<MetricFormulaDisplay spec={getFormulaDisplaySpec('tangibleBookPerShare')} />);
    expect(screen.getByText('Equity')).toBeInTheDocument();
    expect(screen.getByText('Goodwill')).toBeInTheDocument();
    expect(screen.getByText('Intangibles')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/−\s*−/);
  });
});

describe('StTooltipMetricHelp', () => {
  test('renders visual formula block for column headers', () => {
    render(
      <StTooltipMetricHelp
        metricKey="grossMargin"
        fullName="Gross Margin"
        tooltip="Profitability metric"
        formula="gross profit / revenue"
      />,
    );
    expect(screen.getByText('Formula')).toBeInTheDocument();
    expect(screen.getByText('Gross profit')).toBeInTheDocument();
    expect(screen.queryByText('gross profit / revenue')).not.toBeInTheDocument();
  });
});
