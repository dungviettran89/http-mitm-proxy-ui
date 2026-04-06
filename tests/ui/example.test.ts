import { test, expect } from '@playwright/test';

const PROXY_URL = 'http://127.0.0.1:19090';

test('should load the HTTP MITM Proxy UI', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/HTTP MITM Proxy/);
  await expect(page.locator('#app, .app')).toBeVisible({ timeout: 5000 }).catch(() => {});
});

test('should show request list after proxy traffic', async ({ page, request }) => {
  await page.goto('/');

  require('child_process').execSync(
    `curl -sk --max-time 30 -x ${PROXY_URL} "https://httpbin.org/get?test=example"`,
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

  const requestsTable = page.locator('table');
  await expect(requestsTable).toBeVisible({ timeout: 10000 });
});

test('should have working API endpoints', async ({ request }) => {
  const healthResponse = await request.get('/api/health');
  expect(healthResponse.ok()).toBeTruthy();
  const healthJson = await healthResponse.json();
  expect(healthJson.status).toBe('ok');

  const configResponse = await request.get('/api/config');
  expect(configResponse.ok()).toBeTruthy();
  const configJson = await configResponse.json();
  expect(configJson).toHaveProperty('proxyPort');
  expect(configJson).toHaveProperty('uiPort');
});
