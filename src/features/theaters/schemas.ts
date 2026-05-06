import { z } from 'zod'

import {
  emailSchema,
  nonEmptyStringSchema,
  slugSchema,
  uuidSchema,
} from '@/server/schemas'

export const createDraftTheaterInputSchema = z.object({
  name: nonEmptyStringSchema.max(120),
  slug: slugSchema.optional(),
  timezone: nonEmptyStringSchema.max(80).optional(),
})

export const updateTheaterSetupInputSchema = z.object({
  theaterId: uuidSchema,
  name: nonEmptyStringSchema.max(120).optional(),
  slug: slugSchema.optional(),
  tagline: z.string().trim().max(180).optional(),
  websiteUrl: z.string().url().optional(),
  timezone: nonEmptyStringSchema.max(80).optional(),
  socialLinks: z.record(z.string(), z.string().url()).optional(),
})

export const uploadTheaterLogoInputSchema = z.object({
  theaterId: uuidSchema,
  logoUrl: z.string().url(),
})

export const theaterSlugInputSchema = z.object({
  theaterSlug: slugSchema,
})

export const publishTheaterInputSchema = z.object({
  theaterId: uuidSchema,
})

export const createTheaterInviteInputSchema = z.object({
  theaterId: uuidSchema,
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member']).default('member'),
})

export const publishedTheaterEventsInputSchema = z.object({
  theaterSlug: slugSchema,
})
