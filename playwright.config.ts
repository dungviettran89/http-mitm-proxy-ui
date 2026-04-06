import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const serverEntry = path.resolve('dist/index.js');
const sslCaDir = path.resolve('docs/test-ca');

export default defineConfig({
  testDir: './tests/ui',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:14096',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `node "${serverEntry}" --proxy-port 19090 --ui-port 14096 --ssl-ca-dir "${sslCaDir}"`,
    url: 'http://127.0.0.1:14096/api/health',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
