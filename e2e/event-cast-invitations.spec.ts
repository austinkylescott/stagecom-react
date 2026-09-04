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
    await waitForReactHandler(
      acceptedPage.page.getByLabel('Availability for Candidate Slot 1'),
      'onChange',
    )
    await expect(
      acceptedPage.page.getByText('Your participation response is separate'),
    ).toBeVisible()
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
    ).toContainText('pending')
    await acceptedPage.page
      .getByRole('button', { name: 'Accept invitation' })
      .click()
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
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Candidate Slot 1' }),
    ).toBeVisible()
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Candidate Slot 2' }),
    ).toBeVisible()
    await expect(
      pendingPage.page.getByRole('heading', { name: 'Candidate Slot 3' }),
    ).toBeVisible()
    await expect(
      pendingPage.page.getByRole('heading', {
        name: 'Collaborative availability matrix',
      }),
    ).toHaveCount(0)
    await expect(pendingPage.page.getByText('Occurrence Calls')).toHaveCount(0)
    await expect(pendingPage.page.getByText('Accepted Member')).toBeVisible()
    await expect(pendingPage.page.getByText('Pending Member')).toBeVisible()
    await expect(pendingPage.page.getByText('Declined Member')).toHaveCount(0)
    await expect(pendingPage.page.getByText('Leadership')).toHaveCount(0)
    await expect(
      pendingPage.page.getByRole('heading', {
        name: 'Requested staffing needs and resources',
      }),
    ).toHaveCount(0)

    await acceptedPage.page.reload()
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
    await expect(
      ownerPage.page.getByRole('heading', {
        name: 'Requested staffing needs and resources',
      }),
    ).toBeVisible()
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
