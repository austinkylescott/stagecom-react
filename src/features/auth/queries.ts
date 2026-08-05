import { getCurrentUserFromRequest } from '@/server/auth/session'
import { serverEnv } from '@/server/env'
import { ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import { resolvePostAuthPath } from './redirects'

import type { resolveAuthRedirectInputSchema } from './schemas'
import type { z } from 'zod'

export async function getCurrentUser() {
  return getCurrentUserFromRequest()
}

export async function getDemoAccessStatus() {
  return ok({ enabled: serverEnv.STAGECOM_DEMO_MODE === 'true' })
}

export async function resolveAuthRedirect(
  input: z.infer<typeof resolveAuthRedirectInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', currentUser.data.id)
    .maybeSingle()

  const { data: memberships } = await supabase
    .from('theater_memberships')
    .select('theater_id, is_home, home_rank, created_at')
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .order('is_home', { ascending: false })
    .order('home_rank', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const theaterIds =
    memberships?.map((membership) => membership.theater_id) ?? []
  const { data: theaters } = theaterIds.length
    ? await supabase
        .from('theaters')
        .select('id, slug, status')
        .in('id', theaterIds)
    : { data: [] }

  const draftTheaterSlug = theaters?.find(
    (theater) => theater.status === 'draft',
  )?.slug
  const membershipSlug = memberships
    ?.map((membership) =>
      theaters?.find((theater) => theater.id === membership.theater_id),
    )
    .find(Boolean)?.slug

  return {
    ok: true,
    data: {
      path: resolvePostAuthPath({
        draftTheaterSlug,
        hasProfile: Boolean(profile?.display_name.trim()),
        inviteToken: input.inviteToken,
        membershipSlug,
        next: input.next,
      }),
    },
  } as const
}
