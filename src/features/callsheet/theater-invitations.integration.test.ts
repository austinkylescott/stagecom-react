import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { loadEnv } from 'vite'
import type { Database } from '@/server/db/database.types'
import { createInvitationFixture } from './testing/invitation-fixture'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)

describe.skipIf(!local)('recipient-scoped Theater invitation queries', () => {
  it('returns only the recipient’s recorded context and removes access when membership ends', async () => {
    Object.assign(process.env, {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    })
    const { getMyTheaterInvitations } = await import('./theater-invitations')
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
      const result = await getMyTheaterInvitations({ accessToken })
      expect(result).toMatchObject({
        ok: true,
        data: [
          {
            kind: 'admin_invitation',
            invitation: {
              offeredBy: 'Alex Rivera',
              offeredAt: expect.any(String),
            },
          },
          {
            kind: 'ownership_transfer',
            invitation: {
              offeredBy: 'Alex Rivera',
              offeredAt: expect.any(String),
              formerOwnerRole: 'member',
            },
          },
        ],
      })
      const other = await actor.auth.signInWithPassword({
        email: fixture.otherEmail,
        password: fixture.password,
      })
      expect(other.error).toBeNull()
      expect(
        await getMyTheaterInvitations({
          accessToken: other.data.session!.access_token,
        }),
      ).toEqual({ ok: true, data: [] })
      expect(
        await getMyTheaterInvitations({ accessToken: 'invalid' }),
      ).toMatchObject({ ok: false, error: { code: 'unauthenticated' } })
      expect(
        (
          await admin
            .from('theater_memberships')
            .update({ status: 'inactive' })
            .eq('theater_id', fixture.theaterId)
            .eq('user_id', fixture.recipientId)
        ).error,
      ).toBeNull()
      expect(await getMyTheaterInvitations({ accessToken })).toEqual({
        ok: true,
        data: [],
      })
    } finally {
      await fixture.cleanup()
    }
  })
})
