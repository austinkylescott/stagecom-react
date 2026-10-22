import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { Database } from '../src/server/db/database.types'
import { createCallFixture } from '../src/features/callsheet/testing/call-fixture'
import { waitForReactHandler } from './support/hydration'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)
const title =
  'Opening Night — The Extraordinary Adventures of the Moonlit Ensemble and Their Unforgettable Return to the Stage'

test.use({ timezoneId: 'America/New_York', hasTouch: true })

for (const persona of ['ordinary-member', 'multi-theater', 'operator-cast']) {
  for (const width of [1280, 390]) {
    test(`${persona} completes the integrated Callsheet journey at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      test.skip(
        !local,
        'Disposable authenticated fixtures require local Supabase.',
      )
      const admin = createClient<Database>(
        env.VITE_SUPABASE_URL!,
        env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )
      const fixture = await createCallFixture(admin)
      const mixed = persona === 'operator-cast'
      const actorId = fixture.users[mixed ? 0 : 1]
      const north = fixture.theaters[0]
      try {
        if (persona === 'ordinary-member') {
          expect(
            (
              await admin
                .from('theater_memberships')
                .update({ status: 'inactive' })
                .eq('theater_id', fixture.theaters[1].id)
                .eq('user_id', actorId)
            ).error,
          ).toBeNull()
        }
        const event = await admin
          .from('shows')
          .select('id')
          .eq('theater_id', north.id)
          .single()
        expect(event.error).toBeNull()
        expect(
          (await admin.from('shows').update({ title }).eq('id', event.data!.id))
            .error,
        ).toBeNull()
        expect(
          (
            await admin
              .from('profiles')
              .update({ display_name: 'Alex Rivera' })
              .eq('id', fixture.users[0])
          ).error,
        ).toBeNull()
        expect(
          (
            await admin
              .from('profiles')
              .update({ display_name: 'Jordan Member' })
              .eq('id', fixture.users[1])
          ).error,
        ).toBeNull()
        if (mixed) {
          // Operator authority and Cast participation are explicit, separate facts.
          expect(
            (
              await admin.from('show_cast').insert({
                show_id: event.data!.id,
                user_id: actorId,
                status: 'accepted',
                source: 'invited',
                public_credit_enabled: false,
              })
            ).error,
          ).toBeNull()
          for (const call of fixture.calls.slice(0, 3))
            expect(
              (
                await admin.rpc('set_occurrence_call', {
                  p_actor_user_id: actorId,
                  p_participant_user_id: actorId,
                  p_command_id: crypto.randomUUID(),
                  p_occurrence_id: call.id,
                  p_call: call.requirement,
                })
              ).error,
            ).toBeNull()
        }
        const matching = await admin.rpc('create_managed_event', {
          p_actor_user_id: fixture.users[0],
          p_director_user_id: fixture.users[0],
          p_producer_user_ids: [],
          p_theater_id: north.id,
          p_slug: 'matching-event',
          p_title: title,
        })
        expect(matching.error).toBeNull()
        expect(
          (
            await admin.from('show_cast').insert({
              show_id: matching.data![0].id,
              user_id: actorId,
              status: 'accepted',
              source: 'invited',
              public_credit_enabled: false,
            })
          ).error,
        ).toBeNull()
        expect(
          (
            await admin.from('show_staff_assignments').insert({
              show_id: matching.data![0].id,
              user_id: actorId,
              assignment_type: 'other',
              responsibility: 'Front of house',
              status: 'pending',
              invited_by_user_id: fixture.users[0],
              invited_at: '2026-10-07T14:00:00Z',
            })
          ).error,
        ).toBeNull()
        const actor = createClient<Database>(
          env.VITE_SUPABASE_URL!,
          env.VITE_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } },
        )
        const session = await actor.auth.signInWithPassword({
          email: mixed ? fixture.ownerEmail : fixture.email,
          password: fixture.password,
        })
        expect(session.error).toBeNull()
        // Verify the fixture's actual authority, rather than trusting its login label.
        const memberships = await actor
          .from('theater_memberships')
          .select('roles')
          .eq('user_id', actorId)
          .eq('status', 'active')
        expect(memberships.error).toBeNull()
        expect(memberships.data).toHaveLength(
          persona === 'ordinary-member' ? 1 : 2,
        )
        for (const membership of memberships.data!)
          expect(membership.roles).toEqual(mixed ? ['owner'] : ['member'])
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
        await page.setViewportSize({ width, height: 844 })
        const hydrationErrors: string[] = []
        page.on('pageerror', (error) => hydrationErrors.push(error.message))
        page.on('console', (message) => {
          if (
            message.type() === 'error' &&
            /hydrat|mismatch|Minified React/i.test(message.text())
          )
            hydrationErrors.push(message.text())
        })
        await page.goto('/app/notifications')
        async function enterCallsheet() {
          if (width === 390) {
            const menu = page.getByRole('button', { name: 'Open navigation' })
            await waitForReactHandler(menu, 'onClick')
            await menu.click()
          }
          const link = page
            .getByRole('link', { name: 'Callsheet', exact: true })
            .first()
          await waitForReactHandler(link, 'onClick')
          await link.focus()
          await page.keyboard.press('Enter')
        }
        await enterCallsheet()
        const calls = page.getByRole('region', { name: 'Confirmed Calls' })
        const invitation = page
          .getByRole('region', { name: 'Response needed' })
          .getByRole('article')
          .filter({ hasText: 'Front of house' })
        await expect(invitation).toContainText(
          'Acceptance confirms your Event staff responsibility',
        )
        const review = invitation.getByText('Review invitation details')
        await review.focus()
        await page.keyboard.press('Enter')
        await expect(invitation).toContainText('Invited by Alex Rivera')
        await expect(invitation).toContainText('Offered:')
        await page.reload()
        await expect(invitation).toBeVisible()
        await invitation.getByText('Review invitation details').click()
        await expect(calls).toContainText('Rehearsal · Required Call')
        await expect(calls).toContainText('Performance · Optional Call')
        await expect(calls.locator('time').first()).toContainText('EDT')
        await expect(
          page.getByRole('button', { name: 'Change Theater' }),
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'Your Theaters', exact: true }),
        ).toHaveCount(0)
        if (width === 1280) {
          const agenda = page.getByRole('region', { name: 'Your Next Events' })
          await expect(agenda).toContainText('Rehearsal · Required Call')
          await expect(agenda).toContainText('Performance · Optional Call')
          await expect(agenda.locator('time').first()).toHaveText(
            await calls.locator('time').first().innerText(),
          )
        }
        const retainedCalls = await calls
          .locator('a')
          .evaluateAll((elements) =>
            elements.map((a) => a.getAttribute('href')),
          )
        expect(retainedCalls).toHaveLength(persona === 'multi-theater' ? 6 : 3)
        await page.screenshot({
          path: `docs/design/callsheet-journey-evidence/${persona}-${width}-before.png`,
          fullPage: true,
        })
        const accept = invitation.getByRole('button', {
          name: 'Accept staff assignment',
        })
        await waitForReactHandler(accept, 'onClick')
        await accept.focus()
        await page.keyboard.press('Enter')
        await expect(invitation).toHaveCount(0)
        await page.reload()
        await expect(invitation).toHaveCount(0)
        await expect(
          page.getByRole('region', { name: 'Response needed' }),
        ).toHaveCount(0)
        await expect(calls.locator('a')).toHaveCount(retainedCalls.length)
        expect(
          await calls
            .locator('a')
            .evaluateAll((elements) =>
              elements.map((a) => a.getAttribute('href')),
            ),
        ).toEqual(retainedCalls)
        const workspaces = page.getByRole('region', {
          name: 'Your Event workspaces',
        })
        const links = workspaces.getByRole('link').filter({ hasText: title })
        await expect(links).toHaveCount(2)
        const names = await Promise.all(
          (await links.all()).map((link) => link.ariaSnapshot()),
        )
        expect(new Set(names).size).toBe(2)
        const avatar = workspaces
          .getByRole('button', { name: 'Jordan Member', exact: true })
          .first()
        await avatar.focus()
        await expect(
          page.getByRole('tooltip', { name: 'Jordan Member', exact: true }),
        ).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('tooltip')).toHaveCount(0)
        await expect(avatar).toBeFocused()
        if (width === 390) {
          await avatar.blur()
          await avatar.tap()
          await expect(
            page.getByRole('tooltip', { name: 'Jordan Member', exact: true }),
          ).toBeVisible()
          await page
            .getByRole('heading', { name: 'Callsheet', exact: true })
            .tap()
          await expect(page.getByRole('tooltip')).toHaveCount(0)
          const trigger = page.getByRole('button', { name: /^Next Event/ })
          await trigger.focus()
          await page.keyboard.press('Enter')
          const sheet = page.getByRole('dialog', {
            name: 'Your Upcoming Events',
          })
          await expect(sheet).toContainText('Performance · Optional Call')
          await expect(sheet.locator('time').first()).toHaveText(
            await calls.locator('time').first().innerText(),
          )
          await page.keyboard.press('Escape')
          await expect(trigger).toBeFocused()
        }
        for (const row of await workspaces.getByRole('listitem').all())
          expect(
            await row.evaluate(
              (element) => element.scrollWidth <= element.clientWidth,
            ),
          ).toBe(true)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await page.screenshot({
          path: `docs/design/callsheet-journey-evidence/${persona}-${width}-after.png`,
          fullPage: true,
        })
        for (const [slug, context] of [
          ['cast-event', 'Next Event date:'],
          ['matching-event', 'No confirmed dates ahead'],
        ]) {
          const destination = `/app/${north.slug}/events/${slug}`
          const link = workspaces.getByRole('link', {
            name: new RegExp(`${title} North Stage.*${context}`),
          })
          await expect(link).toHaveAttribute('href', destination)
          await link.focus()
          await page.keyboard.press('Enter')
          await expect(page).toHaveURL(new RegExp(`${destination}$`))
          await expect(
            page.getByRole('heading', { name: title, exact: true }),
          ).toBeVisible()
          await page.goBack()
          await expect(workspaces).toBeVisible()
        }
        // Fail only the full browser read once; all Auth, mutations and recovered data are real.
        await page.goto('/app/notifications')
        let failures = 0
        await page.route('**/_serverFn/**', async (route) => {
          const id = new URL(route.request().url()).pathname.split('/').at(-1)!
          const name = JSON.parse(
            Buffer.from(id, 'base64url').toString(),
          ).export
          if (name.startsWith('getMyCallsheetFn_') && failures === 0) {
            failures++
            await route.fulfill({
              json: {
                result: {
                  ok: false,
                  error: {
                    code: 'external_service_error',
                    status: 502,
                    message: 'Simulated transient read failure',
                  },
                },
                context: {},
              },
            })
          } else await route.continue()
        })
        await enterCallsheet()
        const retry = page.getByRole('button', {
          name: 'Retry Callsheet',
          exact: true,
        })
        await expect(retry).toBeVisible()
        await page
          .getByRole('link', { name: 'Open Notifications', exact: true })
          .click()
        await expect(
          page.getByRole('heading', { name: 'Notifications', exact: true }),
        ).toBeVisible()
        failures = 0
        await enterCallsheet()
        await expect(retry).toBeVisible()
        await retry.focus()
        await page.keyboard.press('Enter')
        await expect(calls.locator('a')).toHaveCount(retainedCalls.length)
        expect(
          await calls
            .locator('a')
            .evaluateAll((elements) =>
              elements.map((a) => a.getAttribute('href')),
            ),
        ).toEqual(retainedCalls)
        await expect(invitation).toHaveCount(0)
        await expect(page).toHaveURL(/\/app\/callsheet$/)
        expect(hydrationErrors).toEqual([])
      } finally {
        await fixture.cleanup()
      }
    })
  }
}
