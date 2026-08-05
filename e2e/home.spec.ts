import { expect, test } from '@playwright/test'

test('renders the Stagecom home page', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      name: /keep the whole production moving together/i,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Public navigation' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Open my callsheet' }),
  ).toHaveAttribute('href', '/app/callsheet')
})

test('redirects protected app routes to login with intent', async ({
  page,
}) => {
  await page.goto('/app/main-stage')
  await expect(
    page.getByRole('heading', { name: /sign in to stagecom/i }),
  ).toBeVisible()
  expect(page.url()).toContain('/login')
  expect(page.url()).toContain('next=%2Fapp%2Fmain-stage')
})
