import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const UI_PORT = 14096;
const BASE_URL = `http://127.0.0.1:${UI_PORT}`;

test.describe('OpenAPI & Swagger UI Integration', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clear requests and reset spec
    await request.delete(`${BASE_URL}/api/requests`);
    await request.delete(`${BASE_URL}/api/spec`);
    await page.goto(BASE_URL);
  });

  test('should show Path Mapper when no spec exists', async ({ page }) => {
    // Click on Swagger Spec tab
    await page.click('button:has-text("Swagger Spec")');
    
    // Check for Path Mapper header
    await expect(page.locator('h3:has-text("Map API Paths")')).toBeVisible();
    await expect(page.locator('button:has-text("Build OpenAPI Spec")')).toBeVisible();
  });

  test('should show Swagger UI after generating a spec', async ({ page, request }) => {
    // 1. Manually add a request via API to ensure we have data for mapping
    await request.post(`${BASE_URL}/api/spec/generate`, {
      data: {
        mappings: [
          { pattern: '/api/test', methods: ['GET'] }
        ]
      }
    });

    // Reload page to ensure frontend picks up the new spec state
    await page.reload();

    // 2. Navigate to Swagger Spec tab
    await page.click('button:has-text("Swagger Spec")');

    // 3. Should see Swagger UI instead of Path Mapper
    await expect(page.locator('#swagger-ui')).toBeVisible({ timeout: 15000 });
  });

  test('should allow resetting the spec', async ({ page, request }) => {
    // 1. Create a spec first
    await request.post(`${BASE_URL}/api/spec/generate`, {
      data: {
        mappings: [{ pattern: '/api/reset-test', methods: ['POST'] }]
      }
    });

    await page.reload();
    await page.click('button:has-text("Swagger Spec")');
    await expect(page.locator('#swagger-ui')).toBeVisible();

    // 2. Click Reset Spec
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Reset Spec")');

    // 3. Should be back to Path Mapper
    await expect(page.locator('h3:has-text("Map API Paths")')).toBeVisible();
  });

  test('should show Update from Traffic dialog and submit successfully', async ({ page, request }) => {
    // 0. Inject traffic
    execSync('curl -s -x http://127.0.0.1:19090 http://example.com/api/update-test');

    // 1. Create a spec
    await request.post(`${BASE_URL}/api/spec/generate`, {
      data: {
        mappings: [{ pattern: '/api/update-test', methods: ['GET'] }]
      }
    });

    await page.reload();
    await page.click('button:has-text("Swagger Spec")');
    await expect(page.locator('#swagger-ui')).toBeVisible();

    // 2. Click Update from Traffic
    await page.click('button:has-text("Update from Traffic")');

    // 3. Verify dialog is visible
    const dialog = page.locator('.modal-dialog:has-text("Update Endpoint from Traffic")');
    await expect(dialog).toBeVisible();

    // 4. Check that the paths are loaded in the select
    const pathSelect = dialog.locator('#update-path');
    await expect(pathSelect).toContainText('/api/update-test');

    // Select the path and method
    await pathSelect.selectOption('/api/update-test');
    
    const methodSelect = dialog.locator('#update-method');
    await methodSelect.selectOption('GET');

    // 5. Submit
    await dialog.locator('button:has-text("Update")').click();

    // 6. Verify dialog closed
    await expect(dialog).toBeHidden();
  });

  test('should display query and header parameters in Swagger UI', async ({ page, request }) => {
    // 1. Inject traffic with custom headers and query params
    execSync('curl -s -x http://127.0.0.1:19090 -H "X-API-Key: test-key" -H "Authorization: Bearer token" "http://example.com/api/search?q=test&limit=10"');

    // 2. Create a spec
    await request.post(`${BASE_URL}/api/spec/generate`, {
      data: {
        mappings: [{ pattern: '/api/search', methods: ['GET'] }]
      }
    });

    await page.reload();
    await page.click('button:has-text("Swagger Spec")');
    await expect(page.locator('#swagger-ui')).toBeVisible();

    // 3. Expand the endpoint details
    await page.click('.opblock-summary-method:has-text("GET")');

    // 4. Check for query parameters and headers in the Parameters section
    const parametersTable = page.locator('.parameters');
    await expect(parametersTable).toBeVisible();

    // Check query params
    await expect(parametersTable).toContainText('q');
    await expect(parametersTable).toContainText('limit');
    
    // Check header params
    await expect(parametersTable).toContainText('X-API-Key');
    await expect(parametersTable).toContainText('Authorization');
  });
});
