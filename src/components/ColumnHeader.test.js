import { render, screen } from '@testing-library/react';
import ColumnHeader, { formatColumnHeaderHelp } from './ColumnHeader';

describe('ColumnHeader', () => {
  test('formatColumnHeaderHelp joins metadata', () => {
    const text = formatColumnHeaderHelp({
      metricKey: 'pe',
      fullName: 'Price to Earnings',
      tooltip: 'Trailing P/E',
      formula: 'price / diluted EPS',
    });
    expect(text).toContain('Price to Earnings');
    expect(text).toContain('Formula: Price / Diluted EPS');
  });

  test('renders visual formula tooltip without raw code string', () => {
    render(
      <ColumnHeader
        label="P/E"
        meta={{ metricKey: 'pe', tooltip: 'Price to earnings ratio', formula: 'price / diluted EPS' }}
        canSort
        sortDir={false}
        onSort={() => {}}
      />,
    );
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Formula');
    expect(tooltip).toHaveTextContent('Price');
    expect(tooltip).toHaveTextContent('Diluted EPS');
    expect(tooltip).not.toHaveTextContent('price / diluted EPS');
    expect(document.querySelector('.st-metric-fraction-bar')).toBeInTheDocument();
    expect(tooltip).not.toHaveAttribute('title');
  });
});
