import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import type { Database } from '@/server/db/database.types'
import { createInvitationFixture } from './testing/invitation-fixture'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)

describe.skipIf(!local)(
  'Staff invitation context through the authenticated Event query',
  () => {
    it('discloses only the recipient’s offer and never private planning or roster fields', async () => {
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
      const fixture = await createInvitationFixture(admin)
      try {
        const actor = createClient<Database>(
          env.VITE_SUPABASE_URL!,
          env.VITE_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } },
        )
        const session = await actor.auth.signInWithPassword({
          email: fixture.email,
          password: fixture.password,
        })
        expect(session.error).toBeNull()
        const accessToken = session.data.session!.access_token
        const result = await getEventCommitments({
          accessToken,
          scope: { kind: 'all_active_theaters' },
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        const staff = result.data.find(
          (item) => item.kind === 'staff_invitation',
        )
        expect(staff).toEqual({
          id: `staff-assignment:${fixture.staffId}`,
          responseId: fixture.staffId,
          kind: 'staff_invitation',
          action: 'Respond to staff assignment',
          actionableAt: null,
          event: { slug: 'invited-event', title: 'Opening Night' },
          theater: { slug: fixture.theaterSlug, title: 'Invitation Theater' },
          relationship: 'Event staff invitee · Front of house',
          targetAnchor: '#event-staff-assignment',
          invitation: {
            offeredBy: 'Alex Rivera',
            offeredAt: '2026-10-07T14:00:00+00:00',
            responsibility: 'Front of house',
          },
        })
        const other = await actor.auth.signInWithPassword({
          email: fixture.otherEmail,
          password: fixture.password,
        })
        expect(other.error).toBeNull()
        expect(
          await getEventCommitments({
            accessToken: other.data.session!.access_token,
            scope: { kind: 'all_active_theaters' },
          }),
        ).toEqual({ ok: true, data: [] })
        expect(
          (
            await admin
              .from('show_staff_assignments')
              .update({
                invited_at: null,
                invited_by_user_id: null,
                responsibility: null,
              })
              .eq('id', fixture.staffId)
          ).error,
        ).toBeNull()
        const historical = await getEventCommitments({
          accessToken,
          scope: { kind: 'all_active_theaters' },
        })
        expect(
          historical.ok &&
            historical.data.find((item) => item.kind === 'staff_invitation'),
        ).toMatchObject({
          invitation: {
            offeredBy: null,
            offeredAt: null,
            responsibility: null,
          },
        })
        expect(
          (
            await admin
              .from('theater_memberships')
              .update({ status: 'inactive' })
              .eq('theater_id', fixture.theaterId)
              .eq('user_id', fixture.recipientId)
          ).error,
        ).toBeNull()
        expect(
          await getEventCommitments({
            accessToken,
            scope: { kind: 'all_active_theaters' },
          }),
        ).toEqual({ ok: true, data: [] })
      } finally {
        await fixture.cleanup()
      }
    })
  },
)
