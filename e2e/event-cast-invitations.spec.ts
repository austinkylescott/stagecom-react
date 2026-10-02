import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { Browser, BrowserContext, Locator } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

type Actor = { email: string; name: string; userId: string }
type Fixture = {
  accepted: Actor
  admin: SupabaseClient<Database>
  anonKey: string
  declined: Actor
  director: Actor
  eventId: string
  eventSlug: string
  owner: Actor
  password: string
  pending: Actor
  supabaseUrl: string
  theaterId: string
  theaterSlug: string
}

test('Cast invitations and disclosure boundaries use distinct actor contexts', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)
  const contexts: BrowserContext[] = []

  try {
    const directorPage = await actorPage(browser, fixture, fixture.director)
    contexts.push(directorPage.context)
    await directorPage.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await expect(
      directorPage.page.getByRole('heading', { name: 'Private Cast Event' }),
    ).toBeVisible()
    await directorPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await waitForReactHandler(
      directorPage.page.getByLabel('Active Theater Member'),
      'onChange',
    )

    for (const actor of [fixture.accepted, fixture.pending, fixture.declined]) {
      await directorPage.page
        .getByLabel('Active Theater Member')
        .selectOption(actor.userId)
      await Promise.all([
        directorPage.page.waitForResponse((response) =>
          response.url().includes('/_serverFn/'),
        ),
        directorPage.page
          .getByRole('button', { name: 'Invite to Cast' })
          .click(),
      ])
      await expect(
        directorPage.page.getByText(actor.name).first(),
      ).toBeVisible()
    }

    const acceptedPage = await actorPage(browser, fixture, fixture.accepted)
    contexts.push(acceptedPage.context)
    await acceptedPage.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await acceptedPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await expect(
      acceptedPage.page.getByText('Your participation response is separate'),
    ).toBeVisible()
    await expect(
      acceptedPage.page.getByRole('heading', { name: 'Candidate Slot 1' }),
    ).toHaveCount(0)
    await expect(acceptedPage.page.getByText('Pending Member')).toHaveCount(0)
    await acceptedPage.page
      .getByRole('button', { name: 'Accept invitation' })
      .click()
    await acceptedPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await waitForReactHandler(
      acceptedPage.page.getByLabel('Availability for Candidate Slot 1'),
      'onChange',
    )
    await expect(
      acceptedPage.page.getByRole('heading', { name: 'Candidate Slot 1' }),
    ).toBeVisible()
    for (const [slotNumber, response] of [
      [1, 'available'],
      [2, 'unavailable'],
      [3, 'uncertain'],
    ] as const) {
      await Promise.all([
        acceptedPage.page.waitForResponse((serverResponse) =>
          serverResponse.url().includes('/_serverFn/'),
        ),
        acceptedPage.page
          .getByLabel(`Availability for Candidate Slot ${slotNumber}`)
          .selectOption(response),
      ])
    }
    await expect(
      acceptedPage.page.getByText('Accepted Member').first().locator('..'),
    ).toContainText('accepted')

    await directorPage.page.reload()
    await waitForReactHandler(
      directorPage.page.getByLabel('Call for Accepted Member, Occurrence 1'),
      'onChange',
    )
    await Promise.all([
      directorPage.page.waitForResponse((response) =>
        response.url().includes('/_serverFn/'),
      ),
      directorPage.page
        .getByLabel('Call for Accepted Member, Occurrence 1')
        .selectOption('required'),
    ])

    const declinedPage = await actorPage(browser, fixture, fixture.declined)
    contexts.push(declinedPage.context)
    await declinedPage.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await declinedPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await waitForReactHandler(
      declinedPage.page.getByRole('button', { name: 'Decline invitation' }),
      'onClick',
    )
    await declinedPage.page
      .getByRole('button', { name: 'Decline invitation' })
      .click()

    const pendingPage = await actorPage(browser, fixture, fixture.pending)
    contexts.push(pendingPage.context)
    await pendingPage.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await pendingPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Candidate Slot 1' }),
    ).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Candidate Slot 2' }),
    ).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Candidate Slot 3' }),
    ).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', {
        name: 'Collaborative availability matrix',
      }),
    ).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Occurrence Calls' }),
    ).toHaveCount(0)
    await expect(pendingPage.page.getByText('Accepted Member')).toHaveCount(0)
    await expect(pendingPage.page.getByText('Pending Member')).toBeVisible()
    await expect(pendingPage.page.getByText('Declined Member')).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Leadership' }),
    ).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', {
        name: 'Requested staffing needs and resources',
      }),
    ).toHaveCount(0)

    await acceptedPage.page.reload()
    await acceptedPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await expect(
      acceptedPage.page.getByRole('heading', {
        name: 'Collaborative availability matrix',
      }),
    ).toBeVisible()
    await expect(
      acceptedPage.page.getByLabel('Availability for Candidate Slot 1'),
    ).toHaveValue('available')
    await expect(
      acceptedPage.page.getByLabel('Availability for Candidate Slot 2'),
    ).toHaveValue('unavailable')
    await expect(
      acceptedPage.page.getByLabel('Availability for Candidate Slot 3'),
    ).toHaveValue('uncertain')
    await expect(
      acceptedPage.page.getByLabel('Call for Accepted Member, Occurrence 1'),
    ).toHaveValue('required')
    await expect(
      acceptedPage.page.getByText('Pending Member').first(),
    ).toBeVisible()
    await expect(
      acceptedPage.page.getByText('Declined Member').first(),
    ).toBeVisible()

    const ownerPage = await actorPage(browser, fixture, fixture.owner)
    contexts.push(ownerPage.context)
    await ownerPage.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await ownerPage.page.getByRole('link', { name: 'Schedule & Plan' }).click()
    await expect(
      ownerPage.page.getByRole('heading', {
        name: 'Requested staffing needs and resources',
      }),
    ).toBeVisible()
    await ownerPage.page
      .getByRole('navigation', { name: 'Event workspace sections' })
      .getByRole('link', { name: 'Cast & Team' })
      .click()
    await expect(
      ownerPage.page.getByText('Pending Member').first(),
    ).toBeVisible()
    await expect(
      ownerPage.page.getByText('Declined Member').first(),
    ).toBeVisible()

    const { data: activity } = await fixture.admin
      .from('activity_events')
      .select('action')
      .eq('entity_id', fixture.eventId)
      .in('action', [
        'event.cast.invited',
        'event.cast.accepted',
        'event.cast.declined',
        'event.availability.responded',
        'event.occurrence_call.assigned',
      ])
    const { data: notifications } = await fixture.admin
      .from('notifications')
      .select('dedupe_key')
      .eq('entity_id', fixture.eventId)
      .eq('type', 'event.cast.invited')

    expect(
      activity?.filter(({ action }) => action === 'event.cast.invited'),
    ).toHaveLength(3)
    expect(activity).toEqual(
      expect.arrayContaining([
        { action: 'event.cast.accepted' },
        { action: 'event.cast.declined' },
        { action: 'event.availability.responded' },
        { action: 'event.occurrence_call.assigned' },
      ]),
    )
    expect(notifications).toHaveLength(3)
    expect(
      new Set(notifications?.map(({ dedupe_key }) => dedupe_key)).size,
    ).toBe(3)
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()))
    await deleteFixture(fixture)
  }
})

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? testEnv.VITE_SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? testEnv.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? testEnv.SUPABASE_SERVICE_ROLE_KEY

  return supabaseUrl && anonKey && serviceRoleKey
    ? { anonKey, serviceRoleKey, supabaseUrl }
    : null
}

async function createFixture(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
): Promise<Fixture> {
  const admin = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const password = `Stagecom-${crypto.randomUUID()}`
  const theaterSlug = `casting-stage-${suffix}`
  const eventSlug = `private-cast-${suffix}`
  const actors = await Promise.all(
    [
      ['owner', 'Cast Owner'],
      ['director', 'Cast Director'],
      ['accepted', 'Accepted Member'],
      ['pending', 'Pending Member'],
      ['declined', 'Declined Member'],
    ].map(async ([key, name]) => {
      const email = `cast-${key}-${suffix}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: name },
      })
      expect(error).toBeNull()
      return { email, name, userId: data.user!.id }
    }),
  )
  const [owner, director, accepted, pending, declined] = actors
  const { data: theaters, error: theaterError } = await admin.rpc(
    'create_theater_with_owner',
    {
      p_actor_user_id: owner.userId,
      p_name: 'Casting Stage',
      p_slug: theaterSlug,
      p_timezone: 'America/New_York',
    },
  )
  expect(theaterError).toBeNull()
  const theaterId = theaters![0].id
  const { error: membershipError } = await admin
    .from('theater_memberships')
    .insert(
      [director, accepted, pending, declined].map((actor) => ({
        roles: ['member' as const],
        status: 'active' as const,
        theater_id: theaterId,
        user_id: actor.userId,
      })),
    )
  expect(membershipError).toBeNull()
  const { data: events, error: eventError } = await admin.rpc(
    'create_managed_event',
    {
      p_actor_user_id: owner.userId,
      p_director_user_id: director.userId,
      p_producer_user_ids: [],
      p_slug: eventSlug,
      p_theater_id: theaterId,
      p_title: 'Private Cast Event',
    },
  )
  expect(eventError).toBeNull()
  const eventId = events![0].id
  const { error: planError } = await admin.rpc('save_event_operational_plan', {
    p_actor_user_id: owner.userId,
    p_minimum_viable_cast: 1,
    p_occurrences: [
      {
        candidateSlots: [0, 1, 2].map((position) => ({
          durationMinutes: 90,
          id: crypto.randomUUID(),
          localStartsAt: `2026-09-${String(10 + position).padStart(2, '0')}T19:30`,
          locationKind: 'off_site',
          locationName: 'Community Hall',
          offSiteApproved: true,
          position,
          startsAt: `2026-09-${String(10 + position).padStart(2, '0')}T23:30:00.000Z`,
          timezoneName: 'America/New_York',
          timezoneSource: 'manual',
          utcOffsetMinutes: -240,
        })),
        confirmedCandidateSlotId: null,
        id: crypto.randomUUID(),
        position: 0,
        type: 'performance',
        visibility: 'public',
      },
    ],
    p_resource_requests: [
      {
        id: crypto.randomUUID(),
        label: 'Lighting operator',
        position: 0,
        quantity: 1,
        type: 'staff',
      },
    ],
    p_show_id: eventId,
    p_target_cast_size: 3,
  })
  expect(planError).toBeNull()

  return {
    accepted,
    admin,
    anonKey: config.anonKey,
    declined,
    director,
    eventId,
    eventSlug,
    owner,
    password,
    pending,
    supabaseUrl: config.supabaseUrl,
    theaterId,
    theaterSlug,
  }
}

async function actorPage(browser: Browser, fixture: Fixture, actor: Actor) {
  const auth = createClient<Database>(fixture.supabaseUrl, fixture.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await auth.auth.signInWithPassword({
    email: actor.email,
    password: fixture.password,
  })
  expect(error).toBeNull()
  const context = await browser.newContext()
  await context.addCookies([
    {
      domain: 'localhost',
      httpOnly: true,
      name: 'stagecom-access-token',
      path: '/',
      sameSite: 'Lax',
      value: data.session!.access_token,
    },
  ])
  return { context, page: await context.newPage() }
}

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

async function deleteFixture(fixture: Fixture) {
  await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
  await Promise.all(
    [
      fixture.accepted,
      fixture.declined,
      fixture.director,
      fixture.owner,
      fixture.pending,
    ].map((actor) => fixture.admin.auth.admin.deleteUser(actor.userId)),
  )
}

test('Team Cast invitations review unique people, refresh changed membership, retry and accept on phone', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const config = getSupabaseConfig()
  test.skip(
    !config || !/^http:\/\/(localhost|127\.0\.0\.1):/.test(config.supabaseUrl),
    'Requires disposable local Supabase.',
  )
  const fixture = await createFixture(config!)
  const contexts: BrowserContext[] = []
  const failureConstraint = `test_sta73_${crypto.randomUUID().replaceAll('-', '')}`
  let failureInstalled = false
  try {
    for (const actor of [fixture.accepted, fixture.pending]) {
      const result = await fixture.admin.rpc('invite_event_cast_member', {
        p_show_id: fixture.eventId,
        p_actor_user_id: fixture.director.userId,
        p_member_user_id: actor.userId,
      })
      expect(result.error).toBeNull()
    }
    expect(
      (
        await fixture.admin.rpc('respond_to_event_cast_invitation', {
          p_show_id: fixture.eventId,
          p_actor_user_id: fixture.accepted.userId,
          p_response: 'accepted',
        })
      ).error,
    ).toBeNull()
    const first = crypto.randomUUID(),
      second = crypto.randomUUID()
    expect(
      (
        await fixture.admin.from('theater_teams').insert([
          {
            id: first,
            theater_id: fixture.theaterId,
            name: 'First Casting Team',
            owner_user_id: fixture.director.userId,
          },
          {
            id: second,
            theater_id: fixture.theaterId,
            name: 'Second Casting Team',
            owner_user_id: fixture.director.userId,
          },
        ])
      ).error,
    ).toBeNull()
    expect(
      (
        await fixture.admin.from('team_memberships').insert([
          ...[fixture.accepted, fixture.pending, fixture.declined].map(
            (actor) => ({
              team_id: first,
              theater_id: fixture.theaterId,
              user_id: actor.userId,
              state: 'accepted',
              invited_by: fixture.director.userId,
            }),
          ),
          ...[fixture.director, fixture.declined].map((actor) => ({
            team_id: second,
            theater_id: fixture.theaterId,
            user_id: actor.userId,
            state: 'accepted',
            invited_by: fixture.director.userId,
          })),
        ])
      ).error,
    ).toBeNull()
    const leader = await actorPage(browser, fixture, fixture.director)
    contexts.push(leader.context)
    await leader.page.setViewportSize({ width: 390, height: 844 })
    await leader.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await leader.page.getByRole('link', { name: 'Cast & Team' }).click()
    const picker = leader.page.getByRole('region', {
      name: 'Invite Team Members to Cast',
    })
    const whole = picker.getByLabel('Select whole Team: First Casting Team', {
      exact: true,
    })
    await waitForReactHandler(whole, 'onChange')
    await whole.focus()
    await whole.press('Space')
    await picker
      .getByLabel('Declined Member in Second Casting Team', { exact: true })
      .check()
    await picker
      .getByLabel('Cast Director in Second Casting Team', { exact: true })
      .check()
    await picker
      .getByRole('button', { name: 'Review named recipients' })
      .click()
    const review = picker.getByRole('region', {
      name: 'Named recipient review',
    })
    await expect(review.getByRole('listitem')).toHaveCount(4)
    await expect(
      review.getByText('Declined Member', { exact: true }),
    ).toHaveCount(1)
    await expect(review).toContainText('Accepted Cast · excluded')
    await expect(review).toContainText('Pending invitation · excluded')
    await expect(review).toContainText('2 unique eligible recipients')
    await leader.context.setOffline(true)
    await picker
      .getByRole('button', { name: 'Send reviewed invitations' })
      .click()
    await expect(picker.getByRole('alert')).toContainText('retry safely')
    await expect(review.getByRole('listitem')).toHaveCount(4)
    await leader.context.setOffline(false)
    expect(
      (
        await fixture.admin
          .from('show_cast')
          .select('user_id')
          .eq('show_id', fixture.eventId)
      ).data,
    ).toHaveLength(2)
    expect(
      (
        await fixture.admin.from('team_memberships').insert({
          team_id: first,
          theater_id: fixture.theaterId,
          user_id: fixture.owner.userId,
          state: 'accepted',
          invited_by: fixture.director.userId,
        })
      ).error,
    ).toBeNull()
    await picker
      .getByRole('button', { name: 'Send reviewed invitations' })
      .click()
    await expect(picker.getByRole('status')).toContainText(
      'No invitations were sent',
    )
    await expect(review.getByText('Cast Owner', { exact: true })).toBeVisible()
    await expect(review).toContainText('3 unique eligible recipients')
    expect(
      (
        await fixture.admin
          .from('show_cast')
          .select('user_id')
          .eq('show_id', fixture.eventId)
      ).data,
    ).toHaveLength(2)
    // Inject a real last-recipient database failure scoped to this fixture.
    localSql(
      `alter table public.show_cast add constraint ${failureConstraint} check (show_id <> '${fixture.eventId}'::uuid or user_id <> '${fixture.declined.userId}'::uuid) not valid`,
    )
    failureInstalled = true
    await picker
      .getByRole('button', { name: 'Send reviewed invitations' })
      .click()
    await expect(picker.getByRole('alert')).toBeVisible()
    expect(
      (
        await fixture.admin
          .from('show_cast')
          .select('user_id')
          .eq('show_id', fixture.eventId)
      ).data,
    ).toHaveLength(2)
    expect(
      (
        await fixture.admin
          .from('notifications')
          .select('id')
          .eq('entity_id', fixture.eventId)
      ).data,
    ).toHaveLength(2)
    await expect(review).toContainText('3 unique eligible recipients')
    localSql(
      `alter table public.show_cast drop constraint ${failureConstraint}`,
    )
    failureInstalled = false
    await picker
      .getByRole('button', { name: 'Send reviewed invitations' })
      .focus()
    await picker
      .getByRole('button', { name: 'Send reviewed invitations' })
      .press('Enter')
    await expect(picker.getByRole('status')).toContainText(
      '3 Cast invitations sent',
    )
    await expect
      .poll(
        async () =>
          (
            await fixture.admin
              .from('show_cast')
              .select('user_id')
              .eq('show_id', fixture.eventId)
          ).data?.length,
      )
      .toBe(5)
    await leader.page.reload()
    await leader.page.getByRole('link', { name: 'Cast & Team' }).click()
    await expect(
      leader.page.getByText('Declined Member', { exact: true }).first(),
    ).toBeVisible()
    const recipient = await actorPage(browser, fixture, fixture.declined)
    contexts.push(recipient.context)
    await recipient.page.goto('/app')
    await expect(
      recipient.page.getByText('Private Cast Event').first(),
    ).toBeVisible()
    await expect(
      recipient.page.getByRole('link', {
        name: 'Respond to invitation',
        exact: true,
      }),
    ).toBeVisible()
    await recipient.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await recipient.page.getByRole('link', { name: 'Cast & Team' }).click()
    await expect(
      recipient.page.getByRole('region', {
        name: 'Invite Team Members to Cast',
      }),
    ).toHaveCount(0)
    const accept = recipient.page.getByRole('button', {
      name: 'Accept invitation',
    })
    await waitForReactHandler(accept, 'onClick')
    await accept.click()
    await recipient.page.reload()
    await recipient.page.getByRole('link', { name: 'Cast & Team' }).click()
    await expect(
      recipient.page.getByLabel('Availability for Candidate Slot 1'),
    ).toBeVisible()
    await expect(
      recipient.page.getByRole('button', { name: 'Accept invitation' }),
    ).toHaveCount(0)
    const cast = await fixture.admin
      .from('show_cast')
      .select('status')
      .eq('show_id', fixture.eventId)
      .eq('user_id', fixture.declined.userId)
      .single()
    expect(cast.data?.status).toBe('accepted')
    const auth = createClient<Database>(fixture.supabaseUrl, fixture.anonKey)
    expect(
      (
        await auth.auth.signInWithPassword({
          email: fixture.accepted.email,
          password: fixture.password,
        })
      ).error,
    ).toBeNull()
    expect(
      (await auth.rpc('get_cast_team_options', { p_show_id: fixture.eventId }))
        .error?.code,
    ).toBe('42501')
    await recipient.page.goto('/app')
    await expect(
      recipient.page.getByRole('link', {
        name: 'Respond to invitation',
        exact: true,
      }),
    ).toHaveCount(0)
  } finally {
    if (failureInstalled)
      localSql(
        `alter table public.show_cast drop constraint if exists ${failureConstraint}`,
      )
    await Promise.allSettled(contexts.map((context) => context.close()))
    await deleteFixture(fixture)
  }
})

test('concurrent reviewed batches serialize and successful retries do not duplicate persisted invitations', async () => {
  const config = getSupabaseConfig()
  test.skip(
    !config || !/^http:\/\/(localhost|127\.0\.0\.1):/.test(config.supabaseUrl),
    'Requires disposable local Supabase.',
  )
  const fixture = await createFixture(config!)
  try {
    const teamId = crypto.randomUUID()
    expect(
      (
        await fixture.admin.from('theater_teams').insert({
          id: teamId,
          theater_id: fixture.theaterId,
          name: 'Concurrent Casting',
          owner_user_id: fixture.director.userId,
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await fixture.admin.from('team_memberships').insert(
          [fixture.accepted, fixture.pending].map((actor) => ({
            team_id: teamId,
            theater_id: fixture.theaterId,
            user_id: actor.userId,
            state: 'accepted',
            invited_by: fixture.director.userId,
          })),
        )
      ).error,
    ).toBeNull()
    const leader = createClient<Database>(fixture.supabaseUrl, fixture.anonKey)
    expect(
      (
        await leader.auth.signInWithPassword({
          email: fixture.director.email,
          password: fixture.password,
        })
      ).error,
    ).toBeNull()
    const selection = [{ teamId, memberIds: null }]
    const reviews = await Promise.all(
      [1, 2].map(() =>
        leader.rpc('review_team_cast_invitations', {
          p_show_id: fixture.eventId,
          p_selection: selection,
        }),
      ),
    )
    const reviewIds = reviews.map((result) => {
      expect(result.error).toBeNull()
      const value = result.data
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        typeof value.reviewId !== 'string'
      )
        throw new Error('Expected stored review')
      return value.reviewId
    })
    const sends = await Promise.all(
      reviewIds.map((id) =>
        leader.rpc('send_team_cast_invitations', { p_review_id: id }),
      ),
    )
    expect(sends.map((result) => result.error)).toEqual([null, null])
    const states = sends.map((result) => {
      const value = result.data
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value.state
        : null
    })
    expect(states.sort()).toEqual(['refreshed', 'sent'])
    const successfulReview =
      reviewIds[
        sends.findIndex((result) => {
          const value = result.data
          return (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            value.state === 'sent'
          )
        })
      ]
    const retries = await Promise.all(
      [1, 2].map(() =>
        leader.rpc('send_team_cast_invitations', {
          p_review_id: successfulReview,
        }),
      ),
    )
    expect(retries.map((result) => result.error)).toEqual([null, null])
    expect(
      (
        await fixture.admin
          .from('show_cast')
          .select('status')
          .eq('show_id', fixture.eventId)
      ).data,
    ).toEqual([{ status: 'pending' }, { status: 'pending' }])
    expect(
      (
        await fixture.admin
          .from('notifications')
          .select('id')
          .eq('entity_id', fixture.eventId)
      ).data,
    ).toHaveLength(2)
    expect(
      (
        await fixture.admin
          .from('activity_events')
          .select('id')
          .eq('entity_id', fixture.eventId)
          .eq('action', 'event.cast.invited')
      ).data,
    ).toHaveLength(2)
  } finally {
    await deleteFixture(fixture)
  }
})

// SQL fault injection is confined to the disposable local integration target.
function localSql(sql: string) {
  const raw = process.env.SUPABASE_DB_URL ?? testEnv.SUPABASE_DB_URL
  if (!raw)
    throw new Error('Local database URL is required for batch rollback checks.')
  const url = new URL(raw)
  if (!['127.0.0.1', 'localhost'].includes(url.hostname))
    throw new Error('Fault injection requires a disposable local database.')
  const container = process.env.STAGECOM_TEST_DB_CONTAINER
  if (container) {
    if (!/^supabase_db_[a-zA-Z0-9_-]+$/.test(container))
      throw new Error('Expected a local Supabase database container.')
    execFileSync(
      'docker',
      [
        'exec',
        '-i',
        container,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 },
    )
    return
  }
  execFileSync('psql', ['--no-psqlrc', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    env: {
      ...process.env,
      PGCONNECT_TIMEOUT: '10',
      PGHOST: url.hostname,
      PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: url.pathname.slice(1),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}
