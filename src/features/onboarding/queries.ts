import { err, notImplemented } from '@/server/errors'

export async function getOnboardingState() {
  return err(notImplemented('getOnboardingState'))
}
