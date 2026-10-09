import type { StagecomSupabaseClient } from '@/server/supabase/client'

/** Disposable local-only actors; cleanup never touches pre-existing data. */
export async function createInvitationFixture(admin: StagecomSupabaseClient) {
  const suffix = crypto.randomUUID()
  const password = `Stagecom-${suffix}`
  const users: string[] = []
  const theaters: string[] = []
  async function cleanup() {
    for (const id of theaters)
      await admin.from('theaters').delete().eq('id', id)
    for (const id of users) await admin.auth.admin.deleteUser(id)
  }
  function check<T>(result: { data: T; error: { message: string } | null }): T {
    if (result.error) throw new Error(result.error.message)
    return result.data
  }
  try {
    for (const role of ['owner', 'recipient', 'other']) {
      const result = await admin.auth.admin.createUser({
        email: `${role}-${suffix}@example.com`,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: role === 'owner' ? 'Alex Rivera' : role,
        },
      })
      if (result.error) throw new Error(result.error.message)
      users.push(result.data.user.id)
    }
    const ownerId = users[0],
      recipientId = users[1],
      otherId = users[2]
    check(
      await admin
        .from('profiles')
        .update({ display_name: 'Alex Rivera' })
        .eq('id', ownerId),
    )
    const theater = check(
      await admin.rpc('create_theater_with_owner', {
        p_actor_user_id: ownerId,
        p_name: 'Invitation Theater',
        p_slug: `invitation-${suffix}`,
        p_timezone: 'America/New_York',
      }),
    )![0]
    theaters.push(theater.id)
    check(
      await admin.from('theater_memberships').insert(
        [recipientId, otherId].map((user_id) => ({
          theater_id: theater.id,
          user_id,
          roles: ['member' as const],
          status: 'active' as const,
        })),
      ),
    )
    const adminInvitation = check(
      await admin.rpc('invite_theater_admin', {
        p_actor_user_id: ownerId,
        p_command_id: crypto.randomUUID(),
        p_member_user_id: recipientId,
        p_theater_id: theater.id,
      }),
    )
    const transfer = check(
      await admin.rpc('propose_theater_ownership_transfer', {
        p_actor_user_id: ownerId,
        p_command_id: crypto.randomUUID(),
        p_member_user_id: recipientId,
        p_theater_id: theater.id,
        p_former_owner_role: 'member',
      }),
    )
    if (!adminInvitation || !transfer)
      throw new Error('Invitation offers were not created')
    const event = check(
      await admin.rpc('create_managed_event', {
        p_actor_user_id: ownerId,
        p_director_user_id: ownerId,
        p_producer_user_ids: [],
        p_slug: 'invited-event',
        p_title: 'Opening Night',
        p_theater_id: theater.id,
      }),
    )![0]
    const staff = check(
      await admin
        .from('show_staff_assignments')
        .insert({
          show_id: event.id,
          user_id: recipientId,
          assignment_type: 'other',
          responsibility: 'Front of house',
          status: 'pending',
          invited_by_user_id: ownerId,
          invited_at: '2026-10-07T14:00:00Z',
          note: 'Private operator note',
        })
        .select('id')
        .single(),
    )!
    // Sensitive planning and Cast data exist, but pending Staff must never receive them.
    check(
      await admin.from('show_cast').insert({
        show_id: event.id,
        user_id: otherId,
        status: 'accepted',
        source: 'invited',
        public_credit_enabled: false,
      }),
    )
    const privateOccurrence = check(
      await admin
        .from('show_occurrences')
        .insert({ show_id: event.id, occurrence_type: 'rehearsal' })
        .select('id')
        .single(),
    )!
    check(
      await admin.from('show_candidate_slots').insert({
        occurrence_id: privateOccurrence.id,
        starts_at: '2026-12-01T14:00:00Z',
        duration_minutes: 90,
        location_kind: 'off_site',
        off_site_approved: true,
        location_name: 'Private planning studio',
        timezone_name: 'UTC',
        timezone_source: 'manual',
        local_starts_at: '2026-12-01T14:00:00',
        utc_offset_minutes: 0,
      }),
    )
    // A separate accepted Event proves responses do not erase existing Calls.
    const calledEvent = check(
      await admin.rpc('create_managed_event', {
        p_actor_user_id: ownerId,
        p_director_user_id: ownerId,
        p_producer_user_ids: [],
        p_slug: 'confirmed-event',
        p_title: 'Confirmed Rehearsal Event',
        p_theater_id: theater.id,
      }),
    )![0]
    check(
      await admin.from('show_cast').insert({
        show_id: calledEvent.id,
        user_id: recipientId,
        public_credit_enabled: false,
        status: 'accepted',
        source: 'invited',
        invited_by_user_id: ownerId,
      }),
    )
    const occurrence = check(
      await admin
        .from('show_occurrences')
        .insert({
          show_id: calledEvent.id,
          occurrence_type: 'rehearsal',
          status: 'scheduled',
        })
        .select('id')
        .single(),
    )!
    const startsAt = new Date(Date.now() + 7 * 86400000).toISOString()
    const slot = check(
      await admin
        .from('show_candidate_slots')
        .insert({
          occurrence_id: occurrence.id,
          starts_at: startsAt,
          duration_minutes: 90,
          location_kind: 'off_site',
          off_site_approved: true,
          location_name: 'Studio',
          timezone_name: 'UTC',
          timezone_source: 'manual',
          local_starts_at: startsAt.slice(0, 19),
          utc_offset_minutes: 0,
        })
        .select('id')
        .single(),
    )!
    check(
      await admin
        .from('show_occurrences')
        .update({ confirmed_candidate_slot_id: slot.id })
        .eq('id', occurrence.id),
    )
    check(
      await admin.rpc('set_occurrence_call', {
        p_actor_user_id: ownerId,
        p_call: 'required',
        p_command_id: crypto.randomUUID(),
        p_occurrence_id: occurrence.id,
        p_participant_user_id: recipientId,
      }),
    )
    return {
      adminInvitation,
      transfer,
      staffId: staff.id,
      eventId: event.id,
      theaterId: theater.id,
      theaterSlug: theater.slug,
      ownerId,
      recipientId,
      otherId,
      email: `recipient-${suffix}@example.com`,
      otherEmail: `other-${suffix}@example.com`,
      password,
      cleanup,
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
