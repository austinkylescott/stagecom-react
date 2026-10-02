import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'
import type { Page } from '@playwright/test'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const localDemo =
  env.STAGECOM_DEMO_MODE === 'true' &&
  /^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? '')
async function openTeam(
  page: Page,
  persona: string,
  teamName = 'Authority Review Team',
) {
  await page.goto('/login')
  const login = page.getByRole('button', { name: new RegExp(`^${persona}`) })
  await waitForReactHandler(login, 'onClick')
  await login.click()
  await expect(page).toHaveURL(/\/app\//)
  await page.goto('/app/compass-rose/members')
  await waitForReactHandler(page.getByLabel('Search Members'), 'onChange')
  await page
    .getByRole('button', { name: `View ${teamName}`, exact: true })
    .click()
  return page.getByRole('region', { name: `${teamName} Team`, exact: true })
}
async function refresh(page: Page) {
  await page
    .getByRole('button', { name: 'Refresh Teams; keep editing input' })
    .click()
}
async function confirm(page: Page, text: string) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(text)
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true)
  if (page.viewportSize()?.width === 390)
    await page.screenshot({ path: '/tmp/sta72-phone-admin-dialog.png' })
  await dialog
    .getByRole('button', { name: 'Confirm action', exact: true })
    .focus()
  await dialog
    .getByRole('button', { name: 'Confirm action', exact: true })
    .press('Enter')
  await expect(dialog).toHaveCount(0)
}

test('Team governance persists consent, scoped Admin authority and successor departure through phone and keyboard dialogs', async ({
  browser,
}) => {
  test.skip(!localDemo, 'Requires disposable local demo data.')
  test.setTimeout(120_000)
  const ownerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const adminContext = await browser.newContext()
  const successorContext = await browser.newContext()
  const owner = await ownerContext.newPage(),
    admin = await adminContext.newPage(),
    successor = await successorContext.newPage()
  try {
    const ownerTeam = await openTeam(owner, 'Event Producer')
    const adminTeam = await openTeam(admin, 'Theater Member')
    const successorTeam = await openTeam(successor, 'Multi-Theater Member')
    await ownerTeam
      .getByLabel('Offer Team Admin to')
      .selectOption({ label: 'Morgan Member' })
    await ownerTeam
      .getByRole('button', { name: 'Offer Admin authority' })
      .click()
    await expect(ownerTeam).toContainText('Pending Team Admin: Morgan Member')
    await refresh(admin)
    await expect(
      adminTeam.getByRole('button', { name: 'Rename Team' }),
    ).toHaveCount(0)
    await adminTeam
      .getByRole('button', { name: 'Accept Team Admin authority' })
      .click()
    await confirm(admin, 'Team scope')
    await expect(adminTeam).toContainText('Morgan Member · You · Team Admin')
    await expect(
      admin.getByRole('heading', { name: 'Access & Roles' }),
    ).toHaveCount(0)
    await admin.reload()
    await waitForReactHandler(admin.getByLabel('Search Members'), 'onChange')
    await admin
      .getByRole('button', { name: 'View Authority Review Team', exact: true })
      .click()
    await expect(
      adminTeam.getByRole('button', { name: 'Rename Team' }),
    ).toBeVisible()
    await adminTeam.getByLabel('Team name').fill('Renamed Ants')
    await adminContext.setOffline(true)
    await adminTeam.getByRole('button', { name: 'Rename Team' }).click()
    await expect(admin.getByRole('alert')).toContainText('retry when connected')
    await expect(adminTeam.getByLabel('Team name')).toHaveValue('Renamed Ants')
    await adminContext.setOffline(false)
    await refresh(owner)
    await ownerTeam
      .getByRole('button', {
        name: 'Remove Admin authority from Morgan Member',
      })
      .click()
    await confirm(owner, 'Morgan Member')
    await adminTeam.getByRole('button', { name: 'Rename Team' }).click()
    await expect(admin.getByRole('alert')).toContainText('This Team changed')
    await refresh(admin)
    await expect(
      adminTeam.getByRole('button', { name: 'Rename Team' }),
    ).toHaveCount(0)
    await ownerTeam
      .getByLabel('Offer Team Admin to')
      .selectOption({ label: 'Morgan Member' })
    await ownerTeam
      .getByRole('button', { name: 'Offer Admin authority' })
      .click()
    await refresh(admin)
    await adminTeam
      .getByRole('button', { name: 'Accept Team Admin authority' })
      .click()
    await confirm(admin, 'Team scope')
    await adminTeam
      .getByRole('button', { name: 'Relinquish Team Admin authority' })
      .click()
    await confirm(admin, 'Relinquish')
    await expect(
      adminTeam.getByRole('button', { name: 'Rename Team' }),
    ).toHaveCount(0)
    await refresh(owner)
    await ownerTeam
      .getByLabel('Recovery nominee')
      .selectOption({ label: 'Casey Multi-Theater' })
    await ownerTeam
      .getByRole('button', { name: 'Offer recovery nomination' })
      .click()
    await refresh(successor)
    await successorTeam
      .getByRole('button', { name: 'Accept recovery nomination' })
      .click()
    await confirm(successor, 'loses Theater membership')
    await successor.reload()
    await waitForReactHandler(
      successor.getByLabel('Search Members'),
      'onChange',
    )
    await successor
      .getByRole('button', { name: 'View Authority Review Team', exact: true })
      .click()
    await expect(successorTeam).toContainText(
      'Recovery nominee: Casey Multi-Theater · Accepted',
    )
    await refresh(owner)
    await ownerTeam
      .getByLabel('Ownership successor')
      .selectOption({ label: 'Casey Multi-Theater' })
    await ownerTeam.getByLabel('Leave when successor accepts').check()
    await ownerTeam.getByRole('button', { name: 'Offer ownership' }).click()
    await expect(ownerTeam).toContainText('Team Owner: Parker Producer')
    await expect(ownerTeam).toContainText(
      'Ownership offered to Casey Multi-Theater · departure on acceptance',
    )
    await refresh(successor)
    await successorTeam
      .getByRole('button', { name: 'Decline Team ownership' })
      .click()
    await expect(successorTeam).not.toContainText('Ownership offered to')
    await refresh(owner)
    await ownerTeam.getByRole('button', { name: 'Offer ownership' }).click()
    await refresh(successor)
    await successorTeam
      .getByRole('button', { name: 'Accept Team ownership' })
      .click()
    await confirm(successor, 'departure')
    await expect(successorTeam).toContainText('Team Owner: Casey Multi-Theater')
    await successor.reload()
    await waitForReactHandler(
      successor.getByLabel('Search Members'),
      'onChange',
    )
    await successor
      .getByRole('button', { name: 'View Authority Review Team', exact: true })
      .click()
    await expect(successorTeam).toContainText('Team Owner: Casey Multi-Theater')
    await refresh(owner)
    await expect(
      ownerTeam.getByRole('button', { name: 'Offer ownership' }),
    ).toHaveCount(0)
    await successorTeam
      .getByRole('button', { name: 'Leave Team', exact: true })
      .click()
    await confirm(successor, 'Morgan Member becomes Owner')
    await refresh(admin)
    await expect(adminTeam).toContainText('Team Owner: Morgan Member')
    for (const width of [360, 390, 1280]) {
      await admin.setViewportSize({ width, height: 844 })
      expect(
        await admin.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    }
    await adminTeam
      .getByRole('button', { name: 'Leave Team', exact: true })
      .click()
    await admin.screenshot({
      path: '/tmp/sta72-departure-dialog.png',
      fullPage: true,
    })
    await admin.getByRole('dialog').press('Escape')
    await expect(admin.getByRole('dialog')).toHaveCount(0)
    await expect(
      adminTeam.getByRole('button', { name: 'Leave Team', exact: true }),
    ).toBeFocused()
    await adminTeam
      .getByRole('button', { name: 'Leave Team', exact: true })
      .click()
    await confirm(admin, 'dissolves')
    await admin.reload()
    await waitForReactHandler(admin.getByLabel('Search Members'), 'onChange')
    await expect(
      admin.getByRole('button', {
        name: 'View Authority Review Team',
        exact: true,
      }),
    ).toHaveCount(0)
    await owner.goto(
      '/app/compass-rose/events/a-midsummer-nights-dream#cast-team',
    )
    await expect(
      owner.getByRole('heading', { name: 'Cast & Team', exact: true }),
    ).toBeVisible()
  } finally {
    await ownerContext.close()
    await adminContext.close()
    await successorContext.close()
  }
})

test('real Team recovery rejects stale authority, races deactivation and preserves accountable ownership', async ({
  page,
}) => {
  test.skip(!localDemo, 'Requires disposable local demo data.')
  const { createClient } = await import('@supabase/supabase-js')
  const fixture = createClient(
    env.VITE_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  async function actor(key: string) {
    const client = createClient(
      env.VITE_SUPABASE_URL!,
      env.VITE_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    expect(
      (
        await client.auth.signInWithPassword({
          email: `${key}@demo.stagecom.test`,
          password: env.STAGECOM_DEMO_PASSWORD!,
        })
      ).error,
    ).toBeNull()
    return client
  }
  const recoveryKey = `recovery-${crypto.randomUUID()}`
  const recoveryUser = await fixture.auth.admin.createUser({
    email: `${recoveryKey}@demo.stagecom.test`,
    password: env.STAGECOM_DEMO_PASSWORD!,
    email_confirm: true,
    user_metadata: { full_name: 'Recovery Owner' },
  })
  expect(recoveryUser.error).toBeNull()
  const owner = await actor(recoveryKey),
    nominee = await actor('producer'),
    remaining = await actor('multi'),
    operator = await actor('owner')
  const ownerId = (await owner.auth.getUser()).data.user!.id
  const nomineeId = (await nominee.auth.getUser()).data.user!.id
  const remainingId = (await remaining.auth.getUser()).data.user!.id
  const operatorId = (await operator.auth.getUser()).data.user!.id
  const theater = await fixture
    .from('theaters')
    .select('id')
    .eq('slug', 'compass-rose')
    .single()
  const theaterId = theater.data!.id
  expect(
    (
      await fixture.from('theater_memberships').insert({
        theater_id: theaterId,
        user_id: ownerId,
        status: 'active',
        roles: ['member'],
      })
    ).error,
  ).toBeNull()
  const teamId = crypto.randomUUID()
  expect(
    (
      await owner.rpc('manage_team', {
        p_theater_id: theaterId,
        p_action: 'create',
        p_input: { name: 'Recovery Browser Team' },
        p_command_id: teamId,
      })
    ).error,
  ).toBeNull()
  async function team() {
    const read = await remaining.rpc('get_team_workspace', {
      p_theater_id: theaterId,
    })
    expect(read.error).toBeNull()
    return read.data.teams.find((item: { id: string }) => item.id === teamId)
  }
  async function act(client: typeof owner, action: string, input = {}) {
    return client.rpc('manage_team', {
      p_theater_id: theaterId,
      p_action: action,
      p_input: { ...input, teamId, expectedVersion: (await team()).version },
      p_command_id: crypto.randomUUID(),
    })
  }
  for (const [client, id] of [
    [nominee, nomineeId],
    [remaining, remainingId],
  ] as const) {
    expect((await act(owner, 'invite', { memberUserId: id })).error).toBeNull()
    expect(
      (await act(client, 'respond', { response: 'accepted' })).error,
    ).toBeNull()
  }
  expect(
    (await act(operator, 'offer_admin', { memberUserId: remainingId })).error
      ?.code,
  ).toBe('42501')
  expect(
    (await act(owner, 'offer_recovery', { memberUserId: nomineeId })).error,
  ).toBeNull()
  expect(
    (await act(remaining, 'respond_recovery', { response: 'accepted' })).error
      ?.code,
  ).toBe('42501')
  expect(
    (await act(nominee, 'respond_recovery', { response: 'declined' })).error,
  ).toBeNull()
  expect((await team()).recovery).toBeNull()
  expect(
    (await act(owner, 'offer_recovery', { memberUserId: nomineeId })).error,
  ).toBeNull()
  expect(
    (await act(nominee, 'respond_recovery', { response: 'accepted' })).error,
  ).toBeNull()
  expect(
    (
      await act(owner, 'offer_transfer', {
        memberUserId: remainingId,
        depart: true,
      })
    ).error,
  ).toBeNull()
  // Open the recipient's old tab before its Owner loses Theater membership.
  await openTeam(page, 'Multi-Theater Member', 'Ants 2 Gods')
  await page
    .getByRole('button', { name: 'View Recovery Browser Team', exact: true })
    .click()
  const detail = page.getByRole('region', {
    name: 'Recovery Browser Team Team',
    exact: true,
  })
  const version = (await team()).version
  const membership = await fixture
    .from('theater_memberships')
    .select('membership_version')
    .eq('theater_id', theaterId)
    .eq('user_id', ownerId)
    .single()
  const [deactivated, accepted] = await Promise.all([
    fixture.rpc('deactivate_theater_membership', {
      p_theater_id: theaterId,
      p_member_user_id: ownerId,
      p_actor_user_id: operatorId,
      p_command_id: crypto.randomUUID(),
      p_expected_membership_version: membership.data!.membership_version,
    }),
    remaining.rpc('manage_team', {
      p_theater_id: theaterId,
      p_action: 'respond_transfer',
      p_input: { teamId, expectedVersion: version, response: 'accepted' },
      p_command_id: crypto.randomUUID(),
    }),
  ])
  expect(deactivated.error).toBeNull()
  expect(accepted.error?.code ?? 'committed').toMatch(/55000|committed/)
  const recovered = await team()
  expect([remainingId, nomineeId]).toContain(recovered.ownerId)
  expect(recovered.memberIds).not.toContain(ownerId)
  expect(recovered.transfer).toBeNull()
  await detail.getByRole('button', { name: 'Accept Team ownership' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByRole('alert')).toContainText('This Team changed')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await refresh(page)
  await expect(
    detail.getByRole('button', { name: 'Accept Team ownership' }),
  ).toHaveCount(0)
  await page.reload()
  await waitForReactHandler(page.getByLabel('Search Members'), 'onChange')
  await page
    .getByRole('button', { name: 'View Recovery Browser Team', exact: true })
    .click()
  await expect(detail).toContainText(
    `Team Owner: ${recovered.ownerId === remainingId ? 'Casey Multi-Theater' : 'Parker Producer'}`,
  )
  expect(
    (await owner.rpc('get_team_workspace', { p_theater_id: theaterId })).error
      ?.code,
  ).toBe('42501')
  expect(
    (
      await owner.rpc('manage_team', {
        p_theater_id: theaterId,
        p_action: 'rename',
        p_input: { teamId, expectedVersion: recovered.version, name: 'Denied' },
        p_command_id: crypto.randomUUID(),
      })
    ).error?.code,
  ).toBe('42501')
  const anonymous = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
  )
  expect(
    (await anonymous.rpc('get_team_workspace', { p_theater_id: theaterId }))
      .error,
  ).not.toBeNull()
  expect(
    (await remaining.rpc('reconcile_team_ownership', { p_team_id: teamId }))
      .error?.code,
  ).toBe('42501')
})
