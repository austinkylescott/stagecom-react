import { z } from 'zod'
import { ok } from '@/server/errors'
import { planningClient, planningError } from './persistence'
import { planningSchema } from './schemas'

export async function getPlanning(eventId: string) {
  const client = await planningClient()
  if (!client.ok) return client
  const result = await client.data.rpc('get_event_planning', {
    p_show_id: eventId,
  })
  return result.error
    ? planningError(result.error)
    : ok(planningSchema.parse(result.data))
}

export async function getMyPlanningActions() {
  const client = await planningClient()
  if (!client.ok) return client
  const result = await client.data.rpc('get_my_planning_actions')
  if (result.error) return planningError(result.error)
  const rows = z
    .array(
      z.object({
        id: z.uuid(),
        startsAt: z.string(),
        eventSlug: z.string(),
        eventTitle: z.string(),
        theaterSlug: z.string(),
        theaterName: z.string(),
      }),
    )
    .parse(result.data)
  return ok(
    rows.map((row) => ({
      id: `planning-confirmation:${row.id}`,
      action: 'Confirm selected time',
      actionableAt: row.startsAt,
      kind: 'selected_time_confirmation' as const,
      relationship: 'Called participant',
      targetAnchor: '#planning-confirmations',
      event: { slug: row.eventSlug, title: row.eventTitle },
      theater: { slug: row.theaterSlug, title: row.theaterName },
    })),
  )
}
