import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Mini landscape'],
        browserName: 'chromium',
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    // Make the spawned dev server trust its own origin so Better Auth's
    // email/password sign-in does not 403 with INVALID_ORIGIN when the test
    // base URL is http://localhost:3000.
    env: {
      BETTER_AUTH_URL: 'http://localhost:3000',
      PORT: '3000',
    },
  },
});
