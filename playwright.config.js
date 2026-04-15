// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'node server/server.js',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 10000,
    },
    {
      command: 'node scripts/serve-build.js',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 10000,
    },
  ],
});
