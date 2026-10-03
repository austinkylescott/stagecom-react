import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { Database } from '../src/server/db/database.types'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)

test('Member answers a personal action and keeps a confirmed Call across Theater navigation', async ({
  page,
}) => {
  test.skip(!local, 'Disposable fixture writes require local Supabase.')
  const admin = createClient<Database>(
    env.VITE_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const password = `Stagecom-${suffix}`
  const users: string[] = []
  const theaters: string[] = []
  try {
    for (const role of ['owner', 'member']) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `${role}-${suffix}@example.com`,
        password,
        email_confirm: true,
        user_metadata: { display_name: role },
      })
      expect(error).toBeNull()
      users.push(data.user!.id)
    }
    for (const name of ['North Stage', 'South Stage']) {
      const { data, error } = await admin.rpc('create_theater_with_owner', {
        p_actor_user_id: users[0],
        p_name: name,
        p_slug: `${name.toLowerCase().replace(' ', '-')}-${suffix}`,
        p_timezone: 'America/New_York',
      })
      expect(error).toBeNull()
      theaters.push(data![0].id)
      const membership = await admin.from('theater_memberships').insert({
        theater_id: theaters.at(-1)!,
        user_id: users[1],
        roles: ['member'],
        status: 'active',
      })
      expect(membership.error).toBeNull()
    }
    const invitation = await admin.rpc('invite_theater_admin', {
      p_actor_user_id: users[0],
      p_command_id: crypto.randomUUID(),
      p_member_user_id: users[1],
      p_theater_id: theaters[0],
    })
    expect(invitation.error).toBeNull()
    const event = await admin.rpc('create_managed_event', {
      p_actor_user_id: users[0],
      p_director_user_id: users[0],
      p_producer_user_ids: [],
      p_slug: 'opening-night',
      p_title: 'Opening Night',
      p_theater_id: theaters[0],
    })
    expect(event.error).toBeNull()
    const eventId = event.data![0].id
    expect(
      (
        await admin.from('show_cast').insert({
          show_id: eventId,
          user_id: users[1],
          public_credit_enabled: false,
          status: 'accepted',
          source: 'invited',
          invited_by_user_id: users[0],
        })
      ).error,
    ).toBeNull()
    const startsAt = new Date(Date.now() + 7 * 86400000).toISOString()
    const occurrence = await admin
      .from('show_occurrences')
      .insert({
        show_id: eventId,
        occurrence_type: 'rehearsal',
        status: 'scheduled',
      })
      .select('id')
      .single()
    expect(occurrence.error).toBeNull()
    const slot = await admin
      .from('show_candidate_slots')
      .insert({
        occurrence_id: occurrence.data!.id,
        starts_at: startsAt,
        duration_minutes: 90,
        location_kind: 'off_site',
        off_site_approved: true,
        location_name: 'Studio',
        timezone_name: 'America/New_York',
        timezone_source: 'manual',
        local_starts_at: new Date(Date.parse(startsAt) - 4 * 3600000)
          .toISOString()
          .slice(0, 19),
        utc_offset_minutes: -240,
      })
      .select('id')
      .single()
    expect(slot.error).toBeNull()
    expect(
      (
        await admin
          .from('show_occurrences')
          .update({ confirmed_candidate_slot_id: slot.data!.id })
          .eq('id', occurrence.data!.id)
      ).error,
    ).toBeNull()
    expect(
      (
        await admin.rpc('set_occurrence_call', {
          p_actor_user_id: users[0],
          p_call: 'required',
          p_command_id: crypto.randomUUID(),
          p_occurrence_id: occurrence.data!.id,
          p_participant_user_id: users[1],
        })
      ).error,
    ).toBeNull()
    const auth = createClient(
      env.VITE_SUPABASE_URL!,
      env.VITE_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const session = await auth.auth.signInWithPassword({
      email: `member-${suffix}@example.com`,
      password,
    })
    expect(session.error).toBeNull()
    await page.context().addCookies([
      {
        name: 'stagecom-access-token',
        value: session.data.session!.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
    await page.goto('/app/callsheet')
    const actions = page.getByRole('region', { name: 'Response needed' })
    const agenda = page.getByRole('region', { name: 'Confirmed Calls' })
    await expect(actions.getByText('Admin authority invitation')).toBeVisible()
    await expect(agenda.getByText('Opening Night')).toBeVisible()
    await page
      .getByRole('link', { name: 'Notifications', exact: true })
      .first()
      .click()
    const dismiss = page
      .getByRole('button', { name: 'Dismiss', exact: true })
      .first()
    await waitForReactHandler(dismiss, 'onClick')
    await dismiss.click()
    await expect(
      page.getByRole('heading', { name: 'Dismissed Notifications' }),
    ).toBeVisible()
    await page
      .getByRole('link', { name: 'Callsheet', exact: true })
      .first()
      .click()
    await expect(actions.getByText('Admin authority invitation')).toBeVisible()
    await expect(agenda.getByText('Opening Night')).toBeVisible()
    const accept = actions.getByRole('button', {
      name: 'Accept Admin authority',
    })
    await waitForReactHandler(accept, 'onClick')
    await accept.click()
    await expect(actions.getByText('Admin authority invitation')).toHaveCount(0)
    await expect(agenda.getByText('Opening Night')).toBeVisible()
    await page.reload()
    await expect(actions.getByText('Admin authority invitation')).toHaveCount(0)
    await expect(agenda.getByText('Opening Night')).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Relevant Events' })
        .getByRole('heading', { name: 'Opening Night' }),
    ).toBeVisible()
    const switcher = page.getByRole('button', { name: 'Change Theater' })
    await waitForReactHandler(switcher, 'onPointerDown')
    await switcher.click()
    await page.getByRole('menuitem', { name: 'South Stage' }).click()
    await expect(page).toHaveURL(new RegExp(`south-stage-${suffix}`))
    await page
      .getByRole('link', { name: 'Callsheet', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/app\/callsheet$/)
    await waitForReactHandler(
      page.getByRole('button', { name: 'Open navigation' }),
      'onClick',
    )
    await expect(agenda.getByText('Opening Night')).toBeVisible()
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 })
      await expect(
        page.getByRole('button', { name: 'Open navigation' }),
      ).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
      await page.getByRole('button', { name: 'Open navigation' }).focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('button', { name: 'Open navigation' }),
      ).toBeFocused()
    }
  } finally {
    for (const id of theaters) {
      const events = await admin.from('shows').select('id').eq('theater_id', id)
      if (events.data?.length)
        await admin
          .from('show_leadership')
          .delete()
          .in(
            'show_id',
            events.data.map((event) => event.id),
          )
      expect(
        (await admin.from('theaters').delete().eq('id', id)).error,
      ).toBeNull()
    }
    for (const id of users) await admin.auth.admin.deleteUser(id)
  }
})

for (const persona of [
  'Theater Member',
  'Multi-Theater Member',
  'Theater Owner',
]) {
  test(`seeded ${persona} enters through real Auth and navigates the neutral workspace`, async ({
    page,
  }) => {
    test.skip(
      !local || env.STAGECOM_DEMO_MODE !== 'true',
      'Requires the local demo:seed dataset.',
    )
    await page.goto('/login')
    const chooser = page.getByRole('button', {
      name: new RegExp(`^${persona}`),
    })
    await waitForReactHandler(chooser, 'onClick')
    await chooser.click()
    await expect(
      page.getByRole('heading', { name: 'Callsheet', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Response needed' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Theater needs attention' }),
    ).toBeVisible()
    if (persona !== 'Theater Owner') {
      const calls = page.getByRole('region', { name: 'Confirmed Calls' })
      await expect(calls.getByText('Compass Rose Players')).toBeVisible()
      if (persona === 'Multi-Theater Member')
        await expect(calls.getByText('Harbor Stage')).toBeVisible()
    }
    await page.screenshot({
      path: `/tmp/sta-66-${persona.replaceAll(' ', '-')}-desktop.png`,
      fullPage: true,
    })
    const navigation = page.getByRole('navigation', {
      name: 'Workspace navigation',
    })
    await expect(navigation.getByRole('link')).toHaveText([
      'Callsheet',
      'Calendar',
      'Compass Rose Players',
      'People',
    ])
    await expect(
      navigation.getByRole('link', { name: 'Calendar', exact: true }),
    ).toHaveAttribute('href', '/app/compass-rose/calendar')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: `/tmp/sta-66-${persona.replaceAll(' ', '-')}-phone.png`,
      fullPage: true,
    })
    const drawer = page.getByRole('button', { name: 'Open navigation' })
    await waitForReactHandler(drawer, 'onClick')
    await drawer.click()
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'People', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/compass-rose\/members/)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    if (persona === 'Multi-Theater Member') {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/app/callsheet')
      const harbor = page
        .getByRole('region', { name: 'Your Theaters' })
        .getByRole('article')
        .filter({ hasText: 'Harbor Stage' })
      await harbor.getByRole('link', { name: 'Enter Theater' }).click()
      const callsheet = page
        .getByRole('navigation', { name: 'Workspace navigation' })
        .getByRole('link', { name: 'Callsheet', exact: true })
      await waitForReactHandler(callsheet, 'onClick')
      await callsheet.click()
      await expect(
        page
          .getByRole('navigation', { name: 'Workspace navigation' })
          .getByRole('link', { name: 'Calendar', exact: true }),
      ).toHaveAttribute('href', '/app/harbor-stage/calendar')
    }
  })
}

async function waitForReactHandler(locator: Locator, handlerName: string) {
  await expect
    .poll(() =>
      locator.evaluate(
        (element, name) =>
          Object.keys(element).some(
            (key) =>
              key.startsWith('__reactProps$') &&
              typeof Reflect.get(element, key)?.[name] === 'function',
          ),
        handlerName,
      ),
    )
    .toBe(true)
}
