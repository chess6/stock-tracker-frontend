// @ts-check
const { test, expect } = require('@playwright/test');
const { mockStockTrackerApi } = require('./support/mock-api');
const { waitForPageReady } = require('./support/page-ready');

test.describe('dashboard layout', () => {
  test('places macro treemap to the right of the portfolio list on wide screens', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockStockTrackerApi(page, { portfolio: ['AAPL', 'JPM'], theme: 'dark' });
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const portfolio = page.locator('.dashboard-layout__portfolio');
    const macro = page.locator('.dashboard-layout__macro');
    await expect(portfolio).toBeVisible();
    await expect(macro).toBeVisible();
    await expect(page.getByText('Macro Treemap')).toBeVisible();

    const portfolioBox = await portfolio.boundingBox();
    const macroBox = await macro.boundingBox();
    expect(portfolioBox).not.toBeNull();
    expect(macroBox).not.toBeNull();
    expect(macroBox.x).toBeGreaterThan(portfolioBox.x);
    expect(portfolioBox.x + portfolioBox.width).toBeLessThanOrEqual(macroBox.x + 2);
  });

  test('stacks portfolio above macro on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await mockStockTrackerApi(page, { portfolio: ['AAPL'], theme: 'dark' });
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const portfolio = page.locator('.dashboard-layout__portfolio');
    const macro = page.locator('.dashboard-layout__macro');
    await expect(portfolio).toBeVisible();
    await expect(macro).toBeVisible();

    const portfolioBox = await portfolio.boundingBox();
    const macroBox = await macro.boundingBox();
    expect(portfolioBox).not.toBeNull();
    expect(macroBox).not.toBeNull();
    expect(macroBox.y).toBeGreaterThanOrEqual(portfolioBox.y + portfolioBox.height - 4);
  });
});
