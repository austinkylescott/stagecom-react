import { createHash } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

const DEMO_THEATER = {
  city: 'New Haven',
  country: 'United States',
  name: 'Compass Rose Players',
  postalCode: '06510',
  slug: 'compass-rose',
  stateRegion: 'Connecticut',
  street: '24 Crown Street',
  tagline: 'Adventurous theater, made together.',
  timezone: 'America/New_York',
  websiteUrl: 'https://example.com/compass-rose',
}

const DEMO_EVENT = {
  slug: 'a-midsummer-nights-dream',
  title: "A Midsummer Night's Dream",
}

const DEMO_PERSONAS = {
  owner: {
    displayName: 'Olivia Owner',
    email: 'owner@demo.stagecom.test',
  },
  admin: {
    displayName: 'Avery Admin',
    email: 'admin@demo.stagecom.test',
  },
  producer: {
    displayName: 'Parker Producer',
    email: 'producer@demo.stagecom.test',
  },
  member: {
    displayName: 'Morgan Member',
    email: 'member@demo.stagecom.test',
  },
  newcomer: {
    displayName: 'Noah Newcomer',
    email: 'newcomer@demo.stagecom.test',
  },
}

const DEMO_JOIN_LINKS = {
  active: 'stagecom-demo-active-join-token-2026',
  exhausted: 'stagecom-demo-exhausted-join-token-2026',
  expired: 'stagecom-demo-expired-join-token-2026',
  revoked: 'stagecom-demo-revoked-join-token-2026',
}

const args = new Set(process.argv.slice(2))
const resetOnly = args.has('--reset-only')
const allowRemote = args.has('--allow-remote')
const fileEnv = loadEnv('development', process.cwd(), '')
const env = { ...fileEnv, ...process.env }
const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const demoPassword = requireEnv('STAGECOM_DEMO_PASSWORD')
const appUrl = env.VITE_APP_URL || 'http://localhost:3000'
const parsedSupabaseUrl = new URL(supabaseUrl)
const isLocal = ['127.0.0.1', 'localhost'].includes(parsedSupabaseUrl.hostname)

if (env.STAGECOM_DEMO_MODE !== 'true') {
  throw new Error(
    'Set STAGECOM_DEMO_MODE=true before seeding or resetting demo data.',
  )
}

if (!isLocal && !allowRemote) {
  throw new Error(
    'Refusing to change a remote Supabase project. Re-run with --allow-remote only for a dedicated demo project.',
  )
}

if (demoPassword.length < 12) {
  throw new Error('STAGECOM_DEMO_PASSWORD must contain at least 12 characters.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

await clearDemoTheater()

if (resetOnly) {
  await deleteDemoUsers()
  console.log('Removed the Compass Rose demo Theater and demo personas.')
  process.exit(0)
}

const personas = await ensureDemoUsers()
const theater = await createDemoTheater(personas)
const event = await createDemoEvent(theater.id, personas)
await createDemoJoinLinks(theater.id, personas.owner.id)

console.log(`
Stagecom demo seeded successfully.

Persona chooser:
  ${appUrl}/login

Owner workspace:
  ${appUrl}/app/${DEMO_THEATER.slug}/members

Seeded Event:
  ${appUrl}/app/${DEMO_THEATER.slug}/events/${DEMO_EVENT.slug}

Join Link states:
  active:    ${appUrl}/join-link/${DEMO_JOIN_LINKS.active}
  expired:   ${appUrl}/join-link/${DEMO_JOIN_LINKS.expired}
  exhausted: ${appUrl}/join-link/${DEMO_JOIN_LINKS.exhausted}
  revoked:   ${appUrl}/join-link/${DEMO_JOIN_LINKS.revoked}

Created Event ID: ${event.id}
`)

function requireEnv(name) {
  const value = env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

async function clearDemoTheater() {
  const { error } = await supabase
    .from('theaters')
    .delete()
    .eq('slug', DEMO_THEATER.slug)

  throwIfError('clear the existing demo Theater', error)
}

async function deleteDemoUsers() {
  const users = await listAllUsers()
  const demoEmails = new Set(
    Object.values(DEMO_PERSONAS).map(({ email }) => email),
  )

  for (const user of users) {
    if (!user.email || !demoEmails.has(user.email)) continue

    const { error } = await supabase.auth.admin.deleteUser(user.id)
    throwIfError(`delete demo user ${user.email}`, error)
  }
}

async function ensureDemoUsers() {
  const existingUsers = await listAllUsers()
  const personas = {}

  for (const [key, persona] of Object.entries(DEMO_PERSONAS)) {
    const existing = existingUsers.find(({ email }) => email === persona.email)

    if (existing) {
      const { data, error } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          email_confirm: true,
          password: demoPassword,
          user_metadata: { display_name: persona.displayName },
        },
      )
      throwIfError(`update demo user ${persona.email}`, error)
      personas[key] = data.user
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: persona.email,
        email_confirm: true,
        password: demoPassword,
        user_metadata: { display_name: persona.displayName },
      })
      throwIfError(`create demo user ${persona.email}`, error)
      personas[key] = data.user
    }
  }

  const profileRows = Object.entries(DEMO_PERSONAS).map(([key, persona]) => ({
    display_name: persona.displayName,
    id: personas[key].id,
  }))
  const { error } = await supabase.from('profiles').upsert(profileRows)
  throwIfError('synchronize demo profiles', error)

  return personas
}

async function listAllUsers() {
  const users = []
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1_000,
    })
    throwIfError('list Auth users', error)
    users.push(...data.users)

    if (data.users.length < 1_000) return users
    page += 1
  }
}

async function createDemoTheater(personas) {
  const { data: createdRows, error: createError } = await supabase.rpc(
    'create_theater_with_owner',
    {
      p_actor_user_id: personas.owner.id,
      p_name: DEMO_THEATER.name,
      p_slug: DEMO_THEATER.slug,
      p_timezone: DEMO_THEATER.timezone,
    },
  )
  throwIfError('create the demo Theater', createError)

  const theater = createdRows?.[0]
  if (!theater) throw new Error('The demo Theater was not returned.')

  const membershipRows = [
    { persona: 'admin', roles: ['admin'] },
    { persona: 'producer', roles: ['member'] },
    { persona: 'member', roles: ['member'] },
  ].map(({ persona, roles }) => ({
    is_home: true,
    roles,
    status: 'active',
    theater_id: theater.id,
    user_id: personas[persona].id,
  }))
  const { error: membershipError } = await supabase
    .from('theater_memberships')
    .upsert(membershipRows, { onConflict: 'theater_id,user_id' })
  throwIfError('create demo Theater memberships', membershipError)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ home_theater_id: theater.id })
    .in(
      'id',
      membershipRows.map(({ user_id }) => user_id),
    )
  throwIfError('set demo home Theaters', profileError)

  const { error: setupError } = await supabase.rpc('update_theater_setup', {
    p_actor_user_id: personas.owner.id,
    p_changes: {
      city: DEMO_THEATER.city,
      country: DEMO_THEATER.country,
      name: DEMO_THEATER.name,
      postalCode: DEMO_THEATER.postalCode,
      slug: DEMO_THEATER.slug,
      stateRegion: DEMO_THEATER.stateRegion,
      street: DEMO_THEATER.street,
      tagline: DEMO_THEATER.tagline,
      timezone: DEMO_THEATER.timezone,
      websiteUrl: DEMO_THEATER.websiteUrl,
    },
    p_theater_id: theater.id,
  })
  throwIfError('complete demo Theater setup', setupError)

  const { error: governanceError } = await supabase.rpc(
    'update_theater_governance',
    {
      p_actor_user_id: personas.owner.id,
      p_counteroffer_response_hours: 48,
      p_owner_self_approval_enabled: false,
      p_primary_venue_name: 'Compass Rose Mainstage',
      p_producer_eligibility: 'all_members',
      p_setup_buffer_minutes: 60,
      p_theater_id: theater.id,
      p_turnover_buffer_minutes: 30,
    },
  )
  throwIfError('configure demo Theater governance', governanceError)

  const { error: publishError } = await supabase.rpc('publish_theater', {
    p_actor_user_id: personas.owner.id,
    p_theater_id: theater.id,
  })
  throwIfError('publish the demo Theater', publishError)

  return theater
}

async function createDemoEvent(theaterId, personas) {
  const { data: eventRows, error: eventError } = await supabase.rpc(
    'create_managed_event',
    {
      p_actor_user_id: personas.owner.id,
      p_director_user_id: personas.member.id,
      p_producer_user_ids: [personas.producer.id],
      p_slug: DEMO_EVENT.slug,
      p_theater_id: theaterId,
      p_title: DEMO_EVENT.title,
    },
  )
  throwIfError('create the demo Event', eventError)

  const event = eventRows?.[0]
  if (!event) throw new Error('The demo Event was not returned.')

  const { error: descriptionError } = await supabase
    .from('shows')
    .update({
      casting_mode: 'direct_invite',
      description:
        'A playful outdoor production being prepared for its first governance review.',
    })
    .eq('id', event.id)
  throwIfError('add demo Event details', descriptionError)

  const startsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)
  startsAt.setUTCHours(23, 0, 0, 0)
  const endsAt = new Date(startsAt.getTime() + 1000 * 60 * 150)
  const { error: occurrenceError } = await supabase
    .from('show_occurrences')
    .insert({
      ends_at: endsAt.toISOString(),
      show_id: event.id,
      starts_at: startsAt.toISOString(),
      status: 'scheduled',
    })
  throwIfError('schedule the demo Event', occurrenceError)

  const { error: castError } = await supabase.from('show_cast').insert({
    invited_by_user_id: personas.producer.id,
    note: 'Seeded cast membership for demo exploration.',
    show_id: event.id,
    source: 'invited',
    status: 'accepted',
    user_id: personas.member.id,
  })
  throwIfError('add demo cast membership', castError)

  return event
}

async function createDemoJoinLinks(theaterId, ownerUserId) {
  const futureExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

  await createJoinLink({
    maxUses: 5,
    ownerUserId,
    theaterId,
    token: DEMO_JOIN_LINKS.active,
  })
  const expired = await createJoinLink({
    expiresAt: futureExpiry.toISOString(),
    ownerUserId,
    theaterId,
    token: DEMO_JOIN_LINKS.expired,
  })
  const exhausted = await createJoinLink({
    maxUses: 1,
    ownerUserId,
    theaterId,
    token: DEMO_JOIN_LINKS.exhausted,
  })
  const revoked = await createJoinLink({
    ownerUserId,
    theaterId,
    token: DEMO_JOIN_LINKS.revoked,
  })

  const { error: expiredError } = await supabase
    .from('theater_join_links')
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', expired.id)
  throwIfError('expire the demo Join Link', expiredError)

  const { error: exhaustedError } = await supabase
    .from('theater_join_links')
    .update({ use_count: 1 })
    .eq('id', exhausted.id)
  throwIfError('exhaust the demo Join Link', exhaustedError)

  const { error: revokedError } = await supabase.rpc(
    'revoke_reusable_theater_join_link',
    {
      p_actor_user_id: ownerUserId,
      p_join_link_id: revoked.id,
    },
  )
  throwIfError('revoke the demo Join Link', revokedError)
}

async function createJoinLink({
  expiresAt,
  maxUses,
  ownerUserId,
  theaterId,
  token,
}) {
  const { data, error } = await supabase.rpc(
    'create_reusable_theater_join_link',
    {
      p_actor_user_id: ownerUserId,
      p_expires_at: expiresAt,
      p_max_uses: maxUses,
      p_theater_id: theaterId,
      p_token_hash: createHash('sha256').update(token).digest('hex'),
    },
  )
  throwIfError(`create demo Join Link ${token}`, error)

  const link = data?.[0]
  if (!link) throw new Error(`Demo Join Link ${token} was not returned.`)
  return link
}

function throwIfError(action, error) {
  if (!error) return

  throw new Error(`Could not ${action}: ${error.message}`)
}
