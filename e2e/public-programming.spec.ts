import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { waitForReactHandler } from './support/hydration'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const localDemo =
  env.STAGECOM_DEMO_MODE === 'true' &&
  /^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? '')

test.beforeEach(() =>
  test.skip(!localDemo, 'Requires the disposable local demo seed.'),
)

test('phone discovery discloses only published presentations and complete posters', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/theater')
  await expect(
    page.getByRole('heading', { name: 'Discover public programming' }),
  ).toBeVisible()
  const theater = page.getByRole('link', {
    name: 'Compass Rose Players',
    exact: true,
  })
  await waitForReactHandler(
    page.getByRole('link', { name: 'Discover', exact: true }),
    'onClick',
  )
  await theater.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Upcoming programming' }),
  ).toBeVisible()
  await expect(
    page.getByText("A Midsummer Night's Dream", { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByText('PRIVATE REVIEW COPY', { exact: false }),
  ).toHaveCount(0)
  await page
    .getByRole('link', { name: 'Calendar Performance', exact: true })
    .click()
  await expect(
    page.getByText('Published presentation', { exact: true }),
  ).toBeVisible()
  const poster = page.getByRole('img', { name: 'Calendar Performance poster' })
  await expect(poster).toBeVisible()
  await expect
    .poll(() =>
      poster.evaluate(
        (img) =>
          img instanceof HTMLImageElement &&
          img.complete &&
          img.naturalWidth === 1080 &&
          img.naturalHeight === 1350,
      ),
    )
    .toBe(true)
  const bounds = await poster.boundingBox()
  expect(bounds!.width / bounds!.height).toBeCloseTo(0.8, 2)
  expect(await poster.evaluate((img) => getComputedStyle(img).objectFit)).toBe(
    'contain',
  )
  await expect(
    page.getByRole('link', { name: 'Open original poster' }),
  ).toHaveAttribute('href', /programming-poster.svg$/)
  await expect(
    page.getByText('Compass Rose Mainstage', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Free admission', { exact: true })).toBeVisible()
  await expect(
    page.getByText('No advance ticketing', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Cast', exact: true }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/public-event-phone.png',
    fullPage: true,
  })
  await page.goto('/theater/compass-rose/public-stories')
  await expect(page.getByText('Poster unavailable')).toBeVisible()
  await expect(page.getByText('$18.00')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get tickets' })).toHaveAttribute(
    'href',
    'https://example.com/compass-rose-tickets',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/public-long-copy-phone.png',
    fullPage: true,
  })
  await page.goto('/theater/compass-rose/a-midsummer-nights-dream')
  await expect(
    page.getByRole('heading', { name: 'Published page unavailable' }),
  ).toBeVisible()
  await expect(
    page.getByText("A Midsummer Night's Dream", { exact: true }),
  ).toHaveCount(0)
})

test('anonymous Performance entry keeps its identity through sign-in and private authorization', async ({
  page,
}) => {
  await page.goto('/theater/compass-rose/calendar-performance')
  const performance = page.getByRole('link', {
    name: 'Open this Performance in the private Event',
  })
  const href = await performance.getAttribute('href')
  expect(href).toMatch(/#occurrence-[a-f0-9-]+$/)
  await performance.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect
    .poll(() => new URL(page.url()).searchParams.get('next'))
    .toBe(href)
  // Password Auth supplies the same Supabase session as the existing email-link flow.
  const auth = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
  const { data, error } = await auth.auth.signInWithPassword({
    email: 'producer@demo.stagecom.test',
    password: env.STAGECOM_DEMO_PASSWORD!,
  })
  expect(error).toBeNull()
  await page.context().addCookies([
    {
      name: 'stagecom-access-token',
      value: data.session!.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  await page.goto(href!)
  await expect(
    page.getByRole('heading', { name: 'Calendar Performance', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Current private plan', { exact: true }),
  ).toBeVisible()
  await expect(page.locator(href!.slice(href!.indexOf('#')))).toBeVisible()
  await page.getByRole('link', { name: 'Public Page', exact: true }).click()
  await expect(page.getByLabel('Public title')).toHaveValue(
    'Private working copy: Calendar Performance',
  )
  await page
    .getByRole('link', { name: 'View published presentation', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Calendar Performance', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('PRIVATE REVIEW COPY', { exact: false }),
  ).toHaveCount(0)
  const { data: member, error: memberError } =
    await auth.auth.signInWithPassword({
      email: 'member@demo.stagecom.test',
      password: env.STAGECOM_DEMO_PASSWORD!,
    })
  expect(memberError).toBeNull()
  await page.context().addCookies([
    {
      name: 'stagecom-access-token',
      value: member.session!.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  await page.goto(href!)
  await expect(page.getByLabel('Public title')).toHaveCount(0)
  await expect(
    page.getByText('PRIVATE REVIEW COPY', { exact: false }),
  ).toHaveCount(0)
  await expect(
    page.getByText('Current private plan', { exact: true }),
  ).toHaveCount(0)
})

test('discovery has a recoverable error and an accessible loading presentation', async ({
  page,
}) => {
  await page.goto('/')
  await page.route('**/_serverFn/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1600))
    await route.abort('failed')
  })
  const discovery = page
    .getByRole('navigation', { name: 'Public navigation' })
    .getByRole('link', { name: 'Discover', exact: true })
  await waitForReactHandler(discovery, 'onClick')
  await discovery.click()
  await expect(page.getByRole('status')).toHaveText(
    'Loading published programming…',
  )
  await expect(
    page.getByRole('heading', { name: 'Public programming is unavailable' }),
  ).toBeVisible()
  await page.unroute('**/_serverFn/**')
  const retry = page.getByRole('button', { name: 'Try again' })
  await waitForReactHandler(retry, 'onClick')
  await retry.click()
  await expect(
    page.getByRole('heading', { name: 'Discover public programming' }),
  ).toBeVisible()
})
