import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'
import { createSupabaseScheduleBlockPersistence } from './persistence'
import type { AppResult } from '@/server/errors'
import type { ScheduleBlock, ScheduleBlockPersistence } from './persistence'
import type { z } from 'zod'
import type { createScheduleBlockInputSchema, finishScheduleBlockInputSchema, updateScheduleBlockInputSchema } from './schemas'

export type ScheduleBlockCommandDependencies = { getCurrentUser: () => Promise<AppResult<{ id: string }>>; persistence: ScheduleBlockPersistence }
const defaults = (): ScheduleBlockCommandDependencies => ({ getCurrentUser: getCurrentUserFromRequest, persistence: createSupabaseScheduleBlockPersistence() })

export async function createScheduleBlock(input: z.infer<typeof createScheduleBlockInputSchema>, dependencies = defaults()) {
  return run(input.theaterId, dependencies, (actorUserId) => dependencies.persistence.create({ ...input, actorUserId }))
}
export async function updateScheduleBlock(input: z.infer<typeof updateScheduleBlockInputSchema>, dependencies = defaults()) {
  return authorizeBlockAndRun(input.scheduleBlockId, dependencies, (actorUserId) => dependencies.persistence.change({ ...input, action: 'updated', actorUserId }))
}
export async function finishScheduleBlock(input: z.infer<typeof finishScheduleBlockInputSchema>, dependencies = defaults()) {
  return authorizeBlockAndRun(input.scheduleBlockId, dependencies, (actorUserId) => dependencies.persistence.change({ ...input, actorUserId }))
}
async function run(theaterId: string, dependencies: ScheduleBlockCommandDependencies, operation: (actorUserId: string) => Promise<ScheduleBlock>) {
  const currentUser = await dependencies.getCurrentUser(); if (!currentUser.ok) return currentUser
  try {
    if (!(await dependencies.persistence.authorizeManagement({ theaterId, userId: currentUser.data.id }))) return err(appError('forbidden', 'Current Theater Operator access is required.'))
    return ok(await operation(currentUser.data.id))
  } catch (error) { return scheduleBlockFailure(error) }
}
async function authorizeBlockAndRun(scheduleBlockId: string, dependencies: ScheduleBlockCommandDependencies, operation: (actorUserId: string) => Promise<ScheduleBlock>) {
  const currentUser = await dependencies.getCurrentUser(); if (!currentUser.ok) return currentUser
  try {
    const theaterId = await dependencies.persistence.findTheaterForBlock({ scheduleBlockId })
    if (!(await dependencies.persistence.authorizeManagement({ theaterId, userId: currentUser.data.id }))) return err(appError('forbidden', 'Current Theater Operator access is required.'))
    return ok(await operation(currentUser.data.id))
  } catch (error) { return scheduleBlockFailure(error) }
}
function scheduleBlockFailure(error: unknown) { const failure = toAppError(error); return failure.code === 'internal_error' ? err(appError('external_service_error', 'Schedule Block could not be saved.')) : err(failure) }
