// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi } = require('./support/mock-api');
const { waitForPageReady, stabilizeForScreenshot } = require('./support/page-ready');

test.describe('visual regression', () => {
  test('portfolio empty state', async ({ page }) => {
    await mockStockTrackerApi(page, { portfolio: [], theme: 'dark' });
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /your portfolio is empty/i })).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('portfolio-empty.png', { fullPage: true });
  });

  test('portfolio with holdings', async ({ page }) => {
    await mockStockTrackerApi(page, { portfolio: ['JPM', 'MCD'], theme: 'dark' });
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.locator('table.portfolio-grid-table')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: 'JPM' })).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('portfolio-loaded.png', { fullPage: true });
  });

  test('dashboard', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('news hub', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/news');
    await waitForPageReady(page);
    await expect(page.getByText('Markets steady')).toBeVisible({ timeout: 15000 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('news.png', { fullPage: true });
  });

  test('admin console', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/admin');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /admin console/i })).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('admin.png', { fullPage: true });
  });

  test('screener', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/screener');
    await waitForPageReady(page);
    await expect(page.getByRole('link', { name: 'JPM' })).toBeVisible({ timeout: 15000 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('screener.png', { fullPage: true });
  });

  test('research deep-dive', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research/AAPL?dim=MRY&years=10&groups=balance,income,cashflow');
    await waitForPageReady(page);
    await expect(page.getByText('Historical Financials')).toBeVisible({ timeout: 20000 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('research-aapl-deep-dive.png', { fullPage: true });
  });
});
