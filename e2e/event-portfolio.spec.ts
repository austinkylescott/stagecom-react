import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'
import type { Database } from '../src/server/db/database.types'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }

test('Operator filters and Member sees a scoped Event Portfolio', async ({
  context,
  page,
}) => {
  test.setTimeout(120_000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  test.skip(
    !url ||
      !anonKey ||
      !serviceKey ||
      !/^http:\/\/(localhost|127\.0\.0\.1):/.test(url),
    'Supabase test credentials are required.',
  )
  if (!url || !anonKey || !serviceKey) return
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
    await page.goto(`/app/${slug}`)
    await expect(
      page.getByRole('heading', { name: 'Portfolio Stage', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Explore programming' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Explore community' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Explore programming' }).click()
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

    await page.getByRole('link', { name: 'Open Overview' }).click()
    await expect(
      page.getByRole('region', { name: 'Event Occurrences' }),
    ).toBeVisible()
    await expect(page.getByText('No Occurrences planned yet.')).toBeVisible()
    await expect(
      page.getByText('Theater Operator · Owner', { exact: false }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Prepare Event plan · Producer' }),
    ).toBeVisible()

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
    // Store dates in reverse position order to verify chronological presentation.
    const occurrenceIds: string[] = []
    for (const [position, type, days] of [
      [0, 'performance', 14],
      [1, 'rehearsal', 7],
    ] as const) {
      const occurrence = await admin
        .from('show_occurrences')
        .insert({ show_id: event!.id, occurrence_type: type, position })
        .select('id')
        .single()
      expect(occurrence.error).toBeNull()
      occurrenceIds.push(occurrence.data!.id)
      const slot = await admin
        .from('show_candidate_slots')
        .insert({
          timezone_name: 'UTC',
          utc_offset_minutes: 0,
          local_starts_at: new Date(Date.now() + days * 86400000)
            .toISOString()
            .slice(0, 19),
          occurrence_id: occurrence.data!.id,
          starts_at: new Date(Date.now() + days * 86400000).toISOString(),
          duration_minutes: 90,
          location_kind: 'off_site',
          location_name: 'Private rehearsal studio',
          off_site_approved: true,
        })
        .select('id')
        .single()
      expect(slot.error).toBeNull()
      expect(
        (
          await admin
            .from('show_occurrences')
            .update({ confirmed_candidate_slot_id: slot.data!.id })
            .eq('id', occurrence.data!.id)
        ).error,
      ).toBeNull()
    }
    const longTitle = `A community evening of stories and songs ${'UnbrokenTitle'.repeat(15)}`
    expect(
      (
        await admin
          .from('shows')
          .update({ title: longTitle })
          .eq('id', event!.id)
      ).error,
    ).toBeNull()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: longTitle, exact: true }),
    ).toBeVisible()
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    }
    await page.getByRole('link', { name: 'Back to Event portfolio' }).focus()
    await expect(
      page.getByRole('link', { name: 'Back to Event portfolio' }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'Event portfolio', exact: true }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Open Overview', exact: true }).click()
    const chronology = page.getByRole('region', { name: 'Event Occurrences' })
    await expect(chronology.getByRole('listitem').first()).toContainText(
      'rehearsal',
    )
    await expect(chronology.getByRole('listitem').last()).toContainText(
      'performance',
    )
    const { error: castError } = await admin.from('show_cast').insert({
      show_id: event!.id,
      user_id: memberId,
      source: 'invited',
      invited_by_user_id: owner.user!.id,
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
    const { error: publicEventError } = await admin.rpc(
      'create_managed_event',
      {
        p_actor_user_id: owner.user!.id,
        p_producer_user_ids: [],
        p_slug: 'public-event',
        p_theater_id: theaterId,
        p_title: 'Draft Event',
      },
    )
    expect(publicEventError).toBeNull()
    const { error: publishError } = await admin
      .from('shows')
      .update({ publication_status: 'published' })
      .eq('theater_id', theaterId)
      .eq('slug', 'public-event')
    expect(publishError).toBeNull()
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
    await page.goto(`/app/${slug}`)
    await expect(
      page.getByRole('link', { name: 'Open Theater Operations' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Theater Operations', exact: true }),
    ).toHaveCount(0)
    await page.goto(`/app/${slug}/operations`)
    await expect(
      page.getByRole('heading', {
        name: 'This destination is not available to you',
      }),
    ).toBeVisible()
    await page.goto(`/app/${slug}/events`)
    const inviteeSummary = page
      .getByRole('article')
      .filter({ has: page.getByRole('link', { name: 'Open Overview' }) })
    await expect(inviteeSummary).toBeVisible()
    await inviteeSummary.getByRole('link', { name: 'Open Overview' }).click()
    await expect(
      page.getByText('Planned participation', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Event Occurrences' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Schedule & Plan', exact: true }),
    ).toHaveCount(0)
    await page
      .getByRole('link', { name: 'Respond to Cast invitation · Cast invitee' })
      .click()
    await expect(
      page.getByRole('button', { name: 'Accept invitation' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Availability|Occurrence Calls/ }),
    ).toHaveCount(0)
    await expect(page.getByText('Private rehearsal studio')).toHaveCount(0)
    await page.goto(
      `/app/${slug}/events/draft-event#occurrence-call-${occurrenceIds[1]}`,
    )
    await expect(
      page.getByRole('heading', { name: 'Occurrence Calls', exact: true }),
    ).toHaveCount(0)
    await page.goto(`/app/${slug}/events`)
    await expect(inviteeSummary.getByText('Proposal decision')).toHaveCount(0)
    await expect(inviteeSummary.getByText('Operational health')).toHaveCount(0)
    await expect(inviteeSummary.getByText('Leadership:')).toHaveCount(0)
    await expect(
      inviteeSummary.getByRole('link', { name: 'Respond to invitation' }),
    ).toHaveAttribute('href', /#cast-participation$/)
    const publicSummary = page
      .getByRole('article')
      .filter({ has: page.getByRole('link', { name: 'Open public Event' }) })
    await expect(publicSummary).toBeVisible()
    await expect(publicSummary.getByText('Proposal decision')).toHaveCount(0)
    await expect(publicSummary.getByText('Operational health')).toHaveCount(0)
    await expect(publicSummary.getByText('Leadership:')).toHaveCount(0)
    await expect(
      publicSummary.getByRole('link', { name: 'Respond to invitation' }),
    ).toHaveCount(0)
    await expect(page.getByText('2 of 2 Events')).toBeVisible()
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
    // An independent accepted staff relationship must not hide a pending Cast decision.
    expect(
      (
        await admin.from('show_staff_assignments').insert({
          show_id: event!.id,
          user_id: memberId,
          status: 'accepted',
          assignment_type: 'other',
          responsibility: 'Front of house',
          invited_by_user_id: owner.user!.id,
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await admin.from('show_staff_assignments').insert({
          show_id: event!.id,
          user_id: memberId,
          status: 'pending',
          assignment_type: 'other',
          responsibility: 'Stage hand',
          invited_by_user_id: owner.user!.id,
        })
      ).error,
    ).toBeNull()
    // Accept through the existing command and prove it persists across reloads.
    await page.goto(`/app/${slug}/events/draft-event#cast-participation`)
    await expect(
      page.getByRole('heading', { name: 'Collaborative availability matrix' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Accept assignment', exact: true }),
    ).toHaveCount(1)
    const accept = page.getByRole('button', { name: 'Accept invitation' })
    await waitForReactHandler(accept, 'onClick')
    await accept.click()
    await expect(
      page.getByRole('button', { name: 'Withdraw from Event' }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('button', { name: 'Accept invitation' }),
    ).toHaveCount(0)

    // Read the independent relationships together.
    await page.goto(`/app/${slug}/events/draft-event#overview`)
    await page.reload()
    await expect(
      page.getByText('Cast Member · Event staff member', { exact: true }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Event Occurrences' })
        .getByRole('listitem'),
    ).toHaveCount(2)
    expect(
      (
        await admin
          .from('show_leadership')
          .insert({ show_id: event!.id, user_id: memberId, role: 'director' })
      ).error,
    ).toBeNull()
    await page.reload()
    await expect(
      page.getByText('Director · Cast Member · Event staff member', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: /^Coordinate Cast and Calls/,
      }),
    ).toBeVisible()

    // A cold protected deep link must survive Supabase's real OTP callback.
    await context.clearCookies()
    const destination = `/app/${slug}/events/draft-event?from=calendar#occurrence-call-${occurrenceIds[1]}`
    await page.goto(destination)
    await expect(
      page.getByRole('heading', { name: 'Sign in to Stagecom' }),
    ).toBeVisible()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('next'))
      .toBe(destination)
    const loginUrl = new URL(page.url())
    const magic = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: memberEmail,
    })
    expect(magic.error).toBeNull()
    const callback = new URL('/auth/callback', page.url())
    callback.searchParams.set('token_hash', magic.data.properties!.hashed_token)
    callback.searchParams.set('next', loginUrl.searchParams.get('next')!)
    await page.goto(callback.toString())
    await expect(page).toHaveURL(
      new RegExp(`#occurrence-call-${occurrenceIds[1]}$`),
    )
    await expect(
      page.getByRole('heading', { name: 'Occurrence Calls', exact: true }),
    ).toBeVisible()

    // Revocation removes previously opened destinations on the next navigation.
    expect(
      (
        await admin
          .from('theater_memberships')
          .update({ status: 'inactive' })
          .eq('theater_id', theaterId)
          .eq('user_id', memberId)
      ).error,
    ).toBeNull()
    await page.reload()
    await expect(
      page.getByRole('heading', {
        name: 'This destination is not available to you',
      }),
    ).toBeVisible()
    await expect(page.getByText('Private rehearsal studio')).toHaveCount(0)
    expect(
      pageErrors.filter((message) => !message.includes('concurrent rendering')),
    ).toEqual([])
  } finally {
    if (theaterId) await admin.from('theaters').delete().eq('id', theaterId)
    if (otherTheaterId)
      await admin.from('theaters').delete().eq('id', otherTheaterId)
    if (memberId) await admin.auth.admin.deleteUser(memberId)
    await admin.auth.admin.deleteUser(owner.user!.id)
  }
})
