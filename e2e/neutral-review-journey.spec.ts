import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'

test.use({ actionTimeout: 10_000, navigationTimeout: 20_000 })

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const localDemo =
  env.STAGECOM_DEMO_MODE === 'true' &&
  /^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? '')

async function inspect(page: Page, name: string) {
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.getByRole('heading', { level: 1 }).last()).toBeVisible()
    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            width: window.innerWidth,
            scroll: document.documentElement.scrollWidth,
            overflowing: Array.from(document.querySelectorAll('*'))
              .filter(
                (element) =>
                  element.getBoundingClientRect().right > window.innerWidth + 1,
              )
              .map((element) => `${element.tagName}.${element.className}`)
              .slice(-5),
          })),
        { message: `${name} overflows at ${width}px` },
      )
      .toMatchObject({ width, scroll: width })
    await page.screenshot({
      path: test.info().outputPath(`${name}-${width}.png`),
      fullPage: true,
      caret: 'initial',
    })
  }
}

// This walkthrough uses one seeded database story across real authenticated and
// anonymous presentations. Mutating feature suites should run serially; reseed
// before this review when a pristine invitation/Team story is needed.
test('connected neutral review spans all workspace pages and relationship presentations', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  test.skip(!localDemo, 'Requires the disposable local Supabase demo seed.')
  for (const persona of [
    'Theater Member',
    'Event Producer',
    'Theater Owner',
    'Theater Admin',
    'Multi-Theater Member',
    'Pending Cast invitee',
  ]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const label = persona.replaceAll(' ', '-')
    try {
      await page.goto('/login')
      const chooser = page.getByRole('button', {
        name: new RegExp(`^${persona}`),
      })
      await waitForReactHandler(chooser, 'onClick')
      await chooser.click()
      await expect(page).toHaveURL(/\/app\//)
      const callsheet = page
        .getByRole('link', {
          name: 'Callsheet',
          exact: true,
        })
        .first()
      await waitForReactHandler(callsheet, 'onClick')
      await callsheet.click()
      await expect(
        page.getByRole('region', { name: 'Confirmed Calls' }),
      ).toBeVisible()
      await inspect(page, `${label}-callsheet`)
      if (persona === 'Multi-Theater Member') {
        const calls = page.getByRole('region', { name: 'Confirmed Calls' })
        await expect(calls).toContainText('Compass Rose Players')
        await expect(calls).toContainText('Harbor Stage')
      }
      // Product pages never expose development persona controls.
      await expect(
        page.getByRole('button', { name: /^Event Producer/ }),
      ).toHaveCount(0)
      await page
        .getByRole('link', { name: 'Compass Rose Players', exact: true })
        .first()
        .click()
      await expect(
        page.getByRole('heading', {
          name: 'Compass Rose Players',
          exact: true,
        }),
      ).toBeVisible()
      if (persona === 'Theater Owner' || persona === 'Theater Admin') {
        await page
          .getByRole('link', { name: 'Open Theater Operations' })
          .click()
        await expect(
          page.getByRole('heading', {
            name: 'Theater Operations',
            exact: true,
          }),
        ).toBeVisible()
        await inspect(page, `${label}-operations`)
        await page.getByRole('link', { name: 'Theater', exact: true }).click()
      } else {
        await expect(
          page.getByRole('link', { name: 'Open Theater Operations' }),
        ).toHaveCount(0)
      }
      await page.getByRole('link', { name: 'Explore programming' }).click()
      await expect(
        page.getByRole('heading', { name: 'Event portfolio', exact: true }),
      ).toBeVisible()
      await inspect(page, `${label}-portfolio`)
      const event = page.getByRole('article').filter({
        has: page.getByRole('heading', {
          name: "A Midsummer Night's Dream",
          exact: true,
        }),
      })
      await waitForReactHandler(
        page.getByRole('button', { name: 'All Events', exact: true }),
        'onClick',
      )
      await event.getByRole('link', { name: 'Open Overview' }).click()
      await expect(page).toHaveURL(/\/events\/a-midsummer-nights-dream/)
      await expect(
        page.getByRole('heading', {
          name: "A Midsummer Night's Dream",
          exact: true,
          level: 1,
        }),
      ).toBeVisible()
      await inspect(page, `${label}-event`)
      if (persona === 'Pending Cast invitee') {
        await expect(
          page.getByRole('region', { name: 'Event Occurrences' }),
        ).toHaveCount(0)
        await expect(
          page.getByRole('link', { name: 'Schedule & Plan', exact: true }),
        ).toHaveCount(0)
        await page
          .getByRole('link', { name: 'Cast & Team', exact: true })
          .click()
        await expect(
          page.getByRole('button', { name: 'Accept invitation', exact: true }),
        ).toBeVisible()
        await expect(
          page.getByRole('region', { name: 'Availability polls', exact: true }),
        ).toHaveCount(0)
      }
      if (persona === 'Event Producer') {
        await expect(
          page.getByText('Producer · Director · Cast Member', { exact: true }),
        ).toBeVisible()
        await page
          .getByRole('link', { name: 'Cast & Team', exact: true })
          .click()
        await expect(
          page.getByRole('heading', {
            name: 'Availability polls',
            exact: true,
          }),
        ).toBeVisible()
        await inspect(page, `${label}-cast-team`)
      }
      await page.getByRole('link', { name: 'Back to Event portfolio' }).click()
      await expect(
        page.getByRole('heading', { name: 'Event portfolio', level: 1 }),
      ).toBeVisible()
      await page
        .getByRole('link', { name: 'Calendar', exact: true })
        .first()
        .click()
      await expect(
        page.getByRole('heading', { name: 'Theater Calendar', exact: true }),
      ).toBeVisible()
      await inspect(page, `${label}-calendar`)
      if (persona === 'Theater Owner') {
        const entry = page.getByRole('link', { name: /^Calendar Performance,/ })
        await entry.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('li[aria-current=true]')).toContainText(
          'performance',
        )
        await page.getByRole('link', { name: 'Review', exact: true }).click()
        await expect(
          page.getByRole('heading', { name: 'Review', exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText('Immutable submitted snapshot', { exact: true }),
        ).toBeVisible()
        await inspect(page, `${label}-review`)
        await page
          .getByRole('link', { name: 'Back to Calendar', exact: true })
          .click()
        await expect(page.locator('article[aria-current=true]')).toContainText(
          'Calendar Performance',
        )
      }
      await page
        .getByRole('link', { name: 'People', exact: true })
        .first()
        .click()
      await expect(
        page.getByRole('region', { name: 'Directory', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('region', { name: 'Teams', exact: true }),
      ).toBeVisible()
      await inspect(page, `${label}-people`)
      await page
        .getByRole('link', { name: 'Notifications', exact: true })
        .first()
        .click()
      await expect(
        page.getByRole('heading', { name: 'Notifications', exact: true }),
      ).toBeVisible()
      await inspect(page, `${label}-notifications`)
      const account = page
        .getByRole('button', { name: 'Account', exact: true })
        .first()
      await waitForReactHandler(account, 'onPointerDown')
      await account.focus()
      await page.keyboard.press('Enter')
      await expect(
        page.getByRole('menuitem', { name: 'Sign out' }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(account).toBeFocused()
      await page
        .getByRole('link', { name: 'Callsheet', exact: true })
        .first()
        .click()
      await page.setViewportSize({ width: 360, height: 844 })
      await page.reload()
      const phoneAccount = page.getByRole('button', {
        name: 'Account',
        exact: true,
      })
      await waitForReactHandler(phoneAccount, 'onPointerDown')
      await phoneAccount.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menu')).toContainText('@demo.stagecom.test')
      await page.keyboard.press('Escape')
      await expect(phoneAccount).toBeFocused()
      const drawer = page.getByRole('button', { name: 'Open navigation' })
      await waitForReactHandler(drawer, 'onClick')
      await drawer.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(drawer).toBeFocused()
    } finally {
      await context.close()
    }
  }
  const publicContext = await browser.newContext()
  const page = await publicContext.newPage()
  try {
    await page.goto('/theater')
    await page
      .getByRole('link', { name: 'Compass Rose Players', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Upcoming programming' }),
    ).toBeVisible()
    await inspect(page, 'public-theater')
    await page
      .getByRole('link', { name: 'Calendar Performance', exact: true })
      .click()
    await expect(
      page.getByText('Published presentation', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('PRIVATE REVIEW COPY', { exact: false }),
    ).toHaveCount(0)
    await inspect(page, 'public-event')
    await page.goto('/theater/compass-rose/public-stories')
    await expect(page.getByText('Poster unavailable')).toBeVisible()
    await inspect(page, 'public-long-copy')
  } finally {
    await publicContext.close()
  }
})

test('Notification transport failure leaves the alert actionable and retry persists without resolving domain work', async ({
  page,
}) => {
  test.skip(!localDemo, 'Requires the disposable local Supabase demo seed.')
  await page.goto('/login')
  const chooser = page.getByRole('button', { name: /^Pending Cast invitee/ })
  await waitForReactHandler(chooser, 'onClick')
  await chooser.click()
  await expect(page).toHaveURL(/\/app\//)
  await page.goto('/app/notifications')
  const attention = page.getByRole('region', { name: 'Needs your attention' })
  const markRead = attention
    .getByRole('button', { name: 'Mark read', exact: true })
    .first()
  await waitForReactHandler(markRead, 'onClick')
  await page.route('**/_serverFn/**', (route) =>
    route.request().method() === 'POST'
      ? route.abort('failed')
      : route.continue(),
  )
  await markRead.click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not mark this Notification read',
  )
  await expect(markRead).toBeEnabled()
  await page.unroute('**/_serverFn/**')
  await markRead.click()
  await expect(
    attention.getByText('Read', { exact: true }).first(),
  ).toBeVisible()
  await page.reload()
  await expect(
    attention.getByText('Read', { exact: true }).first(),
  ).toBeVisible()
  const dismiss = attention
    .getByRole('button', { name: 'Dismiss', exact: true })
    .first()
  await waitForReactHandler(dismiss, 'onClick')
  await page.route('**/_serverFn/**', (route) =>
    route.request().method() === 'POST'
      ? route.abort('failed')
      : route.continue(),
  )
  await dismiss.click()
  await expect(page.getByRole('alert')).toContainText('retry when connected')
  await expect(dismiss).toBeEnabled()
  await page.unroute('**/_serverFn/**')
  await dismiss.click()
  await expect(
    page.getByRole('heading', { name: 'Dismissed Notifications' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Dismissed Notifications' }),
  ).toBeVisible()
  await page.goto('/app/callsheet')
  await expect(
    page.getByRole('region', { name: 'Response needed' }),
  ).toContainText('Respond to invitation')
})
