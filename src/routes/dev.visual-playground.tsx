import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { VisualPlayground } from '@/features/visual-playground-prototype/visual-playground'
import {
  scenarios,
  screens,
} from '@/features/visual-playground-prototype/fixtures'

export const Route = createFileRoute('/dev/visual-playground')({
  validateSearch: z.object({
    variant: z.enum(['A', 'B', 'C']).catch('A'),
    screen: z.enum(screens).catch('portal'),
    scenario: z.enum(scenarios).catch('member'),
    viewport: z.enum(['full', 'phone', 'compare']).catch('full'),
    event: z.enum(['afterlight', 'atlas', 'room', 'draft']).catch('afterlight'),
    section: z
      .enum([
        'Overview',
        'Schedule & Plan',
        'Cast & Team',
        'Review',
        'Public Page',
        'History',
      ])
      .catch('Overview'),
    occurrence: z.string().catch('performance'),
    calendar: z.enum(['daybook', 'month']).catch('daybook'),
    month: z.number().int().min(1).max(12).catch(10),
    year: z.number().int().min(2025).max(2028).catch(2026),
    theater: z.enum(['focus', 'harbor']).catch('focus'),
  }),
  component: VisualPlayground,
})
