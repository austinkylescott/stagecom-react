import { appError, err, ok } from '@/server/errors'
import { castReviewClient, castReviewError } from './persistence'
import {
  reviewInputSchema,
  reviewSchema,
  sendInputSchema,
  sendResultSchema,
} from './schemas'
import type { z } from 'zod'

export async function reviewTeamCastInvitations(
  input: z.infer<typeof reviewInputSchema>,
) {
  const parsed = reviewInputSchema.safeParse(input)
  if (!parsed.success)
    return err(
      appError('validation_error', 'Select at least one Team or subset.'),
    )
  const client = await castReviewClient()
  if (!client.ok) return client
  const result = await client.data.rpc('review_team_cast_invitations', {
    p_show_id: parsed.data.eventId,
    p_selection: parsed.data.selection,
  })
  if (result.error) return castReviewError(result.error)
  const review = reviewSchema.safeParse(result.data)
  return review.success
    ? ok(review.data)
    : err(
        appError(
          'external_service_error',
          'The named review could not be loaded. Retry review.',
        ),
      )
}
export async function sendTeamCastInvitations(
  input: z.infer<typeof sendInputSchema>,
) {
  const parsed = sendInputSchema.safeParse(input)
  if (!parsed.success)
    return err(appError('validation_error', 'Choose a named review.'))
  const client = await castReviewClient()
  if (!client.ok) return client
  const result = await client.data.rpc('send_team_cast_invitations', {
    p_review_id: parsed.data.reviewId,
  })
  if (result.error) return castReviewError(result.error)
  const sent = sendResultSchema.safeParse(result.data)
  return sent.success
    ? ok(sent.data)
    : err(
        appError(
          'external_service_error',
          'The send result could not be loaded. Retry this review safely.',
        ),
      )
}
