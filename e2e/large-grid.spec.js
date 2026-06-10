// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi, buildLargeTickerList } = require('./support/mock-api');
const { waitForPageReady } = require('./support/page-ready');
const perfBaseline = require('./support/perf-baseline.json');

const LARGE_TICKER_COUNT = 500;

test.describe('large grid', () => {
  test('research screener renders 500-ticker mock grid within regression budget', async ({ page }) => {
    const tickers = buildLargeTickerList(LARGE_TICKER_COUNT);
    await mockStockTrackerApi(page, { theme: 'dark' });

    const started = Date.now();
    await page.goto(`/research?tickers=${encodeURIComponent(tickers.join(','))}&dim=MRY`);
    await waitForPageReady(page);

    const grid = page.locator('.research-grid-table');
    await expect(grid).toBeVisible();
    await expect(page.getByText(`${LARGE_TICKER_COUNT} tickers`)).toBeVisible();

    const dataRows = page.locator('.research-grid-table tbody tr:not(.group-header)');
    await expect(dataRows.first()).toBeVisible();

    const elapsedMs = Date.now() - started;
    const budget = perfBaseline.researchScreener500TickersMs * perfBaseline.regressionMultiplier;
    expect(elapsedMs).toBeLessThan(budget);
  });
});
