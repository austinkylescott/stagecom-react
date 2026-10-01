import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }

test('seeded personas explore the named Theater and recognizable Event destination', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  test.skip(
    env.STAGECOM_DEMO_MODE !== 'true' ||
      !/^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? ''),
    'Requires the disposable local demo seed.',
  )
  for (const persona of [
    'Theater Owner',
    'Event Producer',
    'Theater Member',
    'Pending Cast invitee',
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    try {
      await page.goto('/login')
      const chooser = page.getByRole('button', {
        name: new RegExp(`^${persona}`),
      })
      await expect
        .poll(() =>
          chooser.evaluate((element) =>
            Object.keys(element).some(
              (key) =>
                key.startsWith('__reactProps$') &&
                typeof Reflect.get(element, key)?.onClick === 'function',
            ),
          ),
        )
        .toBe(true)
      await chooser.click()
      await expect(page).toHaveURL(/\/app\//)
      await page.goto('/app/compass-rose')
      await expect(
        page.getByRole('heading', {
          name: 'Compass Rose Players',
          exact: true,
        }),
      ).toBeVisible()
      const programming = page.getByRole('link', {
        name: 'Explore programming',
      })
      await programming.focus()
      await expect(programming).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(
        page.getByRole('heading', { name: 'Event portfolio', exact: true }),
      ).toBeVisible()
      const event = page.getByRole('article').filter({
        has: page.getByRole('heading', {
          name: "A Midsummer Night's Dream",
          exact: true,
        }),
      })
      await event.getByRole('link', { name: 'Open Overview' }).click()
      await expect(
        page.getByRole('heading', {
          name: "A Midsummer Night's Dream",
          exact: true,
        }),
      ).toBeVisible()
      const sections = page.getByRole('navigation', {
        name: 'Event workspace sections',
      })
      if (persona === 'Pending Cast invitee') {
        await expect(
          sections.getByRole('link', { name: 'Schedule & Plan' }),
        ).toHaveCount(0)
        await expect(
          page.getByText('Invited by', { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText('Parker Producer', { exact: true }),
        ).toBeVisible()
        await expect(
          page.getByRole('region', { name: 'Event Occurrences' }),
        ).toHaveCount(0)
      } else {
        await expect(
          page.getByRole('region', { name: 'Event Occurrences' }),
        ).toBeVisible()
        if (persona === 'Event Producer') {
          await expect(
            page.getByText('Producer · Director · Cast Member', {
              exact: true,
            }),
          ).toBeVisible()
          await expect(
            page.getByRole('link', { name: 'Prepare Event plan · Producer' }),
          ).toBeVisible()
          await expect(
            page.getByRole('link', {
              name: 'Coordinate Cast and Calls',
              exact: true,
            }),
          ).toBeVisible()
        }
      }
      for (const width of [360, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 })
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true)
        if (width !== 390)
          await page.screenshot({
            path: test
              .info()
              .outputPath(`${persona.replaceAll(' ', '-')}-${width}.png`),
            fullPage: true,
            caret: 'initial',
          })
      }
      await page.getByRole('link', { name: 'Back to Event portfolio' }).click()
      await expect(
        page.getByRole('heading', { name: 'Event portfolio', exact: true }),
      ).toBeVisible()
      if (persona === 'Theater Owner') {
        await page
          .getByRole('link', { name: 'Theater Operations', exact: true })
          .click()
        await expect(
          page.getByRole('heading', {
            name: 'Theater Operations',
            exact: true,
          }),
        ).toBeVisible()
      }
    } finally {
      await context.close()
    }
  }
})
