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
        },
      },
    });
    mockAxiosPost.mockResolvedValue({
      data: {
        flags: {
          experimental_research_composite_rank: true,
          experimental_composite_rank: false,
          experimental_signal_ranking: false,
          embedding_heavy_retag: false,
        },
      },
    });
  });

  it('loads and toggles research composite ranking flag', async () => {
    const showToast = jest.fn();
    render(<AdminFeatureFlags showToast={showToast} />);

    expect(await screen.findByLabelText(/Research composite ranking/i)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Research composite ranking/i));

    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith('/api/admin/config', {
        experimental_research_composite_rank: true,
      });
    });
    expect(showToast).toHaveBeenCalledWith('Research composite ranking enabled', 'success', 4000);
  });
});
