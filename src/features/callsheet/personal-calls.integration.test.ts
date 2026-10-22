import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import type { Database } from '@/server/db/database.types'
import { createCallFixture } from './testing/call-fixture'
import { upcomingCalls } from './upcoming-calls'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)

describe.skipIf(!local)('authorized personal Calls with local Supabase', () => {
  it('retains actual Cast and Staff requirements across active Theaters without publication or authority implying attendance', async () => {
    Object.assign(process.env, {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    })
    const { getEventCommitments } = await import('./event-commitments')
    const admin = createClient<Database>(
      env.VITE_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const fixture = await createCallFixture(admin)
    const actor = createClient<Database>(
      env.VITE_SUPABASE_URL!,
      env.VITE_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    async function read(email: string) {
      const session = await actor.auth.signInWithPassword({
        email,
        password: fixture.password,
      })
      expect(session.error).toBeNull()
      const result = await getEventCommitments({
        accessToken: session.data.session!.access_token,
        scope: { kind: 'all_active_theaters' },
      })
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    }
    try {
      const calls = upcomingCalls(await read(fixture.email))
      expect(calls).toHaveLength(6)
      expect(
        calls.map((call) => ({
          id: call.id,
          call: call.call,
          relationship: call.relationship,
          theater: call.theater.slug,
        })),
      ).toEqual(
        fixture.calls.map((call) => ({
          id: `occurrence-call:${call.id}`,
          call: {
            requirement: call.requirement,
            occurrenceType: call.occurrenceType,
          },
          relationship:
            call.eventSlug === 'cast-event'
              ? 'Cast Member'
              : 'Event staff · Stage Manager',
          theater: call.theaterSlug,
        })),
      )
      // PostgreSQL accepts infinity; it cannot represent a usable personal schedule instant.
      expect(
        (
          await admin
            .from('show_candidate_slots')
            .update({ starts_at: 'infinity' })
            .eq('occurrence_id', fixture.calls[5].id)
        ).error,
      ).toBeNull()
      const invalidSchedule = await read(fixture.email)
      expect(
        invalidSchedule.filter((item) => item.kind === 'occurrence_call'),
      ).toHaveLength(5)
      expect(
        invalidSchedule.some(
          (item) => item.id === `occurrence-call:${fixture.calls[5].id}`,
        ),
      ).toBe(false)
      expect(upcomingCalls(await read(fixture.ownerEmail))).toEqual([])
      const pending = await read(fixture.pendingEmail)
      expect(upcomingCalls(pending)).toEqual([])
      expect(
        pending.every(
          (item) => item.call === undefined && item.actionableAt === null,
        ),
      ).toBe(true)
      expect(
        (
          await admin
            .from('theater_memberships')
            .update({ status: 'inactive' })
            .eq('theater_id', fixture.theaters[1].id)
            .eq('user_id', fixture.users[1])
        ).error,
      ).toBeNull()
      expect(upcomingCalls(await read(fixture.email))).toHaveLength(3)
      for (const status of ['cancelled', 'completed'] as const) {
        expect(
          (
            await admin
              .from('shows')
              .update({ lifecycle_status: status })
              .eq('theater_id', fixture.theaters[0].id)
          ).error,
        ).toBeNull()
        expect(upcomingCalls(await read(fixture.email))).toEqual([])
      }
    } finally {
      await fixture.cleanup()
    }
  }, 30000)
})
