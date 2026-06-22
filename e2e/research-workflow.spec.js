// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi } = require('./support/mock-api');
const { waitForPageReady } = require('./support/page-ready');

test.describe('research workflow (B3)', () => {
  test('screener keyboard j/k selects ticker and Enter deep-dives', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research?tickers=JPM,MCD&dim=MRY');
    await waitForPageReady(page);

    await expect(page.getByText('Financial Screener')).toBeVisible();
    await expect(page.locator('.research-ticker-header--selected .st-ticker', { hasText: 'JPM' })).toBeVisible();

    await page.keyboard.press('k');
    await expect(page.locator('.research-ticker-header--selected .st-ticker', { hasText: 'MCD' })).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/overview\/MCD/);
    await expect(page.getByText('Investment Thesis')).toBeVisible();
  });

  test('legacy research deep-dive URL redirects to overview', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research/MCD?dim=MRY');
    await waitForPageReady(page);
    await expect(page).toHaveURL(/\/overview\/MCD\?dim=MRY/);
    await expect(page.getByText('Investment Thesis')).toBeVisible();
  });

  test('p pins selected ticker to persistent strip', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research?tickers=JPM,MCD&dim=MRY');
    await waitForPageReady(page);

    await page.keyboard.press('k');
    await page.keyboard.press('p');

    const strip = page.locator('.research-pinned-strip');
    await expect(strip).toBeVisible();
    await expect(strip.getByText('MCD')).toBeVisible();

    const pinned = await page.evaluate(() => localStorage.getItem('research-pinned-tickers'));
    expect(pinned).toContain('MCD');
  });

  test('clicking screener ticker link preserves scroll on return', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research?tickers=JPM,MCD&dim=MRY');
    await waitForPageReady(page);

    await page.evaluate(() => {
      document.body.style.minHeight = '3000px';
    });
    await page.mouse.wheel(0, 280);
    await page.waitForFunction(() => window.scrollY >= 200, null, { timeout: 3000 });

    await page.locator('.research-ticker-header').getByRole('link', { name: 'MCD' }).click();
    await expect(page).toHaveURL(/\/financials\/MCD/);
    await page.goBack();
    await expect(page.getByText('Financial Screener')).toBeVisible({ timeout: 15000 });
    await page.waitForFunction(() => window.scrollY >= 200, null, { timeout: 5000 });
  });

  test('screener scroll position is restored after deep-dive round trip', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/research?tickers=JPM,MCD&dim=MRY');
    await waitForPageReady(page);

    await page.evaluate(() => {
      document.body.style.minHeight = '3000px';
    });
    await page.mouse.wheel(0, 280);
    await page.waitForFunction(() => window.scrollY >= 200, null, { timeout: 3000 });

    await page.keyboard.press('k');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/overview\/MCD/);
    await page.goBack();
    await expect(page.getByText('Financial Screener')).toBeVisible({ timeout: 15000 });

    await page.waitForFunction(() => window.scrollY >= 200, null, { timeout: 5000 });
    const restored = await page.evaluate(() => window.scrollY);
    expect(restored).toBeGreaterThanOrEqual(200);
  });
});

test.describe('composable screen (B1/B2)', () => {
  test('/screen runs preset and keyboard selects rows', async ({ page }) => {
    await mockStockTrackerApi(page, { theme: 'dark' });
    await page.goto('/screen?preset=deep_value');
    await waitForPageReady(page);

    await page.getByRole('button', { name: 'Run screen' }).click();
    await expect(page.getByRole('link', { name: 'JPM' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'MCD' })).toBeVisible();

    await page.keyboard.press('k');
    const activeRows = page.locator('tbody tr.table-active');
    await expect(activeRows).toHaveCount(1);
    await expect(activeRows.first()).toContainText('MCD');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/overview\/MCD/);
  });
});
