import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

import type { BrowserContext } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/server/db/database.types'

const testEnv = loadEnv('development', process.cwd(), '')

type Fixture = {
  admin: SupabaseClient<Database>
  anonKey: string
  memberEmail: string
  memberUserId: string
  ownerEmail: string
  ownerPassword: string
  ownerUserId: string
  supabaseUrl: string
  theaterId: string
  theaterSlug: string
}

test('Owner governs Producer eligibility and creates an explicit managed Event team', async ({
  context,
  page,
}) => {
  test.setTimeout(120_000)
  const config = getRemoteSupabaseConfig()

  test.skip(!config, 'Remote Supabase credentials are required.')
  const fixture = await createFixture(config!)

  try {
    const { error: deniedError } = await fixture.admin.rpc(
      'create_managed_event',
      {
        p_actor_user_id: fixture.memberUserId,
        p_producer_user_ids: [],
        p_slug: 'denied-event',
        p_theater_id: fixture.theaterId,
        p_title: 'Denied Event',
      },
    )

    expect(deniedError?.code).toBe('42501')

    await signInBrowser(context, fixture)
    await page.goto(`/app/${fixture.theaterSlug}/settings`)
    await page.waitForTimeout(500)
    await page
      .getByLabel('Producer eligibility')
      .selectOption('designated_proposers')
    await page.getByLabel('Counteroffer response window (hours)').fill('96')
    await page.getByLabel('Primary Venue name').fill('Main Stage')
    await page.getByLabel('Setup buffer (minutes)').fill('30')
    await page.getByLabel('Turnover buffer (minutes)').fill('45')
    await page.getByLabel('Allow audited Owner self-approval').check()
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/_serverFn/'),
      ),
      page.getByRole('button', { name: 'Save Event governance' }).click(),
    ])
    await expect(page.getByText('Governance saved.')).toBeVisible()

    const memberCard = page
      .locator('article')
      .filter({ hasText: 'Governed Member' })
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/_serverFn/'),
      ),
      memberCard.getByRole('button', { name: 'Designate proposer' }).click(),
    ])
    await expect(
      memberCard.getByRole('button', { name: 'Remove proposer' }),
    ).toBeVisible()

    await page.goto(`/app/${fixture.theaterSlug}/events/new`)
    await page.waitForTimeout(500)
    await page.getByLabel('Event title').fill('Summer Hamlet')
    await expect(page.getByLabel('Event slug')).toHaveValue('summer-hamlet')
    await page.getByRole('checkbox', { name: 'Governed Member' }).check()
    await page.getByLabel('Director').selectOption(fixture.memberUserId)
    await page.getByRole('button', { name: 'Create Event draft' }).click()

    await expect(page).toHaveURL(
      new RegExp(`/app/${fixture.theaterSlug}/events/summer-hamlet$`),
    )
    await page.waitForTimeout(500)
    await expect(page.getByText('Cast Members: 0.')).toBeVisible()
    await expect(page.getByText('Lifecycle').locator('..')).toContainText(
      'draft',
    )
    await expect(page.getByText('Publication').locator('..')).toContainText(
      'unpublished',
    )
    await expect(
      page.getByText('Operational health').locator('..'),
    ).toContainText('on_track')

    await page.getByLabel('Target cast size').fill('8')
    await page.getByLabel('Minimum Viable Cast').fill('5')
    await expect(page.getByLabel('Target cast size')).toHaveValue('8')
    await expect(page.getByLabel('Minimum Viable Cast')).toHaveValue('5')
    await page.getByRole('button', { name: 'Add Occurrence' }).click()
    await page.getByLabel('Occurrence 1 type').selectOption('performance')
    await page.getByLabel('Occurrence 1 visibility').selectOption('public')
    await page.getByRole('button', { name: 'Add Candidate Slot' }).click()
    await page.getByLabel('Local date and time').fill('2026-08-15T19:30')
    await page.getByLabel('Duration (minutes)').fill('90')
    await page.getByLabel('Confirm this Slot').check()
    await page.getByRole('button', { name: 'Add Candidate Slot' }).click()
    await page.getByLabel('Local date and time').nth(1).fill('2026-08-16T19:30')
    await page.getByLabel('Location type').nth(1).selectOption('off_site')
    await page
      .getByLabel('Location', { exact: true })
      .nth(1)
      .fill('Community Hall')
    await page.getByRole('button', { name: 'Add requested resource' }).click()
    await page.getByLabel('Resource 1 type').selectOption('equipment')
    await page.getByLabel('Requested resource').fill('Wireless microphones')
    await page.getByLabel('Quantity').fill('4')
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/_serverFn/'),
      ),
      page.getByRole('button', { name: 'Save operational plan' }).click(),
    ])
    await expect(page.getByText('Plan saved.')).toBeVisible()

    const { data: managedEvent, error: eventError } = await fixture.admin
      .from('shows')
      .select('id, lifecycle_status, publication_status, operational_health')
      .eq('theater_id', fixture.theaterId)
      .eq('slug', 'summer-hamlet')
      .single()
    const { data: theater } = await fixture.admin
      .from('theaters')
      .select('primary_venue_id')
      .eq('id', fixture.theaterId)
      .single()
    const { data: leadership } = await fixture.admin
      .from('show_leadership')
      .select('user_id, role')
      .eq('show_id', managedEvent!.id)
    const { data: occurrences } = await fixture.admin
      .from('show_occurrences')
      .select(
        'occurrence_type, visibility, confirmed_candidate_slot_id, show_candidate_slots!show_candidate_slots_occurrence_id_fkey(starts_at, duration_minutes, timezone_name, utc_offset_minutes, location_kind, resource_id, location_name, off_site_approved)',
      )
      .eq('show_id', managedEvent!.id)
    const { data: resourceRequests } = await fixture.admin
      .from('show_resource_requests')
      .select('resource_type, label, quantity')
      .eq('show_id', managedEvent!.id)
    const { count: castCount } = await fixture.admin
      .from('show_cast')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', managedEvent!.id)
    const { data: activity } = await fixture.admin
      .from('activity_events')
      .select('action')
      .eq('theater_id', fixture.theaterId)
      .in('action', [
        'theater.governance.updated',
        'theater.capability.granted',
        'event.created',
        'event.role.assigned',
        'event.operational_plan.updated',
      ])

    expect(eventError).toBeNull()
    expect(theater?.primary_venue_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(managedEvent).toMatchObject({
      lifecycle_status: 'draft',
      operational_health: 'on_track',
      publication_status: 'unpublished',
    })
    expect(leadership).toEqual(
      expect.arrayContaining([
        { role: 'producer', user_id: fixture.ownerUserId },
        { role: 'producer', user_id: fixture.memberUserId },
        { role: 'director', user_id: fixture.memberUserId },
      ]),
    )
    expect(castCount).toBe(0)
    expect(occurrences).toHaveLength(1)
    expect(occurrences?.[0]).toMatchObject({
      occurrence_type: 'performance',
      visibility: 'public',
    })
    expect(occurrences?.[0]?.confirmed_candidate_slot_id).toBeTruthy()
    expect(occurrences?.[0]?.show_candidate_slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          duration_minutes: 90,
          location_kind: 'primary_venue',
          resource_id: theater?.primary_venue_id,
          timezone_name: 'America/New_York',
          utc_offset_minutes: -240,
        }),
        expect.objectContaining({
          location_kind: 'off_site',
          location_name: 'Community Hall',
          off_site_approved: true,
          resource_id: null,
        }),
      ]),
    )
    expect(resourceRequests).toEqual([
      {
        label: 'Wireless microphones',
        quantity: 4,
        resource_type: 'equipment',
      },
    ])
    expect(activity?.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'theater.governance.updated',
        'theater.capability.granted',
        'event.created',
        'event.role.assigned',
        'event.operational_plan.updated',
      ]),
    )

    const memberAuth = createClient<Database>(
      fixture.supabaseUrl,
      fixture.anonKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { error: memberSignInError } =
      await memberAuth.auth.signInWithPassword({
        email: fixture.memberEmail,
        password: fixture.ownerPassword,
      })
    const { data: eligibleAuthority } = await memberAuth.rpc(
      'is_show_producer',
      { p_show_id: managedEvent!.id },
    )

    expect(memberSignInError).toBeNull()
    expect(eligibleAuthority).toBe(true)

    const { error: revokeError } = await fixture.admin.rpc(
      'set_theater_member_capability',
      {
        p_actor_user_id: fixture.ownerUserId,
        p_capability: 'proposer',
        p_enabled: false,
        p_theater_id: fixture.theaterId,
        p_user_id: fixture.memberUserId,
      },
    )
    const { data: revokedAuthority } = await memberAuth.rpc(
      'is_show_producer',
      { p_show_id: managedEvent!.id },
    )

    expect(revokeError).toBeNull()
    expect(revokedAuthority).toBe(false)
  } finally {
    await deleteFixture(fixture)
  }
})

function getRemoteSupabaseConfig() {
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
  config: NonNullable<ReturnType<typeof getRemoteSupabaseConfig>>,
): Promise<Fixture> {
  const admin = createClient<Database>(
    config.supabaseUrl,
    config.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const suffix = crypto.randomUUID()
  const ownerEmail = `governance-owner-${suffix}@example.com`
  const memberEmail = `governed-member-${suffix}@example.com`
  const ownerPassword = `Stagecom-${crypto.randomUUID()}`
  const theaterSlug = `governed-stage-${suffix}`
  const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    email_confirm: true,
    password: ownerPassword,
    user_metadata: { full_name: 'Governance Owner' },
  })
  const { data: member, error: memberError } =
    await admin.auth.admin.createUser({
      email: memberEmail,
      email_confirm: true,
      password: ownerPassword,
      user_metadata: { full_name: 'Governed Member' },
    })

  expect(ownerError).toBeNull()
  expect(memberError).toBeNull()
  const { data: theaters, error: theaterError } = await admin.rpc(
    'create_theater_with_owner',
    {
      p_actor_user_id: owner.user!.id,
      p_name: 'Governed Stage',
      p_slug: theaterSlug,
      p_timezone: 'America/New_York',
    },
  )

  expect(theaterError).toBeNull()
  const theaterId = theaters![0].id
  const { error: membershipError } = await admin
    .from('theater_memberships')
    .insert({
      roles: ['member'],
      status: 'active',
      theater_id: theaterId,
      user_id: member.user!.id,
    })

  expect(membershipError).toBeNull()
  return {
    admin,
    anonKey: config.anonKey,
    memberEmail,
    memberUserId: member.user!.id,
    ownerEmail,
    ownerPassword,
    ownerUserId: owner.user!.id,
    supabaseUrl: config.supabaseUrl,
    theaterId,
    theaterSlug,
  }
}

async function signInBrowser(context: BrowserContext, fixture: Fixture) {
  const browserAuth = createClient<Database>(
    fixture.supabaseUrl,
    fixture.anonKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data, error } = await browserAuth.auth.signInWithPassword({
    email: fixture.ownerEmail,
    password: fixture.ownerPassword,
  })

  expect(error).toBeNull()
  await context.addCookies([
    {
      name: 'stagecom-access-token',
      value: data.session!.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

async function deleteFixture(fixture: Fixture) {
  await fixture.admin.from('theaters').delete().eq('id', fixture.theaterId)
  await fixture.admin.auth.admin.deleteUser(fixture.memberUserId)
  await fixture.admin.auth.admin.deleteUser(fixture.ownerUserId)
}
