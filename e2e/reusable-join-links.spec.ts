import { expect, test } from '@playwright/test'
import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

type JoinLinkFixture = {
  admin: SupabaseClient<Database>
  anonKey: string
  memberIds: string[]
  ownerEmail: string
  ownerPassword: string
  ownerUserId: string
  supabaseUrl: string
  theaterId: string
  theaterName: string
  theaterSlug: string
}

test('Owner creates, rotates, and revokes a governed Reusable Join Link', async ({
  context,
  page,
}) => {
  const config = getRemoteSupabaseConfig()

  test.skip(!config, 'Remote Supabase credentials are required.')

  const fixture = await createJoinLinkFixture(config!, 1)

  try {
    await signInBrowserAsOwner(context, fixture)
    await page.goto(`/app/${fixture.theaterSlug}/members`)
    await page.waitForTimeout(1_000)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    const maximumUsesInput = page.getByLabel('Maximum uses (optional)')
    await maximumUsesInput.fill('2')
    await expect(maximumUsesInput).toHaveValue('2')
    await page.getByRole('button', { name: 'Create Join Link' }).click()
    await page.waitForTimeout(500)
    expect(pageErrors).toEqual([])

    const shareInput = page.getByLabel('Shareable Reusable Join Link')
    await expect(shareInput).toHaveValue(/\/join-link\//)
    const firstShareUrl = await shareInput.inputValue()
    const firstToken = new URL(firstShareUrl).pathname.split('/').at(-1)!
    const { data: firstLink, error: firstLinkError } = await fixture.admin
      .from('theater_join_links')
      .select('id, token_hash, max_uses')
      .eq('token_hash', hashToken(firstToken))
      .single()

    expect(firstLinkError).toBeNull()
    expect(firstLink?.max_uses).toBe(2)
    expect(firstLink?.token_hash).not.toBe(firstToken)

    const activeCard = page
      .locator('article')
      .filter({ hasText: '0 of 2 uses' })
    await activeCard.getByRole('button', { name: 'Rotate' }).click()
    await expect(shareInput).not.toHaveValue(firstShareUrl)
    const rotatedShareUrl = await shareInput.inputValue()
    const rotatedToken = new URL(rotatedShareUrl).pathname.split('/').at(-1)!
    const { data: rotatedLink, error: rotatedLinkError } = await fixture.admin
      .from('theater_join_links')
      .select('id, rotated_from_id, max_uses')
      .eq('token_hash', hashToken(rotatedToken))
      .single()

    expect(rotatedLinkError).toBeNull()
    expect(rotatedLink?.rotated_from_id).toBe(firstLink!.id)
    expect(rotatedLink?.max_uses).toBe(2)

    await page.goto(`/join-link/${firstToken}`)
    await expect(
      page.getByRole('heading', { name: 'Join Link revoked' }),
    ).toBeVisible()

    await page.goto(`/app/${fixture.theaterSlug}/members`)
    await page.waitForTimeout(1_000)
    const rotatedCard = page
      .locator('article')
      .filter({ hasText: '0 of 2 uses' })
      .filter({ has: page.getByRole('button', { name: 'Revoke' }) })
    await rotatedCard.getByRole('button', { name: 'Revoke' }).click()
    await expect(
      page.locator('article').filter({ hasText: 'revoked' }),
    ).toHaveCount(2)

    const { data: revokedLink } = await fixture.admin
      .from('theater_join_links')
      .select('revoked_at')
      .eq('id', rotatedLink!.id)
      .single()
    const { data: activity } = await fixture.admin
      .from('activity_events')
      .select('action')
      .eq('theater_id', fixture.theaterId)
      .in('action', [
        'theater.join_link.created',
        'theater.join_link.rotated',
        'theater.join_link.revoked',
      ])

    expect(revokedLink?.revoked_at).not.toBeNull()
    expect(activity?.map(({ action }) => action).sort()).toEqual([
      'theater.join_link.created',
      'theater.join_link.revoked',
      'theater.join_link.rotated',
    ])
  } finally {
    await deleteJoinLinkFixture(fixture)
  }
})

test('Reusable Join Link acceptance is idempotent and enforces every terminal state atomically', async ({
  context,
  page,
}) => {
  const config = getRemoteSupabaseConfig()

  test.skip(!config, 'Remote Supabase credentials are required.')

  const fixture = await createJoinLinkFixture(config!, 3)
  const successfulToken = randomBytes(32).toString('base64url')
  const concurrentToken = randomBytes(32).toString('base64url')
  const expiredToken = randomBytes(32).toString('base64url')
  const revokedToken = randomBytes(32).toString('base64url')

  try {
    await createJoinLink(fixture, successfulToken, { maxUses: 1 })
    await signInBrowserAsMember(context, fixture, 0)
    await page.goto(`/join-link/${successfulToken}`)
    await expect(
      page.getByRole('heading', { name: `Join ${fixture.theaterName}` }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Join Theater' }).click()
    await expect(
      page.getByRole('heading', {
        name: `You joined ${fixture.theaterName}`,
      }),
    ).toBeVisible()

    const { data: retry, error: retryError } = await fixture.admin.rpc(
      'accept_reusable_theater_join_link',
      {
        p_actor_user_id: fixture.memberIds[0],
        p_token_hash: hashToken(successfulToken),
      },
    )
    const { data: successfulLink } = await fixture.admin
      .from('theater_join_links')
      .select('use_count')
      .eq('token_hash', hashToken(successfulToken))
      .single()
    const { data: successfulMembership } = await fixture.admin
      .from('theater_memberships')
      .select('roles')
      .eq('theater_id', fixture.theaterId)
      .eq('user_id', fixture.memberIds[0])
      .single()

    expect(retryError).toBeNull()
    expect(retry?.[0]).toMatchObject({
      membership_created: false,
      result: 'accepted',
    })
    expect(successfulLink?.use_count).toBe(1)
    expect(successfulMembership?.roles).toEqual(['member'])

    await createJoinLink(fixture, expiredToken, {
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    await fixture.admin
      .from('theater_join_links')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('token_hash', hashToken(expiredToken))
    await page.goto(`/join-link/${expiredToken}`)
    await expect(
      page.getByRole('heading', { name: 'Join Link expired' }),
    ).toBeVisible()

    const revokedLinkId = await createJoinLink(fixture, revokedToken)
    const { error: revokeError } = await fixture.admin.rpc(
      'revoke_reusable_theater_join_link',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_join_link_id: revokedLinkId,
      },
    )

    expect(revokeError).toBeNull()
    await page.goto(`/join-link/${revokedToken}`)
    await expect(
      page.getByRole('heading', { name: 'Join Link revoked' }),
    ).toBeVisible()

    await createJoinLink(fixture, concurrentToken, { maxUses: 1 })
    const concurrentResults = await Promise.all(
      fixture.memberIds.slice(1).map((memberId) =>
        fixture.admin.rpc('accept_reusable_theater_join_link', {
          p_actor_user_id: memberId,
          p_token_hash: hashToken(concurrentToken),
        }),
      ),
    )
    const resultStates = concurrentResults
      .map(({ data, error }) => {
        expect(error).toBeNull()
        return data?.[0].result
      })
      .sort()
    const { data: concurrentLink } = await fixture.admin
      .from('theater_join_links')
      .select('use_count')
      .eq('token_hash', hashToken(concurrentToken))
      .single()
    const { count: acceptedMemberships } = await fixture.admin
      .from('theater_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('theater_id', fixture.theaterId)
      .in('user_id', fixture.memberIds.slice(1))
      .eq('status', 'active')

    expect(resultStates).toEqual(['accepted', 'exhausted'])
    expect(concurrentLink?.use_count).toBe(1)
    expect(acceptedMemberships).toBe(1)

    await page.goto(`/join-link/${concurrentToken}`)
    await expect(
      page.getByRole('heading', { name: 'Join Link exhausted' }),
    ).toBeVisible()

    const { data: history } = await fixture.admin
      .from('activity_events')
      .select('action')
      .eq('theater_id', fixture.theaterId)
      .in('action', [
        'theater.join_link.accepted',
        'theater.join_link.exhausted',
      ])

    expect(
      history?.filter(({ action }) => action === 'theater.join_link.accepted'),
    ).toHaveLength(2)
    expect(
      history?.filter(({ action }) => action === 'theater.join_link.exhausted'),
    ).toHaveLength(2)
  } finally {
    await deleteJoinLinkFixture(fixture)
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

async function createJoinLinkFixture(
  config: NonNullable<ReturnType<typeof getRemoteSupabaseConfig>>,
  memberCount: number,
): Promise<JoinLinkFixture> {
  const admin = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const ownerEmail = `join-owner-${suffix}@example.com`
  const ownerPassword = `Stagecom-${crypto.randomUUID()}`
  const theaterName = `Join Link Theater ${suffix.slice(0, 8)}`
  const theaterSlug = `join-link-theater-${suffix}`
  let ownerUserId: string | undefined
  let theaterId: string | undefined
  const memberIds: string[] = []

  try {
    const { data: owner, error: ownerError } =
      await admin.auth.admin.createUser({
        email: ownerEmail,
        email_confirm: true,
        password: ownerPassword,
        user_metadata: { display_name: 'Join Link Owner' },
      })

    expect(ownerError).toBeNull()
    ownerUserId = owner.user!.id

    for (let index = 0; index < memberCount; index += 1) {
      const { data: member, error: memberError } =
        await admin.auth.admin.createUser({
          email: `join-member-${index}-${suffix}@example.com`,
          email_confirm: true,
          password: ownerPassword,
          user_metadata: { display_name: `Join Member ${index + 1}` },
        })

      expect(memberError).toBeNull()
      memberIds.push(member.user!.id)
    }

    const { data: theaters, error: theaterError } = await admin.rpc(
      'create_theater_with_owner',
      {
        p_actor_user_id: ownerUserId,
        p_name: theaterName,
        p_slug: theaterSlug,
      },
    )

    expect(theaterError).toBeNull()
    theaterId = theaters![0].id

    return {
      admin,
      anonKey: config.anonKey,
      memberIds,
      ownerEmail,
      ownerPassword,
      ownerUserId,
      supabaseUrl: config.supabaseUrl,
      theaterId,
      theaterName,
      theaterSlug,
    }
  } catch (error) {
    if (theaterId) {
      await admin.from('theaters').delete().eq('id', theaterId)
    }
    await Promise.all(
      memberIds.map((memberId) => admin.auth.admin.deleteUser(memberId)),
    )
    if (ownerUserId) {
      await admin.auth.admin.deleteUser(ownerUserId)
    }
    throw error
  }
}

async function createJoinLink(
  fixture: JoinLinkFixture,
  token: string,
  options: { expiresAt?: string; maxUses?: number } = {},
) {
  const { data, error } = await fixture.admin.rpc(
    'create_reusable_theater_join_link',
    {
      p_actor_user_id: fixture.ownerUserId,
      ...(options.expiresAt ? { p_expires_at: options.expiresAt } : {}),
      ...(options.maxUses ? { p_max_uses: options.maxUses } : {}),
      p_theater_id: fixture.theaterId,
      p_token_hash: hashToken(token),
    },
  )

  expect(error).toBeNull()
  return data![0].id
}

async function signInBrowserAsOwner(
  context: import('@playwright/test').BrowserContext,
  fixture: JoinLinkFixture,
) {
  await setBrowserSession(
    context,
    fixture,
    fixture.ownerEmail,
    fixture.ownerPassword,
  )
}

async function signInBrowserAsMember(
  context: import('@playwright/test').BrowserContext,
  fixture: JoinLinkFixture,
  memberIndex: number,
) {
  await setBrowserSession(
    context,
    fixture,
    `join-member-${memberIndex}-${fixture.ownerEmail.split('join-owner-')[1]}`,
    fixture.ownerPassword,
  )
}

async function setBrowserSession(
  context: import('@playwright/test').BrowserContext,
  fixture: JoinLinkFixture,
  email: string,
  password: string,
) {
  const browserAuth = createClient<Database>(
    fixture.supabaseUrl,
    fixture.anonKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data, error } = await browserAuth.auth.signInWithPassword({
    email,
    password,
  })

  expect(error).toBeNull()
  await context.addCookies([
    {
      name: 'stagecom-access-token',
      value: data.session!.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

async function deleteJoinLinkFixture(fixture: JoinLinkFixture) {
  await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
  await Promise.all(
    fixture.memberIds.map((memberId) =>
      fixture.admin.auth.admin.deleteUser(memberId),
    ),
  )
  await fixture.admin.auth.admin.deleteUser(fixture.ownerUserId)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
