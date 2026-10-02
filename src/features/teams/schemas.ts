import { z } from 'zod'
import { uuidSchema } from '@/server/schemas'

export const readTeamsSchema = z.object({ theaterId: uuidSchema })
const teamAction = z.object({
  teamId: uuidSchema,
  expectedVersion: z.number().int().positive(),
})
export const teamCommandSchema = z
  .discriminatedUnion('action', [
    z.object({
      action: z.literal('create'),
      name: z.string().trim().min(1).max(80),
    }),
    teamAction.extend({
      action: z.literal('invite'),
      memberUserId: uuidSchema,
    }),
    teamAction.extend({
      action: z.literal('respond'),
      response: z.enum(['accepted', 'declined']),
    }),
    teamAction.extend({ action: z.literal('leave') }),
    teamAction.extend({
      action: z.literal('rename'),
      name: z.string().trim().min(1).max(80),
    }),
    teamAction.extend({
      action: z.literal('offer_admin'),
      memberUserId: uuidSchema,
    }),
    teamAction.extend({
      action: z.literal('remove_admin'),
      memberUserId: uuidSchema,
    }),
    teamAction.extend({
      action: z.literal('remove'),
      memberUserId: uuidSchema,
    }),
    teamAction.extend({ action: z.literal('relinquish_admin') }),
    teamAction.extend({
      action: z.literal('respond_admin'),
      response: z.enum(['accepted', 'declined']),
    }),
    teamAction.extend({
      action: z.literal('offer_transfer'),
      memberUserId: uuidSchema,
      depart: z.boolean(),
    }),
    teamAction.extend({
      action: z.literal('respond_transfer'),
      response: z.enum(['accepted', 'declined']),
    }),
    teamAction.extend({ action: z.literal('cancel_transfer') }),
    teamAction.extend({
      action: z.literal('offer_recovery'),
      memberUserId: uuidSchema,
    }),
    teamAction.extend({
      action: z.literal('respond_recovery'),
      response: z.enum(['accepted', 'declined']),
    }),
    teamAction.extend({ action: z.literal('cancel_recovery') }),
  ])
  .and(z.object({ theaterId: uuidSchema, commandId: uuidSchema }))
export const teamWorkspaceSchema = z.object({
  actorId: uuidSchema,
  teams: z.array(
    z.object({
      id: uuidSchema,
      name: z.string(),
      ownerId: uuidSchema,
      ownerEligible: z.boolean(),
      version: z.number().int(),
      memberIds: z.array(uuidSchema),
      adminIds: z.array(uuidSchema),
      adminInvitationIds: z.array(uuidSchema),
      transfer: z
        .object({ userId: uuidSchema, depart: z.boolean() })
        .nullable(),
      recovery: z
        .object({ userId: uuidSchema, accepted: z.boolean() })
        .nullable(),
      invitations: z.array(
        z.object({ userId: uuidSchema, inviterId: uuidSchema }),
      ),
    }),
  ),
})
export type TeamWorkspace = z.infer<typeof teamWorkspaceSchema>
export type TeamCommand = z.infer<typeof teamCommandSchema>
export type Team = TeamWorkspace['teams'][number]

type WithoutIdentity<T> = T extends unknown
  ? Omit<T, 'theaterId' | 'commandId'>
  : never
export type TeamAction = WithoutIdentity<TeamCommand>
