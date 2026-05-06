import { z } from 'zod'

export const uuidSchema = z.uuid()

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const inviteTokenSchema = z.string().trim().min(24).max(256)

export const nonEmptyStringSchema = z.string().trim().min(1)

export const emailSchema = z.string().trim().toLowerCase().email()
