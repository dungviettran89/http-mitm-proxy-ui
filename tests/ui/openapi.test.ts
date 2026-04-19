import { test, expect } from '@playwright/test';

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
});
