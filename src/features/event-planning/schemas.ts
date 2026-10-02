import { z } from 'zod'

const version = z.number().int().nonnegative()
const target = { targetId: z.uuid(), expectedVersion: version }
export const readPlanningSchema = z.object({ eventId: z.uuid() })
export const planningCommandSchema = z.object({
  eventId: z.uuid(),
  commandId: z.uuid(),
  operation: z.discriminatedUnion('action', [
    z.object({
      action: z.literal('select'),
      input: z.object({
        occurrenceId: z.uuid(),
        slotId: z.uuid(),
        expectedVersion: version,
      }),
    }),
    z.object({
      action: z.literal('call'),
      input: z.object({
        ...target,
        userId: z.uuid(),
        call: z.enum(['required', 'optional', 'not_called']),
        callVersion: version,
      }),
    }),
    z.object({
      action: z.literal('confirm'),
      input: z.object({
        ...target,
        callVersion: version,
        confirmationVersion: version,
        confirmed: z.boolean(),
      }),
    }),
    z.object({ action: z.literal('hold'), input: z.object(target) }),
    z.object({ action: z.literal('withdraw'), input: z.object(target) }),
    z.object({ action: z.literal('submit'), input: z.object(target) }),
  ]),
})
export const planningSchema = z.object({
  canSelect: z.boolean(),
  canCall: z.boolean(),
  canHold: z.boolean(),
  participants: z.array(
    z.object({ userId: z.uuid(), displayName: z.string() }),
  ),
  targets: z.array(
    z.object({
      id: z.uuid(),
      occurrenceId: z.uuid(),
      version,
      state: z.enum([
        'planning',
        'submitted',
        'committed',
        'withdrawn',
        'denied',
        'changes_requested',
      ]),
      replacement: z.boolean(),
      currentCommitment: z.boolean(),
      revisionId: z.uuid().nullable(),
      holdUntil: z.string().nullable(),
      slot: z.object({
        startsAt: z.string(),
        durationMinutes: z.number(),
        locationName: z.string(),
        locationKind: z.string(),
        timezoneName: z.string(),
      }),
      blockers: z.array(
        z.object({
          code: z.string(),
          message: z.string(),
          members: z
            .array(z.object({ userId: z.uuid(), displayName: z.string() }))
            .optional(),
        }),
      ),
      calls: z.array(
        z.object({
          userId: z.uuid(),
          displayName: z.string(),
          call: z.enum(['required', 'optional', 'not_called']),
          version,
          eligible: z.boolean(),
          own: z.boolean(),
          confirmed: z.boolean(),
          confirmationVersion: version,
        }),
      ),
    }),
  ),
})
export type Planning = z.infer<typeof planningSchema>
export type PlanningOperation = z.infer<
  typeof planningCommandSchema
>['operation']
