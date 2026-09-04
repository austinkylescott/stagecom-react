import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { Browser, BrowserContext, Locator } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

type Actor = { email: string; name: string; userId: string }
type Fixture = {
  actors: {
    cast: Actor
    director: Actor
    owner: Actor
    producer: Actor
    reviewer: Actor
  }
  admin: SupabaseClient<Database>
  anonKey: string
  eventSlug: string
  password: string
  supabaseUrl: string
  theaterSlug: string
}

test('seeded Members take one Event from Theater creation through anonymous admission', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const config = getSupabaseConfig()
  test.skip(!config, 'Local Supabase credentials are required.')
  const fixture = await createFixture(config!)
  const contexts: BrowserContext[] = []

  try {
    const owner = await actorPage(browser, fixture, fixture.actors.owner)
    const producer = await actorPage(browser, fixture, fixture.actors.producer)
    const director = await actorPage(browser, fixture, fixture.actors.director)
    const cast = await actorPage(browser, fixture, fixture.actors.cast)
    const reviewer = await actorPage(browser, fixture, fixture.actors.reviewer)
    const anonymous = await browser.newContext()
    contexts.push(
      owner.context,
      producer.context,
      director.context,
      cast.context,
      reviewer.context,
      anonymous,
    )

    await owner.page.goto('/onboarding/theater')
    await waitForReactHandler(owner.page.getByLabel('Theater name'), 'onChange')
    await owner.page.getByLabel('Theater name').fill('Milestone Theater')
    await owner.page.getByLabel('Public slug').fill(fixture.theaterSlug)
    await owner.page
      .getByLabel('Tagline')
      .fill('One trusted operational record')
    await owner.page.getByLabel('Street').fill('23 Stage Door Way')
    await owner.page.getByLabel('City').fill('New York')
    await owner.page.getByLabel('State / region').fill('NY')
    await owner.page.getByLabel('Postal code').fill('10001')
    await owner.page.getByLabel('Country').fill('US')
    await owner.page.getByLabel('Timezone').fill('America/New_York')
    await owner.page.getByRole('button', { name: 'Save and preview' }).click()
    await expect(owner.page).toHaveURL(
      new RegExp(`/app/${fixture.theaterSlug}/preview$`),
    )
    const publishTheaterButton = owner.page.getByRole('button', {
      name: 'Publish Theater',
    })
    await waitForReactHandler(publishTheaterButton, 'onClick')
    await publishTheaterButton.click()
    await expect(owner.page).toHaveURL(
      new RegExp(`/theater/${fixture.theaterSlug}$`),
    )

    await owner.page.goto(`/app/${fixture.theaterSlug}/members`)
    await owner.page.waitForTimeout(500)
    await owner.page.getByLabel('Maximum uses (optional)').fill('4')
    await owner.page.getByRole('button', { name: 'Create Join Link' }).click()
    const shareUrl = await owner.page
      .getByLabel('Shareable Reusable Join Link')
      .inputValue()
    const joinToken = new URL(shareUrl).pathname.split('/').at(-1)!

    for (const member of [producer, director, cast, reviewer]) {
      await member.page.goto(`/join-link/${joinToken}`)
      await member.page.waitForTimeout(500)
      await member.page.getByRole('button', { name: 'Join Theater' }).click()
      await expect(
        member.page.getByRole('heading', {
          name: 'You joined Milestone Theater',
        }),
      ).toBeVisible()
    }

    await owner.page.goto(`/app/${fixture.theaterSlug}/settings/event-policy`)
    await waitForReactHandler(
      owner.page.getByLabel('Producer eligibility'),
      'onChange',
    )
    await owner.page
      .getByLabel('Producer eligibility')
      .selectOption('all_members')
    await owner.page.getByRole('button', { name: 'Save settings' }).click()
    await expect(owner.page.getByText('Governance saved.')).toBeVisible()
    await owner.page.goto(`/app/${fixture.theaterSlug}/settings/venue-calendar`)
    await owner.page.getByLabel('Primary Venue name').fill('Milestone Stage')
    await owner.page.getByLabel('Setup buffer (minutes)').fill('30')
    await owner.page.getByLabel('Turnover buffer (minutes)').fill('30')
    await owner.page.getByRole('button', { name: 'Save settings' }).click()
    await expect(owner.page.getByText('Governance saved.')).toBeVisible()
    await owner.page.goto(`/app/${fixture.theaterSlug}/members`)
    const reviewerCard = owner.page
      .locator('section')
      .filter({
        has: owner.page.getByRole('heading', { name: 'Access & Roles' }),
      })
      .locator('article')
      .filter({ hasText: fixture.actors.reviewer.name })
    await waitForReactHandler(
      reviewerCard.getByRole('button', { name: 'Designate reviewer' }),
      'onClick',
    )
    await reviewerCard
      .getByRole('button', { name: 'Designate reviewer' })
      .click()
    await expect(
      reviewerCard.getByRole('button', { name: 'Remove reviewer' }),
    ).toBeVisible()

    await producer.page.goto(`/app/${fixture.theaterSlug}/events/new`)
    await waitForReactHandler(
      producer.page.getByLabel('Event title'),
      'onChange',
    )
    await producer.page.getByLabel('Event title').fill('Milestone Event')
    await producer.page.getByLabel('Event slug').fill(fixture.eventSlug)
    await producer.page
      .getByRole('combobox')
      .selectOption(fixture.actors.director.userId)
    await producer.page
      .getByRole('button', { name: 'Create Event draft' })
      .click()
    await expect(producer.page).toHaveURL(
      new RegExp(`/app/${fixture.theaterSlug}/events/${fixture.eventSlug}$`),
    )
    await waitForReactHandler(
      producer.page.getByLabel('Target cast size'),
      'onChange',
    )
    await expect(
      producer.page.getByRole('heading', { name: 'Schedule & Plan' }),
    ).toBeVisible()

    await producer.page.getByLabel('Target cast size').fill('1')
    await producer.page.getByLabel('Minimum Viable Cast').fill('1')
    await producer.page.getByRole('button', { name: 'Add Occurrence' }).click()
    const rehearsal = producer.page
      .locator('article')
      .filter({ has: producer.page.getByText('Occurrence 1', { exact: true }) })
    await rehearsal.getByLabel('Occurrence 1 type').selectOption('rehearsal')
    await rehearsal
      .getByLabel('Occurrence 1 visibility')
      .selectOption('internal')
    await rehearsal.getByRole('button', { name: 'Add Candidate Slot' }).click()
    await rehearsal.getByLabel('Local date and time').fill('2026-10-09T19:00')
    await rehearsal.getByLabel('Duration (minutes)').fill('120')

    await producer.page.getByRole('button', { name: 'Add Occurrence' }).click()
    const performance = producer.page
      .locator('article')
      .filter({ has: producer.page.getByText('Occurrence 2', { exact: true }) })
    await performance
      .getByLabel('Occurrence 2 type')
      .selectOption('performance')
    await performance
      .getByLabel('Occurrence 2 visibility')
      .selectOption('public')
    await performance
      .getByRole('button', { name: 'Add Candidate Slot' })
      .click()
    await performance.getByLabel('Local date and time').fill('2026-10-10T19:30')
    await performance.getByLabel('Duration (minutes)').fill('90')
    await producer.page
      .getByRole('button', { name: 'Save operational plan' })
      .click()
    await expect(producer.page.getByText('Plan saved.')).toBeVisible()

    await director.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await waitForReactHandler(
      director.page.getByLabel('Active Theater Member'),
      'onChange',
    )
    await director.page
      .getByLabel('Active Theater Member')
      .selectOption(fixture.actors.cast.userId)
    await director.page.getByRole('button', { name: 'Invite to Cast' }).click()
    await expect(
      director.page.getByText(fixture.actors.cast.name).first(),
    ).toBeVisible()

    await cast.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await expect(
      cast.page.getByRole('heading', { name: 'Schedule & Plan' }),
    ).toBeVisible()
    await expect(
      cast.page.getByText(
        'You can inspect this Event plan, but only an eligible Producer can edit it.',
      ),
    ).toBeVisible()
    await expect(cast.page.getByLabel('Minimum Viable Cast')).toBeDisabled()
    await waitForReactHandler(
      cast.page.getByRole('button', { name: 'Accept invitation' }),
      'onClick',
    )
    await cast.page.getByRole('button', { name: 'Accept invitation' }).click()
    await cast.page
      .getByLabel('Availability for Candidate Slot 1')
      .selectOption('available')
    await cast.page
      .getByLabel('Availability for Candidate Slot 2')
      .selectOption('available')

    await director.page.reload()
    await waitForReactHandler(
      director.page.getByLabel(
        `Call for ${fixture.actors.cast.name}, Occurrence 1`,
      ),
      'onChange',
    )
    await director.page
      .getByLabel(`Call for ${fixture.actors.cast.name}, Occurrence 1`)
      .selectOption('required')
    await director.page
      .getByLabel(`Call for ${fixture.actors.cast.name}, Occurrence 2`)
      .selectOption('required')

    await producer.page.reload()
    await waitForReactHandler(
      producer.page.getByRole('button', { name: 'Save Proposed Cast' }),
      'onClick',
    )
    await producer.page
      .getByRole('checkbox', { name: fixture.actors.cast.name, exact: true })
      .check()
    await producer.page
      .getByRole('button', { name: 'Save Proposed Cast' })
      .click()
    await expect(producer.page.getByText('Proposed Cast saved.')).toBeVisible()
    const recommendations = producer.page.getByRole('radio')
    await expect(recommendations).toHaveCount(2)
    await recommendations.nth(0).check()
    await recommendations.nth(1).check()
    await producer.page
      .getByRole('button', { name: 'Save operational plan' })
      .click()
    await expect(producer.page.getByText('Plan saved.')).toBeVisible()
    await producer.page
      .getByRole('button', { name: 'Submit Proposal Revision' })
      .click()
    await expect(
      producer.page.getByText('Proposal Revision 1 submitted for review.'),
    ).toBeVisible()

    await reviewer.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await waitForReactHandler(
      reviewer.page.getByLabel('Offered local date and time'),
      'onChange',
    )
    await reviewer.page
      .getByLabel('Target Occurrence')
      .selectOption({ index: 1 })
    await reviewer.page
      .getByLabel('Offered local date and time')
      .fill('2026-10-11T19:30')
    await reviewer.page.getByLabel('Offered duration (minutes)').fill('90')
    await reviewer.page
      .getByRole('button', { name: 'Issue Counteroffer' })
      .click()
    await expect(
      reviewer.page.getByText('Counteroffer · pending'),
    ).toBeVisible()

    await cast.page.reload()
    await waitForReactHandler(
      cast.page.getByLabel('Availability for Candidate Slot 3'),
      'onChange',
    )
    await cast.page
      .getByLabel('Availability for Candidate Slot 3')
      .selectOption('available')

    await producer.page.reload()
    await waitForReactHandler(
      producer.page.getByRole('button', { name: 'accept Counteroffer' }),
      'onClick',
    )
    await producer.page
      .getByRole('button', { name: 'accept Counteroffer' })
      .click()
    await expect(producer.page.getByText('Revision 2 · pending')).toBeVisible()

    await reviewer.page.reload()
    await waitForReactHandler(reviewer.page.getByLabel('Decision'), 'onChange')
    await reviewer.page.getByLabel('Decision').selectOption('approve')
    await reviewer.page.getByRole('button', { name: 'Record approve' }).click()
    await expect(
      reviewer.page.getByText('approved', { exact: true }).first(),
    ).toBeVisible()

    await producer.page.reload()
    await waitForReactHandler(
      producer.page.getByLabel('Public title'),
      'onChange',
    )
    await producer.page.getByLabel('Public title').fill('Milestone Event Live')
    await producer.page
      .getByLabel('Image URL')
      .fill('https://images.example/milestone-event.jpg')
    await producer.page
      .getByLabel('Public description')
      .fill('The complete Stagecom milestone is now open to the audience.')
    await producer.page.getByLabel('General-admission price (USD)').fill('18')
    await producer.page.getByLabel('Sales Channel').selectOption('external')
    await producer.page
      .getByLabel('Ticket or reservation URL')
      .fill('https://tickets.example/milestone-event')
    await producer.page
      .getByLabel(`Credit ${fixture.actors.cast.name} for this Event`)
      .check()
    await producer.page
      .getByRole('button', { name: 'Save unpublished revision' })
      .click()
    await expect(
      producer.page.getByText('Unpublished public-content revision saved.'),
    ).toBeVisible()

    await owner.page.goto(
      `/app/${fixture.theaterSlug}/events/${fixture.eventSlug}`,
    )
    await waitForReactHandler(
      owner.page.getByRole('button', { name: 'Publish anonymous snapshot' }),
      'onClick',
    )
    await owner.page
      .getByRole('button', { name: 'Publish anonymous snapshot' })
      .click()
    await expect(
      owner.page.getByText('published', { exact: true }),
    ).toBeVisible()

    const anonymousPage = await anonymous.newPage()
    await anonymousPage.goto(
      `/theater/${fixture.theaterSlug}/${fixture.eventSlug}`,
    )
    await expect(
      anonymousPage.getByRole('heading', { name: 'Milestone Event Live' }),
    ).toBeVisible()
    await expect(
      anonymousPage.getByText(fixture.actors.cast.name),
    ).toBeVisible()
    await expect(anonymousPage.getByText('$18.00')).toBeVisible()
    await expect(
      anonymousPage.getByRole('link', { name: 'Get tickets' }),
    ).toHaveAttribute('href', 'https://tickets.example/milestone-event')
    await expect(anonymousPage.getByText('Proposal Revision')).toHaveCount(0)
    await expect(anonymousPage.getByText('Availability')).toHaveCount(0)

    const { data: state } = await fixture.admin
      .from('shows')
      .select('id, lifecycle_status, publication_status, operational_health')
      .eq('slug', fixture.eventSlug)
      .single()
    const { data: revisions } = await fixture.admin
      .from('show_proposal_revisions')
      .select('revision_number, decision_state')
      .eq('show_id', state!.id)
      .order('revision_number')
    expect(state).toMatchObject({
      lifecycle_status: 'approved',
      operational_health: 'on_track',
      publication_status: 'published',
    })
    expect(revisions).toEqual([
      {
        decision_state: 'counteroffered',
        revision_number: 1,
      },
      {
        decision_state: 'approved',
        revision_number: 2,
      },
    ])
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()))
    const { data: theater } = await fixture.admin
      .from('theaters')
      .select('id')
      .eq('slug', fixture.theaterSlug)
      .maybeSingle()
    if (theater) {
      await fixture.admin.from('theaters').delete().eq('id', theater.id)
    }
    await Promise.all(
      Object.values(fixture.actors).map((actor) =>
        fixture.admin.auth.admin.deleteUser(actor.userId),
      ),
    )
  }
})

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? testEnv.VITE_SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? testEnv.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? testEnv.SUPABASE_SERVICE_ROLE_KEY
  return supabaseUrl && anonKey && serviceRoleKey
    ? { anonKey, serviceRoleKey, supabaseUrl }
    : null
}

async function createFixture(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
): Promise<Fixture> {
  const admin = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const password = `Stagecom-${crypto.randomUUID()}`
  const actors = Object.fromEntries(
    await Promise.all(
      [
        ['owner', 'Milestone Owner'],
        ['producer', 'Milestone Producer'],
        ['director', 'Milestone Director'],
        ['cast', 'Milestone Cast'],
        ['reviewer', 'Milestone Reviewer'],
      ].map(async ([key, name]) => {
        const email = `milestone-${key}-${suffix}@example.com`
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          password,
          user_metadata: { full_name: name },
        })
        expect(error).toBeNull()
        return [key, { email, name, userId: data.user!.id }] as const
      }),
    ),
  ) as Fixture['actors']

  return {
    actors,
    admin,
    anonKey: config.anonKey,
    eventSlug: `milestone-event-${suffix}`,
    password,
    supabaseUrl: config.supabaseUrl,
    theaterSlug: `milestone-theater-${suffix}`,
  }
}

async function actorPage(browser: Browser, fixture: Fixture, actor: Actor) {
  const context = await browser.newContext()
  const auth = createClient<Database>(fixture.supabaseUrl, fixture.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await auth.auth.signInWithPassword({
    email: actor.email,
    password: fixture.password,
  })
  expect(error).toBeNull()
  await context.addCookies([
    {
      domain: 'localhost',
      httpOnly: true,
      name: 'stagecom-access-token',
      path: '/',
      sameSite: 'Lax',
      value: data.session!.access_token,
    },
  ])
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  return { context, page }
}

async function waitForReactHandler(locator: Locator, handlerName: string) {
  await expect
    .poll(() =>
      locator.evaluate(
        (element, name) =>
          Object.keys(element).some((key) => {
            if (!key.startsWith('__reactProps$')) return false
            const props = Reflect.get(element, key) as
              Record<string, unknown> | undefined
            return typeof props?.[name] === 'function'
          }),
        handlerName,
      ),
    )
    .toBe(true)
}
