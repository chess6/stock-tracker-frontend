import { render, screen, waitFor } from '@testing-library/react';
import ResearchQueuePage from './ResearchQueuePage';

const mockAxiosGet = jest.fn();
const mockAxiosPut = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  get: (...args) => mockAxiosGet(...args),
  put: (...args) => mockAxiosPut(...args),
  post: (...args) => mockAxiosPost(...args),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('../utils/portfolio', () => ({
  getPortfolio: () => [],
  loadUserPreferences: () => Promise.resolve(),
  PORTFOLIO_UPDATED_EVENT: 'portfolio-updated',
}));

const sampleSignal = {
  dedupKey: 'AAPL:rank_up:2026-06-20',
  ticker: 'AAPL',
  signalType: 'rank_up',
  eventDate: '2026-06-20',
  researchImportance: 0.72,
  whyItMatters: 'Composite rank improved materially.',
  evidence: [],
};

describe('ResearchQueuePage', () => {
  beforeEach(() => {
    mockAxiosPut.mockResolvedValue({ data: { state: { items: {} } } });
    mockAxiosPost.mockResolvedValue({ data: { dismissed: true } });
    mockAxiosGet.mockImplementation((url) => {
      if (url.includes('/signals/morning-brief')) {
        return Promise.resolve({
          data: { items: [sampleSignal], returned: 1, lastVisitedAt: null },
        });
      }
      if (url.includes('/signals/state')) {
        return Promise.resolve({ data: { lastVisitedAt: null, items: {} } });
      }
      if (url.includes('/signals')) {
        return Promise.resolve({
          data: {
            returned: 1,
            uniqueAfterDedup: 1,
            items: [sampleSignal],
            userState: { lastVisitedAt: null },
            meta: { computedAt: '2026-06-20T12:00:00Z' },
          },
        });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
  });

  it('renders signals and link to Firehose', async () => {
    render(<ResearchQueuePage />);

    expect(await screen.findByText('AAPL')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Firehose' })).toHaveAttribute('href', '/firehose');
    expect(screen.getByText(/Composite rank improved/)).toBeInTheDocument();
  });

  it('renders readable evidence instead of a count', async () => {
    mockAxiosGet.mockImplementation((url) => {
      if (url.includes('/signals/morning-brief')) {
        return Promise.resolve({ data: { items: [], returned: 0 } });
      }
      if (url.includes('/signals/state')) {
        return Promise.resolve({ data: { lastVisitedAt: null, items: {} } });
      }
      if (url.includes('/signals')) {
        return Promise.resolve({
          data: {
            returned: 1,
            uniqueAfterDedup: 1,
            items: [{
              ...sampleSignal,
              signalType: 'insider_cluster_buy',
              evidence: [{
                type: 'insider_cluster',
                windowStart: '2026-03-01',
                windowEnd: '2026-03-30',
                uniqueBuyers: 3,
              }],
            }],
            userState: { lastVisitedAt: null },
            meta: { computedAt: '2026-06-20T12:00:00Z' },
          },
        });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });

    render(<ResearchQueuePage />);

    expect(await screen.findByText(/3 insiders bought in cluster/)).toBeInTheDocument();
    expect(screen.queryByText(/evidence item/i)).not.toBeInTheDocument();
  });

  it('shows feature flag banner when signals are disabled', async () => {
    mockAxiosGet.mockImplementation((url) => {
      if (url.includes('/signals') && !url.includes('morning-brief') && !url.includes('/state')) {
        return Promise.reject({
          response: { status: 404, data: { flag: 'experimental_signals' } },
        });
      }
      if (url.includes('/signals/morning-brief')) {
        return Promise.resolve({ data: { items: [] } });
      }
      if (url.includes('/signals/state')) {
        return Promise.resolve({ data: { items: {} } });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });

    render(<ResearchQueuePage />);

    await waitFor(() => {
      expect(screen.getByText(/experimental_signals/)).toBeInTheDocument();
    });
  });
});
