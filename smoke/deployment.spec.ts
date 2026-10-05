import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page, baseURL }) => {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  if (bypass) {
    // Send the protection credential only to this deployment's own origin.
    await page.route(`${new URL(baseURL!).origin}/**`, (route) =>
      route.continue({
        headers: {
          ...route.request().headers(),
          'x-vercel-protection-bypass': bypass,
        },
      }),
    )
  }
})

test('the deployed homepage renders the app and Callsheet entry', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      name: /keep the whole production moving together/i,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Open my callsheet' }),
  ).toHaveAttribute('href', '/app/callsheet')
})

test('production sign-in renders without demo access', async ({ page }) => {
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: /sign in to stagecom/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^Theater Member/ }),
  ).toHaveCount(0)
})

test('a private Callsheet preserves login intent', async ({ page }) => {
  await page.goto('/app/callsheet')
  await expect(
    page.getByRole('heading', { name: /sign in to stagecom/i }),
  ).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/login')
  expect(new URL(page.url()).searchParams.get('next')).toBe('/app/callsheet')
})

test('public programming reaches its anonymous database query', async ({
  page,
}) => {
  await page.goto('/theater')
  await expect(
    page.getByRole('heading', { name: 'Discover public programming' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
})
