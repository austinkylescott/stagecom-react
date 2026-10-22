import type { StagecomSupabaseClient } from '@/server/supabase/client'

/** Local-only disposable Calls, including both sides of the fall DST transition. */
export async function createCallFixture(admin: StagecomSupabaseClient) {
  const suffix = crypto.randomUUID()
  const password = `Stagecom-${suffix}`
  const users: string[] = []
  const theaters: Array<{ id: string; slug: string }> = []
  const calls: Array<{
    id: string
    startsAt: string
    requirement: 'required' | 'optional'
    occurrenceType: 'rehearsal' | 'performance'
    eventSlug: string
    theaterSlug: string
  }> = []
  function check<T>(result: { data: T; error: { message: string } | null }): T {
    if (result.error) throw new Error(result.error.message)
    return result.data
  }
  async function cleanup() {
    for (const theater of theaters) {
      const events =
        check(
          await admin.from('shows').select('id').eq('theater_id', theater.id),
        ) ?? []
      if (events.length)
        check(
          await admin
            .from('show_leadership')
            .delete()
            .in(
              'show_id',
              events.map((event) => event.id),
            ),
        )
      check(await admin.from('theaters').delete().eq('id', theater.id))
    }
    for (const id of users) {
      const result = await admin.auth.admin.deleteUser(id)
      if (result.error) throw result.error
    }
  }
  try {
    for (const role of ['owner', 'member', 'pending']) {
      const result = await admin.auth.admin.createUser({
        email: `${role}-${suffix}@example.com`,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: role === 'member' ? 'Jordan Member' : role,
        },
      })
      if (result.error) throw result.error
      users.push(result.data.user.id)
    }
    for (const [index, name] of ['North Stage', 'South Stage'].entries()) {
      const theater = check(
        await admin.rpc('create_theater_with_owner', {
          p_actor_user_id: users[0],
          p_name: name,
          p_slug: `calls-${index}-${suffix}`,
          p_timezone: index ? 'America/Los_Angeles' : 'America/New_York',
        }),
      )![0]
      theaters.push(theater)
      check(
        await admin.from('theater_memberships').insert(
          users.slice(1).map((user_id) => ({
            theater_id: theater.id,
            user_id,
            roles: ['member' as const],
            status: 'active' as const,
          })),
        ),
      )
      const event = check(
        await admin.rpc('create_managed_event', {
          p_actor_user_id: users[0],
          p_director_user_id: users[0],
          p_producer_user_ids: [users[0]],
          p_theater_id: theater.id,
          p_slug: index ? 'staff-event' : 'cast-event',
          p_title: index ? 'South Performance' : 'North Rehearsal',
        }),
      )![0]
      if (index) {
        check(
          await admin.from('show_staff_assignments').insert(
            users.slice(1).map((user_id, i) => ({
              show_id: event.id,
              user_id,
              responsibility: 'Stage Manager',
              assignment_type: 'other',
              status: i ? ('pending' as const) : ('accepted' as const),
              invited_by_user_id: users[0],
            })),
          ),
        )
      } else {
        check(
          await admin.from('show_cast').insert(
            users.slice(1).map((user_id, i) => ({
              show_id: event.id,
              user_id,
              status: i ? ('pending' as const) : ('accepted' as const),
              source: 'invited' as const,
              public_credit_enabled: false,
              invited_by_user_id: users[0],
            })),
          ),
        )
      }
      for (const [n, excluded] of [
        null,
        null,
        null,
        'not_called',
        'cancelled',
        'past',
        'undated',
      ].entries()) {
        const occurrenceType =
          n % 2 ? ('performance' as const) : ('rehearsal' as const)
        const requirement =
          n % 2 ? ('optional' as const) : ('required' as const)
        const occurrence = check(
          await admin
            .from('show_occurrences')
            .insert({
              show_id: event.id,
              occurrence_type: occurrenceType,
              position: n,
            })
            .select('id')
            .single(),
        )!
        const startsAt =
          excluded === 'past'
            ? '2020-01-01T12:00:00Z'
            : `2030-11-03T${String(5 + n + index * 3).padStart(2, '0')}:30:00Z`
        const offset =
          excluded === 'past'
            ? index
              ? -480
              : -300
            : index
              ? 5 + n + index * 3 < 9
                ? -420
                : -480
              : 5 + n < 6
                ? -240
                : -300
        if (excluded !== 'undated') {
          const slot = check(
            await admin
              .from('show_candidate_slots')
              .insert({
                occurrence_id: occurrence.id,
                starts_at: startsAt,
                duration_minutes: 30,
                location_kind: 'off_site',
                off_site_approved: true,
                location_name: 'Studio',
                timezone_name: index
                  ? 'America/Los_Angeles'
                  : 'America/New_York',
                timezone_source: 'manual',
                local_starts_at: new Date(Date.parse(startsAt) + offset * 60000)
                  .toISOString()
                  .slice(0, 19),
                utc_offset_minutes: offset,
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
        }
        check(
          await admin.rpc('set_occurrence_call', {
            p_actor_user_id: users[0],
            p_call: excluded === 'not_called' ? 'not_called' : requirement,
            p_command_id: crypto.randomUUID(),
            p_occurrence_id: occurrence.id,
            p_participant_user_id: users[1],
          }),
        )
        // Stale rows must not turn pending participation or leadership into attendance.
        if (n === 0)
          check(
            await admin.from('show_occurrence_calls').insert(
              [users[0], users[2]].map((user_id) => ({
                actor_user_id: users[0],
                show_id: event.id,
                occurrence_id: occurrence.id,
                user_id,
                call: 'required' as const,
                last_command_id: crypto.randomUUID(),
              })),
            ),
          )
        if (excluded === 'cancelled')
          check(
            await admin
              .from('show_occurrences')
              .update({ status: 'cancelled' })
              .eq('id', occurrence.id),
          )
        if (!excluded)
          calls.push({
            id: occurrence.id,
            startsAt,
            requirement,
            occurrenceType,
            eventSlug: event.slug,
            theaterSlug: theater.slug,
          })
      }
    }
    return {
      users,
      theaters,
      calls,
      password,
      email: `member-${suffix}@example.com`,
      ownerEmail: `owner-${suffix}@example.com`,
      pendingEmail: `pending-${suffix}@example.com`,
      cleanup,
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
