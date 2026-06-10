// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi, buildLargeTickerList } = require('./support/mock-api');
const { waitForPageReady } = require('./support/page-ready');
const perfBaseline = require('./support/perf-baseline.json');

const SCREENER_TICKER_COUNT = 75;

test.describe('screener regression', () => {
  test('75-ticker mock screener renders metric rows within latency budget', async ({ page }) => {
    const tickers = buildLargeTickerList(SCREENER_TICKER_COUNT);
    await mockStockTrackerApi(page, { theme: 'dark' });

    const started = Date.now();
    await page.goto(`/research?tickers=${encodeURIComponent(tickers.join(','))}&dim=MRY`);
    await waitForPageReady(page);

    await expect(page.locator('.research-grid-table')).toBeVisible();
    await expect(page.getByText(`${SCREENER_TICKER_COUNT} tickers`)).toBeVisible();

    const metricCells = page.locator('.research-grid-table tbody tr:not(.group-header) td.numeric-cell');
    await expect(metricCells.first()).toBeVisible();

    const elapsedMs = Date.now() - started;
    const budget = perfBaseline.researchScreener75TickersMs * perfBaseline.regressionMultiplier;
    expect(elapsedMs).toBeLessThan(budget);
  });
});
