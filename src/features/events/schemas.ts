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

export const inviteEventCastMemberInputSchema = z.object({
  eventId: uuidSchema,
  memberUserId: uuidSchema,
})

export const respondToEventCastInvitationInputSchema = z.object({
  eventId: uuidSchema,
  response: z.enum(['accepted', 'declined']),
})

const localDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    'Use a complete local date and time.',
  )

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
