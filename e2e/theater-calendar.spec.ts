import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }

test('persisted Theater Calendar periods, disclosure and Occurrence return context', async ({
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
      hasTouch: persona === 'Theater Member',
    })
    const page = await context.newPage()
    let calendarEndpoint: string | undefined
    page.on('response', async (response) => {
      if (response.request().resourceType() !== 'fetch') return
      const body = await response.text().catch(() => '')
      if (
        body.includes('Calendar Performance') &&
        body.includes('scheduleBlocks')
      )
        calendarEndpoint = new URL(response.url()).pathname
    })
    try {
      await page.goto('/login')
      const chooser = page.getByRole('button', {
        name: new RegExp(`^${persona}`),
      })
      await waitForReactHandler(chooser, 'onClick')
      await chooser.click()
      await expect(page).toHaveURL(/\/app\//)
      await page.goto('/app/compass-rose/calendar')
      await expect(
        page.getByRole('heading', { name: 'Theater Calendar', exact: true }),
      ).toBeVisible()
      const month = page.getByRole('button', { name: 'Month', exact: true })
      await waitForReactHandler(month, 'onClick')
      await month.click()
      await expect(month).toHaveAttribute('aria-pressed', 'true')
      const monthPicker = page.getByLabel('Calendar month and year')
      const reviewMonth = new Date().toISOString().slice(0, 7)
      await monthPicker.fill(reviewMonth)
      if (persona === 'Theater Owner' || persona === 'Event Producer') {
        await expect(
          page.getByRole('link', { name: /^Calendar Performance,/ }),
        ).toBeVisible()
        await expect(
          page.getByRole('link', { name: /^Calendar Hold,/ }),
        ).toBeVisible()
        await expect(
          page.getByText('Active hold', { exact: true }),
        ).toBeVisible()
        const details = page.getByRole('button', {
          name: 'Details for Calendar Performance',
        })
        await details.hover()
        await expect(
          page.getByText('Compass Rose Mainstage', { exact: true }).first(),
        ).toBeVisible()
        await details.focus()
        await expect(details).toBeFocused()
        await expect(
          page.getByText('Compass Rose Mainstage', { exact: true }).first(),
        ).toBeVisible()
        await details.click()
        const event = page.getByRole('link', { name: /^Calendar Performance,/ })
        const href = await event.getAttribute('href')
        expect(href).toContain('#occurrence-')
        await event.focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(
          /\/events\/calendar-performance\?.*#occurrence-/,
        )
        await expect(
          page
            .getByRole('region', { name: 'Event Occurrences' })
            .locator('li[aria-current=true]'),
        ).toContainText('performance')
        await page
          .getByRole('link', { name: 'Back to Calendar', exact: true })
          .click()
        await expect(monthPicker).toHaveValue(reviewMonth)
        await expect(month).toHaveAttribute('aria-pressed', 'true')
        await expect(page.locator('article[aria-current=true]')).toContainText(
          'Calendar Performance',
        )
        await event.click()
        await expect(page).toHaveURL(/\/events\/calendar-performance/)
        await page.goBack()
        await expect(page.locator('article[aria-current=true]')).toContainText(
          'Calendar Performance',
        )
        await expect(monthPicker).toHaveValue(reviewMonth)
        if (persona === 'Theater Owner') {
          await page.getByRole('link', { name: /Calendar maintenance/ }).click()
          await expect(page).toHaveURL(/#schedule-block-/)
          const blockHash = new URL(page.url()).hash
          await expect(page.locator(blockHash)).toContainText(
            'Calendar maintenance',
          )
          await expect(page.locator(blockHash)).toBeInViewport()
        } else {
          await expect(
            page.getByText('Calendar maintenance', { exact: true }),
          ).toHaveCount(0)
        }
      } else {
        await expect(
          page.getByRole('link', { name: /^Calendar Performance,/ }),
        ).toHaveCount(0)
        await expect(
          page.getByText('Calendar Hold', { exact: true }),
        ).toHaveCount(0)
        await expect(
          page.getByText('Calendar maintenance', { exact: true }),
        ).toHaveCount(0)
        await expect(
          page.getByRole('link', { name: /Primary Venue unavailable/ }),
        ).toHaveCount(0)
        await page
          .getByRole('button', {
            name: 'Details for Primary Venue unavailable',
          })
          .first()
          .click()
        await expect(
          page.getByText('Details are unavailable to you.').first(),
        ).toBeVisible()
      }
      // The existing seed's Confirmed Slot is offsite. Pending invitations grant no planning access.
      if (persona !== 'Pending Cast invitee') {
        await monthPicker.fill(
          new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 7),
        )
        await expect(
          page.getByText('Confirmed Slot · Offsite', { exact: true }).first(),
        ).toBeVisible()
      } else {
        await expect(
          page.getByRole('link', { name: /A Midsummer Night/ }),
        ).toHaveCount(0)
      }
      for (const width of [360, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 })
        await page.screenshot({
          path: test
            .info()
            .outputPath(`layout-${persona.replaceAll(' ', '-')}-${width}.png`),
          fullPage: true,
        })
        const overflowing = await page.evaluate(() =>
          Array.from(document.querySelectorAll('*'))
            .filter(
              (element) =>
                element.getBoundingClientRect().right > window.innerWidth + 1,
            )
            .map((element) => `${element.tagName}.${element.className}`)
            .slice(-10),
        )
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          JSON.stringify(overflowing),
        ).toBe(true)
        await page.screenshot({
          path: test
            .info()
            .outputPath(`${persona.replaceAll(' ', '-')}-${width}.png`),
          fullPage: true,
        })
      }
      await monthPicker.fill('2035-02')
      await expect(
        page.getByText('No Calendar entries in this period.'),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Next Calendar period' }).click()
      await expect(monthPicker).toHaveValue('2035-03')
      await page
        .getByRole('button', { name: 'Previous Calendar period' })
        .click()
      await expect(monthPicker).toHaveValue('2035-02')
      await page.getByRole('button', { name: 'Daybook', exact: true }).click()
      await expect(
        page.getByText('No Calendar entries in this period.'),
      ).toBeVisible()
      await page.reload()
      await expect(monthPicker).toHaveValue('2035-02')
      await expect(
        page.getByRole('button', { name: 'Daybook' }),
      ).toHaveAttribute('aria-pressed', 'true')
      if (persona === 'Theater Owner') {
        await page.goto('/app/compass-rose/calendar')
        const calendarEvent = page.getByRole('link', {
          name: /^Calendar Performance,/,
        })
        await waitForReactHandler(calendarEvent, 'onClick')
        await calendarEvent.click()
        await expect(page).toHaveURL(/\/events\/calendar-performance/)
        await expect.poll(() => calendarEndpoint).toBeDefined()
        let interrupted = 0
        await page.route('**/*', async (route) => {
          if (new URL(route.request().url()).pathname === calendarEndpoint) {
            interrupted += 1
            await route.abort()
          } else await route.continue()
        })
        await page
          .getByRole('link', { name: 'Back to Calendar', exact: true })
          .click()
        await expect(
          page.getByRole('button', { name: 'Retry Calendar' }),
        ).toBeVisible()
        expect(interrupted).toBeGreaterThan(0)
        await page.unroute('**/*')
        await page.getByRole('button', { name: 'Retry Calendar' }).click()
        await expect(
          page.getByRole('heading', { name: 'Theater Calendar', exact: true }),
        ).toBeVisible()
      }
      await page.goto('/app/harbor-stage/calendar')
      if (persona === 'Theater Owner') {
        await expect(page.getByText(/Harbor Stage ·/)).toBeVisible()
        await expect(
          page.getByText('Calendar Performance', { exact: true }),
        ).toHaveCount(0)
      } else if (
        persona === 'Theater Member' ||
        persona === 'Pending Cast invitee'
      ) {
        await expect(
          page.getByRole('heading', { name: 'Theater Calendar', exact: true }),
        ).toHaveCount(0)
      }
    } finally {
      await context.close()
    }
  }
})
