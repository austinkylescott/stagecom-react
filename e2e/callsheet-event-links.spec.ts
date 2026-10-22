import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { Database } from '../src/server/db/database.types'
import { createCallFixture } from '../src/features/callsheet/testing/call-fixture'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)
const title =
  'Opening Night — The Extraordinary Adventures of the Moonlit Ensemble and Their Unforgettable Return to the Stage'

test.use({ timezoneId: 'America/New_York', hasTouch: true })
test('same-title Event links and Cast names remain distinguishable by keyboard and phone', async ({
  page,
}) => {
  test.setTimeout(120_000)
  test.skip(!local, 'Disposable fixtures require local Supabase.')
  const admin = createClient<Database>(
    env.VITE_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const fixture = await createCallFixture(admin)
  try {
    const events = await admin
      .from('shows')
      .select('id, slug, theater_id')
      .in(
        'theater_id',
        fixture.theaters.map((theater) => theater.id),
      )
    expect(events.error).toBeNull()
    expect(
      (
        await admin
          .from('shows')
          .update({ title })
          .in(
            'id',
            events.data!.map((event) => event.id),
          )
      ).error,
    ).toBeNull()
    for (const slug of ['matching-one', 'matching-two']) {
      const result = await admin.rpc('create_managed_event', {
        p_actor_user_id: fixture.users[0],
        p_director_user_id: fixture.users[0],
        p_producer_user_ids: [],
        p_theater_id: fixture.theaters[0].id,
        p_slug: slug,
        p_title: title,
      })
      expect(result.error).toBeNull()
    }
    expect(
      (
        await admin
          .from('profiles')
          .update({ display_name: 'Jordan Member' })
          .eq('id', fixture.users[1])
      ).error,
    ).toBeNull()
    // Seven explicit Cast memberships exercise individual and remaining-name controls.
    const castEvent = events.data!.find(
      (event) => event.theater_id === fixture.theaters[0].id,
    )!
    for (const name of [
      'Morgan Avery',
      'Casey Rivera',
      'Alex Chen',
      'Sam Taylor',
      'Robin Brooks',
      'Jamie Ellis',
    ]) {
      const result = await admin.auth.admin.createUser({
        email: `${crypto.randomUUID()}@example.com`,
        password: fixture.password,
        email_confirm: true,
        user_metadata: { full_name: name },
      })
      expect(result.error).toBeNull()
      const userId = result.data.user!.id
      fixture.users.push(userId)
      expect(
        (
          await admin.from('theater_memberships').insert({
            theater_id: fixture.theaters[0].id,
            user_id: userId,
            roles: ['member'],
            status: 'active',
          })
        ).error,
      ).toBeNull()
      expect(
        (
          await admin.from('show_cast').insert({
            show_id: castEvent.id,
            user_id: userId,
            status: 'accepted',
            source: 'invited',
            invited_by_user_id: fixture.users[0],
            public_credit_enabled: false,
          })
        ).error,
      ).toBeNull()
    }
    const auth = createClient(
      env.VITE_SUPABASE_URL!,
      env.VITE_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const session = await auth.auth.signInWithPassword({
      email: fixture.ownerEmail,
      password: fixture.password,
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
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/app/callsheet')
    const region = page.getByRole('region', { name: 'Your Event workspaces' })
    await expect(region.getByRole('heading', { name: title })).toHaveCount(4)
    const baseline = process.env.STA79_CAPTURE_BASELINE === 'true'
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 })
      await expect(region.locator('time').first()).toContainText(/EDT|EST/)
      await page.screenshot({
        path: `docs/design/event-link-evidence/${baseline ? 'before' : 'after'}-${width}.png`,
        fullPage: true,
      })
      if (baseline) continue
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      for (const row of await region.getByRole('listitem').all()) {
        expect(
          await row.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true)
      }
      const links = region.getByRole('link')
      const names = []
      for (const link of await links.all())
        names.push((await link.ariaSnapshot()).split('\n')[0])
      expect(new Set(names).size).toBe(4)
      const castLink = region.getByRole('link', {
        name: new RegExp(`${title} North Stage.*Nov 3, 2030, 1:30 AM EDT`),
      })
      const castRow = castLink.locator('..')
      const avatar = castRow.getByRole('button', {
        name: 'Morgan Avery',
        exact: true,
      })
      await expect(avatar).toBeVisible()
      await castLink.focus()
      await page.keyboard.press('Tab')
      await expect(castRow.getByRole('button').first()).toBeFocused()
      await avatar.focus()
      await expect(
        page.getByRole('tooltip', { name: 'Morgan Avery', exact: true }),
      ).toBeVisible()
      if (width === 1280)
        await page.screenshot({
          path: 'docs/design/event-link-evidence/cast-focus-1280.png',
          fullPage: true,
        })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('tooltip')).toHaveCount(0)
      await expect(avatar).toBeFocused()
      await avatar.blur()
      await page.mouse.move(0, 0)
      if (width === 390) {
        await avatar.tap()
        await expect(
          page.getByRole('tooltip', { name: 'Morgan Avery', exact: true }),
        ).toBeVisible()
        await page.screenshot({
          path: 'docs/design/event-link-evidence/cast-tap-390.png',
          fullPage: true,
        })
        await page
          .getByRole('heading', { name: 'Callsheet', exact: true })
          .tap()
        await expect(page.getByRole('tooltip')).toHaveCount(0)
      }
      const remaining = castRow.getByRole('button', {
        name: '2 more Cast Members',
      })
      await remaining.focus()
      await expect(
        page.getByRole('tooltip', {
          name: 'Robin Brooks, Sam Taylor',
          exact: true,
        }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL(/\/app\/callsheet$/)
      for (const href of await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href')!),
      )) {
        const link = region.locator(`a[href="${href}"]`)
        await link.focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(new RegExp(`${href}$`))
        await expect(
          page.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible()
        await page.goBack()
        await expect(region).toBeVisible()
      }
    }
    expect(errors).toEqual([])
  } finally {
    await fixture.cleanup()
  }
})
