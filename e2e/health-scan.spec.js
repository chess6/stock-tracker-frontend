// @ts-check
const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');
const { mockStockTrackerApi } = require('./support/mock-api');
const { waitForPageReady } = require('./support/page-ready');

const REPORT_PATH = path.join(__dirname, '..', 'agent_tasks', 'health-scan-report.json');

const ROUTES = ['/', '/dashboard', '/news', '/admin', '/screener', '/overview/AAPL'];

test.describe('health scan', () => {
  test('collect console errors, API failures, and broken UI', async ({ page }) => {
    const report = {
      console_errors: [],
      api_failures: [],
      broken_ui: [],
      scanned_at: new Date().toISOString(),
    };

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        report.console_errors.push({ text: msg.text(), route: page.url() });
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 400) {
        report.api_failures.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
          route: page.url(),
        });
      }
    });

    await mockStockTrackerApi(page, { portfolio: ['JPM'], theme: 'dark' });

    if (process.env.AGENT_HEALTH_SIMULATE_API_FAILURE === '1') {
      await page.route('**/api/news**', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"simulated"}' }),
      );
    }

    for (const route of ROUTES) {
      await page.goto(route);
      await waitForPageReady(page);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflowPx = doc.scrollWidth - doc.clientWidth;
        return {
          overflowPx,
          viewportWidth: window.innerWidth,
        };
      });
      const threshold = Number(process.env.AGENT_OVERFLOW_THRESHOLD_PX || 48);
      // Flag only meaningful overflow on tablet/mobile viewports
      if (
        overflow.overflowPx > threshold &&
        overflow.viewportWidth < 1200
      ) {
        report.broken_ui.push({
          route,
          reason: `horizontal overflow ${overflow.overflowPx}px (viewport ${overflow.viewportWidth}px)`,
          overflowPx: overflow.overflowPx,
          viewportWidth: overflow.viewportWidth,
        });
      }

      const hasErrorAlert = await page.locator('.alert-danger, .st-alert-danger').count();
      if (hasErrorAlert > 0) {
        const text = await page.locator('.alert-danger, .st-alert-danger').first().textContent();
        if (text && !text.includes('Stale')) {
          report.broken_ui.push({ route, reason: text.trim().slice(0, 200) });
        }
      }
    }

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  });
});
