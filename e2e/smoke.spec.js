// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi } = require('./support/mock-api');

async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle');
  await page.locator('.spinner-border').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

test.describe('smoke', () => {
  test('portfolio loads holdings from preferences API', async ({ page }) => {
    await mockStockTrackerApi(page, { portfolio: ['JPM', 'MCD'], theme: 'dark' });
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.locator('table.portfolio-grid-table')).toBeVisible();
    await expect(page.getByRole('link', { name: 'JPM' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'MCD' })).toBeVisible();
  });

  test('portfolio empty state when preferences has no tickers', async ({ page }) => {
    await mockStockTrackerApi(page, { portfolio: [], theme: 'dark' });
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /your portfolio is empty/i })).toBeVisible();
    await expect(page.locator('table.portfolio-grid-table')).toHaveCount(0);
  });

  test('research deep-dive renders mocked AAPL history', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research/AAPL?dim=MRY&years=10&groups=balance,income,cashflow');
    await waitForPageReady(page);
    await expect(page.getByText('Historical Financials')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AAPL' })).toBeVisible();
    await expect(page.getByText('Apple Inc.')).toBeVisible();
  });

  test('key routes render without API failures', async ({ page }) => {
    const apiFailures = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 400) {
        apiFailures.push({ url, status: response.status() });
      }
    });

    await mockStockTrackerApi(page, { portfolio: ['JPM'], theme: 'dark' });
    for (const route of ['/', '/dashboard', '/news', '/admin', '/screener', '/research/AAPL']) {
      await page.goto(route);
      await waitForPageReady(page);
      await expect(page.locator('.alert-danger')).toHaveCount(0);
    }
    expect(apiFailures).toEqual([]);
  });
});
