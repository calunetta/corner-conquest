import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    // Cloud sessions set CHROMIUM_PATH (SessionStart hook) when their preinstalled Chromium
    // differs from the build this Playwright version expects.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
