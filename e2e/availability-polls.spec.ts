import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }

test('Event leaders open stable polls for explicitly selected accepted Cast', async ({
  page,
}) => {
  test.skip(
    env.STAGECOM_DEMO_MODE !== 'true' ||
      !/^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? ''),
    'Requires disposable local demo data.',
  )
  await page.goto('/login')
  const producer = page.getByRole('button', { name: /^Event Producer/ })
  await waitForReactHandler(producer, 'onClick')
  await producer.click()
  await expect(page).toHaveURL(/\/app\//)
  await page.goto('/app/compass-rose/events/a-midsummer-nights-dream#cast-team')
  await expect(
    page.getByRole('heading', { name: 'Availability polls', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', {
      name: /^(Open availability poll|Cancel and replace poll)$/,
    })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Select at least one option and respondent',
  )
})

async function login(page: Page, persona: string) {
  await page.goto('/login')
  const button = page.getByRole('button', { name: new RegExp(`^${persona}`) })
  await waitForReactHandler(button, 'onClick')
  await button.click()
  await expect(page).toHaveURL(/\/app\//)
}
const eventPath = '/app/compass-rose/events/a-midsummer-nights-dream#cast-team'

test('selected Cast save drafts, resubmit, compare, recover stale input and retain confirmed Calls', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  test.skip(
    env.STAGECOM_DEMO_MODE !== 'true' ||
      !/^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? ''),
    'Requires disposable local demo data.',
  )
  const leaderContext = await browser.newContext()
  const memberContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const pendingContext = await browser.newContext()
  const ownerContext = await browser.newContext()
  const leader = await leaderContext.newPage()
  const member = await memberContext.newPage()
  try {
    await login(leader, 'Event Producer')
    await leader.goto(eventPath)
    const polls = leader.getByRole('region', {
      name: 'Availability polls',
      exact: true,
    })
    await expect(
      polls.getByRole('button', {
        name: /^(Open availability poll|Cancel and replace poll)$/,
      }),
    ).toBeVisible()
    // End previous disposable review polls without discarding their history.
    for (const button of await polls
      .getByRole('button', { name: 'Cancel poll', exact: true })
      .all())
      await button.click()
    await expect(
      polls.getByRole('button', { name: 'Open availability poll' }),
    ).toBeVisible()
    const options = polls
      .getByRole('group', { name: 'Fixed options' })
      .getByRole('checkbox')
    await expect(
      polls.getByRole('group', { name: 'Fixed options' }),
    ).toContainText('7:00 PM EDT')
    await expect(
      polls.getByRole('group', { name: 'Fixed options' }),
    ).not.toContainText('11:00 PM UTC')
    await options.nth(0).focus()
    await options.nth(0).press('Space')
    await expect(options.nth(0)).toBeChecked()
    await options.nth(1).check()
    await polls.getByLabel('Morgan Member', { exact: true }).check()
    await polls.getByLabel('Parker Producer', { exact: true }).check()
    await polls.getByRole('button', { name: 'Open availability poll' }).focus()
    await polls
      .getByRole('button', { name: 'Open availability poll' })
      .press('Enter')
    const leaderPoll = polls.getByRole('region', {
      name: 'open availability poll',
      exact: true,
    })
    await expect(leaderPoll).toContainText(
      '0 of 2 eligible respondents submitted',
    )
    await expect(leaderPoll).toContainText('Morgan Member · Not submitted')
    await leaderPoll
      .getByLabel('Your answer for option 1')
      .selectOption('uncertain')
    await leaderPoll
      .getByLabel('Your answer for option 2')
      .selectOption('available')
    await leaderPoll.getByRole('button', { name: 'Submit all answers' }).click()
    await expect(leaderPoll).toContainText(
      '1 of 2 eligible respondents submitted',
    )

    for (const [context, persona] of [
      [pendingContext, 'Pending Cast invitee'],
      [ownerContext, 'Theater Admin'],
    ] as const) {
      const page = await context.newPage()
      await login(page, persona)
      await page.goto(eventPath)
      await expect(
        page.getByRole('heading', { name: 'Cast & Team', exact: true }),
      ).toBeVisible()
      if (persona === 'Theater Admin')
        await expect(
          page.getByText('No availability polls for you yet.', { exact: true }),
        ).toBeVisible()
      await expect(
        page.getByRole('region', {
          name: 'open availability poll',
          exact: true,
        }),
      ).toHaveCount(0)
    }
    await login(member, 'Theater Member')
    await member.goto('/app/callsheet')
    await expect(
      member.getByRole('link', {
        name: 'Respond to availability poll',
        exact: true,
      }),
    ).toBeVisible()
    await member.goto(eventPath)
    const memberPoll = member.getByRole('region', {
      name: 'open availability poll',
      exact: true,
    })
    await expect(memberPoll).toContainText('Parker Producer · uncertain')
    await memberPoll.getByRole('button', { name: 'Submit all answers' }).click()
    await expect(memberPoll.getByRole('alert')).toContainText(
      'Answer every option',
    )
    await memberPoll.getByLabel('Your answer for option 1').focus()
    await memberPoll
      .getByLabel('Your answer for option 1')
      .selectOption('available')
    await memberPoll.getByLabel('Your answer for option 1').press('Tab')
    await expect(
      memberPoll.getByLabel('Your answer for option 2'),
    ).toBeFocused()
    await memberPoll.getByLabel('Your answer for option 2').press('Tab')
    await expect(
      memberPoll.getByRole('button', { name: 'Save private draft' }),
    ).toBeFocused()
    await expect(memberPoll.getByLabel('Your answer for option 1')).toHaveValue(
      'available',
    )
    await memberPoll.getByRole('button', { name: 'Save private draft' }).focus()
    await memberPoll
      .getByRole('button', { name: 'Save private draft' })
      .press('Enter')
    await expect(memberPoll).toContainText('Private draft saved')
    await member.reload()
    await expect(memberPoll.getByLabel('Your answer for option 1')).toHaveValue(
      'available',
    )
    await expect(memberPoll).toContainText('Morgan Member · Not submitted')
    await memberPoll
      .getByLabel('Your answer for option 2')
      .selectOption('unavailable')
    await memberContext.setOffline(true)
    await memberPoll.getByRole('button', { name: 'Submit all answers' }).click()
    await expect(memberPoll.getByRole('alert')).toContainText(
      'retry when connected',
    )
    await expect(memberPoll.getByLabel('Your answer for option 2')).toHaveValue(
      'unavailable',
    )
    await memberContext.setOffline(false)
    await memberPoll.getByRole('button', { name: 'Submit all answers' }).focus()
    await memberPoll
      .getByRole('button', { name: 'Submit all answers' })
      .press('Enter')
    await expect(memberPoll).toContainText(
      '2 of 2 eligible respondents submitted',
    )
    await member.goto('/app/callsheet')
    await expect(
      member.getByRole('link', {
        name: 'Respond to availability poll',
        exact: true,
      }),
    ).toHaveCount(0)
    await expect(
      member
        .getByRole('region', { name: 'Confirmed Calls' })
        .getByRole('link', { name: 'Review call' })
        .first(),
    ).toBeVisible()
    await member.goto(eventPath)
    await memberPoll
      .getByLabel('Your answer for option 2')
      .selectOption('uncertain')
    await memberPoll.getByRole('button', { name: 'Resubmit answers' }).click()
    await expect(memberPoll).toContainText('Morgan Member · uncertain')
    await member.reload()
    await expect(memberPoll.getByLabel('Your answer for option 2')).toHaveValue(
      'uncertain',
    )
    // A second tab commits newer answers; the old tab must retain its rejected edit.
    const second = await memberContext.newPage()
    await second.goto(eventPath)
    const secondPoll = second.getByRole('region', {
      name: 'open availability poll',
      exact: true,
    })
    await secondPoll
      .getByLabel('Your answer for option 2')
      .selectOption('available')
    await secondPoll.getByRole('button', { name: 'Resubmit answers' }).click()
    await expect(secondPoll).toContainText('Answers submitted.')
    await memberPoll
      .getByLabel('Your answer for option 2')
      .selectOption('unavailable')
    await memberPoll.getByRole('button', { name: 'Resubmit answers' }).click()
    await expect(memberPoll.getByRole('alert')).toContainText(
      'Your answers changed',
    )
    await expect(memberPoll.getByLabel('Your answer for option 2')).toHaveValue(
      'unavailable',
    )
    await memberPoll
      .getByRole('button', { name: 'Refresh poll; keep editing input' })
      .click()
    await memberPoll.getByRole('button', { name: 'Resubmit answers' }).click()
    await expect(memberPoll).toContainText('Answers submitted.')
    for (const width of [360, 390, 1280]) {
      await member.setViewportSize({ width, height: 844 })
      expect(
        await member.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    }
    await memberPoll.getByLabel('Your answer for option 1').focus()
    await expect(
      memberPoll.getByLabel('Your answer for option 1'),
    ).toBeFocused()
    await memberPoll
      .getByLabel('Your answer for option 1')
      .selectOption('uncertain')
    await leaderPoll.getByRole('button', { name: 'Close poll' }).click()
    await expect(
      leader.getByRole('region', { name: 'closed availability poll' }).first(),
    ).toBeVisible()
    await memberPoll.getByRole('button', { name: 'Resubmit answers' }).click()
    await expect(memberPoll.getByRole('alert')).toContainText(
      'This poll is closed',
    )
    await expect(memberPoll.getByLabel('Your answer for option 1')).toHaveValue(
      'uncertain',
    )
    await memberPoll
      .getByRole('button', { name: 'Refresh poll; keep editing input' })
      .click()
    const closed = member
      .getByRole('region', { name: 'closed availability poll' })
      .first()
    await expect(closed.getByLabel('Your answer for option 1')).toBeDisabled()
    await expect(closed.getByLabel('Your answer for option 1')).toHaveValue(
      'uncertain',
    )
    await member.reload()
    await expect(closed.getByLabel('Your answer for option 1')).toHaveValue(
      'available',
    )
  } finally {
    await Promise.all([
      leaderContext.close(),
      memberContext.close(),
      pendingContext.close(),
      ownerContext.close(),
    ])
  }
})

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
  return client
}

test('real RPCs deny unauthorized readers and serialize submit/close retries', async () => {
  test.skip(
    env.STAGECOM_DEMO_MODE !== 'true' ||
      !/^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? ''),
    'Requires disposable local demo data.',
  )
  const leader = await actor('producer')
  const member = await actor('member')
  const pending = await actor('invitee')
  const owner = await actor('admin')
  const newcomer = await actor('newcomer')
  const identity = await member.auth.getUser()
  const fixture = createClient(
    env.VITE_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const theater = await fixture
    .from('theaters')
    .select('id')
    .eq('slug', 'compass-rose')
    .single()
  expect(theater.error).toBeNull()
  const event = await fixture
    .from('shows')
    .select(
      'id, show_occurrences(id, show_candidate_slots!show_candidate_slots_occurrence_id_fkey(id))',
    )
    .eq('theater_id', theater.data!.id)
    .eq('slug', 'a-midsummer-nights-dream')
    .single()
  expect(event.error).toBeNull()
  const showId = event.data!.id
  const occurrence = event.data!.show_occurrences[0]
  const old = await leader.rpc('get_availability_polls', { p_show_id: showId })
  for (const poll of old.data.polls.filter(
    (p: { state: string }) => p.state === 'open',
  )) {
    expect(
      (
        await leader.rpc('close_availability_poll', {
          p_poll_id: poll.id,
          p_command_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull()
  }
  const pollId = crypto.randomUUID()
  const open = await leader.rpc('open_availability_poll', {
    p_occurrence_id: occurrence.id,
    p_slot_ids: [occurrence.show_candidate_slots[0].id],
    p_user_ids: [identity.data.user!.id],
    p_command_id: pollId,
  })
  expect(open.error).toBeNull()
  const write = {
    p_poll_id: pollId,
    p_answers: { [occurrence.show_candidate_slots[0].id]: 'available' },
    p_submit: true,
    p_expected_version: 0,
    p_command_id: crypto.randomUUID(),
  }
  for (const denied of [pending, owner, newcomer]) {
    const read = await denied.rpc('get_availability_polls', {
      p_show_id: showId,
    })
    expect(read.data.polls).toEqual([])
    expect(
      (await denied.rpc('save_availability_poll_answers', write)).error?.code,
    ).toBe('42501')
    expect(
      (
        await denied
          .from('show_poll_responses')
          .select('*')
          .eq('poll_id', pollId)
      ).data,
    ).toEqual([])
  }
  const anonymous = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
  )
  expect(
    (await anonymous.rpc('get_availability_polls', { p_show_id: showId }))
      .error,
  ).not.toBeNull()
  const [submitted, closed] = await Promise.all([
    member.rpc('save_availability_poll_answers', write),
    leader.rpc('close_availability_poll', {
      p_poll_id: pollId,
      p_command_id: crypto.randomUUID(),
    }),
  ])
  expect(closed.error).toBeNull()
  expect(submitted.error?.code ?? 'committed').toMatch(/^(55000|committed)$/)
  const read = await member.rpc('get_availability_polls', { p_show_id: showId })
  const poll = read.data.polls.find((p: { id: string }) => p.id === pollId)
  expect(poll.state).toBe('closed')
  expect(poll.own?.submitted ?? null).toEqual(
    submitted.error ? null : write.p_answers,
  )
  const retry = await member.rpc('save_availability_poll_answers', write)
  expect(retry.error?.code ?? 'committed').toBe(
    submitted.error ? '55000' : 'committed',
  )
})
