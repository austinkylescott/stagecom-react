import { expect, test } from '@playwright/test'

test('renders the Stagecom home page', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /theater operations start here/i }),
  ).toBeVisible()
})

test('redirects protected app routes to login with intent', async ({ page }) => {
  await page.goto('/app/main-stage')
  await expect(
    page.getByRole('heading', { name: /sign in to stagecom/i }),
  ).toBeVisible()
  expect(page.url()).toContain('/login')
  expect(page.url()).toContain('next=%2Fapp%2Fmain-stage')
})
