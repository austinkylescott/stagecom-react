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
      invitations: z.array(
        z.object({ userId: uuidSchema, inviterId: uuidSchema }),
      ),
    }),
  ),
})
export type TeamWorkspace = z.infer<typeof teamWorkspaceSchema>
export type TeamCommand = z.infer<typeof teamCommandSchema>
export type Team = TeamWorkspace['teams'][number]
