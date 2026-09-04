import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { BrowserContext, Locator } from '@playwright/test'
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
    await page.getByRole('link', { name: 'Review' }).click()
    await expect(
      page.getByRole('heading', { name: 'Proposal Revision' }),
    ).toBeVisible()
    const acceptedCastCheckbox = page.getByLabel('Accepted Cast', {
      exact: true,
    })
    await expect(acceptedCastCheckbox).toBeVisible()
    await waitForReactHandler(acceptedCastCheckbox, 'onChange')
    await acceptedCastCheckbox.check()
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
    await expect(
      page.getByText(
        'Another eligible Reviewer must decide your Proposal Revision.',
      ),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Review', exact: true }).click()
    await expect(page).toHaveURL(/#review$/)
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()
    const snapshot = page.getByText('Immutable submitted snapshot')
    await snapshot.click()
    await expect(page.getByText('Minimum viable Cast')).toBeVisible()
    await expect(page.getByText('Community Hall')).toBeVisible()
    await page.getByText('Exact immutable record').click()
    await expect(
      page.getByText('timezoneSource', { exact: false }),
    ).toBeVisible()
    const ownerOverrideCheckbox = page.getByLabel(
      'Explicitly invoke the audited Owner self-approval override',
    )
    await waitForReactHandler(ownerOverrideCheckbox, 'onChange')
    await ownerOverrideCheckbox.check()
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
        .eq('actor_user_id', fixture.ownerUserId)
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

    await expect(
      page.getByText('Publish the Theater before publishing this Event.'),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Public Page', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Public Page' }),
    ).toBeVisible()
    await expect(page.getByText('Producer work needed')).toBeVisible()
    await expect(
      page.getByText(
        'Publication is unavailable while Producer work remains above.',
      ),
    ).toBeVisible()

    const { error: theaterSetupError } = await fixture.admin
      .from('theaters')
      .update({
        city: 'New York',
        country: 'US',
        postal_code: '10001',
        state_region: 'NY',
        street: '10 Stage Door Way',
        tagline: 'A home for public performance',
        timezone_source: 'manual',
      })
      .eq('id', fixture.theaterId)
    expect(theaterSetupError).toBeNull()
    const { error: theaterPublishError } = await fixture.admin.rpc(
      'publish_theater',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_theater_id: fixture.theaterId,
      },
    )
    expect(theaterPublishError).toBeNull()

    await page.reload()
    await waitForReactHandler(page.getByLabel('Public title'), 'onChange')
    await page.getByLabel('Public title').fill('The Exact Public Event')
    await page
      .getByLabel('Image URL')
      .fill('https://images.example/public-event.jpg')
    await page
      .getByLabel('Public description')
      .fill('This is the exact anonymous description.')
    await page.getByLabel('General-admission price (USD)').fill('15')
    await page.getByLabel('Sales Channel').selectOption('external')
    await page
      .getByLabel('Ticket or reservation URL')
      .fill('https://tickets.example/exact-event')
    await page.getByLabel('Credit Accepted Cast for this Event').check()
    await page
      .getByRole('button', { name: 'Save unpublished revision' })
      .click()
    await expect(
      page.getByText('Unpublished public-content revision saved.'),
    ).toBeVisible()

    await page.reload()
    await waitForReactHandler(page.getByLabel('Public title'), 'onChange')
    const preview = page
      .getByRole('article')
      .filter({ hasText: 'Exact eligible anonymous snapshot' })
    await expect(preview.getByText('The Exact Public Event')).toBeVisible()
    await expect(
      preview.getByText('This is the exact anonymous description.'),
    ).toBeVisible()
    await expect(preview.getByText('$15.00')).toBeVisible()
    await expect(preview.getByText('Accepted Cast')).toBeVisible()
    await expect(
      preview.getByRole('link', { name: 'Get tickets' }),
    ).toHaveAttribute('href', 'https://tickets.example/exact-event')

    const unpublishedAnonymousPage = await context.browser()!.newPage()
    await unpublishedAnonymousPage.goto(
      `/theater/${fixture.theaterSlug}/${fixture.eventSlug}`,
    )
    await expect(
      unpublishedAnonymousPage.getByRole('heading', {
        name: 'The Exact Public Event',
      }),
    ).toHaveCount(0)
    await unpublishedAnonymousPage.close()

    const { error: atRiskError } = await fixture.admin
      .from('shows')
      .update({ operational_health: 'at_risk' })
      .eq('id', fixture.eventId)
    expect(atRiskError).toBeNull()
    await page.reload()
    await expect(
      page.getByText('Management must explicitly allow this At Risk Event.'),
    ).toBeVisible()
    const publishButton = page.getByRole('button', {
      name: 'Publish exact anonymous snapshot',
    })
    await expect(publishButton).toHaveCount(0)
    await waitForReactHandler(
      page.getByLabel('At Risk management reason'),
      'onChange',
    )
    await page
      .getByLabel('At Risk management reason')
      .fill('The approved operational plan remains safe to publish.')
    await page.getByRole('button', { name: 'Allow continuation' }).click()
    await expect(
      page.getByText(
        'Continuation allowed with an audited reason. The Event remains At Risk.',
      ),
    ).toBeVisible()
    await page.reload()
    await page.waitForTimeout(500)
    await expect(
      page.getByRole('button', { name: 'Publish exact anonymous snapshot' }),
    ).toBeEnabled()
    await waitForReactHandler(
      page.getByRole('button', { name: 'Publish exact anonymous snapshot' }),
      'onClick',
    )
    await page
      .getByRole('button', { name: 'Publish exact anonymous snapshot' })
      .click()
    await expect(page.getByText('published', { exact: true })).toBeVisible()

    const anonymousPage = await context.browser()!.newPage()
    await anonymousPage.goto(
      `/theater/${fixture.theaterSlug}/${fixture.eventSlug}`,
    )
    await expect(
      anonymousPage.getByRole('heading', { name: 'The Exact Public Event' }),
    ).toBeVisible()
    await expect(anonymousPage.getByText('Community Hall')).toBeVisible()
    await expect(anonymousPage.getByText('Accepted Cast')).toBeVisible()
    await expect(anonymousPage.getByText('Pending Invitee')).toHaveCount(0)
    await expect(anonymousPage.getByText('Proposal Revision')).toHaveCount(0)
    await expect(
      anonymousPage.getByRole('link', { name: 'Get tickets' }),
    ).toHaveAttribute('href', 'https://tickets.example/exact-event')

    await page.waitForTimeout(500)
    await page.getByLabel('Public title').fill('A Later Unpublished Edit')
    await page
      .getByLabel('Image URL')
      .fill('https://images.example/later-edit.jpg')
    await page
      .getByLabel('Public description')
      .fill('This later description must remain private.')
    await page.getByLabel('General-admission price (USD)').fill('20')
    await page.getByLabel('Sales Channel').selectOption('external')
    await page
      .getByLabel('Ticket or reservation URL')
      .fill('https://tickets.example/later-edit')
    await page.getByLabel('Credit Accepted Cast for this Event').check()
    await page
      .getByRole('button', { name: 'Save unpublished revision' })
      .click()
    await expect(
      page.getByText('Unpublished public-content revision saved.'),
    ).toBeVisible()

    await anonymousPage.reload()
    await expect(
      anonymousPage.getByRole('heading', { name: 'The Exact Public Event' }),
    ).toBeVisible()
    await expect(anonymousPage.getByText('$15.00')).toBeVisible()
    await expect(
      anonymousPage.getByText('A Later Unpublished Edit'),
    ).toHaveCount(0)
    await expect(
      anonymousPage.getByText('This later description must remain private.'),
    ).toHaveCount(0)

    const [
      { data: publicationState },
      { data: publicationEvents },
      { data: publicationNotifications },
    ] = await Promise.all([
      fixture.admin
        .from('shows')
        .select(
          'lifecycle_status, publication_status, operational_health, at_risk_continuation_allowed',
        )
        .eq('id', fixture.eventId)
        .single(),
      fixture.admin
        .from('activity_events')
        .select('action')
        .eq('entity_id', fixture.eventId)
        .eq('action', 'event.published'),
      fixture.admin
        .from('notifications')
        .select('type, dedupe_key, user_id')
        .eq('entity_id', fixture.eventId)
        .eq('type', 'event.published'),
    ])
    expect(publicationState).toEqual({
      at_risk_continuation_allowed: true,
      lifecycle_status: 'approved',
      operational_health: 'at_risk',
      publication_status: 'published',
    })
    expect(publicationEvents).toEqual([{ action: 'event.published' }])
    expect(publicationNotifications?.length).toBeGreaterThan(0)
    expect(
      new Set(
        publicationNotifications?.map(
          (notification) =>
            `${notification.user_id}:${notification.dedupe_key}`,
        ),
      ).size,
    ).toBe(publicationNotifications?.length)
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
    await page.getByRole('link', { name: 'Review' }).click()
    await page.getByRole('button', { name: 'accept Counteroffer' }).click()
    await expect(
      page.getByRole('heading', { name: 'Proposal Revision 2' }),
    ).toBeVisible()

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

test('published approved Event becomes At Risk after Cast withdrawal without disappearing', async ({
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
    const { data: submitted, error: submissionError } = await fixture.admin.rpc(
      'submit_event_proposal_revision',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_command_id: crypto.randomUUID(),
        p_show_id: fixture.eventId,
      },
    )
    expect(submissionError).toBeNull()
    const proposalRevision = submitted!
    const { error: revisionApprovalError } = await fixture.admin
      .from('show_proposal_revisions')
      .update({ decision_state: 'approved', decision_version: 2 })
      .eq('id', proposalRevision.id)
    expect(revisionApprovalError).toBeNull()
    const { error: eventApprovalError } = await fixture.admin
      .from('shows')
      .update({
        approved_proposal_revision_id: proposalRevision.id,
        lifecycle_status: 'approved',
        status: 'approved',
      })
      .eq('id', fixture.eventId)
    expect(eventApprovalError).toBeNull()

    const { error: theaterSetupError } = await fixture.admin
      .from('theaters')
      .update({
        city: 'New York',
        country: 'US',
        postal_code: '10001',
        state_region: 'NY',
        street: '20 Risk Way',
        tagline: 'A resilient public stage',
        timezone_source: 'manual',
      })
      .eq('id', fixture.theaterId)
    expect(theaterSetupError).toBeNull()
    const { error: theaterPublishError } = await fixture.admin.rpc(
      'publish_theater',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_theater_id: fixture.theaterId,
      },
    )
    expect(theaterPublishError).toBeNull()

    const { data: contentRevision, error: contentError } =
      await fixture.admin.rpc('save_event_public_content_draft', {
        p_actor_user_id: fixture.ownerUserId,
        p_admission_price_cents: 1200,
        p_command_id: crypto.randomUUID(),
        p_credits: [
          {
            position: 0,
            publicly_credited: true,
            user_id: fixture.acceptedUserId,
          },
        ],
        p_description: 'A published Event whose operational risk is visible.',
        p_external_url: 'https://tickets.example/risk-event',
        p_image_url: 'https://images.example/risk-event.jpg',
        p_sales_channel: 'external',
        p_show_id: fixture.eventId,
        p_title: 'Published At Risk Event',
      })
    expect(contentError).toBeNull()
    const { error: publicationError } = await fixture.admin.rpc(
      'publish_event',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_allow_at_risk: false,
        p_command_id: crypto.randomUUID(),
        p_expected_version: contentRevision!.version,
        p_public_content_revision_id: contentRevision!.id,
        p_show_id: fixture.eventId,
      },
    )
    expect(publicationError).toBeNull()

    await authenticateContext({
      anonKey: fixture.anonKey,
      context,
      email: fixture.acceptedEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    await page.goto(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`)
    const withdrawButton = page.getByRole('button', {
      name: 'Withdraw from Event',
    })
    await waitForReactHandler(withdrawButton, 'onClick')
    await withdrawButton.click()
    await expect
      .poll(async () => {
        const { data } = await fixture.admin
          .from('show_cast')
          .select('status')
          .eq('show_id', fixture.eventId)
          .eq('user_id', fixture.acceptedUserId)
          .single()
        return data?.status
      })
      .toBe('withdrawn')
    await expect
      .poll(async () => {
        const { data } = await fixture.admin
          .from('shows')
          .select('operational_health')
          .eq('id', fixture.eventId)
          .single()
        return data?.operational_health
      })
      .toBe('at_risk')
    const { data: atRiskState } = await fixture.admin
      .from('shows')
      .select(
        'lifecycle_status, publication_status, operational_health, operational_health_version',
      )
      .eq('id', fixture.eventId)
      .single()
    expect(atRiskState).toEqual({
      lifecycle_status: 'approved',
      operational_health: 'at_risk',
      operational_health_version: 2,
      publication_status: 'published',
    })
    await expect(page.getByText('Event is At Risk')).toBeVisible()

    const anonymousPage = await context.browser()!.newPage()
    await anonymousPage.goto(
      `/theater/${fixture.theaterSlug}/${fixture.eventSlug}`,
    )
    await expect(
      anonymousPage.getByRole('heading', { name: 'Published At Risk Event' }),
    ).toBeVisible()

    await authenticateContext({
      anonKey: fixture.anonKey,
      context,
      email: fixture.ownerEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    await page.goto(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`)
    await page.waitForTimeout(500)
    await expect(
      page.getByText('approved', { exact: true }).first(),
    ).toBeVisible()
    await expect(page.getByText('published', { exact: true })).toBeVisible()
    await expect(page.getByText('at_risk', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Revise Event' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Reschedule Event' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Cancel Event' }),
    ).toBeVisible()

    await waitForReactHandler(
      page.getByLabel('At Risk management reason'),
      'onChange',
    )
    await page
      .getByLabel('At Risk management reason')
      .fill('The understudy plan is confirmed for this Performance.')
    await page.getByRole('button', { name: 'Allow continuation' }).click()
    await expect(
      page.getByText(
        'Continuation allowed with an audited reason. The Event remains At Risk.',
      ),
    ).toBeVisible()

    const [{ data: allowedState }, { data: decisions }, { data: riskEvents }] =
      await Promise.all([
        fixture.admin
          .from('shows')
          .select(
            'lifecycle_status, publication_status, operational_health, at_risk_continuation_allowed',
          )
          .eq('id', fixture.eventId)
          .single(),
        fixture.admin
          .from('show_risk_management_decisions')
          .select('action, reason')
          .eq('show_id', fixture.eventId),
        fixture.admin
          .from('activity_events')
          .select('action')
          .eq('entity_id', fixture.eventId)
          .eq('action', 'event.operational_health.at_risk'),
      ])
    expect(allowedState).toEqual({
      at_risk_continuation_allowed: true,
      lifecycle_status: 'approved',
      operational_health: 'at_risk',
      publication_status: 'published',
    })
    expect(decisions).toEqual([
      {
        action: 'allow',
        reason: 'The understudy plan is confirmed for this Performance.',
      },
    ])
    expect(riskEvents).toEqual([{ action: 'event.operational_health.at_risk' }])
    await anonymousPage.close()
  } finally {
    await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
    await Promise.all(
      fixture.userIds.map((userId) =>
        fixture.admin.auth.admin.deleteUser(userId),
      ),
    )
  }
})

test('Owner deactivates a Theater Member while preserving history and surfacing affected Event risk', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const config = getSupabaseConfig()
  test.skip(!config, 'Supabase credentials are required.')
  const fixture = await createFixture(config!)
  const ownerContext = await browser.newContext()
  const memberContext = await browser.newContext()
  const anonymousContext = await browser.newContext()

  try {
    const { error: leadershipError } = await fixture.admin
      .from('show_leadership')
      .insert({
        assigned_by_user_id: fixture.ownerUserId,
        role: 'producer',
        show_id: fixture.eventId,
        user_id: fixture.acceptedUserId,
      })
    expect(leadershipError).toBeNull()

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
    const { data: revision, error: submissionError } = await fixture.admin.rpc(
      'submit_event_proposal_revision',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_command_id: crypto.randomUUID(),
        p_show_id: fixture.eventId,
      },
    )
    expect(submissionError).toBeNull()
    const { error: revisionApprovalError } = await fixture.admin
      .from('show_proposal_revisions')
      .update({ decision_state: 'approved', decision_version: 2 })
      .eq('id', revision!.id)
    expect(revisionApprovalError).toBeNull()
    const { error: eventApprovalError } = await fixture.admin
      .from('shows')
      .update({
        approved_proposal_revision_id: revision!.id,
        lifecycle_status: 'approved',
        status: 'approved',
      })
      .eq('id', fixture.eventId)
    expect(eventApprovalError).toBeNull()

    const { error: theaterSetupError } = await fixture.admin
      .from('theaters')
      .update({
        city: 'New York',
        country: 'US',
        postal_code: '10001',
        state_region: 'NY',
        street: '22 Membership Way',
        tagline: 'History stays truthful',
        timezone_source: 'manual',
      })
      .eq('id', fixture.theaterId)
    expect(theaterSetupError).toBeNull()
    const { error: theaterPublishError } = await fixture.admin.rpc(
      'publish_theater',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_theater_id: fixture.theaterId,
      },
    )
    expect(theaterPublishError).toBeNull()
    const { data: contentRevision, error: contentError } =
      await fixture.admin.rpc('save_event_public_content_draft', {
        p_actor_user_id: fixture.ownerUserId,
        p_admission_price_cents: 0,
        p_command_id: crypto.randomUUID(),
        p_credits: [
          {
            position: 0,
            publicly_credited: true,
            user_id: fixture.acceptedUserId,
          },
        ],
        p_description: 'A published Event with preserved historical credit.',
        p_image_url: 'https://images.example/membership-history.jpg',
        p_sales_channel: 'no_advance_ticketing',
        p_show_id: fixture.eventId,
        p_title: 'Membership History Event',
      })
    expect(contentError).toBeNull()
    const { error: publicationError } = await fixture.admin.rpc(
      'publish_event',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_allow_at_risk: false,
        p_command_id: crypto.randomUUID(),
        p_expected_version: contentRevision!.version,
        p_public_content_revision_id: contentRevision!.id,
        p_show_id: fixture.eventId,
      },
    )
    expect(publicationError).toBeNull()

    await authenticateContext({
      anonKey: fixture.anonKey,
      context: memberContext,
      email: fixture.acceptedEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    const memberPage = await memberContext.newPage()
    await memberPage.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await expect(
      memberPage.getByText('Accepted Cast · producer', { exact: true }),
    ).toBeVisible()

    await authenticateContext({
      anonKey: fixture.anonKey,
      context: ownerContext,
      email: fixture.ownerEmail,
      password: fixture.password,
      supabaseUrl: fixture.supabaseUrl,
    })
    const ownerPage = await ownerContext.newPage()
    await ownerPage.goto(`/app/${fixture.theaterSlug}/members`)
    const memberCard = ownerPage
      .locator('section')
      .filter({
        has: ownerPage.getByRole('heading', { name: 'Access & Roles' }),
      })
      .locator('article')
      .filter({
        has: ownerPage.getByRole('heading', { name: 'Accepted Cast' }),
      })
    const deactivateButton = memberCard.getByRole('button', {
      name: 'Deactivate',
    })
    await waitForReactHandler(deactivateButton, 'onClick')
    await deactivateButton.click()
    const confirmButton = memberCard.getByRole('button', {
      name: 'Confirm deactivation',
    })
    await waitForReactHandler(confirmButton, 'onClick')
    await confirmButton.click()
    await expect(
      ownerPage.getByText(
        'Accepted Cast was deactivated. 1 affected Event became At Risk.',
      ),
    ).toBeVisible()

    await memberPage.reload()
    await expect(
      memberPage.getByRole('heading', {
        name: 'This destination is not available to you',
      }),
    ).toBeVisible()
    await expect(
      memberPage.getByRole('link', { name: 'Return to Callsheet' }),
    ).toHaveAttribute('href', '/app/callsheet')

    await ownerPage.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await expect(ownerPage.getByText('Event is At Risk')).toBeVisible()
    await expect(
      ownerPage.getByText('approved', { exact: true }).first(),
    ).toBeVisible()
    await expect(
      ownerPage.getByText('published', { exact: true }),
    ).toBeVisible()
    await expect(ownerPage.getByText('at_risk', { exact: true })).toBeVisible()
    await expect(ownerPage.getByText('Accepted Cast · producer')).toHaveCount(0)
    await expect(
      ownerPage
        .getByRole('heading', { name: 'Cast participation' })
        .locator('..')
        .getByText('removed', { exact: true }),
    ).toBeVisible()
    await expect(ownerPage.getByText('Revision 1 ·')).toBeVisible()
    await expect(
      ownerPage.getByText('approved', { exact: true }).last(),
    ).toBeVisible()

    const anonymousPage = await anonymousContext.newPage()
    await anonymousPage.goto(
      `/theater/${fixture.theaterSlug}/${fixture.eventSlug}`,
    )
    await expect(
      anonymousPage.getByRole('heading', { name: 'Membership History Event' }),
    ).toBeVisible()
    await expect(anonymousPage.getByText('Accepted Cast')).toBeVisible()
  } finally {
    await Promise.all([
      ownerContext.close(),
      memberContext.close(),
      anonymousContext.close(),
    ])
    await fixture.admin
      .from('show_public_occurrence_snapshots')
      .delete()
      .eq('occurrence_id', fixture.occurrenceId)
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
    p_participant_user_id: accepted.userId,
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
  context: BrowserContext
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
