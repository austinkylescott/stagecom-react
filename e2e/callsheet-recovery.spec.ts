import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const call = {
  id: 'occurrence-call:recovery',
  kind: 'occurrence_call',
  action: 'Review call',
  actionableAt: '2030-11-03T05:30:00Z',
  relationship: 'Cast Member',
  call: { requirement: 'required', occurrenceType: 'rehearsal' },
  event: { slug: 'opening', title: 'Opening Night' },
  theater: { slug: 'north', title: 'North Stage' },
  targetAnchor: '#occurrence-call-recovery',
}

for (const code of ['unauthenticated', 'forbidden']) {
  test(`${code} Callsheet offers access recovery without a retry promise`, async ({
    page,
  }) => {
    await reads(page, { errorCode: code })
    await expect(
      page.getByRole('button', { name: 'Retry Callsheet' }),
    ).toHaveCount(0)
    if (code === 'unauthenticated') {
      const signIn = page.getByRole('link', { name: 'Sign in again' })
      await expect(signIn).toHaveAttribute(
        'href',
        '/login?next=%2Fapp%2Fcallsheet',
      )
      await signIn.click()
      await expect(page).toHaveURL(/\/login\?next=/)
    } else {
      await expect(
        page.getByRole('heading', {
          name: 'Your Callsheet is not available to you',
        }),
      ).toBeVisible()
      await page.getByRole('link', { name: 'Open Notifications' }).click()
      await expect(
        page.getByRole('heading', { name: 'Notifications', exact: true }),
      ).toBeVisible()
    }
  })
}

test('transport failure, pending retry and genuinely empty Callsheet are distinct', async ({
  page,
}) => {
  const state = await reads(page, { transportFailed: true })
  const retry = page.getByRole('button', {
    name: 'Retry Callsheet',
    exact: true,
  })
  await expect(retry).toBeVisible()
  state.transportFailed = false
  state.failed = false
  state.empty = true
  let release!: () => void
  state.wait = new Promise<void>((resolve) => {
    release = resolve
  })
  await retry.click()
  await expect(
    page.getByRole('button', { name: 'Retrying Callsheet…' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('region', { name: 'Confirmed Calls' }),
  ).toHaveCount(0)
  release()
  await expect(
    page.getByRole('heading', { name: 'Callsheet', exact: true }),
  ).toBeVisible()
  await expect(retry).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Could not load your Callsheet' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Confirmed Calls' }),
  ).toHaveCount(0)
})

for (const width of [1280, 390]) {
  test(`personal agenda retries independently of a failed full Callsheet at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    const state = await reads(page, { agendaFailed: true })
    await expect(
      page.getByRole('button', { name: 'Retry Callsheet', exact: true }),
    ).toBeVisible()
    if (width === 390)
      await page
        .getByRole('button', { name: /Your Events.*Could not load/ })
        .click()
    const agenda =
      width === 390
        ? page.getByRole('dialog')
        : page.getByRole('region', { name: 'Your Next Events' })
    const before = state.callsheetReads
    const retry = agenda.getByRole('button', { name: 'Retry Events' })
    await retry.click()
    await expect.poll(() => state.agendaReads).toBe(2)
    await expect(retry).toBeEnabled()
    state.agendaFailed = false
    await retry.click()
    await expect(agenda).toContainText('Opening Night')
    expect(state.callsheetReads).toBe(before)
    if (width === 390) await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Retry Callsheet', exact: true }),
    ).toBeVisible()
  })
}
const data = { commitments: [call], sharedWork: [], theaters: [] }

// Inject only at app-owned browser read boundaries, never into shared data.
// The Playwright config runs Vite dev, whose RPC IDs describe their export.
async function reads(
  page: Page,
  options: {
    errorCode?: string
    agendaFailed?: boolean
    transportFailed?: boolean
  } = {},
) {
  const state = {
    failed: true,
    callsheetReads: 0,
    agendaReads: 0,
    agendaFailed: options.agendaFailed ?? false,
    errorCode: options.errorCode ?? 'external_service_error',
    transportFailed: options.transportFailed ?? false,
    empty: false,
    wait: Promise.resolve(),
  }
  await page.route('**/_serverFn/**', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)!
    const name = JSON.parse(Buffer.from(id, 'base64url').toString()).export
    let result: unknown
    if (name.startsWith('getCurrentUserFn_')) {
      result = { ok: true, data: { id: 'member', email: 'member@example.com' } }
    } else if (name.startsWith('getMyTheatersFn_')) {
      result = { ok: true, data: { theaters: [] } }
    } else if (name.startsWith('getMyUpcomingCallsFn_')) {
      state.agendaReads++
      result = state.agendaFailed
        ? {
            ok: false,
            error: {
              code: 'external_service_error',
              status: 502,
              message: 'Read unavailable',
            },
          }
        : { ok: true, data: [call] }
    } else if (name.startsWith('getMyCallsheetFn_')) {
      state.callsheetReads++
      await state.wait
      if (state.transportFailed) return route.abort('failed')
      result = state.failed
        ? {
            ok: false,
            error: {
              code: state.errorCode,
              status:
                state.errorCode === 'unauthenticated'
                  ? 401
                  : state.errorCode === 'forbidden'
                    ? 403
                    : 502,
              message: 'Read unavailable',
            },
          }
        : { ok: true, data: state.empty ? { ...data, commitments: [] } : data }
    } else if (name.startsWith('getMyNotificationsFn_')) {
      result = { ok: true, data: { attention: [], dismissed: [] } }
    } else {
      return route.continue()
    }
    await route.fulfill({ json: { result, context: {} } })
  })
  await page.goto('/')
  const enter = page.getByRole('link', { name: 'Open my callsheet' })
  await expect
    .poll(() =>
      enter.evaluate((element) =>
        Object.keys(element).some(
          (key) =>
            key.startsWith('__reactProps$') &&
            typeof Reflect.get(element, key)?.onClick === 'function',
        ),
      ),
    )
    .toBe(true)
  await enter.click()
  return state
}

for (const width of [1280, 390]) {
  test(`failed Callsheet can retry repeatedly, recover in place and leave at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    const state = await reads(page)
    const retry = page.getByRole('button', {
      name: 'Retry Callsheet',
      exact: true,
    })
    await expect(retry).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Confirmed Calls' }),
    ).toHaveCount(0)
    await retry.focus()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('link', { name: 'Open Notifications' }),
    ).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(retry).toBeFocused()
    await expect
      .poll(() =>
        retry.evaluate((element) => getComputedStyle(element).boxShadow),
      )
      .not.toBe('none')
    await page.screenshot({
      path: `docs/design/callsheet-recovery-evidence/failure-${width}.png`,
      fullPage: true,
    })
    const before = state.callsheetReads
    await page.keyboard.press('Enter')
    await expect.poll(() => state.callsheetReads).toBeGreaterThan(before)
    await expect(retry).toBeEnabled()
    await expect(
      page.getByRole('button', { name: 'Retry Events' }),
    ).toHaveCount(0)
    expect(state.agendaReads).toBe(1)
    state.failed = false
    await retry.click()
    await expect(
      page.getByRole('region', { name: 'Confirmed Calls' }),
    ).toContainText('Opening Night')
    await expect(page).toHaveURL(/\/app\/callsheet$/)
    await page.screenshot({
      path: `docs/design/callsheet-recovery-evidence/recovered-${width}.png`,
      fullPage: true,
    })
    state.failed = true
    await page
      .getByRole('link', { name: 'Notifications', exact: true })
      .last()
      .click()
    await expect(
      page.getByRole('heading', { name: 'Notifications', exact: true }),
    ).toBeVisible()
    if (width === 390)
      await page.getByRole('button', { name: 'Open navigation' }).click()
    await page
      .getByRole('link', { name: 'Callsheet', exact: true })
      .first()
      .click()
    await expect(retry).toBeVisible()
    await page
      .getByRole('link', { name: 'Open Notifications', exact: true })
      .click()
    await expect(page).toHaveURL(/\/app\/notifications$/)
    await expect(
      page.getByRole('heading', { name: 'Notifications', exact: true }),
    ).toBeVisible()
  })
}
