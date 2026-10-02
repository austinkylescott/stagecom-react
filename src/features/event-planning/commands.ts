import { ok } from '@/server/errors'
import { planningClient, planningError } from './persistence'
import { planningCommandSchema } from './schemas'
import type { z } from 'zod'

export async function managePlanning(
  input: z.infer<typeof planningCommandSchema>,
) {
  const parsed = planningCommandSchema.parse(input)
  const client = await planningClient()
  if (!client.ok) return client
  const result = await client.data.rpc('manage_event_planning', {
    p_show_id: parsed.eventId,
    p_command_id: parsed.commandId,
    p_action: parsed.operation.action,
    p_input: parsed.operation.input,
  })
  return result.error ? planningError(result.error) : ok(result.data)
}
