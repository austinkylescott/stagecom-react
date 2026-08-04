import { z } from 'zod'

import { nonEmptyStringSchema, slugSchema, uuidSchema } from '@/server/schemas'

export const createManagedEventInputSchema = z.object({
  directorUserId: uuidSchema.optional(),
  producerUserIds: z.array(uuidSchema).max(20).default([]),
  slug: slugSchema,
  theaterId: uuidSchema,
  title: nonEmptyStringSchema.max(160),
})

export const theaterEventsInputSchema = z.object({
  theaterSlug: slugSchema,
})

export const eventWorkspaceInputSchema = z.object({
  eventSlug: slugSchema,
  theaterSlug: slugSchema,
})

export const completeEventInputSchema = z.object({
  commandId: uuidSchema,
  eventId: uuidSchema,
})

export const withdrawFromEventCastInputSchema = z.object({
  commandId: uuidSchema,
  eventId: uuidSchema,
  expectedHealthVersion: z.number().int().positive(),
})

export const manageAtRiskEventInputSchema = z.object({
  action: z.enum(['revise', 'reschedule', 'allow', 'cancel']),
  commandId: uuidSchema,
  eventId: uuidSchema,
  expectedHealthVersion: z.number().int().positive(),
  reason: nonEmptyStringSchema.max(2_000),
})

const externalSalesUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith('https://') || value.startsWith('http://'),
    {
      message: 'Use an HTTP or HTTPS ticket or reservation URL.',
    },
  )

export const saveEventPublicContentInputSchema = z
  .object({
    admissionPriceCents: z.number().int().nonnegative(),
    castCredits: z
      .array(
        z.object({
          position: z.number().int().nonnegative(),
          publiclyCredited: z.boolean(),
          userId: uuidSchema,
        }),
      )
      .max(500),
    commandId: uuidSchema,
    description: z.string().trim().max(10_000),
    eventId: uuidSchema,
    expectedVersion: z.number().int().positive().nullable(),
    imageUrl: z.url().nullable(),
    salesChannel: z.enum(['external', 'no_advance_ticketing']),
    externalUrl: externalSalesUrlSchema.nullable(),
    title: nonEmptyStringSchema.max(160),
  })
  .superRefine((content, context) => {
    if (content.salesChannel === 'external' && !content.externalUrl) {
      context.addIssue({
        code: 'custom',
        message: 'External sales requires a ticket or reservation URL.',
        path: ['externalUrl'],
      })
    }

    if (
      content.salesChannel === 'no_advance_ticketing' &&
      content.externalUrl !== null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'No advance ticketing does not use an external sales URL.',
        path: ['externalUrl'],
      })
    }

    if (
      new Set(content.castCredits.map((credit) => credit.userId)).size !==
      content.castCredits.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Each Cast Member can have only one credit setting.',
        path: ['castCredits'],
      })
    }
  })

export const publishEventInputSchema = z.object({
  commandId: uuidSchema,
  eventId: uuidSchema,
  expectedVersion: z.number().int().positive(),
  publicContentRevisionId: uuidSchema,
})

export const inviteEventCastMemberInputSchema = z.object({
  eventId: uuidSchema,
  memberUserId: uuidSchema,
})

export const respondToEventCastInvitationInputSchema = z.object({
  eventId: uuidSchema,
  response: z.enum(['accepted', 'declined']),
})

export const recordCandidateSlotAvailabilityInputSchema = z.object({
  candidateSlotId: uuidSchema,
  commandId: uuidSchema,
  expectedVersion: z.number().int().positive().nullable(),
  response: z.enum(['available', 'unavailable', 'uncertain']),
})

export const setOccurrenceCallInputSchema = z.object({
  call: z.enum(['required', 'optional', 'not_called']),
  castMemberUserId: uuidSchema,
  commandId: uuidSchema,
  expectedVersion: z.number().int().positive().nullable(),
  occurrenceId: uuidSchema,
})

export const saveEventProposedCastInputSchema = z.object({
  castMemberUserIds: z.array(uuidSchema).max(500),
  commandId: uuidSchema,
  eventId: uuidSchema,
})

export const submitEventProposalRevisionInputSchema = z.object({
  commandId: uuidSchema,
  eventId: uuidSchema,
})

export const reviewProposalRevisionInputSchema = z
  .object({
    action: z.enum(['approve', 'request_edits', 'deny']),
    commandId: uuidSchema,
    expectedVersion: z.number().int().positive(),
    ownerOverride: z.boolean().default(false),
    proposalRevisionId: uuidSchema,
    reason: z.string().trim().max(2_000).nullable(),
  })
  .superRefine((decision, context) => {
    if (
      (decision.action === 'request_edits' ||
        decision.action === 'deny' ||
        decision.ownerOverride) &&
      !decision.reason
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A reason is required for this decision.',
        path: ['reason'],
      })
    }
    if (decision.ownerOverride && decision.action !== 'approve') {
      context.addIssue({
        code: 'custom',
        message: 'Owner override can only approve a Proposal Revision.',
        path: ['ownerOverride'],
      })
    }
  })

export const seedDeniedProposalReplacementInputSchema = z.object({
  commandId: uuidSchema,
  proposalRevisionId: uuidSchema,
  slug: slugSchema,
  title: nonEmptyStringSchema.max(160),
})

const localDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    'Use a complete local date and time.',
  )

export const issueProposalCounterofferInputSchema = z.object({
  commandId: uuidSchema,
  durationMinutes: z.number().int().min(15).max(1440),
  expectedVersion: z.number().int().positive(),
  localStartsAt: localDateTimeSchema,
  locationKind: z.enum(['primary_venue', 'off_site']),
  locationName: nonEmptyStringSchema.max(240),
  occurrenceId: uuidSchema,
  proposalRevisionId: uuidSchema,
  responseDeadline: z.iso.datetime({ offset: true }).optional(),
  timezoneName: nonEmptyStringSchema.max(100),
})

export const respondToProposalCounterofferInputSchema = z.object({
  commandId: uuidSchema,
  counterofferId: uuidSchema,
  response: z.enum(['accept', 'decline']),
})

export const operationalPlanCandidateSlotSchema = z
  .object({
    durationMinutes: z.number().int().min(15).max(1440),
    id: uuidSchema,
    localStartsAt: localDateTimeSchema,
    locationKind: z.enum(['primary_venue', 'off_site']),
    locationName: nonEmptyStringSchema.max(240),
    offSiteApproved: z.boolean(),
    position: z.number().int().min(0).max(99),
    resourceId: uuidSchema.optional(),
    timezoneName: nonEmptyStringSchema.max(100),
    timezoneSource: z.enum(['unknown', 'inferred', 'manual']),
  })
  .superRefine((slot, context) => {
    if (slot.locationKind === 'primary_venue' && !slot.resourceId) {
      context.addIssue({
        code: 'custom',
        message: 'Primary Venue identity is required.',
        path: ['resourceId'],
      })
    }

    if (slot.locationKind === 'off_site' && !slot.offSiteApproved) {
      context.addIssue({
        code: 'custom',
        message: 'Off-site locations must be explicitly approved.',
        path: ['offSiteApproved'],
      })
    }
  })

export const operationalPlanOccurrenceSchema = z
  .object({
    candidateSlots: z.array(operationalPlanCandidateSlotSchema).max(100),
    confirmedCandidateSlotId: uuidSchema.nullable(),
    id: uuidSchema,
    position: z.number().int().min(0).max(99),
    type: z.enum(['rehearsal', 'performance']),
    visibility: z.enum(['public', 'internal']),
  })
  .superRefine((occurrence, context) => {
    if (
      occurrence.confirmedCandidateSlotId &&
      !occurrence.candidateSlots.some(
        (slot) => slot.id === occurrence.confirmedCandidateSlotId,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Confirmed Slot must be one of the Candidate Slots.',
        path: ['confirmedCandidateSlotId'],
      })
    }
  })

export const operationalPlanResourceRequestSchema = z.object({
  id: uuidSchema,
  label: nonEmptyStringSchema.max(160),
  position: z.number().int().min(0).max(99),
  quantity: z.number().int().min(1).max(500),
  type: z.enum(['staff', 'equipment', 'other']),
})

export const saveEventOperationalPlanInputSchema = z
  .object({
    eventId: uuidSchema,
    minimumViableCast: z.number().int().min(1).max(500),
    occurrences: z.array(operationalPlanOccurrenceSchema).max(100),
    resourceRequests: z.array(operationalPlanResourceRequestSchema).max(100),
    targetCastSize: z.number().int().min(1).max(500),
  })
  .superRefine((plan, context) => {
    if (plan.minimumViableCast > plan.targetCastSize) {
      context.addIssue({
        code: 'custom',
        message: 'Minimum Viable Cast cannot exceed the target cast size.',
        path: ['minimumViableCast'],
      })
    }
  })
