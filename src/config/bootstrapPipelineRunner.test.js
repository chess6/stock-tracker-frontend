import axios from 'axios';
import {
  formatPipelineStepResult,
  formatStepError,
  runBootstrapPipeline,
} from './bootstrapPipelineRunner';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('bootstrapPipelineRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('formatStepError prefers API error payload', () => {
    expect(formatStepError({
      response: { status: 500, data: { error: 'SPY prices missing' } },
      message: 'Request failed with status code 500',
    })).toBe('SPY prices missing');
  });

  test('market_reactions reports per-ticker failures', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { ticker: 'AAPL', articlesUpdated: 3, limit: 200 } })
      .mockRejectedValueOnce({
        response: { status: 500, data: { error: 'database locked' } },
        message: 'Request failed with status code 500',
      });

    const { stepResults, failedCount } = await runBootstrapPipeline({
      selectedStepIds: ['market_reactions'],
      tickersCsv: 'AAPL,MSFT',
      mode: 'fast',
    });

    expect(failedCount).toBe(1);
    expect(stepResults.market_reactions.status).toBe('error');
    expect(stepResults.market_reactions.error).toContain('MSFT: database locked');
    expect(stepResults.market_reactions.data.tickers).toHaveLength(1);
    expect(stepResults.market_reactions.data.failures).toHaveLength(1);
  });

  test('market_reactions fails clearly with no tickers', async () => {
    const { stepResults, failedCount } = await runBootstrapPipeline({
      selectedStepIds: ['market_reactions'],
      tickersCsv: '  ,  ',
      mode: 'fast',
    });

    expect(failedCount).toBe(0);
    expect(stepResults.market_reactions.status).toBe('skipped');
    expect(stepResults.market_reactions.error).toContain('No tickers provided');
  });

  test('formatPipelineStepResult summarizes market reaction output', () => {
    const text = formatPipelineStepResult('market_reactions', {
      status: 'success',
      data: {
        tickers: [{ ticker: 'AAPL', articlesUpdated: 2 }],
        failures: [],
      },
    });
    expect(text).toContain('AAPL: 2 articles updated');
  });
});
