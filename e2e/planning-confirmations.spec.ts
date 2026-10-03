import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'
import type { Page } from '@playwright/test'

test.use({ actionTimeout: 10_000, trace: 'retain-on-failure' })
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
async function login(page: Page, persona: string) {
  await page.goto('/login')
  const button = page.getByRole('button', { name: new RegExp(`^${persona}`) })
  await waitForReactHandler(button, 'onClick')
  await button.click()
  await expect(page).toHaveURL(/\/app\//)
}
async function actor(email: string) {
  const client = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const result = await client.auth.signInWithPassword({
    email: `${email}@demo.stagecom.test`,
    password: env.STAGECOM_DEMO_PASSWORD!,
  })
  expect(result.error).toBeNull()
  return { client, id: result.data.user!.id }
}
test('planning confirmation persists through exact Review and an atomic replacement', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  test.skip(
    env.STAGECOM_DEMO_MODE !== 'true' ||
      !/^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? ''),
    'Requires disposable local Supabase demo data.',
  )
  const fixture = createClient(
    env.VITE_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const producer = await actor('producer')
  const member = await actor('member')
  const owner = await actor('owner')
  const theater = await fixture
    .from('theaters')
    .select('id,primary_venue_id')
    .eq('slug', 'compass-rose')
    .single()
  expect(theater.error).toBeNull()
  const slug = `sta70-review-${crypto.randomUUID().slice(0, 8)}`
  const created = await fixture.rpc('create_managed_event', {
    p_theater_id: theater.data!.id,
    p_actor_user_id: owner.id,
    p_title: 'Planning confirmation review',
    p_slug: slug,
    p_producer_user_ids: [producer.id],
    p_director_user_id: producer.id,
  })
  expect(created.error).toBeNull()
  const eventId = created.data[0].id
  const leaderContext = await browser.newContext()
  const memberContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const ownerContext = await browser.newContext()
  const leader = await leaderContext.newPage()
  const cast = await memberContext.newPage()
  const reviewer = await ownerContext.newPage()
  try {
    const occurrenceId = crypto.randomUUID()
    const first = crypto.randomUUID()
    const second = crypto.randomUUID()
    const slots = [first, second].map((id, index) => ({
      id,
      startsAt: `2026-11-${index === 0 ? '20' : '22'}T23:00:00.000Z`,
      localStartsAt: `2026-11-${index === 0 ? '20' : '22'}T18:00`,
      durationMinutes: 60,
      timezoneName: 'America/New_York',
      timezoneSource: 'manual',
      utcOffsetMinutes: -300,
      locationKind: 'primary_venue',
      resourceId: theater.data!.primary_venue_id,
      locationName: 'Compass Rose Primary Venue',
      offSiteApproved: false,
      position: index,
    }))
    expect(
      (
        await fixture.rpc('save_event_operational_plan', {
          p_show_id: eventId,
          p_actor_user_id: producer.id,
          p_target_cast_size: 1,
          p_minimum_viable_cast: 1,
          p_occurrences: [
            {
              id: occurrenceId,
              type: 'performance',
              visibility: 'public',
              position: 0,
              confirmedCandidateSlotId: null,
              candidateSlots: slots,
            },
          ],
          p_resource_requests: [],
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await fixture.rpc('invite_event_cast_member', {
          p_show_id: eventId,
          p_actor_user_id: producer.id,
          p_member_user_id: member.id,
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await fixture.rpc('respond_to_event_cast_invitation', {
          p_show_id: eventId,
          p_actor_user_id: member.id,
          p_response: 'accepted',
        })
      ).error,
    ).toBeNull()
    expect(
      (
        await fixture.rpc('save_event_proposed_cast', {
          p_show_id: eventId,
          p_actor_user_id: producer.id,
          p_cast_user_ids: [member.id],
          p_command_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull()
    const path = `/app/compass-rose/events/${slug}`
    await login(leader, 'Event Producer')
    await leader.goto(`${path}#schedule-plan`)
    const planning = leader.getByRole('region', {
      name: 'Planning and confirmations',
      exact: true,
    })
    await planning
      .getByLabel('Planning target', { exact: true })
      .selectOption(first)
    await planning
      .getByRole('button', { name: 'Select planning target', exact: true })
      .focus()
    await planning
      .getByRole('button', { name: 'Select planning target', exact: true })
      .press('Enter')
    const target = planning.getByRole('region', {
      name: 'planning planning target',
    })
    await expect(target).toContainText('No exclusive hold')
    await target
      .getByLabel('Planning Call for Morgan Member')
      .selectOption('required')
    await target
      .getByRole('button', { name: 'Save Call for Morgan Member' })
      .click()
    await target.getByRole('button', { name: 'Submit selected plan' }).click()
    await expect(planning.getByRole('alert')).toContainText(
      'explicitly confirm',
    )
    await login(cast, 'Theater Member')
    await cast.goto(`${path}#cast-team`)
    const personal = cast.getByRole('region', {
      name: 'Planning and confirmations',
      exact: true,
    })
    await expect(
      personal.getByRole('button', {
        name: 'Confirm selected time',
        exact: true,
      }),
    ).toBeVisible()
    await waitForReactHandler(
      personal.getByRole('button', {
        name: 'Confirm selected time',
        exact: true,
      }),
      'onClick',
    )
    await cast.route('**/_serverFn/**', (route) =>
      route.request().method() === 'POST' &&
      Buffer.from(
        new URL(route.request().url()).pathname.split('/').at(-1)!,
        'base64url',
      )
        .toString()
        .includes('managePlanningFn')
        ? route.abort('failed')
        : route.continue(),
    )
    await personal
      .getByRole('button', { name: 'Confirm selected time', exact: true })
      .click()
    await expect(personal.getByRole('alert')).toContainText(
      'retry when connected',
    )
    await cast.unroute('**/_serverFn/**')
    await personal
      .getByRole('button', { name: 'Confirm selected time', exact: true })
      .focus()
    await personal
      .getByRole('button', { name: 'Confirm selected time', exact: true })
      .press('Enter')
    await expect(personal).toContainText('Selected time confirmed')
    await cast.reload()
    await expect(personal).toContainText('Selected time confirmed')
    await cast.screenshot({
      path: test.info().outputPath('planning-phone.png'),
      fullPage: true,
    })
    for (const width of [360, 390, 1280]) {
      await cast.setViewportSize({ width, height: 844 })
      expect(
        await cast.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    }
    await planning
      .getByRole('button', { name: 'Refresh planning; keep input' })
      .click()
    await target.getByRole('button', { name: 'Submit selected plan' }).click()
    await expect(planning).toContainText('Exact Proposal Revision submitted')
    await login(reviewer, 'Theater Owner')
    await reviewer.goto(`${path}#review`)
    await reviewer.reload()
    await reviewer
      .getByText('Immutable submitted snapshot', { exact: true })
      .click()
    await reviewer
      .getByRole('button', { name: 'Record approve', exact: true })
      .click()
    await expect
      .poll(async () => {
        const read = await fixture
          .from('show_occurrences')
          .select('confirmed_candidate_slot_id')
          .eq('id', occurrenceId)
          .single()
        return read.data?.confirmed_candidate_slot_id
      })
      .toBe(first)
    await leader.goto(`${path}#schedule-plan`)
    await leader.reload()
    await planning
      .getByLabel('Planning target', { exact: true })
      .selectOption(second)
    await planning
      .getByRole('button', { name: 'Select planning target', exact: true })
      .click()
    const replacement = planning.getByRole('region', {
      name: 'planning planning target',
    })
    await expect(replacement).toContainText(
      'original approval, booking and Calls remain current',
    )
    const before = await fixture
      .from('show_occurrences')
      .select('confirmed_candidate_slot_id')
      .eq('id', occurrenceId)
      .single()
    expect(before.data!.confirmed_candidate_slot_id).toBe(first)
    await reviewer.goto(`${path}#schedule-plan`)
    await reviewer
      .getByRole('button', { name: 'Grant planning hold', exact: true })
      .click()
    await cast.goto(`${path}#cast-team`)
    await cast.reload()
    await personal
      .getByRole('region', { name: 'planning planning target' })
      .getByRole('button', { name: 'Confirm selected time', exact: true })
      .click()
    await expect(
      personal.getByRole('region', { name: 'planning planning target' }),
    ).toContainText('Selected time confirmed')
    await expect
      .poll(async () => {
        const targetRead = await fixture
          .from('show_planning_targets')
          .select('id')
          .eq('show_id', eventId)
          .eq('state', 'planning')
          .single()
        const confirmation = await fixture
          .from('show_planning_confirmations')
          .select('confirmed')
          .eq('target_id', targetRead.data!.id)
          .eq('user_id', member.id)
          .maybeSingle()
        return confirmation.data?.confirmed
      })
      .toBe(true)
    await planning
      .getByRole('button', { name: 'Refresh planning; keep input' })
      .click()
    await replacement
      .getByRole('button', { name: 'Submit selected plan' })
      .click()
    await expect(
      planning.getByRole('region', { name: 'submitted planning target' }),
    ).toBeVisible()
    await reviewer.goto(`${path}#review`)
    await reviewer.reload()
    await reviewer
      .getByRole('button', { name: 'Record approve', exact: true })
      .click()
    await expect
      .poll(async () => {
        const read = await fixture
          .from('show_occurrences')
          .select('confirmed_candidate_slot_id')
          .eq('id', occurrenceId)
          .single()
        return read.data?.confirmed_candidate_slot_id
      })
      .toBe(second)
    const reservations = await fixture
      .from('show_schedule_reservations')
      .select('candidate_slot_id,kind,status')
      .eq('show_id', eventId)
      .eq('status', 'active')
    expect(reservations.data).toEqual([
      {
        candidate_slot_id: second,
        kind: 'approved_commitment',
        status: 'active',
      },
    ])
    const persisted = await fixture
      .from('shows')
      .select('lifecycle_status,publication_status')
      .eq('id', eventId)
      .single()
    expect(persisted.data).toEqual({
      lifecycle_status: 'approved',
      publication_status: 'unpublished',
    })
    await reviewer.goto(
      '/app/compass-rose/calendar?calendarView=month&calendarPeriod=2026-11-01',
    )
    await expect(
      reviewer.getByRole('link', { name: /^Planning confirmation review,/ }),
    ).toHaveCount(1)
    await expect(
      reviewer.getByRole('link', { name: /^Planning confirmation review,/ }),
    ).toHaveAttribute('href', new RegExp(`occurrence-${occurrenceId}`))
    await cast.goto('/app/callsheet')
    await expect(
      cast.getByRole('region', { name: 'Confirmed Calls' }),
    ).toContainText('Planning confirmation review')
    await cast.goto(`${path}#cast-team`)
    await cast.reload()
    await expect(
      personal.getByRole('button', {
        name: 'Confirm selected time',
        exact: true,
      }),
    ).toBeVisible()
    await waitForReactHandler(
      personal.getByRole('button', {
        name: 'Confirm selected time',
        exact: true,
      }),
      'onClick',
    )
    expect(
      (
        await fixture.rpc('withdraw_from_event_cast', {
          p_show_id: eventId,
          p_actor_user_id: member.id,
          p_command_id: crypto.randomUUID(),
          p_expected_health_version: (
            await fixture
              .from('shows')
              .select('operational_health_version')
              .eq('id', eventId)
              .single()
          ).data!.operational_health_version,
        })
      ).error,
    ).toBeNull()
    await personal
      .getByRole('button', { name: 'Confirm selected time', exact: true })
      .click()
    await expect(personal.getByRole('alert')).toContainText('Current authority')
    await personal
      .getByRole('button', { name: 'Refresh planning; keep input' })
      .click()
    await expect(personal.getByRole('alert')).toContainText(
      'Current Event planning access',
    )
    await expect(
      personal.getByRole('button', {
        name: 'Confirm selected time',
        exact: true,
      }),
    ).toHaveCount(0)
    const newcomer = await actor('newcomer')
    expect(
      (await newcomer.client.rpc('get_event_planning', { p_show_id: eventId }))
        .error?.code,
    ).toBe('42501')
  } finally {
    await Promise.allSettled([
      leaderContext.close(),
      memberContext.close(),
      ownerContext.close(),
    ])
    await fixture
      .from('show_schedule_reservations')
      .delete()
      .eq('show_id', eventId)
    await fixture.from('shows').delete().eq('id', eventId)
  }
})
