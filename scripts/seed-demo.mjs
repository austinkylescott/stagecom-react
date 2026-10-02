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

const SECOND_DEMO_THEATER = {
  ...DEMO_THEATER,
  name: 'Harbor Stage',
  slug: 'harbor-stage',
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
  multi: {
    displayName: 'Casey Multi-Theater',
    email: 'multi@demo.stagecom.test',
  },
  invitee: {
    displayName: 'Indigo Invitee',
    email: 'invitee@demo.stagecom.test',
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
const event = await createDemoEvent(theater.id, personas, [
  personas.member,
  personas.multi,
  personas.producer,
])
const invitation = await supabase.rpc('invite_event_cast_member', {
  p_show_id: event.id,
  p_actor_user_id: personas.producer.id,
  p_member_user_id: personas.invitee.id,
})
throwIfError('create pending Cast invitation scenario', invitation.error)
const unscheduled = await supabase.rpc('create_managed_event', {
  p_actor_user_id: personas.producer.id,
  p_producer_user_ids: [],
  p_slug: 'an-evening-of-stories',
  p_theater_id: theater.id,
  p_title:
    'An Evening of Stories, Songs, and Unexpected Encounters from Across Our Community',
})
throwIfError('create unscheduled long-content Event', unscheduled.error)
await createDemoTeams(theater.id, personas)
await createCalendarReviewData(theater.id, personas)
await createDemoJoinLinks(theater.id, personas.owner.id)
const secondTheater = await createDemoTheater(personas, SECOND_DEMO_THEATER)
await createDemoEvent(secondTheater.id, personas, [personas.multi])
for (const [theaterId, persona] of [
  [theater.id, 'member'],
  [secondTheater.id, 'multi'],
]) {
  const { error } = await supabase.rpc('invite_theater_admin', {
    p_actor_user_id: personas.owner.id,
    p_command_id: crypto.randomUUID(),
    p_member_user_id: personas[persona].id,
    p_theater_id: theaterId,
  })
  throwIfError('create Callsheet response scenario', error)
}

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
  const { data: ownedTheaters, error: lookupError } = await supabase
    .from('theaters')
    .select('id')
    .in('slug', [DEMO_THEATER.slug, SECOND_DEMO_THEATER.slug])
  throwIfError('find owned demo Theaters', lookupError)
  if (ownedTheaters.length) {
    // Clear owned Teams before Theater membership cascades; keep reset scoped.
    const { error: teamError } = await supabase
      .from('theater_teams')
      .delete()
      .in(
        'theater_id',
        ownedTheaters.map((item) => item.id),
      )
    throwIfError('clear owned demo Teams', teamError)
    const { data: events, error } = await supabase
      .from('shows')
      .select('id')
      .in(
        'theater_id',
        ownedTheaters.map((item) => item.id),
      )
    throwIfError('find owned demo Events', error)
    if (events.length) {
      const { data: occurrences, error: occurrenceError } = await supabase
        .from('show_occurrences')
        .select('id')
        .in(
          'show_id',
          events.map((item) => item.id),
        )
      throwIfError('find owned demo Occurrences', occurrenceError)
      if (occurrences.length) {
        const { error: pollError } = await supabase
          .from('show_availability_polls')
          .delete()
          .in(
            'occurrence_id',
            occurrences.map((item) => item.id),
          )
        throwIfError('clear owned demo polls', pollError)
      }
      // Remove leadership while its Event still exists: its risk trigger reads that Event.
      const { error: leadershipError } = await supabase
        .from('show_leadership')
        .delete()
        .in(
          'show_id',
          events.map((item) => item.id),
        )
      throwIfError('clear owned demo Event leadership', leadershipError)
    }
  }
  const { error } = await supabase
    .from('theaters')
    .delete()
    .in('slug', [DEMO_THEATER.slug, SECOND_DEMO_THEATER.slug])

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

async function createDemoTheater(personas, theaterConfig = DEMO_THEATER) {
  const { data: createdRows, error: createError } = await supabase.rpc(
    'create_theater_with_owner',
    {
      p_actor_user_id: personas.owner.id,
      p_name: theaterConfig.name,
      p_slug: theaterConfig.slug,
      p_timezone: theaterConfig.timezone,
    },
  )
  throwIfError('create the demo Theater', createError)

  const theater = createdRows?.[0]
  if (!theater) throw new Error('The demo Theater was not returned.')

  const membershipRows = [
    { persona: 'admin', roles: ['admin'] },
    { persona: 'producer', roles: ['member'] },
    ...(theaterConfig.slug === DEMO_THEATER.slug
      ? [
          { persona: 'member', roles: ['member'] },
          { persona: 'invitee', roles: ['member'] },
        ]
      : []),
    { persona: 'multi', roles: ['member'] },
  ].map(({ persona, roles }) => ({
    is_home: theaterConfig.slug === DEMO_THEATER.slug,
    roles,
    status: 'active',
    theater_id: theater.id,
    user_id: personas[persona].id,
  }))
  const { error: membershipError } = await supabase
    .from('theater_memberships')
    .upsert(membershipRows, { onConflict: 'theater_id,user_id' })
  throwIfError('create demo Theater memberships', membershipError)

  if (theaterConfig.slug === DEMO_THEATER.slug) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ home_theater_id: theater.id })
      .in(
        'id',
        membershipRows.map(({ user_id }) => user_id),
      )
    throwIfError('set demo home Theaters', profileError)
  }

  const { error: setupError } = await supabase.rpc('update_theater_setup', {
    p_actor_user_id: personas.owner.id,
    p_changes: {
      city: theaterConfig.city,
      country: theaterConfig.country,
      name: theaterConfig.name,
      postalCode: theaterConfig.postalCode,
      slug: theaterConfig.slug,
      stateRegion: theaterConfig.stateRegion,
      street: theaterConfig.street,
      tagline: theaterConfig.tagline,
      timezone: theaterConfig.timezone,
      websiteUrl: theaterConfig.websiteUrl,
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

async function createDemoEvent(theaterId, personas, participants) {
  const { data: eventRows, error: eventError } = await supabase.rpc(
    'create_managed_event',
    {
      p_actor_user_id: personas.owner.id,
      p_director_user_id: personas.producer.id,
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
  const { data: occurrence, error: occurrenceError } = await supabase
    .from('show_occurrences')
    .insert({
      ends_at: endsAt.toISOString(),
      show_id: event.id,
      starts_at: startsAt.toISOString(),
      status: 'scheduled',
    })
    .select('id')
    .single()
  throwIfError('schedule the demo Event', occurrenceError)

  const { error: castError } = await supabase.from('show_cast').insert(
    participants.map((persona) => ({
      invited_by_user_id: personas.producer.id,
      note: 'Seeded cast membership for demo exploration.',
      show_id: event.id,
      source: 'invited',
      status: 'accepted',
      public_credit_enabled: false,
      user_id: persona.id,
    })),
  )
  throwIfError('add demo cast membership', castError)
  const localTime = startsAt.toISOString().slice(0, 19)
  const { data: slot, error: slotError } = await supabase
    .from('show_candidate_slots')
    .insert({
      occurrence_id: occurrence.id,
      starts_at: startsAt.toISOString(),
      local_starts_at: localTime,
      duration_minutes: 150,
      location_kind: 'off_site',
      location_name: 'Community Studio',
      off_site_approved: true,
      timezone_name: 'UTC',
      timezone_source: 'manual',
      utc_offset_minutes: 0,
    })
    .select('id')
    .single()
  throwIfError('create demo Confirmed Slot', slotError)
  const alternativeStartsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000)
  const { error: alternativeError } = await supabase
    .from('show_candidate_slots')
    .insert({
      occurrence_id: occurrence.id,
      starts_at: alternativeStartsAt.toISOString(),
      local_starts_at: alternativeStartsAt.toISOString().slice(0, 19),
      duration_minutes: 150,
      location_kind: 'off_site',
      location_name: 'Community Studio',
      off_site_approved: true,
      timezone_name: 'UTC',
      timezone_source: 'manual',
      utc_offset_minutes: 0,
      position: 1,
    })
  throwIfError('create alternative demo poll option', alternativeError)
  const { error: confirmError } = await supabase
    .from('show_occurrences')
    .update({ confirmed_candidate_slot_id: slot.id })
    .eq('id', occurrence.id)
  throwIfError('confirm demo Slot', confirmError)
  for (const persona of participants) {
    const { error } = await supabase.rpc('set_occurrence_call', {
      p_actor_user_id: personas.producer.id,
      p_call: 'required',
      p_command_id: crypto.randomUUID(),
      p_occurrence_id: occurrence.id,
      p_participant_user_id: persona.id,
    })
    throwIfError('assign demo Call', error)
  }

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

// Persisted Calendar review scenarios, confined to the owned demo Theater.
async function createCalendarReviewData(theaterId, personas) {
  const { data: theater, error: theaterError } = await supabase
    .from('theaters')
    .select('primary_venue_id')
    .eq('id', theaterId)
    .single()
  throwIfError('load demo venue', theaterError)
  const month = new Date()
  month.setUTCDate(1)
  month.setUTCHours(18, 0, 0, 0)
  const time = (day) => {
    const date = new Date(month)
    date.setUTCDate(day)
    return date.toISOString()
  }
  for (const [slug, title, day, kind] of [
    ['calendar-performance', 'Calendar Performance', 10, 'approved_commitment'],
    ['calendar-hold', 'Calendar Hold', 12, 'counteroffer_hold'],
  ]) {
    const created = await supabase.rpc('create_managed_event', {
      p_actor_user_id: personas.owner.id,
      p_producer_user_ids: [personas.producer.id],
      p_slug: slug,
      p_title: title,
      p_theater_id: theaterId,
    })
    throwIfError('create Calendar review Event', created.error)
    const showId = created.data[0].id
    const occurrenceResult = await supabase
      .from('show_occurrences')
      .insert({
        show_id: showId,
        occurrence_type: 'performance',
        starts_at: time(day),
        ends_at: new Date(Date.parse(time(day)) + 90 * 60_000).toISOString(),
      })
      .select('id')
      .single()
    throwIfError('create Calendar review Occurrence', occurrenceResult.error)
    const occurrenceId = occurrenceResult.data.id
    const slotResult = await supabase
      .from('show_candidate_slots')
      .insert({
        occurrence_id: occurrenceId,
        starts_at: time(day),
        local_starts_at: time(day).slice(0, 19),
        duration_minutes: 90,
        location_kind: 'primary_venue',
        resource_id: theater.primary_venue_id,
        location_name: 'Compass Rose Mainstage',
        timezone_name: 'UTC',
        timezone_source: 'manual',
        utc_offset_minutes: 0,
      })
      .select('id')
      .single()
    throwIfError('create Calendar review Slot', slotResult.error)
    const slotId = slotResult.data.id
    const revisionResult = await supabase
      .from('show_proposal_revisions')
      .insert({
        show_id: showId,
        revision_number: 1,
        submitted_by: personas.producer.id,
        command_id: crypto.randomUUID(),
        decision_state:
          kind === 'approved_commitment' ? 'approved' : 'counteroffered',
        snapshot: {
          title,
          occurrences: [
            {
              id: occurrenceId,
              type: 'performance',
              confirmedSlot: {
                id: slotId,
                startsAt: time(day),
                durationMinutes: 90,
                locationName: 'Compass Rose Mainstage',
              },
            },
          ],
        },
      })
      .select('id')
      .single()
    throwIfError('create Calendar review Revision', revisionResult.error)
    const revisionId = revisionResult.data.id
    let counterofferId = null
    if (kind === 'counteroffer_hold') {
      const offer = await supabase
        .from('show_counteroffers')
        .insert({
          proposal_revision_id: revisionId,
          occurrence_id: occurrenceId,
          candidate_slot_id: slotId,
          actor_user_id: personas.owner.id,
          command_id: crypto.randomUUID(),
          response_deadline: new Date(
            Date.now() + 48 * 60 * 60_000,
          ).toISOString(),
        })
        .select('id')
        .single()
      throwIfError('create Calendar review hold', offer.error)
      counterofferId = offer.data.id
    } else {
      const confirmed = await supabase
        .from('show_occurrences')
        .update({ confirmed_candidate_slot_id: slotId })
        .eq('id', occurrenceId)
      throwIfError('confirm Calendar review Slot', confirmed.error)
    }
    const state = await supabase
      .from('shows')
      .update({
        lifecycle_status:
          kind === 'approved_commitment' ? 'approved' : 'in_review',
        approved_proposal_revision_id:
          kind === 'approved_commitment' ? revisionId : null,
      })
      .eq('id', showId)
    throwIfError('set Calendar review lifecycle', state.error)
    const reservation = await supabase
      .from('show_schedule_reservations')
      .insert({
        theater_id: theaterId,
        resource_id: theater.primary_venue_id,
        show_id: showId,
        occurrence_id: occurrenceId,
        candidate_slot_id: slotId,
        kind,
        proposal_revision_id:
          kind === 'approved_commitment' ? revisionId : null,
        counteroffer_id: counterofferId,
        reserved_during: `[${new Date(Date.parse(time(day)) - 60 * 60_000).toISOString()},${new Date(Date.parse(time(day)) + 120 * 60_000).toISOString()})`,
      })
    throwIfError('create Calendar review reservation', reservation.error)
  }
  const block = await supabase.rpc('create_schedule_block', {
    p_actor_user_id: personas.owner.id,
    p_command_id: crypto.randomUUID(),
    p_theater_id: theaterId,
    p_starts_at: time(14),
    p_ends_at: new Date(Date.parse(time(14)) + 60 * 60_000).toISOString(),
    p_private_label: 'Calendar maintenance',
    p_private_notes: 'Private review notes.',
  })
  throwIfError('create Calendar review Schedule Block', block.error)
}

async function createDemoTeams(theaterId, personas) {
  const actor = createClient(
    supabaseUrl,
    requireEnv('VITE_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const clients = {}
  for (const key of ['producer', 'member', 'multi']) {
    const client =
      key === 'producer'
        ? actor
        : createClient(supabaseUrl, requireEnv('VITE_SUPABASE_ANON_KEY'), {
            auth: { persistSession: false, autoRefreshToken: false },
          })
    const login = await client.auth.signInWithPassword({
      email: DEMO_PERSONAS[key].email,
      password: demoPassword,
    })
    throwIfError('sign in disposable Team persona', login.error)
    clients[key] = client
  }
  for (const [name, recipients] of [
    ['Ants 2 Gods', ['member', 'multi']],
    ['The Management', ['multi']],
    ['Authority Review Team', ['member', 'multi']],
  ]) {
    const id = crypto.randomUUID()
    const created = await actor.rpc('manage_team', {
      p_theater_id: theaterId,
      p_action: 'create',
      p_input: { name },
      p_command_id: id,
    })
    throwIfError('create demo Team', created.error)
    let version = 1
    for (const recipient of recipients) {
      const invited = await actor.rpc('manage_team', {
        p_theater_id: theaterId,
        p_action: 'invite',
        p_input: {
          teamId: id,
          memberUserId: personas[recipient].id,
          expectedVersion: version++,
        },
        p_command_id: crypto.randomUUID(),
      })
      throwIfError('invite demo Team Member', invited.error)
      const accepted = await clients[recipient].rpc('manage_team', {
        p_theater_id: theaterId,
        p_action: 'respond',
        p_input: {
          teamId: id,
          response: 'accepted',
          expectedVersion: version++,
        },
        p_command_id: crypto.randomUUID(),
      })
      throwIfError('accept demo Team invitation', accepted.error)
    }
    if (name === 'The Management') {
      for (const [offer, response] of [
        ['offer_admin', 'respond_admin'],
        ['offer_recovery', 'respond_recovery'],
      ]) {
        const offered = await actor.rpc('manage_team', {
          p_theater_id: theaterId,
          p_action: offer,
          p_input: {
            teamId: id,
            memberUserId: personas.multi.id,
            expectedVersion: version++,
          },
          p_command_id: crypto.randomUUID(),
        })
        throwIfError('offer demo Team authority', offered.error)
        const consent = await clients.multi.rpc('manage_team', {
          p_theater_id: theaterId,
          p_action: response,
          p_input: {
            teamId: id,
            response: 'accepted',
            expectedVersion: version++,
          },
          p_command_id: crypto.randomUUID(),
        })
        throwIfError('accept demo Team authority', consent.error)
      }
    }
  }
}
