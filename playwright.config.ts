import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const localArgs = process.env.PLAYWRIGHT_CHROMIUM_ARGS;
if (process.env.CI && (executablePath || localArgs || (process.env.E2E_EXPECT_STORAGE && process.env.E2E_EXPECT_STORAGE !== 'postgres'))) {
  throw new Error('CI must use installed Playwright Chromium and the real PostgreSQL stack.');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/e2e.xml' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      ...(localArgs ? { args: JSON.parse(localArgs) as string[] } : {}),
    },
  },
});
