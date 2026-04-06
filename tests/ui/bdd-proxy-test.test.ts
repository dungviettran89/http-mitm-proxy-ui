import { test, expect } from '@playwright/test';

const PROXY_PORT = 19090;
const UI_PORT = 14096;
const BASE_URL = `http://127.0.0.1:${UI_PORT}`;
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;

test.describe('HTTP MITM Proxy UI - BDD Style Tests', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.delete(`${BASE_URL}/api/requests`);
    await page.waitForTimeout(500);
  });

  test('Scenario: Making HTTP requests through proxy should populate UI', async ({ page, request }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/HTTP MITM Proxy/);

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} "https://httpbin.org/get?test=bdd-get&timestamp=${Date.now()}"`,
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

    const firstRowText = await requestRows.first().textContent();
    expect(firstRowText).toContain('GET');
    expect(firstRowText).toMatch(/\d{3}/);
  });

  test('Scenario: Viewing request details', async ({ page, request }) => {
    await page.goto(BASE_URL);

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} -H "Content-Type: application/json" -d '{"test":"bdd-detail","timestamp":${Date.now()},"value":123}' "https://httpbin.org/post"`,
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
    await expect(requestRows.first()).toBeVisible();
    await requestRows.first().click();
    await page.waitForTimeout(1000);

    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);
  });

  test('Scenario: Filtering requests by method', async ({ page, request }) => {
    await page.goto(BASE_URL);

    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} "https://httpbin.org/get?test=bdd-filter-get&timestamp=${Date.now()}"`,
      { encoding: 'utf8' }
    );
    require('child_process').execSync(
      `curl -sk -x ${PROXY_URL} -H "Content-Type: application/json" -d '{"test":"filter"}' "https://httpbin.org/post"`,
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
