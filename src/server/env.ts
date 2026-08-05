import { z } from 'zod'

const emptyStringAsUndefined = (value: unknown) =>
  value === '' ? undefined : value

const optionalUrlSchema = z.preprocess(
  emptyStringAsUndefined,
  z.string().url().optional(),
)

const optionalSecretSchema = z.preprocess(
  emptyStringAsUndefined,
  z.string().min(1).optional(),
)

export const serverEnvSchema = z.object({
  STAGECOM_DEMO_MODE: z.enum(['true', 'false']).optional(),
  STAGECOM_DEMO_PASSWORD: optionalSecretSchema,
  SUPABASE_DB_URL: optionalUrlSchema,
  SUPABASE_PROJECT_ID: optionalSecretSchema,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecretSchema,
  VITE_APP_URL: optionalUrlSchema,
  VITE_SUPABASE_ANON_KEY: optionalSecretSchema,
  VITE_SUPABASE_URL: optionalUrlSchema,
})

export const serverEnv = serverEnvSchema.parse(process.env)

export function requireServerEnv(name: keyof typeof serverEnv): string {
  const value = serverEnv[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
