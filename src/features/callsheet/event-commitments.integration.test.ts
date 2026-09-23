import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import type { Database } from '@/server/db/database.types'

const env = loadEnv('development', process.cwd(), '')
const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
const local = Boolean(
  url && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?/.test(url),
)

// This exercises the same authorized read used by Callsheet and Event Portfolio.
describe.skipIf(!local || !anonKey || !serviceKey)(
  'personal Event commitments with local Supabase',
  () => {
    it('accepts only active Theater scope established from the signed-in Member', async () => {
      Object.assign(process.env, {
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      })
      const { getEventCommitments } = await import('./event-commitments')
      const admin = createClient<Database>(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const suffix = crypto.randomUUID()
      const memberEmail = `commitments-${suffix}@example.com`
      const ownerEmail = `commitments-owner-${suffix}@example.com`
      const password = `Stagecom-${suffix}`
      const theaterSlug = `commitments-${suffix}`
      const otherSlug = `commitments-other-${suffix}`
      const { data: owner, error: ownerError } =
        await admin.auth.admin.createUser({
          email: ownerEmail,
          password,
          email_confirm: true,
        })
      expect(ownerError).toBeNull()
      const { data: member, error: memberError } =
        await admin.auth.admin.createUser({
          email: memberEmail,
          password,
          email_confirm: true,
        })
      expect(memberError).toBeNull()
      let theaterId: string | null = null
      let otherTheaterId: string | null = null
      try {
        const { data: theater, error: theaterError } = await admin.rpc(
          'create_theater_with_owner',
          {
            p_actor_user_id: owner.user!.id,
            p_name: 'Commitments Theater',
            p_slug: theaterSlug,
            p_timezone: 'America/New_York',
          },
        )
        expect(theaterError).toBeNull()
        theaterId = theater![0].id
        const { data: other, error: otherError } = await admin.rpc(
          'create_theater_with_owner',
          {
            p_actor_user_id: owner.user!.id,
            p_name: 'Other Theater',
            p_slug: otherSlug,
            p_timezone: 'America/New_York',
          },
        )
        expect(otherError).toBeNull()
        otherTheaterId = other![0].id
        const { error: membershipError } = await admin
          .from('theater_memberships')
          .insert({
            theater_id: theaterId,
            user_id: member.user!.id,
            roles: ['member'],
            status: 'active',
          })
        expect(membershipError).toBeNull()
        const { error: eventError } = await admin.rpc('create_managed_event', {
          p_actor_user_id: owner.user!.id,
          p_producer_user_ids: [],
          p_slug: 'invited-event',
          p_theater_id: theaterId,
          p_title: 'Invited Event',
        })
        expect(eventError).toBeNull()
        const { data: event, error: lookupError } = await admin
          .from('shows')
          .select('id')
          .eq('theater_id', theaterId)
          .eq('slug', 'invited-event')
          .single()
        expect(lookupError).toBeNull()
        const { error: castError } = await admin.from('show_cast').insert({
          show_id: event!.id,
          user_id: member.user!.id,
          source: 'invited',
          status: 'pending',
          public_credit_enabled: false,
        })
        expect(castError).toBeNull()
        const anon = createClient<Database>(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data: session, error: signInError } =
          await anon.auth.signInWithPassword({
            email: memberEmail,
            password,
          })
        expect(signInError).toBeNull()
        const accessToken = session.session!.access_token
        const scoped = await getEventCommitments({
          accessToken,
          scope: { kind: 'theater', theaterSlug },
        })
        expect(scoped).toMatchObject({
          ok: true,
          data: [{ kind: 'cast_invitation', event: { slug: 'invited-event' } }],
        })
        const all = await getEventCommitments({
          accessToken,
          scope: { kind: 'all_active_theaters' },
        })
        expect(all).toMatchObject({
          ok: true,
          data: [{ kind: 'cast_invitation' }],
        })
        const forbidden = await getEventCommitments({
          accessToken,
          scope: { kind: 'theater', theaterSlug: otherSlug },
        })
        expect(forbidden).toMatchObject({
          ok: false,
          error: { code: 'forbidden' },
        })
      } finally {
        if (theaterId) await admin.from('theaters').delete().eq('id', theaterId)
        if (otherTheaterId)
          await admin.from('theaters').delete().eq('id', otherTheaterId)
        await admin.auth.admin.deleteUser(member.user!.id)
        await admin.auth.admin.deleteUser(owner.user!.id)
      }
    })
  },
)
