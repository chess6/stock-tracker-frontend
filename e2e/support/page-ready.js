/** @param {import('@playwright/test').Page} page */
async function waitForPageReady(page) {
  await page.waitForLoadState('load');
  await page.locator('.spinner-border').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

/** Hide transient toasts so screenshots stay stable across UI copy changes. */
/** @param {import('@playwright/test').Page} page */
async function stabilizeForScreenshot(page) {
  await page.locator('.st-toast-stack').evaluate((node) => {
    node.style.display = 'none';
  }).catch(() => {});
}

module.exports = { waitForPageReady, stabilizeForScreenshot };
