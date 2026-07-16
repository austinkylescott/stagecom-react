import { expect, test } from '@playwright/test'

test('dev component baseline exposes brand tokens and typography choices', async ({
  page,
}) => {
  await page.goto('/dev/components')

  await expect(
    page.getByRole('heading', { name: /stagecom component baseline/i }),
  ).toBeVisible()
  await expect(page.getByText('--theater / #82bfb6')).toBeVisible()
  await expect(page.getByText('--event / #eaa542')).toBeVisible()
  await expect(page.getByText('--performer / #c76056')).toBeVisible()
  await expect(page.getByText(/body text uses public sans/i)).toBeVisible()
  await expect(
    page.getByText(/cubano carries stagecom identity/i),
  ).toBeVisible()
})

test('theater setup validates required fields and keeps slug editable', async ({
  page,
}) => {
  await page.goto('/onboarding/theater')

  await expect(
    page.getByRole('heading', { name: /prepare your public theater home/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Open TanStack Devtools' }),
  ).toBeVisible()

  const saveButton = page.getByRole('button', { name: 'Save and preview' })
  await expect(saveButton).toBeDisabled()

  await page.getByLabel('Theater name').fill('Main Stage Theater')
  await expect(page.getByLabel('Public slug')).toHaveValue('main-stage-theater')
  await expect(saveButton).toBeEnabled()

  await page.getByLabel('Public slug').fill('custom-stage')
  await page.getByLabel('Tagline').fill('A home for organized productions')
  await page.getByLabel('Street').fill('123 Main Street')
  await page.getByLabel('City').fill('Austin')
  await page.getByLabel('State / region').fill('TX')
  await page.getByLabel('Postal code').fill('78701')
  await page.getByLabel('Timezone').fill('America/Chicago')

  await expect(saveButton).toBeEnabled()
})

test('invite route preserves invite intent into auth pages', async ({
  page,
}) => {
  const inviteToken = 'valid-invite-token-1234567890'

  await page.goto(`/join/${inviteToken}`)
  await expect(
    page.getByRole('heading', { name: /join this theater/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: /sign in to accept/i }).click()

  await expect(
    page.getByRole('heading', { name: /sign in to stagecom/i }),
  ).toBeVisible()
  expect(page.url()).toContain('/login')
  expect(page.url()).toContain(`inviteToken=${inviteToken}`)
})

test('profile completion requires a display name before continuing', async ({
  page,
}) => {
  await page.goto('/complete-profile?next=/onboarding')

  const continueButton = page.getByRole('button', { name: 'Continue' })
  await expect(continueButton).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Open TanStack Devtools' }),
  ).toBeVisible()

  await page.getByLabel('Display name').fill('Austin Operator')
  await expect(continueButton).toBeEnabled()
})
