import { isAppError } from '@/server/errors'

export function getWorkspaceErrorState(error: unknown) {
  if (isAppError(error) && error.code === 'forbidden') {
    return {
      description:
        'This area is only available when your current Theater relationship allows it. You can return to Callsheet or choose another available destination.',
      eyebrow: 'Unavailable',
      title: 'This destination is not available to you',
    }
  }

  if (isAppError(error) && error.code === 'not_found') {
    return {
      description:
        'This destination is no longer available. Return to Callsheet to choose your next step.',
      eyebrow: 'Not found',
      title: 'We could not find that destination',
    }
  }

  return {
    description:
      'Stagecom could not load this area right now. Return to Callsheet, then try again.',
    eyebrow: 'Something went wrong',
    title: 'Your workspace is still safe',
  }
}
