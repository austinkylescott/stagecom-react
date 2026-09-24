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

describe.skipIf(!local || !anonKey || !serviceKey)(
  'authorized Theater work with local Supabase',
  () => {
    it('returns only the Owner’s resolvable decision in the requested Theater', async () => {
      Object.assign(process.env, {
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      })
      const { getTheaterWorkQueue } = await import('./queries')
      const admin = createClient<Database>(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const anon = createClient<Database>(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const suffix = crypto.randomUUID()
      const password = `Stagecom-${suffix}`
      const theaterSlug = `work-${suffix}`
      const { data: owner, error: ownerError } =
        await admin.auth.admin.createUser({
          email: `work-owner-${suffix}@example.com`,
          password,
          email_confirm: true,
        })
      expect(ownerError).toBeNull()
      const { data: outsider, error: outsiderError } =
        await admin.auth.admin.createUser({
          email: `work-outsider-${suffix}@example.com`,
          password,
          email_confirm: true,
        })
      expect(outsiderError).toBeNull()
      const { data: member, error: memberError } =
        await admin.auth.admin.createUser({
          email: `work-member-${suffix}@example.com`,
          password,
          email_confirm: true,
        })
      expect(memberError).toBeNull()
      let theaterId: string | null = null
      try {
        const { data: theater, error: theaterError } = await admin.rpc(
          'create_theater_with_owner',
          {
            p_actor_user_id: owner.user!.id,
            p_name: 'Ready Theater',
            p_slug: theaterSlug,
            p_timezone: 'America/New_York',
          },
        )
        expect(theaterError).toBeNull()
        theaterId = theater![0].id
        const { error: profileError } = await admin
          .from('theaters')
          .update({
            tagline: 'Ready to publish',
            street: '1 Stage Street',
            city: 'New York',
            state_region: 'NY',
            postal_code: '10001',
            country: 'US',
          })
          .eq('id', theaterId)
        expect(profileError).toBeNull()
        const { error: membershipError } = await admin
          .from('theater_memberships')
          .insert({
            theater_id: theaterId,
            user_id: member.user!.id,
            roles: ['member'],
            status: 'active',
          })
        expect(membershipError).toBeNull()
        const ownerSession = await anon.auth.signInWithPassword({
          email: `work-owner-${suffix}@example.com`,
          password,
        })
        expect(ownerSession.error).toBeNull()
        const decisions = await getTheaterWorkQueue(
          { theaterSlug },
          {
            accessToken: ownerSession.data.session!.access_token,
            mode: 'decisions',
          },
        )
        expect(decisions).toMatchObject({
          ok: true,
          data: {
            items: [{ kind: 'publication', relationship: 'Theater Operator' }],
            exceptions: [],
          },
        })
        const full = await getTheaterWorkQueue(
          { theaterSlug },
          {
            accessToken: ownerSession.data.session!.access_token,
            mode: 'decisions_and_exceptions',
          },
        )
        expect(full).toMatchObject({
          ok: true,
          data: { items: [{ kind: 'publication' }] },
        })
        const memberSession = await anon.auth.signInWithPassword({
          email: `work-member-${suffix}@example.com`,
          password,
        })
        expect(memberSession.error).toBeNull()
        const memberWork = await getTheaterWorkQueue(
          { theaterSlug },
          {
            accessToken: memberSession.data.session!.access_token,
            mode: 'decisions',
          },
        )
        expect(memberWork).toMatchObject({
          ok: true,
          data: { items: [], exceptions: [] },
        })
        const outsiderSession = await anon.auth.signInWithPassword({
          email: `work-outsider-${suffix}@example.com`,
          password,
        })
        expect(outsiderSession.error).toBeNull()
        const forbidden = await getTheaterWorkQueue(
          { theaterSlug },
          {
            accessToken: outsiderSession.data.session!.access_token,
            mode: 'decisions',
          },
        )
        expect(forbidden).toMatchObject({
          ok: false,
          error: { code: 'not_found' },
        })
      } finally {
        if (theaterId) await admin.from('theaters').delete().eq('id', theaterId)
        await admin.auth.admin.deleteUser(member.user!.id)
        await admin.auth.admin.deleteUser(outsider.user!.id)
        await admin.auth.admin.deleteUser(owner.user!.id)
      }
    })
  },
)
