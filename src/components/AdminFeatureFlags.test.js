import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminFeatureFlags from './AdminFeatureFlags';

const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  get: (...args) => mockAxiosGet(...args),
  post: (...args) => mockAxiosPost(...args),
}));

describe('AdminFeatureFlags', () => {
  beforeEach(() => {
    mockAxiosGet.mockResolvedValue({
      data: {
        flags: {
          experimental_research_composite_rank: false,
          experimental_composite_rank: false,
          experimental_signal_ranking: false,
          embedding_heavy_retag: false,
          experimental_research_queue: false,
          experimental_thesis_versioning: false,
          experimental_backtest_route: false,
          experimental_insider_alerts: false,
          experimental_narrative_alerts: false,
        },
      },
    });
    mockAxiosPost.mockResolvedValue({
      data: {
        flags: {
          experimental_research_composite_rank: false,
          experimental_composite_rank: true,
          experimental_signal_ranking: false,
          embedding_heavy_retag: false,
        },
      },
    });
  });

  it('renders collapsed by default with enabled count in summary', async () => {
    render(<AdminFeatureFlags showToast={jest.fn()} />);

    const summary = await screen.findByText('Experimental feature flags');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(await screen.findByText('0 of 8 enabled')).toBeInTheDocument();
  });

  it('shows research composite ranking as inactive without a toggle', async () => {
    render(<AdminFeatureFlags showToast={jest.fn()} />);

    expect(await screen.findByText('Research composite ranking')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText(/Retired — composite rank is always on/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Research composite ranking/i })).not.toBeInTheDocument();
  });

  it('loads and toggles article composite rank flag', async () => {
    const showToast = jest.fn();
    render(<AdminFeatureFlags showToast={showToast} />);

    const toggle = await screen.findByLabelText(/Article composite rank/i);
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith('/api/admin/config', {
        experimental_composite_rank: true,
      });
    });
    expect(showToast).toHaveBeenCalledWith('Article composite rank enabled', 'success', 4000);
  });

  it('shows all active feature flag toggles when expanded', async () => {
    render(<AdminFeatureFlags showToast={jest.fn()} />);

    await userEvent.click(await screen.findByText('Experimental feature flags'));

    expect(await screen.findByLabelText(/Research queue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Insider alerts API/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Narrative alerts API/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Article composite rank/i)).toBeInTheDocument();
  });
});
