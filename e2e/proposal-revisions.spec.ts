import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

test('Producer selects a Proposed Cast, compares evidence, and submits a revision', async ({
  context,
  page,
}) => {
  test.setTimeout(90_000)
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)

  try {
    const auth = createClient<Database>(fixture.supabaseUrl, fixture.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: session, error: signInError } =
      await auth.auth.signInWithPassword({
        email: fixture.ownerEmail,
        password: fixture.password,
      })
    expect(signInError).toBeNull()
    await context.addCookies([
      {
        domain: 'localhost',
        httpOnly: true,
        name: 'stagecom-access-token',
        path: '/',
        sameSite: 'Lax',
        value: session.session!.access_token,
      },
    ])

    await page.goto(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`)
    await page.waitForTimeout(500)
    await expect(
      page.getByRole('heading', { name: 'Proposal Revision' }),
    ).toBeVisible()
    await expect(page.getByText('Pending Invitee').first()).toBeVisible()
    await page.getByLabel('Accepted Cast', { exact: true }).check()
    await page.getByRole('button', { name: 'Save Proposed Cast' }).click()
    await expect
      .poll(async () => {
        const { count } = await fixture.admin
          .from('show_proposed_cast')
          .select('*', { count: 'exact', head: true })
          .eq('show_id', fixture.eventId)
        return count
      })
      .toBe(1)

    await expect(
      page.getByText('Rank 1: Community Hall · Viable'),
    ).toBeVisible()
    await expect(
      page.getByText('1 of 1 required Cast Members confirmed available.'),
    ).toBeVisible()
    await expect(
      page
        .getByText(
          'Approved off-site location does not reserve the Primary Venue.',
        )
        .first(),
    ).toBeVisible()
    await page.getByRole('radio').first().check()

    await page.getByRole('button', { name: 'Save operational plan' }).click()
    await expect(page.getByText('Plan saved.')).toBeVisible()

    await page.getByRole('button', { name: 'Submit Proposal Revision' }).click()
    await expect(
      page.getByText('Proposal Revision 1 submitted for review.'),
    ).toBeVisible()

    const [{ data: event }, { data: revisions }, { data: activity }] =
      await Promise.all([
        fixture.admin
          .from('shows')
          .select('lifecycle_status')
          .eq('id', fixture.eventId)
          .single(),
        fixture.admin
          .from('show_proposal_revisions')
          .select('revision_number, decision_state, snapshot')
          .eq('show_id', fixture.eventId),
        fixture.admin
          .from('activity_events')
          .select('action')
          .eq('entity_id', fixture.eventId)
          .eq('action', 'event.proposal_revision.submitted'),
      ])

    expect(event?.lifecycle_status).toBe('in_review')
    expect(revisions).toHaveLength(1)
    expect(revisions?.[0]).toMatchObject({
      decision_state: 'pending',
      revision_number: 1,
    })
    expect(activity).toEqual([{ action: 'event.proposal_revision.submitted' }])

    await page.reload()
    await page.waitForTimeout(500)
    await page
      .getByLabel('Explicitly invoke the audited Owner self-approval override')
      .check()
    await page
      .getByLabel('Reason (required)')
      .fill('One-person Theater exception for this exact operational plan.')
    await page
      .getByRole('button', { name: 'Approve with Owner override' })
      .click()

    await expect(
      page.getByText('approved', { exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByText('Owner override', { exact: false }),
    ).toBeVisible()
    await expect(page.getByText('unpublished', { exact: true })).toBeVisible()

    const [approvedEvent, decision, overrideActivity] = await Promise.all([
      fixture.admin
        .from('shows')
        .select(
          'lifecycle_status, publication_status, approved_proposal_revision_id',
        )
        .eq('id', fixture.eventId)
        .single(),
      fixture.admin
        .from('show_proposal_decisions')
        .select('action, owner_override, reason')
        .single(),
      fixture.admin
        .from('activity_events')
        .select('action')
        .eq('entity_id', fixture.eventId)
        .eq('action', 'event.proposal_revision.owner_override_approved'),
    ])
    expect(approvedEvent.data).toMatchObject({
      lifecycle_status: 'approved',
      publication_status: 'unpublished',
    })
    expect(approvedEvent.data?.approved_proposal_revision_id).toBeTruthy()
    expect(decision.data).toEqual({
      action: 'approve',
      owner_override: true,
      reason: 'One-person Theater exception for this exact operational plan.',
    })
    expect(overrideActivity.data).toEqual([
      { action: 'event.proposal_revision.owner_override_approved' },
    ])
  } finally {
    await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
    await Promise.all(
      fixture.userIds.map((userId) =>
        fixture.admin.auth.admin.deleteUser(userId),
      ),
    )
  }
})

test('Reviewer Counteroffer holds the Primary Venue until explicit viable acceptance', async ({
  context,
  page,
}) => {
  test.setTimeout(90_000)
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)

  try {
    const { error: proposedCastError } = await fixture.admin.rpc(
      'save_event_proposed_cast',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_cast_user_ids: [fixture.acceptedUserId],
        p_command_id: crypto.randomUUID(),
        p_show_id: fixture.eventId,
      },
    )
    expect(proposedCastError).toBeNull()
    const { error: confirmedSlotError } = await fixture.admin
      .from('show_occurrences')
      .update({ confirmed_candidate_slot_id: fixture.viableSlotId })
      .eq('id', fixture.occurrenceId)
    expect(confirmedSlotError).toBeNull()
    const { error: submissionError } = await fixture.admin.rpc(
      'submit_event_proposal_revision',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_command_id: crypto.randomUUID(),
        p_show_id: fixture.eventId,
      },
    )
    expect(submissionError).toBeNull()

    await authenticateContext({
      anonKey: fixture.anonKey,
      context,
      email: fixture.reviewerEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    await page.goto(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`)
    await page.waitForTimeout(500)
    await page
      .getByLabel('Offered local date and time')
      .fill('2026-10-12T19:30')
    await page.getByLabel('Offered duration (minutes)').fill('90')
    await page.getByRole('button', { name: 'Issue Counteroffer' }).click()
    await expect(page.getByText('Counteroffer · pending')).toBeVisible()

    const { data: issuedOffer } = await fixture.admin
      .from('show_counteroffers')
      .select('id, candidate_slot_id, state')
      .eq(
        'proposal_revision_id',
        (
          await fixture.admin
            .from('show_proposal_revisions')
            .select('id')
            .eq('show_id', fixture.eventId)
            .eq('revision_number', 1)
            .single()
        ).data!.id,
      )
      .single()
    expect(issuedOffer?.state).toBe('pending')
    const { count: activeHoldCount } = await fixture.admin
      .from('show_schedule_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('counteroffer_id', issuedOffer!.id)
      .eq('status', 'active')
    expect(activeHoldCount).toBe(1)

    await authenticateContext({
      anonKey: fixture.anonKey,
      context,
      email: fixture.acceptedEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    await page.goto(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`)
    await page.waitForTimeout(500)
    await page
      .getByLabel('Availability for Candidate Slot 3')
      .selectOption('available')
    await expect
      .poll(async () => {
        const { data } = await fixture.admin
          .from('show_availability_responses')
          .select('response')
          .eq('candidate_slot_id', issuedOffer!.candidate_slot_id)
          .eq('user_id', fixture.acceptedUserId)
          .maybeSingle()
        return data?.response
      })
      .toBe('available')

    await authenticateContext({
      anonKey: fixture.anonKey,
      context,
      email: fixture.ownerEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    await page.goto(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'accept Counteroffer' }).click()
    await expect(page.getByText('Revision 2 · pending')).toBeVisible()

    const [{ data: revisions }, { data: offer }, { count: remainingHolds }] =
      await Promise.all([
        fixture.admin
          .from('show_proposal_revisions')
          .select('revision_number, decision_state')
          .eq('show_id', fixture.eventId)
          .order('revision_number'),
        fixture.admin
          .from('show_counteroffers')
          .select('state, resulting_proposal_revision_id')
          .eq('id', issuedOffer!.id)
          .single(),
        fixture.admin
          .from('show_schedule_reservations')
          .select('*', { count: 'exact', head: true })
          .eq('counteroffer_id', issuedOffer!.id)
          .eq('status', 'active'),
      ])
    expect(revisions).toEqual([
      { decision_state: 'counteroffered', revision_number: 1 },
      { decision_state: 'pending', revision_number: 2 },
    ])
    expect(offer).toMatchObject({ state: 'accepted' })
    expect(offer?.resulting_proposal_revision_id).toBeTruthy()
    expect(remainingHolds).toBe(0)
  } finally {
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
      ['owner', 'Proposal Owner'],
      ['director', 'Proposal Director'],
      ['accepted', 'Accepted Cast'],
      ['pending', 'Pending Invitee'],
      ['reviewer', 'Proposal Reviewer'],
    ].map(async ([key, name]) => {
      const email = `proposal-${key}-${suffix}@example.com`
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: name },
      })
      expect(error).toBeNull()
      return { email, userId: data.user!.id }
    }),
  )
  const [owner, director, accepted, pending, reviewer] = actors
  const theaterSlug = `proposal-stage-${suffix}`
  const eventSlug = `proposal-event-${suffix}`
  const { data: theaters, error: theaterError } = await admin.rpc(
    'create_theater_with_owner',
    {
      p_actor_user_id: owner.userId,
      p_name: 'Proposal Stage',
      p_slug: theaterSlug,
      p_timezone: 'America/New_York',
    },
  )
  expect(theaterError).toBeNull()
  const theaterId = theaters![0].id
  const { error: governanceError } = await admin
    .from('theaters')
    .update({ owner_self_approval_enabled: true })
    .eq('id', theaterId)
  expect(governanceError).toBeNull()
  const { error: membershipError } = await admin
    .from('theater_memberships')
    .insert(
      [director, accepted, pending, reviewer].map((actor) => ({
        roles: ['member' as const],
        status: 'active' as const,
        theater_id: theaterId,
        user_id: actor.userId,
      })),
    )
  expect(membershipError).toBeNull()
  const { error: capabilityError } = await admin
    .from('theater_member_capabilities')
    .insert({
      capability: 'reviewer',
      granted_by_user_id: owner.userId,
      theater_id: theaterId,
      user_id: reviewer.userId,
    })
  expect(capabilityError).toBeNull()
  const { data: events, error: eventError } = await admin.rpc(
    'create_managed_event',
    {
      p_actor_user_id: owner.userId,
      p_director_user_id: director.userId,
      p_producer_user_ids: [],
      p_slug: eventSlug,
      p_theater_id: theaterId,
      p_title: 'Proposal Event',
    },
  )
  expect(eventError).toBeNull()
  const eventId = events![0].id
  const occurrenceId = crypto.randomUUID()
  const viableSlotId = crypto.randomUUID()
  const alternateSlotId = crypto.randomUUID()
  const { error: planError } = await admin.rpc('save_event_operational_plan', {
    p_actor_user_id: owner.userId,
    p_minimum_viable_cast: 1,
    p_occurrences: [
      {
        candidateSlots: [
          {
            durationMinutes: 90,
            id: viableSlotId,
            localStartsAt: '2026-10-10T19:30',
            locationKind: 'off_site',
            locationName: 'Community Hall',
            offSiteApproved: true,
            position: 0,
            startsAt: '2026-10-10T23:30:00.000Z',
            timezoneName: 'America/New_York',
            timezoneSource: 'manual',
            utcOffsetMinutes: -240,
          },
          {
            durationMinutes: 90,
            id: alternateSlotId,
            localStartsAt: '2026-10-11T19:30',
            locationKind: 'off_site',
            locationName: 'Community Hall',
            offSiteApproved: true,
            position: 1,
            startsAt: '2026-10-11T23:30:00.000Z',
            timezoneName: 'America/New_York',
            timezoneSource: 'manual',
            utcOffsetMinutes: -240,
          },
        ],
        confirmedCandidateSlotId: null,
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

  for (const actor of [accepted, pending]) {
    const { error } = await admin.rpc('invite_event_cast_member', {
      p_actor_user_id: director.userId,
      p_member_user_id: actor.userId,
      p_show_id: eventId,
    })
    expect(error).toBeNull()
  }
  const { error: acceptanceError } = await admin.rpc(
    'respond_to_event_cast_invitation',
    {
      p_actor_user_id: accepted.userId,
      p_response: 'accepted',
      p_show_id: eventId,
    },
  )
  expect(acceptanceError).toBeNull()
  const { error: callError } = await admin.rpc('set_occurrence_call', {
    p_actor_user_id: director.userId,
    p_call: 'required',
    p_cast_member_user_id: accepted.userId,
    p_command_id: crypto.randomUUID(),
    p_occurrence_id: occurrenceId,
  })
  expect(callError).toBeNull()
  const { error: availableError } = await admin.rpc(
    'record_candidate_slot_availability',
    {
      p_actor_user_id: accepted.userId,
      p_candidate_slot_id: viableSlotId,
      p_command_id: crypto.randomUUID(),
      p_response: 'available',
    },
  )
  expect(availableError).toBeNull()
  const { error: uncertainError } = await admin.rpc(
    'record_candidate_slot_availability',
    {
      p_actor_user_id: accepted.userId,
      p_candidate_slot_id: alternateSlotId,
      p_command_id: crypto.randomUUID(),
      p_response: 'uncertain',
    },
  )
  expect(uncertainError).toBeNull()

  return {
    acceptedEmail: accepted.email,
    acceptedUserId: accepted.userId,
    admin,
    anonKey: config.anonKey,
    eventId,
    eventSlug,
    ownerEmail: owner.email,
    ownerUserId: owner.userId,
    occurrenceId,
    password,
    supabaseUrl: config.supabaseUrl,
    theaterId,
    theaterSlug,
    reviewerEmail: reviewer.email,
    userIds: actors.map(({ userId }) => userId),
    viableSlotId,
  }
}

async function authenticateContext({
  anonKey,
  context,
  email,
  password,
  supabaseUrl,
}: {
  anonKey: string
  context: import('@playwright/test').BrowserContext
  email: string
  password: string
  supabaseUrl: string
}) {
  const auth = createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await auth.auth.signInWithPassword({
    email,
    password,
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
