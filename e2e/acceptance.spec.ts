import { expect, test } from '@playwright/test'
import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

type RemoteInvitationFixture = {
  admin: SupabaseClient<Database>
  anonKey: string
  inviteToken: string
  ownerEmail: string
  ownerPassword: string
  ownerUserId: string
  recipientEmail: string
  recipientUserId: string
  supabaseUrl: string
  theaterId: string
  theaterName: string
  theaterSlug: string
}

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

test('recipient authentication preserves intent and accepts a Targeted Invitation', async ({
  page,
}) => {
  const config = getRemoteSupabaseConfig()

  test.skip(
    !config,
    'Remote Supabase credentials are required for invitation testing.',
  )

  const fixture = await createRemoteInvitationFixture(config!)

  try {
    const { data: wrongEmailResult, error: wrongEmailError } =
      await fixture.admin.rpc('accept_targeted_theater_invitation', {
        p_actor_email: fixture.ownerEmail,
        p_actor_user_id: fixture.ownerUserId,
        p_token_hash: hashToken(fixture.inviteToken),
      })

    expect(wrongEmailError).toBeNull()
    expect(wrongEmailResult?.[0].result).toBe('wrong_email')

    await page.goto(`/join/${fixture.inviteToken}`)
    await expect(
      page.getByRole('heading', { name: `Join ${fixture.theaterName}` }),
    ).toBeVisible()

    await page.getByRole('link', { name: /sign in to accept/i }).click()
    await expect(
      page.getByRole('heading', { name: /sign in to stagecom/i }),
    ).toBeVisible()
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain(`inviteToken=${fixture.inviteToken}`)

    let otpRequestBody: Record<string, unknown> | undefined
    let otpRedirectUrl: URL | undefined

    const otpEndpoint = /\/auth\/v1\/otp(?:\?|$)/

    await page.route(otpEndpoint, async (route) => {
      const request = route.request()
      const requestUrl = new URL(request.url())
      const redirectTo = requestUrl.searchParams.get('redirect_to')

      otpRedirectUrl = redirectTo ? new URL(redirectTo) : undefined
      otpRequestBody = JSON.parse(request.postData() ?? '{}') as Record<
        string,
        unknown
      >
      await route.fulfill({ body: '{}', contentType: 'application/json' })
    })

    await page.waitForTimeout(250)
    await page.getByLabel('Email address').fill(fixture.recipientEmail)
    await page.getByRole('button', { name: /send magic link/i }).click()
    await expect.poll(() => otpRequestBody).toBeDefined()
    expect(otpRequestBody).toMatchObject({
      data: { inviteToken: fixture.inviteToken },
      email: fixture.recipientEmail,
    })
    expect(otpRedirectUrl?.pathname).toBe('/auth/callback')
    expect(otpRedirectUrl?.searchParams.get('inviteToken')).toBe(
      fixture.inviteToken,
    )

    await page.unroute(otpEndpoint)

    const { data: generated, error: generateError } =
      await fixture.admin.auth.admin.generateLink({
        type: 'magiclink',
        email: fixture.recipientEmail,
      })
    const tokenHash = generated.properties?.hashed_token

    expect(generateError).toBeNull()
    expect(tokenHash).toBeTruthy()

    if (!tokenHash) {
      throw new Error('Supabase did not generate an invitation callback token.')
    }

    await page.goto(
      `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&inviteToken=${encodeURIComponent(fixture.inviteToken)}`,
    )
    await expect(page).toHaveURL(new RegExp(`/join/${fixture.inviteToken}$`), {
      timeout: 5_000,
    })
    await page.waitForTimeout(250)
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/_serverFn/'),
      ),
      page.getByRole('button', { name: /accept invitation/i }).click(),
    ])
    await expect(
      page.getByRole('heading', {
        name: `You joined ${fixture.theaterName}`,
      }),
    ).toBeVisible()

    const { count: membershipCount } = await fixture.admin
      .from('theater_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('theater_id', fixture.theaterId)
      .eq('user_id', fixture.recipientUserId)
      .eq('status', 'active')

    const { count: acceptanceEventCount } = await fixture.admin
      .from('activity_events')
      .select('*', { count: 'exact', head: true })
      .eq('theater_id', fixture.theaterId)
      .eq('action', 'theater.invitation.accepted')

    expect(membershipCount).toBe(1)
    expect(acceptanceEventCount).toBe(1)

    const { data: consumedResult, error: consumedError } =
      await fixture.admin.rpc('accept_targeted_theater_invitation', {
        p_actor_email: fixture.ownerEmail,
        p_actor_user_id: fixture.ownerUserId,
        p_token_hash: hashToken(fixture.inviteToken),
      })

    expect(consumedError).toBeNull()
    expect(consumedResult?.[0].result).toBe('consumed')

    await page.goto(`/join/${fixture.inviteToken}`)
    await page.waitForTimeout(250)
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/_serverFn/'),
      ),
      page.getByRole('button', { name: /accept invitation/i }).click(),
    ])
    await expect(
      page.getByRole('heading', {
        name: `You joined ${fixture.theaterName}`,
      }),
    ).toBeVisible()

    const { count: retryEventCount } = await fixture.admin
      .from('activity_events')
      .select('*', { count: 'exact', head: true })
      .eq('theater_id', fixture.theaterId)
      .eq('action', 'theater.invitation.accepted')

    expect(retryEventCount).toBe(1)
  } finally {
    await deleteRemoteInvitationFixture(fixture)
  }
})

test('invite route explains invalid, expired, and revoked states', async ({
  page,
}) => {
  const config = getRemoteSupabaseConfig()

  test.skip(
    !config,
    'Remote Supabase credentials are required for invitation testing.',
  )

  await page.goto('/join/not-a-valid-token')
  await expect(
    page.getByRole('heading', { name: /invitation link is invalid/i }),
  ).toBeVisible()

  await page.goto(`/join/${'a'.repeat(257)}`)
  await expect(
    page.getByRole('heading', { name: /invitation link is invalid/i }),
  ).toBeVisible()

  const expired = await createRemoteInvitationFixture(config!)
  const revoked = await createRemoteInvitationFixture(config!)

  try {
    const { error: expireError } = await expired.admin
      .from('theater_invites')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('token_hash', hashToken(expired.inviteToken))

    expect(expireError).toBeNull()

    const { error: revokeError } = await revoked.admin.rpc(
      'revoke_targeted_theater_invitation',
      {
        p_actor_user_id: revoked.ownerUserId,
        p_invitation_id: await getInvitationId(revoked),
      },
    )

    expect(revokeError).toBeNull()

    const { data: expiredResult, error: expiredAcceptanceError } =
      await expired.admin.rpc('accept_targeted_theater_invitation', {
        p_actor_email: expired.recipientEmail,
        p_actor_user_id: expired.recipientUserId,
        p_token_hash: hashToken(expired.inviteToken),
      })
    const { data: revokedResult, error: revokedAcceptanceError } =
      await revoked.admin.rpc('accept_targeted_theater_invitation', {
        p_actor_email: revoked.recipientEmail,
        p_actor_user_id: revoked.recipientUserId,
        p_token_hash: hashToken(revoked.inviteToken),
      })

    expect(expiredAcceptanceError).toBeNull()
    expect(expiredResult?.[0].result).toBe('expired')
    expect(revokedAcceptanceError).toBeNull()
    expect(revokedResult?.[0].result).toBe('revoked')

    await page.goto(`/join/${expired.inviteToken}`)
    await expect(
      page.getByRole('heading', { name: /invitation expired/i }),
    ).toBeVisible()

    await page.goto(`/join/${revoked.inviteToken}`)
    await expect(
      page.getByRole('heading', { name: /invitation revoked/i }),
    ).toBeVisible()
  } finally {
    await deleteRemoteInvitationFixture(expired)
    await deleteRemoteInvitationFixture(revoked)
  }
})

test('Owner creates and revokes a Targeted Invitation from the Members screen', async ({
  context,
  page,
}) => {
  const config = getRemoteSupabaseConfig()

  test.skip(
    !config,
    'Remote Supabase credentials are required for invitation testing.',
  )

  const fixture = await createRemoteInvitationFixture(config!)

  try {
    const { error: forbiddenCreateError } = await fixture.admin.rpc(
      'create_targeted_theater_invitation',
      {
        p_actor_user_id: fixture.recipientUserId,
        p_email: `forbidden-${crypto.randomUUID()}@example.com`,
        p_theater_id: fixture.theaterId,
        p_token_hash: hashToken(randomBytes(32).toString('base64url')),
      },
    )
    const { error: forbiddenRevokeError } = await fixture.admin.rpc(
      'revoke_targeted_theater_invitation',
      {
        p_actor_user_id: fixture.recipientUserId,
        p_invitation_id: await getInvitationId(fixture),
      },
    )

    expect(forbiddenCreateError?.code).toBe('42501')
    expect(forbiddenRevokeError?.code).toBe('42501')

    const ownerAuth = createClient<Database>(
      fixture.supabaseUrl,
      fixture.anonKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data: signedIn, error: signInError } =
      await ownerAuth.auth.signInWithPassword({
        email: fixture.ownerEmail,
        password: fixture.ownerPassword,
      })

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

    const secondRecipient = `second-${crypto.randomUUID()}@example.com`
    await page.goto(`/app/${fixture.theaterSlug}/members`)
    await page.waitForTimeout(500)
    await page.getByLabel('Recipient email').fill(secondRecipient)
    await page.getByRole('button', { name: /create invitation/i }).click()

    await expect(page.getByLabel('Shareable invitation link')).toHaveValue(
      /\/join\//,
    )
    const invitationCard = page
      .locator('article')
      .filter({ hasText: secondRecipient })
    await expect(invitationCard).toContainText('pending')
    await invitationCard.getByRole('button', { name: 'Revoke' }).click()
    await expect(invitationCard).toContainText('revoked')

    const { count: creationEvents } = await fixture.admin
      .from('activity_events')
      .select('*', { count: 'exact', head: true })
      .eq('theater_id', fixture.theaterId)
      .eq('action', 'theater.invitation.created')
    const { count: revocationEvents } = await fixture.admin
      .from('activity_events')
      .select('*', { count: 'exact', head: true })
      .eq('theater_id', fixture.theaterId)
      .eq('action', 'theater.invitation.revoked')

    expect(creationEvents).toBe(2)
    expect(revocationEvents).toBe(1)
  } finally {
    await deleteRemoteInvitationFixture(fixture)
  }
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
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const browserAuth = createClient(supabaseUrl, anonKey, {
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
    await page.waitForTimeout(750)
    await page.getByLabel('Display name').fill('Authenticated Operator')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/onboarding$/)

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
  const admin = createClient(supabaseUrl, serviceRoleKey, {
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

function getRemoteSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? testEnv.VITE_SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? testEnv.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? testEnv.SUPABASE_SERVICE_ROLE_KEY

  return supabaseUrl && anonKey && serviceRoleKey
    ? { anonKey, serviceRoleKey, supabaseUrl }
    : null
}

async function createRemoteInvitationFixture(
  config: NonNullable<ReturnType<typeof getRemoteSupabaseConfig>>,
): Promise<RemoteInvitationFixture> {
  const admin = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const ownerEmail = `invite-owner-${suffix}@example.com`
  const ownerPassword = `Stagecom-${crypto.randomUUID()}`
  const recipientEmail = `invite-recipient-${suffix}@example.com`
  const theaterName = `Invitation Theater ${suffix.slice(0, 8)}`
  const theaterSlug = `invitation-theater-${suffix}`
  const inviteToken = randomBytes(32).toString('base64url')
  let ownerUserId: string | undefined
  let recipientUserId: string | undefined
  let theaterId: string | undefined

  try {
    const { data: owner, error: ownerError } =
      await admin.auth.admin.createUser({
        email: ownerEmail,
        email_confirm: true,
        password: ownerPassword,
        user_metadata: { display_name: 'Invitation Owner' },
      })

    expect(ownerError).toBeNull()
    expect(owner.user).not.toBeNull()
    ownerUserId = owner.user!.id

    const { data: recipient, error: recipientError } =
      await admin.auth.admin.createUser({
        email: recipientEmail,
        email_confirm: true,
        user_metadata: { display_name: 'Invited Member' },
      })

    expect(recipientError).toBeNull()
    expect(recipient.user).not.toBeNull()
    recipientUserId = recipient.user!.id

    const { data: theaters, error: theaterError } = await admin.rpc(
      'create_theater_with_owner',
      {
        p_actor_user_id: ownerUserId,
        p_name: theaterName,
        p_slug: theaterSlug,
      },
    )

    expect(theaterError).toBeNull()
    expect(theaters).toHaveLength(1)
    theaterId = theaters![0].id

    const { error: invitationError } = await admin.rpc(
      'create_targeted_theater_invitation',
      {
        p_actor_user_id: ownerUserId,
        p_email: recipientEmail,
        p_theater_id: theaterId,
        p_token_hash: hashToken(inviteToken),
      },
    )

    expect(invitationError).toBeNull()

    return {
      admin,
      anonKey: config.anonKey,
      inviteToken,
      ownerEmail,
      ownerPassword,
      ownerUserId,
      recipientEmail,
      recipientUserId,
      supabaseUrl: config.supabaseUrl,
      theaterId,
      theaterName,
      theaterSlug,
    }
  } catch (error) {
    if (theaterId) {
      await admin.from('theaters').delete().eq('id', theaterId)
    }
    if (recipientUserId) {
      await admin.auth.admin.deleteUser(recipientUserId)
    }
    if (ownerUserId) {
      await admin.auth.admin.deleteUser(ownerUserId)
    }
    throw error
  }
}

async function getInvitationId(fixture: RemoteInvitationFixture) {
  const { data, error } = await fixture.admin
    .from('theater_invites')
    .select('id')
    .eq('token_hash', hashToken(fixture.inviteToken))
    .single()

  expect(error).toBeNull()
  return data!.id
}

async function deleteRemoteInvitationFixture(fixture: RemoteInvitationFixture) {
  await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
  await fixture.admin.auth.admin.deleteUser(fixture.recipientUserId)
  await fixture.admin.auth.admin.deleteUser(fixture.ownerUserId)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
