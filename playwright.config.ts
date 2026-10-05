import { defineConfig, devices } from '@playwright/test'

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '3000'
const playwrightBaseUrl = `http://localhost:${playwrightPort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'playwright-report/results.json' }]]
    : 'list',
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: playwrightBaseUrl,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
