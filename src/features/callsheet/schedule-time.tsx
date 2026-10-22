import { useHydrated } from '@tanstack/react-router'

/** UTC for SSR/initial hydration; the viewer's zone after hydration. */
export function ScheduleTime({ at }: { at: string | null | undefined }) {
  const hydrated = useHydrated()
  const date = at ? new Date(at) : null
  if (!date || !Number.isFinite(date.getTime())) return <>Time unavailable</>
  return (
    <time dateTime={at ?? undefined}>
      {new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: hydrated
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'UTC',
        timeZoneName: 'short',
      }).format(date)}
    </time>
  )
}
