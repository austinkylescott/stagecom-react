import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const localDemo =
  env.STAGECOM_DEMO_MODE === 'true' &&
  /^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? '')
async function login(page: Page, persona: string) {
  await page.goto('/login')
  const button = page.getByRole('button', { name: new RegExp(`^${persona}`) })
  await waitForReactHandler(button, 'onClick')
  await button.click()
  await expect(page).toHaveURL(/\/app\//)
  await page.goto('/app/compass-rose/members')
  await waitForReactHandler(page.getByLabel('Search Members'), 'onChange')
}
test('Members search overlapping Teams and create, accept and leave through persisted phone/keyboard flows', async ({
  browser,
}) => {
  test.skip(!localDemo, 'Requires disposable local demo data.')
  test.setTimeout(120_000)
  const creatorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const recipientContext = await browser.newContext()
  const creator = await creatorContext.newPage()
  const recipient = await recipientContext.newPage()
  try {
    await login(creator, 'Theater Member')
    const directory = creator.getByRole('region', {
      name: 'Directory',
      exact: true,
    })
    await directory.getByLabel('Search Members').fill('casey')
    await expect(
      directory.getByText('Casey Multi-Theater', { exact: true }),
    ).toBeVisible()
    await expect(
      directory.getByText('Ants 2 Gods', { exact: true }).last(),
    ).toBeVisible()
    await expect(
      directory.getByText('The Management', { exact: true }).last(),
    ).toBeVisible()
    await directory.getByLabel('The Management', { exact: true }).focus()
    await directory.getByLabel('The Management', { exact: true }).press('Space')
    await directory.getByLabel('Search Members').fill('missing')
    await expect(
      directory.getByText('No Members match your search and Team filters.'),
    ).toBeVisible()
    await directory
      .getByRole('button', { name: 'Clear search and filters' })
      .click()
    await expect(
      creator.getByRole('heading', { name: 'Access & Roles' }),
    ).toHaveCount(0)
    const teams = creator.getByRole('region', { name: 'Teams', exact: true })
    await teams
      .getByRole('button', { name: 'Create Team', exact: true })
      .click()
    await expect(teams.getByRole('alert')).toContainText(
      'Team name must contain',
    )
    const name = `Browser Team ${Date.now()}`
    await teams.getByLabel('New Team name').fill(name)
    await creatorContext.setOffline(true)
    await teams
      .getByRole('button', { name: 'Create Team', exact: true })
      .click()
    await expect(teams.getByRole('alert')).toContainText('retry when connected')
    await expect(teams.getByLabel('New Team name')).toHaveValue(name)
    await creatorContext.setOffline(false)
    await teams
      .getByRole('button', { name: 'Create Team', exact: true })
      .focus()
    await teams
      .getByRole('button', { name: 'Create Team', exact: true })
      .press('Enter')
    const detail = teams.getByRole('region', {
      name: `${name} Team`,
      exact: true,
    })
    await expect(detail).toContainText('Team Owner: Morgan Member')
    await creator.reload()
    await waitForReactHandler(creator.getByLabel('Search Members'), 'onChange')
    await teams
      .getByRole('button', { name: `View ${name}`, exact: true })
      .click()
    await detail.getByRole('button', { name: 'Send Team invitation' }).click()
    await expect(teams.getByRole('alert')).toContainText(
      'Choose an active Theater Member',
    )
    await detail
      .getByLabel('Invite Theater Member')
      .selectOption({ label: 'Parker Producer' })
    await detail.getByRole('button', { name: 'Send Team invitation' }).click()
    await expect(detail).toContainText('Pending invitation: Parker Producer')
    await expect(
      detail.getByRole('list').getByText('Parker Producer'),
    ).toHaveCount(0)
    await login(recipient, 'Event Producer')
    const recipientTeams = recipient.getByRole('region', {
      name: 'Teams',
      exact: true,
    })
    await recipientTeams
      .getByRole('button', {
        name: `View ${name} · Invitation pending`,
        exact: true,
      })
      .click()
    const recipientDetail = recipientTeams.getByRole('region', {
      name: `${name} Team`,
      exact: true,
    })
    await expect(
      recipientDetail.getByRole('button', { name: 'Send Team invitation' }),
    ).toHaveCount(0)
    // Another invitation changes the displayed Team version while this recipient
    // is deciding; the old tab must reject and recover rather than enroll silently.
    await detail
      .getByLabel('Invite Theater Member')
      .selectOption({ label: 'Casey Multi-Theater' })
    await detail.getByRole('button', { name: 'Send Team invitation' }).click()
    await expect(detail).toContainText(
      'Pending invitation: Casey Multi-Theater',
    )
    await recipientDetail
      .getByRole('button', { name: 'Accept Team invitation' })
      .click()
    await expect(recipientTeams.getByRole('alert')).toContainText(
      'This Team changed',
    )
    await recipientTeams
      .getByRole('button', { name: 'Refresh Teams; keep editing input' })
      .click()
    await expect(
      recipientDetail.getByRole('button', { name: 'Accept Team invitation' }),
    ).toBeEnabled()
    await recipientDetail
      .getByRole('button', { name: 'Accept Team invitation' })
      .focus()
    await recipientDetail
      .getByRole('button', { name: 'Accept Team invitation' })
      .press('Enter')
    await expect(recipientDetail).toContainText('Parker Producer · You')
    await recipient.reload()
    await waitForReactHandler(
      recipient.getByLabel('Search Members'),
      'onChange',
    )
    await recipientTeams
      .getByRole('button', { name: `View ${name}`, exact: true })
      .click()
    await expect(recipientDetail).toContainText('Parker Producer · You')
    await creator.reload()
    await waitForReactHandler(creator.getByLabel('Search Members'), 'onChange')
    await teams
      .getByRole('button', { name: `View ${name}`, exact: true })
      .click()
    await expect(
      detail.getByRole('button', { name: 'Leave Team', exact: true }),
    ).toBeDisabled()
    await recipientDetail
      .getByRole('button', { name: 'Leave Team', exact: true })
      .click()
    await recipientDetail
      .getByRole('button', { name: 'Confirm leave Team' })
      .click()
    await expect(
      recipientDetail.getByRole('button', { name: 'Leave Team', exact: true }),
    ).toHaveCount(0)
    await recipient.reload()
    await waitForReactHandler(
      recipient.getByLabel('Search Members'),
      'onChange',
    )
    await recipientTeams
      .getByRole('button', { name: `View ${name}`, exact: true })
      .click()
    await expect(
      recipientDetail.getByRole('list').getByText('Parker Producer · You'),
    ).toHaveCount(0)
    await recipient.goto(
      '/app/compass-rose/events/a-midsummer-nights-dream#cast-team',
    )
    await expect(
      recipient.getByRole('heading', { name: 'Cast & Team', exact: true }),
    ).toBeVisible()
    await creator.reload()
    await waitForReactHandler(creator.getByLabel('Search Members'), 'onChange')
    await teams
      .getByRole('button', { name: `View ${name}`, exact: true })
      .click()
    for (const width of [360, 390, 1280]) {
      await creator.setViewportSize({ width, height: 844 })
      expect(
        await creator.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    }
    await creator.screenshot({ path: '/tmp/sta71-people.png', fullPage: true })
    await detail
      .getByRole('button', { name: 'Leave Team', exact: true })
      .click()
    await detail.getByRole('button', { name: 'Confirm leave Team' }).click()
    await expect(
      teams.getByRole('button', { name: `View ${name}`, exact: true }),
    ).toHaveCount(0)
    await creator.reload()
    await waitForReactHandler(creator.getByLabel('Search Members'), 'onChange')
    await expect(
      teams.getByRole('button', { name: `View ${name}`, exact: true }),
    ).toHaveCount(0)
  } finally {
    await creatorContext.close()
    await recipientContext.close()
  }
})

async function actor(key: string) {
  const client = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const signedIn = await client.auth.signInWithPassword({
    email: `${key}@demo.stagecom.test`,
    password: env.STAGECOM_DEMO_PASSWORD!,
  })
  expect(signedIn.error).toBeNull()
  return client
}
test('real Team RPCs enforce individual consent, retries, stale versions and private Theater boundaries', async () => {
  test.skip(!localDemo, 'Requires disposable local demo data.')
  const member = await actor('member'),
    producer = await actor('producer'),
    newcomer = await actor('newcomer'),
    operator = await actor('owner')
  const anonymous = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
  )
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
  const theaterId = theater.data!.id
  const producerId = (await producer.auth.getUser()).data.user!.id
  const id = crypto.randomUUID()
  const create = {
    p_theater_id: theaterId,
    p_action: 'create',
    p_input: { name: 'RPC consent Team' },
    p_command_id: id,
  }
  const [first, retry] = await Promise.all([
    member.rpc('manage_team', create),
    member.rpc('manage_team', create),
  ])
  expect(first.error).toBeNull()
  expect(retry.data).toEqual(first.data)
  const invite = {
    p_theater_id: theaterId,
    p_action: 'invite',
    p_input: { teamId: id, memberUserId: producerId, expectedVersion: 1 },
    p_command_id: crypto.randomUUID(),
  }
  for (const denied of [newcomer, operator, producer])
    expect((await denied.rpc('manage_team', invite)).error?.code).toBe('42501')
  expect((await member.rpc('manage_team', invite)).error).toBeNull()
  const observer = await operator.rpc('get_team_workspace', {
    p_theater_id: theaterId,
  })
  expect(
    observer.data.teams.find((t: { id: string }) => t.id === id).invitations,
  ).toEqual([])
  const pending = await member.rpc('get_team_workspace', {
    p_theater_id: theaterId,
  })
  expect(
    pending.data.teams.find((t: { id: string }) => t.id === id).memberIds,
  ).toHaveLength(1)
  const respond = {
    p_theater_id: theaterId,
    p_action: 'respond',
    p_input: { teamId: id, response: 'accepted', expectedVersion: 2 },
    p_command_id: crypto.randomUUID(),
  }
  expect((await member.rpc('manage_team', respond)).error?.code).toBe('42501')
  expect(
    (
      await producer.rpc('manage_team', {
        ...respond,
        p_input: { ...respond.p_input, expectedVersion: 1 },
      })
    ).error?.code,
  ).toBe('55000')
  const accepted = await producer.rpc('manage_team', respond)
  expect(accepted.error).toBeNull()
  expect((await producer.rpc('manage_team', respond)).data).toEqual(
    accepted.data,
  )
  expect(
    (
      await member.rpc('manage_team', {
        ...create,
        p_input: { name: 'changed' },
      })
    ).error?.code,
  ).toBe('22023')
  for (const denied of [anonymous, newcomer]) {
    expect(
      (await denied.rpc('get_team_workspace', { p_theater_id: theaterId }))
        .error,
    ).not.toBeNull()
    for (const table of ['theater_teams', 'team_memberships', 'team_commands'])
      expect((await denied.from(table).select('*')).error).not.toBeNull()
  }
  const castBefore = await fixture
    .from('show_cast')
    .select('show_id,status')
    .eq('user_id', producerId)
    .order('show_id')
  const leave = {
    p_theater_id: theaterId,
    p_action: 'leave',
    p_input: { teamId: id, expectedVersion: 3 },
    p_command_id: crypto.randomUUID(),
  }
  const [left, leaveRetry] = await Promise.all([
    producer.rpc('manage_team', leave),
    producer.rpc('manage_team', leave),
  ])
  expect(left.error).toBeNull()
  expect(leaveRetry.data).toEqual(left.data)
  const castAfter = await fixture
    .from('show_cast')
    .select('show_id,status')
    .eq('user_id', producerId)
    .order('show_id')
  expect(castAfter.data).toEqual(castBefore.data)
  expect(
    (
      await fixture
        .from('theater_member_capabilities')
        .select('*')
        .eq('user_id', producerId)
    ).error,
  ).toBeNull()
})

test('Team departure races acceptance atomically and empty Theater Teams remain usable', async ({
  page,
}) => {
  test.skip(!localDemo, 'Requires disposable local demo data.')
  await login(page, 'Multi-Theater Member')
  await page.goto('/app/harbor-stage/members')
  await waitForReactHandler(page.getByLabel('Search Members'), 'onChange')
  await expect(
    page.getByText('No Teams yet. Create the first Team in this Theater.'),
  ).toBeVisible()
  const owner = await actor('member'),
    recipient = await actor('producer')
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
  const theaterId = theater.data!.id
  const recipientId = (await recipient.auth.getUser()).data.user!.id
  const id = crypto.randomUUID()
  expect(
    (
      await owner.rpc('manage_team', {
        p_theater_id: theaterId,
        p_action: 'create',
        p_input: { name: 'Race Team' },
        p_command_id: id,
      })
    ).error,
  ).toBeNull()
  expect(
    (
      await owner.rpc('manage_team', {
        p_theater_id: theaterId,
        p_action: 'invite',
        p_input: { teamId: id, memberUserId: recipientId, expectedVersion: 1 },
        p_command_id: crypto.randomUUID(),
      })
    ).error,
  ).toBeNull()
  const [leave, accept] = await Promise.all([
    owner.rpc('manage_team', {
      p_theater_id: theaterId,
      p_action: 'leave',
      p_input: { teamId: id, expectedVersion: 2 },
      p_command_id: crypto.randomUUID(),
    }),
    recipient.rpc('manage_team', {
      p_theater_id: theaterId,
      p_action: 'respond',
      p_input: { teamId: id, response: 'accepted', expectedVersion: 2 },
      p_command_id: crypto.randomUUID(),
    }),
  ])
  expect(
    [
      leave.error?.code ?? 'committed',
      accept.error?.code ?? 'committed',
    ].sort(),
  ).toEqual(['55000', 'committed'])
  const read = await owner.rpc('get_team_workspace', {
    p_theater_id: theaterId,
  })
  const team = read.data.teams.find((t: { id: string }) => t.id === id)
  if (leave.error) expect(team.memberIds).toHaveLength(2)
  else expect(team).toBeUndefined()
})
