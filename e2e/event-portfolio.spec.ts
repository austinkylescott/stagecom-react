import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { Locator } from '@playwright/test'
import type { Database } from '../src/server/db/database.types'

const env = loadEnv('development', process.cwd(), '')

async function waitForReactHandler(locator: Locator, handlerName: string) {
  await expect
    .poll(() =>
      locator.evaluate(
        (element, name) =>
          Object.keys(element).some((key) => {
            if (!key.startsWith('__reactProps$')) return false
            const props = Reflect.get(element, key) as
              Record<string, unknown> | undefined
            return typeof props?.[name] === 'function'
          }),
        handlerName,
      ),
    )
    .toBe(true)
}

test('Operator filters the Event portfolio on desktop and phone', async ({
  context,
  page,
}) => {
  test.setTimeout(60_000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  test.skip(
    !url || !anonKey || !serviceKey,
    'Supabase test credentials are required.',
  )
  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const suffix = crypto.randomUUID()
  const email = `portfolio-${suffix}@example.com`
  const password = `Stagecom-${suffix}`
  const slug = `portfolio-${suffix}`
  const otherSlug = `portfolio-other-${suffix}`
  const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Portfolio Owner' },
  })
  expect(ownerError).toBeNull()
  let theaterId: string | null = null
  let otherTheaterId: string | null = null
  let memberId: string | null = null
  try {
    const { data: theaters, error: theaterError } = await admin.rpc(
      'create_theater_with_owner',
      {
        p_actor_user_id: owner.user!.id,
        p_name: 'Portfolio Stage',
        p_slug: slug,
        p_timezone: 'America/New_York',
      },
    )
    expect(theaterError).toBeNull()
    theaterId = theaters![0].id
    const { error: eventError } = await admin.rpc('create_managed_event', {
      p_actor_user_id: owner.user!.id,
      p_producer_user_ids: [],
      p_slug: 'draft-event',
      p_theater_id: theaterId,
      p_title: 'Draft Event',
    })
    expect(eventError).toBeNull()
    const auth = createClient<Database>(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: session, error: signInError } =
      await auth.auth.signInWithPassword({ email, password })
    expect(signInError).toBeNull()
    await context.addCookies([
      {
        name: 'stagecom-access-token',
        value: session.session!.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
    await page.goto(`/app/${slug}/events`)
    await expect(
      page.getByRole('heading', { name: 'Event portfolio' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Draft Event' }),
    ).toBeVisible()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Draft/Review' }).click()
    await expect(page.getByText('1 of 1 Events')).toBeVisible()
    await waitForReactHandler(
      page.getByRole('combobox', { name: 'Publication', exact: true }),
      'onChange',
    )
    await page
      .getByRole('combobox', { name: 'Publication', exact: true })
      .selectOption('published', { timeout: 5_000 })
    expect(pageErrors).toEqual([])
    await expect(page.getByText('0 of 1 Events')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(
      page.getByRole('heading', { name: 'Draft Event' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Open Overview' }),
    ).toHaveAttribute(
      'href',
      new RegExp(`/app/${slug}/events/draft-event#overview$`),
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)

    const memberEmail = `portfolio-invitee-${suffix}@example.com`
    const { data: member, error: memberError } =
      await admin.auth.admin.createUser({
        email: memberEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Portfolio Invitee' },
      })
    expect(memberError).toBeNull()
    memberId = member.user!.id
    const { error: membershipError } = await admin
      .from('theater_memberships')
      .insert({
        theater_id: theaterId,
        user_id: memberId,
        roles: ['member'],
        status: 'active',
      })
    expect(membershipError).toBeNull()
    const { data: event } = await admin
      .from('shows')
      .select('id')
      .eq('theater_id', theaterId)
      .eq('slug', 'draft-event')
      .single()
    const { error: castError } = await admin.from('show_cast').insert({
      show_id: event!.id,
      user_id: memberId,
      source: 'invited',
      status: 'pending',
      public_credit_enabled: false,
    })
    expect(castError).toBeNull()
    const { data: otherTheaters, error: otherTheaterError } = await admin.rpc(
      'create_theater_with_owner',
      {
        p_actor_user_id: owner.user!.id,
        p_name: 'Other Portfolio Stage',
        p_slug: otherSlug,
        p_timezone: 'America/New_York',
      },
    )
    expect(otherTheaterError).toBeNull()
    otherTheaterId = otherTheaters![0].id
    const { error: otherMembershipError } = await admin
      .from('theater_memberships')
      .insert({
        theater_id: otherTheaterId,
        user_id: memberId,
        roles: ['member'],
        status: 'active',
      })
    expect(otherMembershipError).toBeNull()
    const { error: otherEventError } = await admin.rpc('create_managed_event', {
      p_actor_user_id: owner.user!.id,
      p_producer_user_ids: [],
      p_slug: 'other-event',
      p_theater_id: otherTheaterId,
      p_title: 'Other Event',
    })
    expect(otherEventError).toBeNull()
    const { data: otherEvent } = await admin
      .from('shows')
      .select('id')
      .eq('theater_id', otherTheaterId)
      .eq('slug', 'other-event')
      .single()
    const { error: otherCastError } = await admin.from('show_cast').insert({
      show_id: otherEvent!.id,
      user_id: memberId,
      source: 'invited',
      status: 'pending',
      public_credit_enabled: false,
    })
    expect(otherCastError).toBeNull()
    const { data: memberSession, error: memberSignInError } =
      await auth.auth.signInWithPassword({ email: memberEmail, password })
    expect(memberSignInError).toBeNull()
    await context.clearCookies()
    await context.addCookies([
      {
        name: 'stagecom-access-token',
        value: memberSession.session!.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
    await page.goto(`/app/${slug}/events`)
    const inviteeSummary = page
      .locator('article')
      .filter({ hasText: 'Draft Event' })
    await expect(inviteeSummary).toBeVisible()
    await expect(inviteeSummary.getByText('Proposal decision')).toHaveCount(0)
    await expect(inviteeSummary.getByText('Operational health')).toHaveCount(0)
    await expect(inviteeSummary.getByText('Leadership:')).toHaveCount(0)
    await expect(
      inviteeSummary.getByRole('link', { name: 'Respond to invitation' }),
    ).toHaveAttribute('href', /#cast-participation$/)
    await expect(page.getByText('1 of 1 Events')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Other Event' }),
    ).toHaveCount(0)
    await page.goto(`/app/${otherSlug}/events`)
    await expect(
      page.getByRole('heading', { name: 'Other Event' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Draft Event' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Respond to invitation' }),
    ).toHaveAttribute('href', /#cast-participation$/)
  } finally {
    if (theaterId) await admin.from('theaters').delete().eq('id', theaterId)
    if (otherTheaterId)
      await admin.from('theaters').delete().eq('id', otherTheaterId)
    if (memberId) await admin.auth.admin.deleteUser(memberId)
    await admin.auth.admin.deleteUser(owner.user!.id)
  }
})
