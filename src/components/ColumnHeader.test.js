import { render, screen } from '@testing-library/react';
import ColumnHeader, { formatColumnHeaderHelp } from './ColumnHeader';

describe('ColumnHeader', () => {
  test('formatColumnHeaderHelp joins metadata', () => {
    const text = formatColumnHeaderHelp({
      fullName: 'Price to Earnings',
      tooltip: 'Trailing P/E',
      formula: 'price / eps',
      source: 'SEC + prices',
    });
    expect(text).toContain('Price to Earnings');
    expect(text).toContain('Formula: price / eps');
  });

  test('renders st-tooltip popup without native title attribute', () => {
    render(
      <ColumnHeader
        label="P/E"
        meta={{ tooltip: 'Price to earnings ratio', formula: 'price / eps' }}
        canSort
        sortDir={false}
        onSort={() => {}}
      />,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Formula:');
    expect(screen.getByRole('tooltip')).toHaveTextContent('price / eps');
    expect(document.querySelector('.st-tooltip')).not.toHaveAttribute('title');
  });
});
