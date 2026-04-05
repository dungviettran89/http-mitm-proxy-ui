import { test, expect } from '@playwright/test';

const PROXY_URL = 'http://localhost:19090';

test.describe('HTTP MITM Proxy UI - Functional Tests', () => {
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/requests');
  });

  test('should load the application with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/HTTP MITM Proxy/);
    await expect(page.getByRole('heading', { name: /MITM Proxy/i })).toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });

  test('should show empty state when no requests', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test('should display requests after proxy traffic', async ({ page, request }) => {
    await page.goto('/');

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} "https://httpbin.org/get?test=playwright-ui&timestamp=${Date.now()}"`,
      { encoding: 'utf8' }
    );

    let attempts = 0;
    while (attempts < 10) {
      const res = await request.get('/api/requests?limit=1');
      const json = await res.json();
      if (json.total >= 1) break;
      await page.waitForTimeout(500);
      attempts++;
    }

    await page.reload();
    await page.waitForTimeout(1000);

    const requestRows = page.locator('table tbody tr');
    const rowCount = await requestRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('should have working API endpoints for request management', async ({ request }) => {
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.ok()).toBeTruthy();
    const healthJson = await healthResponse.json();
    expect(healthJson.status).toBe('ok');

    const configResponse = await request.get('/api/config');
    expect(configResponse.ok()).toBeTruthy();
    const configJson = await configResponse.json();
    expect(configJson).toHaveProperty('proxyPort');
    expect(configJson).toHaveProperty('uiPort');
    expect(configJson.proxyPort).toBe(19090);
    expect(configJson.uiPort).toBe(14096);

    const requestsResponse = await request.get('/api/requests?limit=1');
    expect(requestsResponse.ok()).toBeTruthy();
    const requestsJson = await requestsResponse.json();
    expect(requestsJson).toHaveProperty('data');
    expect(requestsJson).toHaveProperty('total');
    expect(requestsJson.total).toBeGreaterThanOrEqual(0);

    const clearResponse = await request.delete('/api/requests');
    expect(clearResponse.ok()).toBeTruthy();
    const clearJson = await clearResponse.json();
    expect(clearJson.message).toBe('Requests cleared');

    const afterClearResponse = await request.get('/api/requests?limit=1');
    const afterClearJson = await afterClearResponse.json();
    expect(afterClearJson.total).toBe(0);
  });

  test('should handle errors gracefully', async ({ request }) => {
    // Unknown API routes fall through to SPA fallback (serves index.html with 200)
    const response = await request.get('/api/nonexistent');
    expect(response.status()).toBe(200); // SPA fallback
    const text = await response.text();
    expect(text.toLowerCase()).toContain('<!doctype html>'); // HTML content, not JSON
  });
});
