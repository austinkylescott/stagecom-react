import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { Database } from '../src/server/db/database.types'
import { createCallFixture } from '../src/features/callsheet/testing/call-fixture'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)

for (const timezoneId of ['America/New_York', 'America/Los_Angeles']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId })
    test('personal Calls keep their meaning across dashboard, desktop agenda and phone disclosure', async ({
      page,
      browser,
    }) => {
      test.skip(!local, 'Disposable fixtures require local Supabase.')
      const admin = createClient<Database>(
        env.VITE_SUPABASE_URL!,
        env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )
      const fixture = await createCallFixture(admin)
      try {
        const actor = createClient(
          env.VITE_SUPABASE_URL!,
          env.VITE_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } },
        )
        const session = await actor.auth.signInWithPassword({
          email: fixture.email,
          password: fixture.password,
        })
        expect(session.error).toBeNull()
        const cookie = {
          name: 'stagecom-access-token',
          value: session.data.session!.access_token,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax' as const,
        }
        await page.context().addCookies([cookie])
        const errors: string[] = []
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text())
        })
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto('/app/callsheet')
        const dashboard = page.getByRole('region', { name: 'Confirmed Calls' })
        const sidebar = page.getByRole('region', { name: 'Your Next Events' })
        await expect(
          dashboard.getByText('North Rehearsal', { exact: true }).first(),
        ).toBeVisible()
        await expect(dashboard.locator('time').first()).toContainText(
          timezoneId === 'America/New_York' ? 'EDT' : 'PDT',
        )
        const zone = timezoneId.split('/')[1]
        await page.screenshot({
          path: `docs/design/personal-call-evidence/after-${zone}-desktop.png`,
          fullPage: true,
        })
        await expect(dashboard.getByRole('listitem')).toHaveCount(6)
        await expect(sidebar.getByRole('listitem')).toHaveCount(6)
        for (const [index, call] of fixture.calls.entries()) {
          const row = dashboard.getByRole('listitem').nth(index)
          const agendaRow = sidebar.getByRole('listitem').nth(index)
          const type =
            call.occurrenceType === 'rehearsal' ? 'Rehearsal' : 'Performance'
          const requirement =
            call.requirement === 'required' ? 'Required' : 'Optional'
          for (const surface of [row, agendaRow]) {
            await expect(surface).toContainText(`${type} · ${requirement} Call`)
            await expect(surface).toContainText(
              index < 3 ? 'North Stage' : 'South Stage',
            )
            await expect(surface.locator('time')).toHaveAttribute(
              'datetime',
              call.startsAt.replace('Z', '+00:00'),
            )
            await expect(surface.getByRole('link')).toHaveAttribute(
              'href',
              `/app/${call.theaterSlug}/events/${call.eventSlug}#occurrence-call-${call.id}`,
            )
          }
          await expect(row.locator('time')).toHaveText(
            await agendaRow.locator('time').innerText(),
          )
        }
        // The repeated New York 1:30 AM hour represents two different instants.
        const firstTimes = await dashboard.locator('time').allTextContents()
        if (timezoneId === 'America/New_York') {
          expect(firstTimes[0]).toContain('1:30 AM EDT')
          expect(firstTimes[1]).toContain('1:30 AM EST')
        } else {
          expect(firstTimes[0]).toContain('Nov 2')
          expect(firstTimes[0]).toContain('PDT')
          expect(firstTimes[5]).toContain('PST')
        }
        const ssr = await browser.newContext({
          javaScriptEnabled: false,
          timezoneId,
        })
        try {
          await ssr.addCookies([cookie])
          const serverPage = await ssr.newPage()
          await serverPage.goto('/app/callsheet')
          const times = serverPage
            .getByRole('region', { name: 'Confirmed Calls' })
            .locator('time')
          await expect(times).toHaveCount(6)
          for (const time of await times.all())
            await expect(time).toContainText('UTC')
        } finally {
          await ssr.close()
        }
        const workspaces = page.getByRole('region', {
          name: 'Your Event workspaces',
        })
        await expect(workspaces).toContainText('Next Event date:')
        const dashboardTime = await dashboard
          .locator('time')
          .first()
          .innerText()
        await page.setViewportSize({ width: 390, height: 844 })
        const trigger = page.getByRole('button', { name: /^Next Event/ })
        await expect(trigger).toBeVisible()
        await expect(trigger.locator('time')).toContainText(
          timezoneId === 'America/New_York' ? 'EDT' : 'PDT',
        )
        await trigger.click()
        const sheet = page.getByRole('dialog', { name: 'Your Upcoming Events' })
        await expect(sheet).toBeVisible()
        await expect(sheet.getByRole('listitem')).toHaveCount(6)
        await expect(sheet).toContainText('Rehearsal · Required Call')
        await expect(sheet).toContainText('Performance · Optional Call')
        await expect(sheet).toContainText('North Stage')
        await expect(sheet).toContainText('South Stage')
        await expect(sheet.locator('time').first()).toHaveText(dashboardTime)
        const rows = sheet.getByRole('listitem')
        await rows.last().scrollIntoViewIfNeeded()
        await expect(rows.last()).toBeInViewport()
        await rows.first().scrollIntoViewIfNeeded()
        await expect(rows.first()).toBeInViewport()
        await page.screenshot({
          path: `docs/design/personal-call-evidence/after-${zone}-phone.png`,
          animations: 'disabled',
        })
        await page.keyboard.press('Escape')
        await expect(trigger).toBeFocused()
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await trigger.click()
        await sheet.getByRole('link').first().click()
        await expect(sheet).toHaveCount(0)
        await expect(page).toHaveURL(
          new RegExp(`#occurrence-call-${fixture.calls[0].id}$`),
        )
        await expect(
          page.locator(`#occurrence-call-${fixture.calls[0].id}`),
        ).toBeVisible()
        expect(
          errors.filter((message) =>
            /hydrat|mismatch|Minified React/i.test(message),
          ),
        ).toEqual([])
      } finally {
        await fixture.cleanup()
      }
    })
  })
}
