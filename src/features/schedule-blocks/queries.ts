import { getBearerTokenFromRequest, getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'
import { createSupabaseScheduleBlockPersistence } from './persistence'
import type { z } from 'zod'
import type { theaterScheduleBlocksInputSchema } from './schemas'

export async function getTheaterScheduleBlocks(input: z.infer<typeof theaterScheduleBlocksInputSchema>) {
  const currentUser = await getCurrentUserFromRequest(); if (!currentUser.ok) return currentUser
  const token = getBearerTokenFromRequest(); if (!token) return err(appError('unauthenticated', 'Sign in is required.'))
  const userClient = createSupabaseAnonClient(token)
  const { data: theater, error } = await userClient.from('theaters').select('id').eq('slug', input.theaterSlug).maybeSingle()
  if (error) return err(appError('external_service_error', 'Schedule Blocks could not be loaded.'))
  if (!theater) return err(appError('not_found', 'Theater was not found.'))
  const persistence = createSupabaseScheduleBlockPersistence()
  if (!(await persistence.authorizeManagement({ theaterId: theater.id, userId: currentUser.data.id }))) return err(appError('forbidden', 'Current Theater Operator access is required.'))
  try { return ok(await persistence.list({ theaterSlug: input.theaterSlug })) }
  catch (failure) { return err(appError('external_service_error', 'Schedule Blocks could not be loaded.')) }
}
