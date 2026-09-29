import { createFileRoute } from '@tanstack/react-router'

import { ProgrammingCalendarPrototype } from '@/features/programming-calendar-prototype/programming-calendar-prototype'

export const Route = createFileRoute('/dev/programming-calendar-prototype')({
  validateSearch: (search: Record<string, unknown>) =>
    ({
      variant:
        search.variant === 'B' || search.variant === 'C' ? search.variant : 'A',
      booking: typeof search.booking === 'string' ? search.booking : undefined,
    }) as const,
  component: PrototypeRoute,
})

function PrototypeRoute() {
  const { variant, booking } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ProgrammingCalendarPrototype
      variant={variant}
      initialBooking={booking}
      onVariant={(next) =>
        void navigate({
          search: (previous) => ({ ...previous, variant: next }),
          replace: true,
        })
      }
    />
  )
}
