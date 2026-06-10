import { fireEvent, render, screen } from '@testing-library/react';
import ResearchPinnedStrip from './ResearchPinnedStrip';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  }),
  { virtual: true },
);

describe('ResearchPinnedStrip', () => {
  it('renders nothing without pinned tickers', () => {
    const { container } = render(<ResearchPinnedStrip pinnedTickers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders chips and handles unpin/select', () => {
    const onUnpin = jest.fn();
    const onSelect = jest.fn();
    render(
      <ResearchPinnedStrip
        pinnedTickers={['AAPL', 'MSFT']}
        selectedTicker="AAPL"
        onUnpin={onUnpin}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByLabelText('Pinned companies')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AAPL' }));
    expect(onSelect).toHaveBeenCalledWith('AAPL');
    fireEvent.click(screen.getByRole('button', { name: 'Unpin MSFT' }));
    expect(onUnpin).toHaveBeenCalledWith('MSFT');
  });
});
