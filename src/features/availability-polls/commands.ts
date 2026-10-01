import type { z } from 'zod'
import { ok } from '@/server/errors'
import { pollClient, pollError } from './persistence'
import { closePollSchema, openPollSchema, saveAnswersSchema } from './schemas'

export async function openPoll(input: z.infer<typeof openPollSchema>) {
  const parsed = openPollSchema.parse(input)
  const client = await pollClient()
  if (!client.ok) return client
  const result = await client.data.rpc('open_availability_poll', {
    p_occurrence_id: parsed.occurrenceId,
    p_slot_ids: parsed.slotIds,
    p_user_ids: parsed.userIds,
    p_command_id: parsed.commandId,
    ...(parsed.replacePollId
      ? { p_replace_poll_id: parsed.replacePollId }
      : {}),
  })
  return result.error ? pollError(result.error) : ok(result.data)
}
export async function closePoll(input: z.infer<typeof closePollSchema>) {
  const parsed = closePollSchema.parse(input)
  const client = await pollClient()
  if (!client.ok) return client
  const result = await client.data.rpc('close_availability_poll', {
    p_poll_id: parsed.pollId,
    p_command_id: parsed.commandId,
    p_cancel: parsed.cancel,
  })
  return result.error ? pollError(result.error) : ok(result.data)
}
export async function saveAnswers(input: z.infer<typeof saveAnswersSchema>) {
  const parsed = saveAnswersSchema.parse(input)
  const client = await pollClient()
  if (!client.ok) return client
  const result = await client.data.rpc('save_availability_poll_answers', {
    p_poll_id: parsed.pollId,
    p_answers: parsed.answers,
    p_submit: parsed.submit,
    p_expected_version: parsed.expectedVersion,
    p_command_id: parsed.commandId,
  })
  return result.error ? pollError(result.error) : ok(result.data)
}
