import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL
if (!baseURL || new URL(baseURL).protocol !== 'https:')
  throw new Error('Deployment smoke requires an HTTPS deployment URL.')

export default defineConfig({
  testDir: './smoke',
  timeout: 15_000,
  globalTimeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    trace: 'off',
  },
})
