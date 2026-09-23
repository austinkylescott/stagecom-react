import { execFileSync } from 'node:child_process'
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
    await ownerPage.goto('/app')
    await ownerPage.getByRole('link', { name: 'Enter Theater' }).click()
    const queue = ownerPage.getByRole('region', { name: 'Work Queue' })
    await expect(
      queue.getByText('Producer requested cancellation'),
    ).toBeVisible()
    await expect(ownerPage.locator('main h2')).toHaveText([
      'Work Queue',
      'Urgent Operational Exceptions',
      'Upcoming Theater Calendar',
      'Event pipeline',
      'Recent activity',
    ])
    const decision = queue.getByRole('link', {
      name: 'Decide cancellation request',
    })
    await expect(decision).toBeInViewport()
    await ownerPage.screenshot({
      path: test.info().outputPath('operations-desktop.png'),
      fullPage: true,
    })
    await ownerPage.setViewportSize({ width: 390, height: 844 })
    await expect(decision).toBeInViewport()
    await expect
      .poll(() =>
        ownerPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    await ownerPage.screenshot({
      path: test.info().outputPath('operations-mobile.png'),
      fullPage: true,
    })
    await decision.click()
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
    await ownerPage
      .getByRole('link', { name: 'Theater Operations', exact: true })
      .click()
    await expect(
      ownerPage.getByRole('link', { name: 'Decide cancellation request' }),
    ).toHaveCount(0)

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

test('Callsheet and Theater Operations separate Producer content from watch-only exceptions', async ({
  browser,
}) => {
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)
  const ownerContext = await browser.newContext()
  const producerContext = await browser.newContext()
  const castContext = await browser.newContext()
  try {
    const blockStart = new Date(Date.now() + 24 * 60 * 60_000).toISOString()
    const blockEnd = new Date(Date.now() + 25 * 60 * 60_000).toISOString()
    const block = await fixture.admin.rpc('create_schedule_block', {
      p_actor_user_id: fixture.userIds[0],
      p_theater_id: fixture.theaterId,
      p_command_id: crypto.randomUUID(),
      p_starts_at: blockStart,
      p_ends_at: blockEnd,
      p_private_label: 'Lighting maintenance',
      p_private_notes: 'Fixture-only private notes',
    })
    expect(block.error).toBeNull()
    // Event creation also adds its actor as Producer; exercise a pure Operator.
    const { error: leadershipError } = await fixture.admin
      .from('show_leadership')
      .delete()
      .eq('show_id', fixture.eventId)
      .eq('user_id', fixture.userIds[0])
      .eq('role', 'producer')
    expect(leadershipError).toBeNull()

    const { error } = await fixture.admin
      .from('show_public_content_revisions')
      .insert({
        show_id: fixture.eventId,
        revision_number: 2,
        title: 'Cancellation Night',
        description: '',
        admission_price_cents: 0,
        sales_channel: 'no_advance_ticketing',
        created_by_user_id: fixture.userIds[1],
        updated_by_user_id: fixture.userIds[1],
        last_command_id: crypto.randomUUID(),
      })
    expect(error).toBeNull()
    await authenticateContext(ownerContext, fixture, fixture.ownerEmail)
    const ownerPage = await ownerContext.newPage()
    await ownerPage.goto('/app')
    await ownerPage.getByRole('link', { name: 'Enter Theater' }).click()
    await expect(
      ownerPage.getByRole('region', { name: 'Event pipeline' }),
    ).toContainText('1 Event')
    await expect(
      ownerPage.getByRole('region', { name: 'Upcoming Theater Calendar' }),
    ).toContainText('Lighting maintenance')
    await expect(ownerPage.getByText('Fixture-only private notes')).toHaveCount(
      0,
    )
    await ownerPage.getByRole('link', { name: 'Open Theater Calendar' }).click()
    await expect(
      ownerPage.getByRole('heading', { name: 'Theater Calendar', exact: true }),
    ).toBeVisible()
    await ownerPage
      .getByRole('link', { name: 'Theater Operations', exact: true })
      .click()
    await expect(
      ownerPage
        .getByRole('region', { name: 'Recent activity' })
        .getByRole('listitem')
        .first(),
    ).toBeVisible()
    // The disclosure must be operable without a pointer.
    await ownerPage
      .getByText('Other conditions to monitor (1)', { exact: true })
      .press('Enter')
    const exceptions = ownerPage.getByRole('region', {
      name: 'Other conditions to monitor',
    })
    await expect(
      exceptions.getByRole('heading', {
        name: 'Public content awaits Producer',
      }),
    ).toBeVisible()
    await expect(
      exceptions.getByText(
        'Producer must add a public description and public image.',
      ),
    ).toBeVisible()
    await expect(exceptions.getByRole('button')).toHaveCount(0)
    await expect(
      ownerPage
        .getByRole('region', { name: 'Work Queue' })
        .getByRole('link', { name: 'Preview and publish Event' }),
    ).toHaveCount(0)
    await exceptions.getByRole('link', { name: /View Event context/ }).click()
    await expect(ownerPage).toHaveURL(/#public-page$/)
    await expect(
      ownerPage.getByRole('heading', { name: 'Public Page', exact: true }),
    ).toBeVisible()

    await authenticateContext(producerContext, fixture, fixture.producerEmail)
    const producerPage = await producerContext.newPage()
    await producerPage.goto('/app')
    await producerPage
      .getByRole('link', { name: 'Prepare public content' })
      .click()
    await expect(
      producerPage.getByRole('heading', { name: 'Public Page', exact: true }),
    ).toBeVisible()
    await expect(
      producerPage.getByRole('button', { name: 'Publish Event', exact: true }),
    ).toHaveCount(0)

    await authenticateContext(castContext, fixture, fixture.castEmail)
    const castPage = await castContext.newPage()
    await castPage.goto('/app')
    await expect(
      castPage.getByRole('link', { name: 'Prepare public content' }),
    ).toHaveCount(0)
    const theaterLink = castPage.getByRole('link', { name: 'Enter Theater' })
    const theaterUrl = new URL(
      (await theaterLink.getAttribute('href'))!,
      castPage.url(),
    )
    await theaterLink.click()
    await expect(castPage).toHaveURL(theaterUrl.href)
    await expect(
      castPage.getByRole('heading', { name: 'Public content awaits Producer' }),
    ).toHaveCount(0)
    await expect(
      castPage.getByRole('region', { name: 'Event pipeline' }),
    ).toHaveCount(0)
    await expect(
      castPage.getByRole('region', { name: 'Recent activity' }),
    ).toHaveCount(0)
    // Seed accepted Admin authority, then verify the same ordinary cockpit.
    const grant = await fixture.admin
      .from('theater_memberships')
      .update({ roles: ['member', 'admin'] })
      .eq('theater_id', fixture.theaterId)
      .eq('user_id', fixture.userIds[2])
    expect(grant.error).toBeNull()
    await castPage.reload()
    await expect(
      castPage.getByRole('region', { name: 'Event pipeline' }),
    ).toContainText('1 Event')
    await expect(
      castPage.getByRole('region', { name: 'Upcoming Theater Calendar' }),
    ).toContainText('Lighting maintenance')
    await castPage
      .getByText('Other conditions to monitor (1)', { exact: true })
      .press('Enter')
    await expect(
      castPage.getByRole('heading', { name: 'Public content awaits Producer' }),
    ).toBeVisible()
    const revoke = await fixture.admin
      .from('theater_memberships')
      .update({ roles: ['member'] })
      .eq('theater_id', fixture.theaterId)
      .eq('user_id', fixture.userIds[2])
    expect(revoke.error).toBeNull()
    await castPage.reload()
    await expect(
      castPage.getByRole('region', { name: 'Event pipeline' }),
    ).toHaveCount(0)
    await expect(castPage.getByText('Lighting maintenance')).toHaveCount(0)
  } finally {
    await Promise.all([
      ownerContext.close(),
      producerContext.close(),
      castContext.close(),
    ])
    await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
    await Promise.all(
      fixture.userIds.map((userId) =>
        fixture.admin.auth.admin.deleteUser(userId),
      ),
    )
  }
})

test('Operator can inspect automatic completion history without a manual completion control', async ({
  browser,
}) => {
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)
  const ownerContext = await browser.newContext()
  const producerContext = await browser.newContext()
  try {
    // The database suite exercises actual failures; this fixture owns their History presentation.
    const { error: failureError } = await fixture.admin
      .from('activity_events')
      .insert({
        theater_id: fixture.theaterId,
        entity_type: 'event',
        entity_id: fixture.eventId,
        action: 'event.completion.failed',
        visibility: 'admin_only',
        payload: {
          errorMessage: 'The Event changed while completion was evaluated.',
          evaluatedAt: '2026-11-15T02:01:00Z',
          finalConfirmedSlotEndsAt: '2026-11-15T02:00:00Z',
        },
      })
    expect(failureError).toBeNull()
    await authenticateContext(ownerContext, fixture, fixture.ownerEmail)
    const page = await ownerContext.newPage()
    await page.goto('/app')
    await page.getByRole('link', { name: 'Enter Theater' }).click()
    await page.getByRole('link', { name: 'Events', exact: true }).click()
    await page.getByRole('link', { name: 'Cancellation Night' }).click()
    await page.getByRole('link', { name: 'History', exact: true }).click()
    await expect(
      page.getByText('Automatic completion failed', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(/Automatic completion failed safely: The Event changed/),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Complete Event', exact: true }),
    ).toHaveCount(0)

    await authenticateContext(producerContext, fixture, fixture.producerEmail)
    const producerPage = await producerContext.newPage()
    await producerPage.goto('/app')
    await producerPage.getByRole('link', { name: 'Enter Theater' }).click()
    await producerPage
      .getByRole('link', { name: 'Events', exact: true })
      .click()
    await producerPage.getByRole('link', { name: 'Cancellation Night' }).click()
    await producerPage
      .getByRole('link', { name: 'History', exact: true })
      .click()
    await expect(
      producerPage.getByText('Automatic completion failed', { exact: true }),
    ).toHaveCount(0)

    const { data: completed, error: completionError } = await fixture.admin.rpc(
      'complete_due_events',
      {
        p_now: '2026-11-15T02:02:00Z',
        p_show_id: fixture.eventId,
      },
    )
    expect(completionError).toBeNull()
    expect(completed).toBe(1)
    await page.reload()
    await expect(
      page.getByText('Event completed', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Complete Event', exact: true }),
    ).toHaveCount(0)
  } finally {
    await Promise.all([ownerContext.close(), producerContext.close()])
    await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
    await Promise.all(
      fixture.userIds.map((userId) =>
        fixture.admin.auth.admin.deleteUser(userId),
      ),
    )
  }
})

test('safe completion failure stays watch-only until automatic recovery clears it', async ({
  browser,
}) => {
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const endpoint = new URL(config!.supabaseUrl)
  test.skip(
    !['localhost', '127.0.0.1'].includes(endpoint.hostname) ||
      endpoint.port !== '54321',
    'Fault injection is restricted to the default local Supabase instance.',
  )
  const fixture = await createFixture(config!)
  const ownerContext = await browser.newContext()
  const producerContext = await browser.newContext()
  // A unique trigger affects only this fixture; the real evaluator still owns failure recording.
  const faultName = `sta51_failure_${fixture.eventId.replaceAll('-', '')}`
  let faultInstalled = false
  const removeFault = () => {
    localCompletionSql(
      `drop trigger if exists ${faultName} on public.shows; drop function if exists private.${faultName}();`,
    )
    faultInstalled = false
  }
  try {
    localCompletionSql(`
      begin;
      create function private.${faultName}() returns trigger language plpgsql as $fault$
      begin raise exception 'STA-51 safe completion verification'; end; $fault$;
      create trigger ${faultName} before update on public.shows for each row
        when (new.id = '${fixture.eventId}'::uuid and new.lifecycle_status = 'completed')
        execute function private.${faultName}();
      update public.show_candidate_slots set starts_at = now() - interval '2 hours'
        where id in (select confirmed_candidate_slot_id from public.show_occurrences where show_id = '${fixture.eventId}'::uuid);
      commit;
    `)
    faultInstalled = true
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await fixture.admin.rpc('complete_due_events', {
        p_now: new Date().toISOString(),
        p_show_id: fixture.eventId,
      })
      expect(result.error).toBeNull()
      expect(result.data).toBe(0)
    }
    await authenticateContext(ownerContext, fixture, fixture.ownerEmail)
    const page = await ownerContext.newPage()
    await page.goto('/app')
    await page.getByRole('link', { name: 'Enter Theater' }).click()
    const exceptions = page.getByRole('region', {
      name: 'Operational Exceptions',
    })
    await expect(
      exceptions.getByRole('heading', { name: 'Automatic completion failed' }),
    ).toHaveCount(1)
    await expect(
      exceptions.getByText(
        /Final Confirmed Slot has ended; completion remains unresolved/,
      ),
    ).toBeVisible()
    await expect(exceptions.getByRole('button')).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: 'Work Queue' }).getByText(/complet/i),
    ).toHaveCount(0)
    await exceptions.getByRole('link', { name: /View Event context/ }).click()
    await expect(
      page.getByText(
        /Automatic completion failed safely: STA-51 safe completion verification/,
      ),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Complete Event', exact: true }),
    ).toHaveCount(0)

    await authenticateContext(producerContext, fixture, fixture.producerEmail)
    const producerPage = await producerContext.newPage()
    await producerPage.goto('/app')
    await producerPage.getByRole('link', { name: 'Enter Theater' }).click()
    await expect(
      producerPage.getByText('Automatic completion failed', { exact: true }),
    ).toHaveCount(0)

    removeFault()
    const recovered = await fixture.admin.rpc('complete_due_events', {
      p_now: new Date().toISOString(),
      p_show_id: fixture.eventId,
    })
    expect(recovered.error).toBeNull()
    await page.reload()
    await expect(
      page.getByText('Event completed', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('link', { name: 'Theater Operations', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Automatic completion failed' }),
    ).toHaveCount(0)
  } finally {
    if (faultInstalled) removeFault()
    await Promise.allSettled([ownerContext.close(), producerContext.close()])
    await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
    await Promise.all(
      fixture.userIds.map((userId) =>
        fixture.admin.auth.admin.deleteUser(userId),
      ),
    )
  }
})

function localCompletionSql(sql: string) {
  execFileSync(
    'psql',
    [
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '--dbname=postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    ],
    { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 10_000 },
  )
}

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
