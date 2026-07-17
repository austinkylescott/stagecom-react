import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

const testEnv = loadEnv('development', process.cwd(), '')

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

test('authenticated user can submit profile completion', async ({
  context,
  page,
}) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? testEnv.VITE_SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? testEnv.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? testEnv.SUPABASE_SERVICE_ROLE_KEY

  test.skip(
    !supabaseUrl || !anonKey || !serviceRoleKey,
    'Supabase credentials are required for authenticated profile testing.',
  )

  const email = `profile-${crypto.randomUUID()}@example.com`
  const password = crypto.randomUUID()
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const browserAuth = createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
    })

  expect(createError).toBeNull()
  expect(created.user).not.toBeNull()

  try {
    const { data: signedIn, error: signInError } =
      await browserAuth.auth.signInWithPassword({ email, password })

    expect(signInError).toBeNull()
    expect(signedIn.session).not.toBeNull()

    await context.addCookies([
      {
        name: 'stagecom-access-token',
        value: signedIn.session!.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])

    await page.goto('/complete-profile?next=/onboarding')
    await page.waitForTimeout(250)
    await page.getByLabel('Display name').fill('Authenticated Operator')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL('http://localhost:3000/onboarding')

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', created.user!.id)
      .single()

    expect(profileError).toBeNull()
    expect(profile?.display_name).toBe('Authenticated Operator')
  } finally {
    if (created.user) {
      await admin.auth.admin.deleteUser(created.user.id)
    }
  }
})

test('hosted auth callback creates the server session promptly', async ({
  page,
}) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? testEnv.VITE_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? testEnv.SUPABASE_SERVICE_ROLE_KEY

  test.skip(
    !supabaseUrl || !serviceRoleKey,
    'Supabase credentials are required for callback testing.',
  )

  const email = `callback-${crypto.randomUUID()}@example.com`
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })

  expect(createError).toBeNull()
  expect(created.user).not.toBeNull()

  try {
    const { data: generated, error: generateError } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })

    expect(generateError).toBeNull()
    const tokenHash = generated.properties?.hashed_token

    expect(tokenHash).toBeTruthy()

    if (!tokenHash) {
      throw new Error('Supabase did not generate a callback token hash.')
    }

    await page.goto(`/auth/callback?token_hash=${tokenHash}&next=%2Fonboarding`)
    await expect(page).toHaveURL(/\/complete-profile|\/onboarding/, {
      timeout: 5_000,
    })
  } finally {
    if (created.user) {
      await admin.auth.admin.deleteUser(created.user.id)
    }
  }
})
