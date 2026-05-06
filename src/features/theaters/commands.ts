import { err, notImplemented } from '@/server/errors'

import type { z } from 'zod'
import type {
  createDraftTheaterInputSchema,
  createTheaterInviteInputSchema,
  publishTheaterInputSchema,
  updateTheaterSetupInputSchema,
  uploadTheaterLogoInputSchema,
} from './schemas'

export async function createDraftTheater(
  _input: z.infer<typeof createDraftTheaterInputSchema>,
) {
  return err(notImplemented('createDraftTheater'))
}

export async function updateTheaterSetup(
  _input: z.infer<typeof updateTheaterSetupInputSchema>,
) {
  return err(notImplemented('updateTheaterSetup'))
}

export async function uploadTheaterLogo(
  _input: z.infer<typeof uploadTheaterLogoInputSchema>,
) {
  return err(notImplemented('uploadTheaterLogo'))
}

export async function publishTheater(
  _input: z.infer<typeof publishTheaterInputSchema>,
) {
  return err(notImplemented('publishTheater'))
}

export async function createTheaterInvite(
  _input: z.infer<typeof createTheaterInviteInputSchema>,
) {
  return err(notImplemented('createTheaterInvite'))
}
