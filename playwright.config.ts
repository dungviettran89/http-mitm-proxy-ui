import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const installDir = path.resolve('test-node-modules');
const serverEntry = path.join(installDir, 'node_modules/http-mitm-proxy-ui/dist/index.js');

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
    baseURL: 'http://localhost:14096',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `node "${serverEntry}" --proxy-port 19090 --ui-port 14096 --ssl-ca-dir ./docs/test-ca`,
    port: 14096,
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
