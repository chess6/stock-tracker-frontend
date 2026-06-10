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

  test('runs wave steps sequentially instead of in parallel', async () => {
    const order = [];
    axios.post.mockImplementation(async (url) => {
      if (url.includes('refresh-fundamentals')) order.push('fundamentals');
      if (url.includes('refresh-prices')) order.push('prices');
      return { data: { tickers: ['AAPL'] } };
    });

    await runBootstrapPipeline({
      selectedStepIds: ['fundamentals', 'prices'],
      tickersCsv: 'AAPL',
      mode: 'fast',
    });

    expect(order).toEqual(['fundamentals', 'prices']);
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('chunks large ticker lists into POST bodies', async () => {
    const tickers = Array.from({ length: 85 }, (_, index) => `T${index}`);
    axios.post.mockResolvedValue({ data: { tickers: ['T0'], recordsWritten: 1 } });

    await runBootstrapPipeline({
      selectedStepIds: ['fundamentals'],
      tickersCsv: tickers.join(','),
      mode: 'fast',
    });

    expect(axios.post).toHaveBeenCalledTimes(3);
    expect(axios.post.mock.calls[0][1]).toEqual({ tickers: tickers.slice(0, 40) });
    expect(axios.post.mock.calls[1][1]).toEqual({ tickers: tickers.slice(40, 80) });
    expect(axios.post.mock.calls[2][1]).toEqual({ tickers: tickers.slice(80, 85) });
  });

  test('formatStepError strips HTML 500 pages', () => {
    expect(formatStepError({
      response: { status: 500, data: '<!doctype html><html><title>500</title>' },
    })).toContain('server error');
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
