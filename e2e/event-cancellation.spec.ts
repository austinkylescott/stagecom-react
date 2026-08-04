import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { BrowserContext, Locator } from '@playwright/test'
import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

test('Producer requests cancellation and management preserves a public notice while releasing commitments', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)
  const producerContext = await browser.newContext()
  const castContext = await browser.newContext()
  const ownerContext = await browser.newContext()
  const anonymousContext = await browser.newContext()

  try {
    await authenticateContext(producerContext, fixture, fixture.producerEmail)
    const producerPage = await producerContext.newPage()
    await producerPage.goto(fixture.workspacePath)
    await expect(
      producerPage.getByRole('heading', {
        exact: true,
        name: 'Cancellation',
      }),
    ).toBeVisible()
    await expect(
      producerPage.getByRole('button', { name: 'Request cancellation' }),
    ).toBeVisible()
    await expect(
      producerPage.getByRole('button', { name: 'Cancel Event' }),
    ).toHaveCount(0)
    const producerReason = producerPage.getByLabel('Cancellation reason')
    await waitForReactHandler(producerReason, 'onChange')
    await producerReason.fill(
      'The Producer recommends cancellation after a venue closure.',
    )
    await producerPage
      .getByRole('button', { name: 'Request cancellation' })
      .click()
    await expect(
      producerPage.getByText(
        'Cancellation requested. An Owner or Admin must make the final decision.',
      ),
    ).toBeVisible()
    await expect(
      producerPage.getByRole('listitem').filter({
        hasText: 'The Producer recommends cancellation after a venue closure.',
      }),
    ).toBeVisible()
    await expect(
      producerPage.getByText('approved', { exact: true }).first(),
    ).toBeVisible()

    await authenticateContext(castContext, fixture, fixture.castEmail)
    const castPage = await castContext.newPage()
    await castPage.goto(fixture.workspacePath)
    await expect(
      castPage.getByRole('button', { name: 'Request cancellation' }),
    ).toHaveCount(0)
    await expect(
      castPage.getByRole('button', { name: 'Cancel Event' }),
    ).toHaveCount(0)

    await authenticateContext(ownerContext, fixture, fixture.ownerEmail)
    const ownerPage = await ownerContext.newPage()
    await ownerPage.goto(fixture.workspacePath)
    await expect(
      ownerPage.getByText(
        'The Producer recommends cancellation after a venue closure.',
      ),
    ).toBeVisible()
    const ownerReason = ownerPage.getByLabel('Cancellation reason')
    await waitForReactHandler(ownerReason, 'onChange')
    await ownerReason.fill(
      'Management confirmed the venue closure and notified the company.',
    )
    await ownerPage.getByRole('button', { name: 'Cancel Event' }).click()
    await expect(
      ownerPage.getByRole('heading', { name: 'Event cancelled' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByText('cancelled', { exact: true }).first(),
    ).toBeVisible()

    await expect
      .poll(async () => {
        const { data } = await fixture.admin
          .from('show_schedule_reservations')
          .select('status')
          .eq('show_id', fixture.eventId)
          .single()
        return data?.status
      })
      .toBe('released')

    const publicPage = await anonymousContext.newPage()
    await publicPage.goto(fixture.publicPath)
    await expect(
      publicPage.getByRole('heading', { name: 'Cancellation Night' }),
    ).toBeVisible()
    await expect(
      publicPage.getByText('This Event has been cancelled.'),
    ).toBeVisible()
    await expect(
      publicPage.getByText(
        'Admission is closed because this Event was cancelled.',
      ),
    ).toBeVisible()
    await expect(
      publicPage.getByRole('link', { name: 'Get tickets' }),
    ).toHaveCount(0)
  } finally {
    await Promise.all([
      producerContext.close(),
      castContext.close(),
      ownerContext.close(),
      anonymousContext.close(),
    ])
    await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
    await Promise.all(
      fixture.userIds.map((userId) =>
        fixture.admin.auth.admin.deleteUser(userId),
      ),
    )
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
) {
  const admin = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const password = `Stagecom-${crypto.randomUUID()}`
  const actors = await Promise.all(
    [
      ['owner', 'Cancellation Owner'],
      ['producer', 'Cancellation Producer'],
      ['cast', 'Cancellation Cast'],
    ].map(async ([key, displayName]) => {
      const email = `cancellation-${key}-${suffix}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: displayName },
      })
      expect(error).toBeNull()
      return { email, userId: data.user!.id }
    }),
  )
  const [owner, producer, cast] = actors
  const theaterSlug = `cancellation-stage-${suffix}`
  const eventSlug = `cancellation-night-${suffix}`
  const { data: theaters, error: theaterError } = await admin.rpc(
    'create_theater_with_owner',
    {
      p_actor_user_id: owner.userId,
      p_name: 'Cancellation Stage',
      p_slug: theaterSlug,
      p_timezone: 'America/New_York',
    },
  )
  expect(theaterError).toBeNull()
  const theaterId = theaters![0].id
  const { data: theater, error: theaterReadError } = await admin
    .from('theaters')
    .select('primary_venue_id')
    .eq('id', theaterId)
    .single()
  expect(theaterReadError).toBeNull()
  const { error: membershipError } = await admin
    .from('theater_memberships')
    .insert(
      [producer, cast].map((actor) => ({
        roles: ['member' as const],
        status: 'active' as const,
        theater_id: theaterId,
        user_id: actor.userId,
      })),
    )
  expect(membershipError).toBeNull()
  const { error: theaterUpdateError } = await admin
    .from('theaters')
    .update({
      city: 'New York',
      country: 'US',
      postal_code: '10001',
      producer_eligibility: 'all_members',
      published_at: '2026-09-15T16:00:00.000Z',
      state_region: 'NY',
      status: 'published',
      street: '1 Stage Street',
      tagline: 'Clear communication, even when plans change',
    })
    .eq('id', theaterId)
  expect(theaterUpdateError).toBeNull()

  const { data: events, error: eventError } = await admin.rpc(
    'create_managed_event',
    {
      p_actor_user_id: owner.userId,
      p_producer_user_ids: [producer.userId],
      p_slug: eventSlug,
      p_theater_id: theaterId,
      p_title: 'Cancellation Night',
    },
  )
  expect(eventError).toBeNull()
  const eventId = events![0].id
  const occurrenceId = crypto.randomUUID()
  const slotId = crypto.randomUUID()
  const { error: planError } = await admin.rpc('save_event_operational_plan', {
    p_actor_user_id: owner.userId,
    p_minimum_viable_cast: 1,
    p_occurrences: [
      {
        candidateSlots: [
          {
            durationMinutes: 90,
            id: slotId,
            localStartsAt: '2026-11-14T19:30',
            locationKind: 'primary_venue',
            locationName: 'Cancellation Stage',
            offSiteApproved: false,
            position: 0,
            resourceId: theater!.primary_venue_id,
            startsAt: '2026-11-15T00:30:00.000Z',
            timezoneName: 'America/New_York',
            timezoneSource: 'manual',
            utcOffsetMinutes: -300,
          },
        ],
        confirmedCandidateSlotId: slotId,
        id: occurrenceId,
        position: 0,
        type: 'performance',
        visibility: 'public',
      },
    ],
    p_resource_requests: [],
    p_show_id: eventId,
    p_target_cast_size: 1,
  })
  expect(planError).toBeNull()
  const { error: castError } = await admin.from('show_cast').insert({
    public_credit_enabled: true,
    show_id: eventId,
    source: 'invited',
    status: 'accepted',
    user_id: cast.userId,
  })
  expect(castError).toBeNull()

  const proposalRevisionId = crypto.randomUUID()
  const { error: revisionError } = await admin
    .from('show_proposal_revisions')
    .insert({
      command_id: crypto.randomUUID(),
      decision_state: 'approved',
      decision_version: 2,
      id: proposalRevisionId,
      revision_number: 1,
      show_id: eventId,
      snapshot: {},
      submitted_by: producer.userId,
    })
  expect(revisionError).toBeNull()
  const { error: decisionError } = await admin
    .from('show_proposal_decisions')
    .insert({
      action: 'approve',
      actor_user_id: owner.userId,
      command_id: crypto.randomUUID(),
      proposal_revision_id: proposalRevisionId,
      revision_version: 1,
    })
  expect(decisionError).toBeNull()

  const publicRevisionId = crypto.randomUUID()
  const { error: contentError } = await admin
    .from('show_public_content_revisions')
    .insert({
      admission_price_cents: 2500,
      created_by_user_id: producer.userId,
      description: 'A published Event whose cancellation remains visible.',
      external_url: 'https://tickets.example/cancellation-night',
      id: publicRevisionId,
      image_url: 'https://images.example/cancellation-night.jpg',
      last_command_id: crypto.randomUUID(),
      published_at: '2026-09-15T16:00:00.000Z',
      revision_number: 1,
      sales_channel: 'external',
      show_id: eventId,
      title: 'Cancellation Night',
      updated_by_user_id: owner.userId,
    })
  expect(contentError).toBeNull()
  const { error: snapshotError } = await admin
    .from('show_public_occurrence_snapshots')
    .insert({
      duration_minutes: 90,
      local_starts_at: '2026-11-14T19:30:00',
      location_name: 'Cancellation Stage',
      occurrence_id: occurrenceId,
      position: 0,
      revision_id: publicRevisionId,
      starts_at: '2026-11-15T00:30:00.000Z',
      timezone_name: 'America/New_York',
      utc_offset_minutes: -300,
    })
  expect(snapshotError).toBeNull()
  const { error: showUpdateError } = await admin
    .from('shows')
    .update({
      approved_proposal_revision_id: proposalRevisionId,
      is_public_listed: true,
      lifecycle_status: 'approved',
      publication_status: 'published',
      published_public_content_revision_id: publicRevisionId,
      status: 'approved',
    })
    .eq('id', eventId)
  expect(showUpdateError).toBeNull()
  const { error: reservationError } = await admin
    .from('show_schedule_reservations')
    .insert({
      candidate_slot_id: slotId,
      kind: 'approved_commitment',
      occurrence_id: occurrenceId,
      proposal_revision_id: proposalRevisionId,
      reserved_during: '["2026-11-15 00:30:00+00","2026-11-15 02:00:00+00")',
      resource_id: theater!.primary_venue_id,
      show_id: eventId,
      theater_id: theaterId,
    })
  expect(reservationError).toBeNull()

  return {
    admin,
    anonKey: config.anonKey,
    castEmail: cast.email,
    eventId,
    ownerEmail: owner.email,
    password,
    producerEmail: producer.email,
    publicPath: `/theater/${theaterSlug}/${eventSlug}`,
    supabaseUrl: config.supabaseUrl,
    theaterId,
    userIds: actors.map(({ userId }) => userId),
    workspacePath: `/app/${theaterSlug}/events/${eventSlug}`,
  }
}

async function authenticateContext(
  context: BrowserContext,
  fixture: Awaited<ReturnType<typeof createFixture>>,
  email: string,
) {
  const auth = createClient<Database>(fixture.supabaseUrl, fixture.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await auth.auth.signInWithPassword({
    email,
    password: fixture.password,
  })
  expect(error).toBeNull()
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
