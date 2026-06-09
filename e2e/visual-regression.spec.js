// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi } = require('./support/mock-api');

async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle');
  await page.locator('.spinner-border').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

test.describe('visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await mockStockTrackerApi(page);
  });

  test('portfolio empty state', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('portfolio', '[]'));
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('portfolio-empty.png', { fullPage: true });
  });

  test('portfolio with holdings', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('portfolio', JSON.stringify(['JPM', 'MCD'])));
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot('portfolio-loaded.png', { fullPage: true });
  });

  test('dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('news hub', async ({ page }) => {
    await page.goto('/news');
    await waitForPageReady(page);
    await expect(page.getByText('Markets steady')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot('news.png', { fullPage: true });
  });

  test('admin console', async ({ page }) => {
    await page.goto('/admin');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: /admin console/i })).toBeVisible();
    await expect(page).toHaveScreenshot('admin.png', { fullPage: true });
  });

  test('screener', async ({ page }) => {
    await page.goto('/screener');
    await waitForPageReady(page);
    await expect(page.getByRole('link', { name: 'JPM' })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot('screener.png', { fullPage: true });
  });

  test('research deep-dive', async ({ page }) => {
    await page.goto('/research/AAPL?dim=MRY&years=10&groups=balance,income,cashflow');
    await waitForPageReady(page);
    await expect(page.getByText('Historical Financials')).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveScreenshot('research-aapl-deep-dive.png', { fullPage: true });
  });
});
