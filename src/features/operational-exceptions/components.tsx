import type { OperationalException } from '@/features/work-queue/operational-exceptions'

export function OperationalExceptions({
  items,
  id = 'operational-exceptions',
  title = 'Operational Exceptions',
  emptyMessage = 'No Operational Exceptions to monitor right now.',
}: {
  id?: string
  title?: string
  emptyMessage?: string
  items: OperationalException[]
}) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-2xl font-extrabold">
        {title}
      </h2>
      <p className="mt-2 text-[var(--sea-ink-soft)]">
        Conditions to monitor. Responsibility and available actions remain with
        the underlying Event.
      </p>
      {items.length ? (
        <ol className="mt-5 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="island-shell rounded-lg p-4">
              <p className="text-sm font-semibold text-[var(--sea-ink-soft)]">
                {item.theaterName} · {item.eventTitle}
              </p>
              <h3 className="mt-2 text-lg font-bold">{item.label}</h3>
              <p className="mt-2">{item.reason}</p>
              <p className="mt-2 text-sm font-semibold">
                {item.urgency === 'urgent' ? 'Urgent' : 'Watch-only'} ·{' '}
                {item.urgencyReason}
              </p>
              {item.deadlineAt ? (
                <p className="mt-1 text-sm">
                  Deadline:{' '}
                  <time dateTime={item.deadlineAt}>
                    {new Date(item.deadlineAt)
                      .toISOString()
                      .replace('T', ' ')
                      .replace('.000Z', ' UTC')}
                  </time>
                </p>
              ) : null}
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-3 inline-block font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  View Event context
                  <span className="sr-only">
                    {' '}
                    for {item.eventTitle}: {item.label}
                  </span>
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="island-shell mt-5 rounded-lg p-4">{emptyMessage}</p>
      )}
    </section>
  )
}
