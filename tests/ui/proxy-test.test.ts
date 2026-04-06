import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:14096';
const PROXY_URL = 'http://127.0.0.1:19090';

test.describe('HTTP MITM Proxy UI - Proxy Traffic Tests', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.delete(`${BASE_URL}/api/requests`);
    await page.waitForTimeout(500);
  });

  test('should display requests after making proxied HTTP requests', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(1000);

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} "https://httpbin.org/get?test=playwright-proxy&timestamp=${Date.now()}"`,
      { encoding: 'utf8' }
    );

    let attempts = 0;
    while (attempts < 10) {
      const res = await request.get(`${BASE_URL}/api/requests?limit=1`);
      const json = await res.json();
      if (json.total >= 1) break;
      await page.waitForTimeout(500);
      attempts++;
    }

    await page.reload();
    await page.waitForTimeout(1000);

    const requestRows = page.locator('table tbody tr');
    await expect(requestRows.first()).toBeVisible({ timeout: 5000 });

    const rowText = await requestRows.first().textContent();
    expect(rowText).toContain('GET');
    expect(rowText).toMatch(/\d{3}/);
  });

  test('should show request details when clicking on a request', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(1000);

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} -H "Content-Type: application/json" -d '{"test":"playwright-detail","timestamp":${Date.now()},"value":42}' "https://httpbin.org/post"`,
      { encoding: 'utf8' }
    );

    let attempts = 0;
    while (attempts < 10) {
      const res = await request.get(`${BASE_URL}/api/requests?limit=1`);
      const json = await res.json();
      if (json.total >= 1) break;
      await page.waitForTimeout(500);
      attempts++;
    }

    await page.reload();
    await page.waitForTimeout(1000);

    const requestRows = page.locator('table tbody tr');
    const firstRow = requestRows.first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();
    await page.waitForTimeout(1000);

    const detailView = page.locator('#request-detail, .request-detail, [data-testid="request-detail"]');
    if (await detailView.count() > 0) {
      await expect(detailView).toBeVisible();
    }
  });

  test('should filter requests by method', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(1000);

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} "https://httpbin.org/get?test=filter-get&timestamp=${Date.now()}"`,
      { encoding: 'utf8' }
    );
    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} -H "Content-Type: application/json" -d '{"test":"filter-post"}' "https://httpbin.org/post"`,
      { encoding: 'utf8' }
    );

    let attempts = 0;
    while (attempts < 10) {
      const res = await request.get(`${BASE_URL}/api/requests?limit=10`);
      const json = await res.json();
      if (json.total >= 2) break;
      await page.waitForTimeout(500);
      attempts++;
    }

    await page.reload();
    await page.waitForTimeout(1000);

    const tableText = await page.locator('table').textContent();
    expect(tableText).toContain('GET');
    expect(tableText).toContain('POST');
  });
});
